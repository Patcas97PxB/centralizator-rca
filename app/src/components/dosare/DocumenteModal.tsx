import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, ArrowLeftRight, Check, FolderPlus, Laptop, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { cheiLocale, fisiereLocale, useFolderLocal, type FisierLocal } from '@/lib/folder-local'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DOCUMENT_LABELS,
  DOCUMENT_LABELS_NUMARATE,
  detectAllDocLabels,
  docLabelText,
  docStatus,
  lipsuriFinalizare,
} from '@/lib/documente'
import { citesteContractFinal } from '@/lib/contract-final-import'
import { useStariContracteLaptop } from '@/lib/contracte-laptop'
import { ConflictSalvare } from '@/lib/dosare-storage'
import { formatCanonic, majuscule } from '@/lib/majuscule'
import { stergeDocumentStocare } from '@/lib/documente-storage'
import type { Dosar, DocumentDosar } from '@/lib/types'
import { cn } from '@/lib/utils'

// Butonul mic de langa fiecare fisier: il muti in alta categorie (cand numele a fost ghicit gresit).
function MutaCategoria({ curent, nume, onAlege }: { curent: string; nume: string; onAlege: (key: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={'Schimbă categoria pentru ' + nume}
          title="Schimbă categoria"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeftRight className="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <p className="px-2 py-1.5 text-[11px] text-muted-foreground">Mută „{nume}” la:</p>
        {DOCUMENT_LABELS.filter((l) => l.key !== curent).map((l) => (
          <DropdownMenuItem key={l.key} onClick={() => onAlege(l.key)}>
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Modalul dedicat "Documente dosar": incarci fisiere (se sorteaza automat dupa nume sau le
// pui pe un anumit tip), vezi ce lipseste si marchezi ce nu se aplica. Salvarea e automata —
// fiecare schimbare se scrie imediat in dosar, "Gata" doar inchide.
// Numele scurt din subsol: „Cesiune creanță (CC)" → „CC", „Documente păgubit (permis/…)" → „Documente păgubit".
function numeScurt(key: string): string {
  const l = docLabelText(key)
  return l.match(/\(([A-Z]{2,3})\)$/)?.[1] ?? l.replace(/\s*\(.*\)$/, '')
}

export function DocumenteModal({
  open,
  dosar,
  onClose,
  onSave,
}: {
  open: boolean
  dosar: Dosar | null
  onClose: () => void
  onSave: (d: Dosar) => Promise<unknown>
}) {
  const [draft, setDraft] = useState<Dosar | null>(dosar)
  const latest = useRef<Dosar | null>(dosar)
  const [status, setStatusText] = useState('')
  const [statusEroare, setStatusEroare] = useState(false)
  const setStatus = (t: string, eroare = false) => {
    setStatusText(t)
    setStatusEroare(eroare)
  }
  const [seIncarca, setSeIncarca] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const tintaEticheta = useRef<string | null>(null)

  useEffect(() => {
    if (open) {
      latest.current = dosar
      setDraft(dosar)
      setStatus('')
    }
    // Se reinitializeaza doar la deschidere (alt dosar / redeschidere), nu la fiecare salvare.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dosar?.id])

  const folder = useFolderLocal()

  // Contractul final din folderul de pe laptop se citeste singur in fundal (lib/contracte-laptop.ts);
  // butonul ⟳ de langa fisier il recitește de mana (doar in browser, nu se urca).
  async function citesteContractLocal(f: FisierLocal, manual = false) {
    if (!f.deschide || seIncarca) return
    setSeIncarca(true)
    setStatus('Se citește contractul final ' + f.nume + ' de pe laptop…')
    try {
      const file = await f.deschide()
      const r = await citesteContractFinal(file, latest.current as Dosar, setStatus)
      if (r.valid) patch({ ...r.patch, contractFinalIncarcat: true })
      setStatus((r.valid ? '' : f.nume + ': ') + r.mesaj, !r.valid)
    } catch (e) {
      console.error(e)
      setStatus(
        manual
          ? 'Nu am putut deschide ' + f.nume + ' de pe laptop — apasă butonul cu laptop din antet și dă din nou voie.'
          : 'Nu am putut citi contractul ' + f.nume + ' de pe laptop.',
        true,
      )
    } finally {
      setSeIncarca(false)
    }
  }
  const stariLaptop = useStariContracteLaptop()
  const stareLaptop = draft ? stariLaptop.get(draft.id) : undefined

  if (!draft) return null

  const documente = Array.isArray(draft.documente) ? draft.documente : []
  const optionale = Array.isArray(draft.etichetaOptionale) ? draft.etichetaOptionale : []
  const peLaptop = fisiereLocale(folder, draft)
  const docLocale = cheiLocale(folder, draft)
  const st = docStatus(draft, docLocale)
  const lipsuri = lipsuriFinalizare(draft, docLocale)
  const procent = st.total > 0 ? Math.round((st.have / st.total) * 100) : 0

  function patch(p: Partial<Dosar>) {
    const next = { ...(latest.current as Dosar), ...formatCanonic(majuscule(p)) }
    latest.current = next
    setDraft(next)
    onSave(next).catch((e) =>
      setStatus(
        e instanceof ConflictSalvare
          ? 'Dosarul a fost modificat în altă parte — închide fereastra și redeschide-l, apoi refă modificarea.'
          : e instanceof Error ? e.message : 'Eroare la salvare.',
        true,
      ),
    )
  }

  async function incarca(files: FileList | File[], eticheta?: string | null) {
    setSeIncarca(true)
    const noi: DocumentDosar[] = []
    const rezumat: string[] = []
    const mesaje: string[] = []
    let dePatch: Partial<Dosar> = {}
    let esecuri = 0
    for (const file of Array.from(files)) {
      setStatus('Se încarcă ' + file.name + '…')
      let labels = eticheta ? [eticheta] : detectAllDocLabels(file.name)

      // Contractul final: se citeste (zile, valoare, clasa) si se verifica sa fie al acestui dosar.
      if (labels.includes('contract')) {
        setStatus('Se citește contractul final ' + file.name + '…')
        const r = await citesteContractFinal(file, { ...(latest.current as Dosar), ...dePatch }, setStatus)
        if (r.valid) {
          dePatch = { ...dePatch, ...r.patch, contractFinalIncarcat: true }
          mesaje.push(r.mesaj)
        } else {
          labels = labels.filter((l) => l !== 'contract')
          mesaje.push(file.name + ': ' + r.mesaj)
          esecuri++
          if (labels.length === 0) continue
        }
      }

      // fisierul nu se urca nicaieri: se tine minte doar ca exista (nume + tip)
      labels.forEach((lbl) => {
        noi.push({ id: 'doc' + Date.now() + Math.random().toString(36).slice(2, 6), nume: file.name, eticheta: lbl })
      })
      if (!eticheta && labels.length > 1) rezumat.push(file.name + ' → ' + labels.map(docLabelText).join(', '))
    }
    if (noi.length || Object.keys(dePatch).length) {
      patch({ documente: [...((latest.current?.documente as DocumentDosar[]) ?? []), ...noi], ...dePatch })
    }
    const total = Array.from(files).length
    const baza = rezumat.length
      ? 'Un fișier a acoperit mai multe documente: ' + rezumat.join(' · ')
      : noi.length === 0
        ? ''
        : total > 1
          ? total + ' fișiere bifate.'
          : 'Fișier bifat.'
    setStatus([baza, ...mesaje].filter(Boolean).join(' '), esecuri > 0 && noi.length === 0)
    setSeIncarca(false)
  }

  function alege(eticheta: string | null) {
    if (seIncarca) return
    tintaEticheta.current = eticheta
    inputRef.current?.click()
  }

  function elimina(doc: DocumentDosar) {
    patch({ documente: documente.filter((x) => x.id !== doc.id) })
    if (doc.assetId) stergeDocumentStocare(doc.assetId).catch(() => {})
  }

  // Categoria aleasa de mana: la fisierele bifate se schimba eticheta, la cele de pe laptop se tine minte
  // alegerea pe numele fisierului (categoriiFolder).
  function mutaDocument(doc: DocumentDosar, key: string) {
    patch({ documente: documente.map((x) => (x.id === doc.id ? { ...x, eticheta: key } : x)) })
  }
  function mutaLocal(nume: string, key: string) {
    patch({ categoriiFolder: { ...(draft?.categoriiFolder ?? {}), [nume]: key } })
  }

  function toggleOptional(key: string) {
    patch({ etichetaOptionale: optionale.includes(key) ? optionale.filter((k) => k !== key) : [...optionale, key] })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) incarca(e.dataTransfer.files, null)
  }

  const cheiFisier = (f: FisierLocal) => (f.chei.length ? f.chei : ['altele'])
  // Randuri: tipurile numarate + (intrare-iesire / altele doar daca exista fisiere pe ele).
  // Ordinea: ce lipseste sus (de facut), apoi ce exista, apoi „nu se aplica"; intrare-iesire / altele la final.
  const lipsesteCheie = (k: string) => st.missing.includes(k)
  const chei: string[] = [
    ...[...DOCUMENT_LABELS_NUMARATE].sort(
      (a, b) => Number(!lipsesteCheie(a)) - Number(!lipsesteCheie(b)) || Number(optionale.includes(a)) - Number(optionale.includes(b)),
    ),
    ...DOCUMENT_LABELS.filter(
      (l) =>
        (l.key === 'intrare_iesire' || l.key === 'altele') &&
        (documente.some((d) => d.eticheta === l.key) || peLaptop.some((f) => cheiFisier(f).includes(l.key))),
    ).map((l) => l.key),
  ]
  const subtitlu = [draft.nrAutoPagubit, draft.nrAutoInlocuire].filter(Boolean).join(' → ') + (draft.nrDosar ? ' · ' + draft.nrDosar : '')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto rounded-[22px] border border-[#2c3a5c] bg-[#0d1524] bg-none p-0 shadow-[0_40px_90px_-30px_#000] sm:max-w-[620px]"
      >
        <DialogHeader className="sticky top-0 z-[5] flex-row items-center gap-3 rounded-t-[22px] border-b border-[#1e2a45] bg-[#0d1524] px-[22px] py-[18px]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-[#2563eb]/45 bg-[#2563eb]/[.16] text-[#60a5fa]">
            <FolderPlus className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[17px] font-extrabold leading-tight text-[#f8fafc]">Documente dosar</DialogTitle>
            {subtitlu && <p className="mt-0.5 truncate text-[12.5px] text-[#94a3b8]">{subtitlu}</p>}
          </div>
          <button
            type="button"
            aria-label="Închide"
            onClick={onClose}
            className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white"
          >
            <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </DialogHeader>

        <div className="flex flex-col gap-3.5 px-[22px] py-[18px]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2.5">
              <span className="text-[12.5px] font-bold text-[#cbd5e1]">Progres documente</span>
              <span className="text-sm font-extrabold tabular-nums" style={{ color: st.complete ? '#00f5a0' : '#fbbf24' }}>
                {st.have} / {st.total}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#253150]/55">
              <span
                className="block h-full rounded-full transition-[width,background] duration-[400ms]"
                style={{
                  width: `${procent}%`,
                  background: st.complete ? '#00f5a0' : '#3d8bff',
                  boxShadow: `0 0 10px ${st.complete ? '#00f5a0' : '#3d8bff'}`,
                }}
              />
            </div>
          </div>

          {folder.nume && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-[#8b9ab5]">
              <Laptop className="size-3.5 shrink-0 text-[#93c5fd]" aria-hidden="true" />
              {folder.permis !== 'granted'
                ? `Folderul „${folder.nume}” de pe laptop așteaptă permisiunea — apasă iconița cu laptop din antet.`
                : peLaptop.length > 0
                  ? `${peLaptop.length} ${peLaptop.length === 1 ? 'fișier găsit' : 'fișiere găsite'} pe laptop pentru ${draft.nrAutoPagubit}.`
                  : `Nu am găsit pe laptop, în „${folder.nume}”, niciun folder sau fișier cu ${draft.nrAutoPagubit || 'nr. auto'} în nume.`}
            </p>
          )}

          <button
            type="button"
            disabled={seIncarca}
            onClick={() => alege(null)}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-[1.5px] border-dashed p-5 text-[#93c5fd] transition-colors hover:bg-[#2563eb]/10',
              dragOver ? 'border-[#7dd3fc] bg-[#2563eb]/15' : 'border-[#60a5fa]/45 bg-[#2563eb]/[.06]',
            )}
          >
            <Upload className="size-[26px]" strokeWidth={1.8} aria-hidden="true" />
            <span className="text-[13.5px] font-extrabold text-[#e2e8f5]">
              {seIncarca ? 'Se încarcă…' : 'Trage fișierele aici sau click pentru a alege'}
            </span>
            <span className="text-[11.5px] text-[#8b9ab5]">Se bifează după nume · fișierul nu se urcă nicăieri, doar contractul final se citește pentru zile și tarif</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) incarca(e.target.files, tintaEticheta.current)
              e.target.value = ''
            }}
          />

          {status ? (
            <p className={cn('text-xs leading-snug', statusEroare ? 'font-semibold text-[#ff8a9f]' : 'text-[#aab8d0]')}>{status}</p>
          ) : stareLaptop?.stare === 'citeste' ? (
            <p className="text-xs leading-snug text-[#aab8d0]">Se citește contractul final de pe laptop…</p>
          ) : stareLaptop?.stare === 'eroare' && !draft.valoareContract ? (
            <p className="text-xs font-semibold leading-snug text-[#ff8a9f]">{stareLaptop.mesaj}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            {chei.map((key) => {
              const fisiere = documente.filter((d) => d.eticheta === key)
              const locale = peLaptop.filter((f) => cheiFisier(f).includes(key))
              const doarFlag = key === 'contract' && fisiere.length === 0 && !!(draft.contractFinalIncarcat || draft.zileContractFinal)
              const are = fisiere.length > 0 || locale.length > 0 || doarFlag
              const optional = key !== 'contract' && optionale.includes(key)
              return (
                <div
                  key={key}
                  className={cn(
                    // pe telefon butoanele trec sub nume, ca numele sa se vada intreg
                    'flex flex-wrap items-center gap-x-[11px] gap-y-2 rounded-[13px] border px-3 py-2.5 transition-colors sm:flex-nowrap',
                    are ? 'border-[#00f5a0]/35 bg-[#00f5a0]/[.06]' : optional ? 'border-[#253150] bg-white/[.02] opacity-70' : 'border-[#2c3a5c] bg-white/[.02]',
                  )}
                >
                  <span
                    className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border"
                    style={
                      are
                        ? { borderColor: 'rgba(0,245,160,.5)', background: 'rgba(0,245,160,.16)', color: '#00f5a0' }
                        : { borderColor: '#2c3a5c', background: 'transparent', color: '#5b6884' }
                    }
                  >
                    {are ? <Check className="size-[17px]" strokeWidth={2.6} aria-hidden="true" /> : <span className="size-2 rounded-full bg-current opacity-50" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-[13.5px] font-bold text-[#f1f5f9] sm:flex-nowrap sm:truncate">
                      {docLabelText(key)}
                      {key === 'contract' && (
                        <span className="rounded-full border border-[#a855f7]/50 bg-[#a855f7]/15 px-1.5 py-px text-[9px] font-extrabold tracking-wide text-[#d8b4fe]">OBLIGATORIU</span>
                      )}
                    </div>
                    {doarFlag ? (
                      <div className="truncate text-[11.5px] text-[#3ddc97]">încărcat din „Editează” (Contract final)</div>
                    ) : are ? (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {locale.map((f) => (
                          <div key={'loc-' + f.nume} className="flex items-center gap-1.5 text-[11.5px] text-[#93c5fd]" title="Găsit în folderul dosarului de pe laptop">
                            <Laptop className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">{f.nume}</span>
                            {key === 'contract' && f.deschide && (
                              <button
                                type="button"
                                onClick={() => void citesteContractLocal(f, true)}
                                disabled={seIncarca}
                                aria-label={'Citește din nou ' + f.nume}
                                title="Citește din nou contractul (zile, valoare, tarif)"
                                className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#93c5fd] transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                              >
                                <RefreshCw className={cn('size-3.5', seIncarca && 'animate-spin')} aria-hidden="true" />
                              </button>
                            )}
                            <MutaCategoria curent={key} nume={f.nume} onAlege={(k) => mutaLocal(f.nume, k)} />
                          </div>
                        ))}
                        {fisiere.map((f) => (
                          <div key={f.id} className="flex items-center gap-1.5 text-[11.5px] text-[#3ddc97]">
                            <span className="min-w-0 flex-1 truncate">{f.nume}</span>
                            <MutaCategoria curent={key} nume={f.nume} onAlege={(k) => mutaDocument(f, k)} />
                            <button
                              type="button"
                              onClick={() => elimina(f)}
                              aria-label={'Șterge ' + f.nume}
                              title="Șterge"
                              className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#f87171] transition-colors hover:bg-[#f87171]/10"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="truncate text-[11.5px] text-[#7b8aa6]">
                        {optional ? 'nu se aplică' : key === 'contract' ? 'lipsește — PDF winMentor, completează valoarea, zilele și durata contractului' : 'lipsește'}
                      </div>
                    )}
                  </div>
                  {are ? null : (
                    <div className="flex w-full items-center gap-1 pl-[45px] sm:w-auto sm:pl-0">
                      {!optional && (
                        <button
                          type="button"
                          onClick={() => alege(key)}
                          className="h-8 rounded-[9px] border border-[#2c3a5c] bg-[#1a2335] px-3 text-xs font-bold text-[#e2e8f5] transition-colors hover:bg-[#222d46]"
                        >
                          Încarcă
                        </button>
                      )}
                      {key !== 'contract' && (
                      <button
                        type="button"
                        onClick={() => toggleOptional(key)}
                        title={optional ? 'Redevine obligatoriu' : 'Marchează ca nu se aplică'}
                        className="h-8 rounded-[9px] px-2 text-[11px] font-semibold text-[#7b8aa6] transition-colors hover:text-[#e2e8f5]"
                      >
                        {optional ? 'obligatoriu' : 'nu se aplică'}
                      </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

          </div>
        </div>

        <div className="sticky bottom-0 z-[5] flex items-center justify-between gap-3 rounded-b-[22px] border-t border-[#1e2a45] bg-[#0d1524] px-[22px] py-3.5">
          <span
            className="flex min-w-0 items-center gap-2 text-[13px] font-bold"
            style={{ color: lipsuri.length === 0 ? '#00f5a0' : '#fbbf24' }}
          >
            {lipsuri.length === 0 ? <Check className="size-4 shrink-0" strokeWidth={2.6} aria-hidden="true" /> : <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />}
            <span className="line-clamp-2 leading-snug" title={lipsuri.join(', ') || undefined}>
              {lipsuri.length === 0 ? 'Dosar complet — poate fi finalizat' : `Lipsesc: ${st.missing.map(numeScurt).join(', ')}`}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 shrink-0 rounded-[10px] border border-[#3b82f6] bg-[#2563eb] px-[18px] text-[12.5px] font-extrabold text-white shadow-[0_10px_24px_-14px_#2563eb] transition-colors hover:bg-[#2563eb]/90"
          >
            Gata
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
