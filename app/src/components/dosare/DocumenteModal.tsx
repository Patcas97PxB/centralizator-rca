import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, Check, Eye, FolderPlus, Trash2, Upload, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DOCUMENT_LABELS,
  DOCUMENT_LABELS_NUMARATE,
  detectAllDocLabels,
  docLabelText,
  docStatus,
  lipsuriFinalizare,
} from '@/lib/documente'
import { deschideDocument, incarcaDocument, mesajEroareAsset, stergeDocumentStocare } from '@/lib/documente-storage'
import type { Dosar, DocumentDosar } from '@/lib/types'
import { cn } from '@/lib/utils'

// Modalul dedicat "Documente dosar": incarci fisiere (se sorteaza automat dupa nume sau le
// pui pe un anumit tip), vezi ce lipseste si marchezi ce nu se aplica. Salvarea e automata —
// fiecare schimbare se scrie imediat in dosar, "Gata" doar inchide.
export function DocumenteModal({
  open,
  dosar,
  onClose,
  onSave,
}: {
  open: boolean
  dosar: Dosar | null
  onClose: () => void
  onSave: (d: Dosar) => Promise<void>
}) {
  const [draft, setDraft] = useState<Dosar | null>(dosar)
  const latest = useRef<Dosar | null>(dosar)
  const [status, setStatus] = useState('')
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

  if (!draft) return null

  const documente = Array.isArray(draft.documente) ? draft.documente : []
  const optionale = Array.isArray(draft.etichetaOptionale) ? draft.etichetaOptionale : []
  const st = docStatus(draft)
  const lipsuri = lipsuriFinalizare(draft)
  const areContract = !!(draft.contractFinalIncarcat || draft.zileContractFinal)
  const procent = st.total > 0 ? Math.round((st.have / st.total) * 100) : 0

  function patch(p: Partial<Dosar>) {
    const next = { ...(latest.current as Dosar), ...p }
    latest.current = next
    setDraft(next)
    onSave(next).catch((e) => setStatus(e instanceof Error ? e.message : 'Eroare la salvare.'))
  }

  async function incarca(files: FileList | File[], eticheta?: string | null) {
    setSeIncarca(true)
    const noi: DocumentDosar[] = []
    const rezumat: string[] = []
    for (const file of Array.from(files)) {
      setStatus('Se încarcă ' + file.name + '…')
      try {
        const res = await incarcaDocument(file)
        const labels = eticheta ? [eticheta] : detectAllDocLabels(file.name)
        labels.forEach((lbl) => {
          noi.push({ id: 'doc' + Date.now() + Math.random().toString(36).slice(2, 6), nume: file.name, eticheta: lbl, assetId: res.id })
        })
        if (!eticheta && labels.length > 1) rezumat.push(file.name + ' → ' + labels.map(docLabelText).join(', '))
      } catch (e) {
        console.error(e)
        setStatus('Eroare la „' + file.name + '”: ' + mesajEroareAsset(e))
        setSeIncarca(false)
        if (noi.length) patch({ documente: [...((latest.current?.documente as DocumentDosar[]) ?? []), ...noi] })
        return
      }
    }
    patch({ documente: [...((latest.current?.documente as DocumentDosar[]) ?? []), ...noi] })
    setStatus(
      rezumat.length
        ? 'Un fișier a acoperit mai multe documente: ' + rezumat.join(' · ')
        : Array.from(files).length > 1
          ? Array.from(files).length + ' fișiere încărcate.'
          : 'Fișier încărcat.',
    )
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

  async function deschide(assetId?: string) {
    if (!assetId) return
    try {
      await deschideDocument(assetId)
    } catch {
      setStatus('Nu am putut deschide fișierul.')
    }
  }

  function toggleOptional(key: string) {
    patch({ etichetaOptionale: optionale.includes(key) ? optionale.filter((k) => k !== key) : [...optionale, key] })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) incarca(e.dataTransfer.files, null)
  }

  // Randuri: tipurile numarate + (intrare-iesire / altele doar daca exista fisiere pe ele).
  const chei: string[] = [
    ...DOCUMENT_LABELS_NUMARATE,
    ...DOCUMENT_LABELS.filter((l) => (l.key === 'intrare_iesire' || l.key === 'altele') && documente.some((d) => d.eticheta === l.key)).map((l) => l.key),
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
            <span className="text-[11.5px] text-[#8b9ab5]">PDF, JPG sau PNG · se sortează automat pe tip de document</span>
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

          {status && <p className="text-xs text-[#aab8d0]">{status}</p>}

          <div className="flex flex-col gap-2">
            {chei.map((key) => {
              const fisiere = documente.filter((d) => d.eticheta === key)
              const are = fisiere.length > 0
              const optional = optionale.includes(key)
              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-[11px] rounded-[13px] border px-3 py-2.5 transition-colors',
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
                    <div className="truncate text-[13.5px] font-bold text-[#f1f5f9]">{docLabelText(key)}</div>
                    {are ? (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {fisiere.map((f) => (
                          <div key={f.id} className="flex items-center gap-1.5 text-[11.5px] text-[#3ddc97]">
                            <span className="min-w-0 flex-1 truncate">{f.nume}</span>
                            <button
                              type="button"
                              onClick={() => deschide(f.assetId)}
                              aria-label={'Deschide ' + f.nume}
                              title="Deschide"
                              className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#93c5fd] transition-colors hover:bg-white/5"
                            >
                              <Eye className="size-3.5" aria-hidden="true" />
                            </button>
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
                      <div className="truncate text-[11.5px] text-[#7b8aa6]">{optional ? 'nu se aplică' : 'lipsește'}</div>
                    )}
                  </div>
                  {are ? null : (
                    <>
                      {!optional && (
                        <button
                          type="button"
                          onClick={() => alege(key)}
                          className="h-8 rounded-[9px] border border-[#2c3a5c] bg-[#1a2335] px-3 text-xs font-bold text-[#e2e8f5] transition-colors hover:bg-[#222d46]"
                        >
                          Încarcă
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleOptional(key)}
                        title={optional ? 'Redevine obligatoriu' : 'Marchează ca nu se aplică'}
                        className="h-8 rounded-[9px] px-2 text-[11px] font-semibold text-[#7b8aa6] transition-colors hover:text-[#e2e8f5]"
                      >
                        {optional ? 'obligatoriu' : 'nu se aplică'}
                      </button>
                    </>
                  )}
                </div>
              )
            })}

            <div
              className={cn(
                'flex items-center gap-[11px] rounded-[13px] border px-3 py-2.5',
                areContract ? 'border-[#00f5a0]/35 bg-[#00f5a0]/[.06]' : 'border-[#2c3a5c] bg-white/[.02]',
              )}
            >
              <span
                className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border"
                style={
                  areContract
                    ? { borderColor: 'rgba(0,245,160,.5)', background: 'rgba(0,245,160,.16)', color: '#00f5a0' }
                    : { borderColor: '#2c3a5c', background: 'transparent', color: '#5b6884' }
                }
              >
                {areContract ? <Check className="size-[17px]" strokeWidth={2.6} aria-hidden="true" /> : <span className="size-2 rounded-full bg-current opacity-50" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-[13.5px] font-bold text-[#f1f5f9]">
                  Contract final
                  <span className="rounded-full border border-[#a855f7]/50 bg-[#a855f7]/15 px-1.5 py-px text-[9px] font-extrabold tracking-wide text-[#d8b4fe]">OBLIGATORIU</span>
                </div>
                <div className="truncate text-[11.5px]" style={{ color: areContract ? '#3ddc97' : '#7b8aa6' }}>
                  {areContract ? 'încărcat' : 'lipsește — se încarcă din „Editează”, la Contract final'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-[5] flex items-center justify-between gap-3 rounded-b-[22px] border-t border-[#1e2a45] bg-[#0d1524] px-[22px] py-3.5">
          <span
            className="flex min-w-0 items-center gap-2 text-[13px] font-bold"
            style={{ color: lipsuri.length === 0 ? '#00f5a0' : '#fbbf24' }}
          >
            {lipsuri.length === 0 ? <Check className="size-4 shrink-0" strokeWidth={2.6} aria-hidden="true" /> : <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">
              {lipsuri.length === 0 ? 'Dosar complet — poate fi finalizat' : `Mai lipsesc ${lipsuri.length} — dosarul nu poate fi finalizat încă`}
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
