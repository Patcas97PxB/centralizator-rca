import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileEdit,
  FileText,
  Files,
  Loader2,
  ScrollText,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { aplicaModificare, extragePagini, randeazaPagina, type Cuvant, type PaginaRandata } from '@/lib/pdf-editor'
import { cn } from '@/lib/utils'

interface IntrareJurnal {
  pagina: number
  din: string
  in: string
  ora: string
}

interface Chip {
  id: string
  eticheta: string
  valoare: string
  cuvinte: Cuvant[]
}

const RE_DATA = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/
const RE_ORA = /^\d{1,2}:\d{2}$/
const RE_NR_AUTO = /^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/

// Eticheta din stanga valorii (ex. „Dată + Oră"), ca sa stii care e care cand sunt mai multe la fel.
function eticheta(c: Cuvant, toate: Cuvant[], latimePagina: number): string {
  const y = (c.rect[1] + c.rect[3]) / 2
  const linii = new Map<number, Cuvant[]>()
  for (const o of toate) {
    if (o.linie === c.linie) continue
    if (o.rect[3] < y - 3 || o.rect[1] > y + 3) continue
    if (o.rect[2] > c.rect[0] + 1 || c.rect[0] - o.rect[2] > 150) continue
    linii.set(o.linie, [...(linii.get(o.linie) ?? []), o])
  }
  // Blocul de eticheta cel mai apropiat pe orizontala; din el luam randul de sus (versiunea in romana).
  const grupuri = [...linii.values()].map((l) => ({ l, x: Math.max(...l.map((w) => w.rect[2])), y: Math.min(...l.map((w) => w.rect[1])) }))
  const xMax = grupuri.length ? Math.max(...grupuri.map((g) => g.x)) : 0
  const bloc = grupuri.filter((g) => g.x >= xMax - 30).sort((p, q) => p.y - q.y)[0]
  const text = bloc ? bloc.l.sort((p, q) => p.rect[0] - q.rect[0]).map((w) => w.text).join(' ') : ''
  const parte = (c.rect[0] + c.rect[2]) / 2 < latimePagina / 2 ? 'stânga' : 'dreapta'
  return (text ? text + ' · ' : '') + parte
}

function chipuri(p: PaginaRandata): Chip[] {
  const out: Chip[] = []
  p.cuvinte.forEach((c, i) => {
    let tip = ''
    if (RE_DATA.test(c.text)) tip = 'Dată'
    else if (RE_ORA.test(c.text)) tip = 'Oră'
    else if (RE_NR_AUTO.test(c.text)) tip = 'Nr. auto'
    else if (i > 0 && p.cuvinte[i - 1].text === 'RBH' && p.cuvinte[i - 1].linie === c.linie && /^\d{3,}$/.test(c.text)) tip = 'RBH'
    const parte = (c.rect[0] + c.rect[2]) / 2 < p.latime / 2 ? 'stânga' : 'dreapta'
    if (tip) out.push({ id: tip + '-' + c.id, eticheta: tip === 'RBH' ? 'RBH · ' + parte : tip + ' · ' + eticheta(c, p.cuvinte, p.latime), valoare: c.text, cuvinte: [c] })
  })
  return out
}

function descarca(bytes: BlobPart, nume: string, tip: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: tip }))
  const a = document.createElement('a')
  a.href = url
  a.download = nume
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function ModificarPdfModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [numeFisier, setNumeFisier] = useState('')
  const [bytes, setBytes] = useState<Uint8Array | null>(null)
  const [istoric, setIstoric] = useState<Uint8Array[]>([])
  const [jurnal, setJurnal] = useState<IntrareJurnal[]>([])
  const [pagina, setPagina] = useState(0)
  const [randare, setRandare] = useState<PaginaRandata | null>(null)
  const [imagineUrl, setImagineUrl] = useState<string | null>(null)
  const [alese, setAlese] = useState<number[]>([])
  const [textNou, setTextNou] = useState('')
  const [seLucreaza, setSeLucreaza] = useState<string | null>(null)
  const [eroare, setEroare] = useState('')
  const [avertizari, setAvertizari] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [paginiAlese, setPaginiAlese] = useState<number[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const ancora = useRef<number | null>(null)

  function reseteaza() {
    setNumeFisier('')
    setBytes(null)
    setIstoric([])
    setJurnal([])
    setPagina(0)
    setRandare(null)
    setAlese([])
    setTextNou('')
    setEroare('')
    setAvertizari([])
    setSeLucreaza(null)
    setPaginiAlese([])
  }

  useEffect(() => {
    if (!open) reseteaza()
  }, [open])

  // Randare pagina curenta ori de cate ori se schimba documentul sau pagina.
  useEffect(() => {
    if (!bytes) return
    let anulat = false
    let url: string | null = null
    setSeLucreaza('Se pregătește pagina…')
    randeazaPagina(bytes, pagina)
      .then((p) => {
        if (anulat) return
        url = URL.createObjectURL(p.png)
        setRandare(p)
        setImagineUrl(url)
        setSeLucreaza(null)
      })
      .catch((e) => {
        if (anulat) return
        setEroare('Nu am putut deschide PDF-ul (' + (e instanceof Error ? e.message : 'eroare') + '). Poate e protejat cu parolă.')
        setSeLucreaza(null)
      })
    return () => {
      anulat = true
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000)
    }
  }, [bytes, pagina])

  async function alegeFisier(f: File) {
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) {
      setEroare('Alege un fișier PDF.')
      return
    }
    reseteaza()
    setNumeFisier(f.name)
    setBytes(new Uint8Array(await f.arrayBuffer()))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) alegeFisier(f)
  }

  const chips = useMemo(() => (randare ? chipuri(randare) : []), [randare])
  const cuvinteAlese = useMemo(
    () => (randare ? alese.map((id) => randare.cuvinte[id]).filter(Boolean) : []),
    [randare, alese],
  )
  const textAles = cuvinteAlese.map((c) => c.text).join(' ')

  const alegeCuvant = useCallback(
    (c: Cuvant, extinde: boolean) => {
      if (!randare) return
      setEroare('')
      setAvertizari([])
      if (extinde && ancora.current !== null) {
        const a = randare.cuvinte[ancora.current]
        if (a && a.linie === c.linie) {
          const [lo, hi] = a.id < c.id ? [a.id, c.id] : [c.id, a.id]
          setAlese(randare.cuvinte.filter((w) => w.linie === c.linie && w.id >= lo && w.id <= hi).map((w) => w.id))
          setTextNou((prev) => prev)
          return
        }
      }
      ancora.current = c.id
      setAlese([c.id])
      setTextNou(c.text)
    },
    [randare],
  )

  async function aplica() {
    if (!bytes || cuvinteAlese.length === 0) return
    setSeLucreaza('Se modifică…')
    setEroare('')
    setAvertizari([])
    try {
      const r = await aplicaModificare(bytes, pagina, cuvinteAlese, textNou.trim())
      setIstoric((h) => [...h, bytes])
      setJurnal((j) => [...j, { pagina: pagina + 1, din: textAles, in: textNou.trim() || '(șters)', ora: new Date().toLocaleTimeString('ro-RO') }])
      setBytes(r.bytes)
      setAvertizari(r.avertizari)
      setAlese([])
      setTextNou('')
      ancora.current = null
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Nu am putut face modificarea.')
      setSeLucreaza(null)
    }
  }

  function anuleazaUltima() {
    const prev = istoric[istoric.length - 1]
    if (!prev) return
    setBytes(prev)
    setIstoric((h) => h.slice(0, -1))
    setJurnal((j) => j.slice(0, -1))
    setAlese([])
    setTextNou('')
    setAvertizari([])
    setEroare('')
  }

  const baza = numeFisier.replace(/\.pdf$/i, '')
  function descarcaPdf() {
    if (bytes) descarca(bytes as BlobPart, baza + ' (modificat).pdf', 'application/pdf')
  }
  // „Salvează pagini": PDF nou doar cu paginile bifate (ex. pagina 2 din 3).
  async function salveazaPagini() {
    if (!bytes || paginiAlese.length === 0) return
    setSeLucreaza('Se salvează paginile…')
    setEroare('')
    try {
      const nou = await extragePagini(bytes, paginiAlese)
      const nr = [...paginiAlese].sort((a, b) => a - b).map((i) => i + 1)
      descarca(nou as BlobPart, `${baza} (${nr.length === 1 ? 'pagina' : 'paginile'} ${nr.join(', ')}).pdf`, 'application/pdf')
    } catch (e) {
      setEroare('Nu am putut separa paginile (' + (e instanceof Error ? e.message : 'eroare') + ').')
    } finally {
      setSeLucreaza(null)
    }
  }

  function descarcaJurnal() {
    const linii = [
      'Jurnal modificări PDF',
      'Fișier original: ' + numeFisier,
      'Generat: ' + new Date().toLocaleString('ro-RO'),
      '',
      ...jurnal.map((j, i) => `${i + 1}. pagina ${j.pagina}: „${j.din}” → „${j.in}” (${j.ora})`),
    ]
    descarca(linii.join('\r\n'), baza + ' (jurnal modificări).txt', 'text/plain;charset=utf-8')
  }

  const ocupat = seLucreaza !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[92vh] grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto rounded-[22px] border border-[#2c3a5c] bg-[#0d1524] bg-none p-0 shadow-[0_40px_90px_-30px_#000] sm:max-w-[1060px]"
      >
        <DialogHeader className="sticky top-0 z-[5] flex-row items-center gap-3 rounded-t-[22px] border-b border-[#1e2a45] bg-[#0d1524] px-[22px] py-[18px]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-[#2563eb]/45 bg-[#2563eb]/[.16] text-[#60a5fa]">
            <FileEdit className="size-[18px]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[17px] font-extrabold leading-tight text-[#f8fafc]">Modificare PDF</DialogTitle>
            <p className="mt-0.5 truncate text-[12.5px] text-[#94a3b8]">
              {numeFisier || 'Alege un PDF: schimbă text sau separă paginile într-un PDF nou'}
            </p>
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

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) alegeFisier(f)
            e.target.value = ''
          }}
        />

        {!bytes ? (
          <div className="px-[22px] py-[22px]">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed p-12 text-[#93c5fd] transition-colors hover:bg-[#2563eb]/10',
                dragOver ? 'border-[#7dd3fc] bg-[#2563eb]/15' : 'border-[#60a5fa]/45 bg-[#2563eb]/[.06]',
              )}
            >
              <Upload className="size-8" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-[15px] font-extrabold text-[#e2e8f5]">Trage PDF-ul aici sau click pentru a alege</span>
              <span className="max-w-md text-center text-xs text-[#8b9ab5]">
                Merge pe PDF-uri cu text (generate de calculator), nu pe documente scanate. Fișierul original rămâne neschimbat — lucrezi pe o copie.
              </span>
            </button>
            {eroare && <p className="mt-3 text-sm font-semibold text-[#ff8a9f]">{eroare}</p>}
          </div>
        ) : (
          <div className="grid gap-4 p-[18px] lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pagina === 0 || ocupat}
                    onClick={() => {
                      setPagina((p) => p - 1)
                      setAlese([])
                    }}
                    aria-label="Pagina anterioară"
                    className="flex size-8 items-center justify-center rounded-[9px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-[88px] text-center text-[12.5px] font-bold text-[#cbd5e1]">
                    Pagina {pagina + 1} / {randare?.nrPagini ?? '…'}
                  </span>
                  <button
                    type="button"
                    disabled={!randare || pagina >= randare.nrPagini - 1 || ocupat}
                    onClick={() => {
                      setPagina((p) => p + 1)
                      setAlese([])
                    }}
                    aria-label="Pagina următoare"
                    className="flex size-8 items-center justify-center rounded-[9px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[11.5px] text-[#7b8aa6]">
                  {ocupat && (
                    <span className="flex items-center gap-1.5 text-[#7dd3fc]">
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      {seLucreaza}
                    </span>
                  )}
                  <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-[#93c5fd] hover:underline">
                    Alt fișier
                  </button>
                </div>
              </div>

              <div className="max-h-[68vh] overflow-auto rounded-xl border border-[#253150] bg-[#080d17] p-2">
                {randare && imagineUrl ? (
                  <div className="relative mx-auto w-full max-w-[760px] select-none bg-white shadow-[0_10px_40px_-14px_rgba(0,0,0,.9)]">
                    <img src={imagineUrl} alt={'Pagina ' + (pagina + 1)} className="block h-auto w-full" draggable={false} />
                    {randare.cuvinte.map((c) => {
                      const ales = alese.includes(c.id)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          title={c.text}
                          disabled={ocupat}
                          onClick={(e) => alegeCuvant(c, e.shiftKey)}
                          className={cn(
                            'absolute rounded-[2px] transition-colors',
                            ales ? 'bg-[#f59e0b]/40 outline outline-2 outline-[#f59e0b]' : 'hover:bg-[#2563eb]/25 hover:outline hover:outline-1 hover:outline-[#2563eb]/70',
                          )}
                          style={{
                            left: `${(c.rect[0] / randare.latime) * 100}%`,
                            top: `${(c.rect[1] / randare.inaltime) * 100}%`,
                            width: `${((c.rect[2] - c.rect[0]) / randare.latime) * 100}%`,
                            height: `${((c.rect[3] - c.rect[1]) / randare.inaltime) * 100}%`,
                          }}
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center text-sm text-[#7b8aa6]">{eroare || 'Se încarcă pagina…'}</div>
                )}
              </div>
              {randare && randare.cuvinte.length === 0 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-[#fbbf24]">
                  <AlertTriangle className="size-3.5" aria-hidden="true" />
                  Nu am găsit text pe această pagină — poate e scanată sau e o imagine, deci nu se poate edita.
                </p>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-3.5">
              <section className="rounded-2xl border border-[#2563eb]/35 bg-[#2563eb]/[.07] p-3.5">
                <div className="mb-2 text-[10px] font-extrabold tracking-[.1em] text-[#8ea0c4]">MODIFICARE</div>
                {cuvinteAlese.length === 0 ? (
                  <p className="text-xs leading-relaxed text-[#94a3b8]">
                    Apasă pe textul din pagină pe care vrei să-l schimbi (sau alege din lista de mai jos). Pentru mai multe cuvinte de pe același rând, ține apăsat Shift și apasă pe ultimul.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div>
                      <div className="text-[11px] font-semibold text-[#8b9ab5]">Din</div>
                      <div className="rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2.5 py-1.5 text-[13px] font-bold text-[#fde68a]">{textAles}</div>
                    </div>
                    <label className="block">
                      <span className="text-[11px] font-semibold text-[#8b9ab5]">În (lasă gol ca să ștergi)</span>
                      <input
                        value={textNou}
                        onChange={(e) => setTextNou(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !ocupat && aplica()}
                        autoFocus
                        className="mt-0.5 h-[38px] w-full rounded-[11px] border border-[#253150] bg-[#253150]/[.24] px-3 text-[13.5px] text-[#f1f5f9] outline-none focus:border-[#3b82f6]"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={ocupat || (textNou.trim() === textAles && textNou.trim() !== '')}
                      onClick={aplica}
                      className="h-9 rounded-[10px] border border-[#3b82f6] bg-[#2563eb] px-4 text-[12.5px] font-extrabold text-white shadow-[0_10px_24px_-14px_#2563eb] transition-colors hover:bg-[#2563eb]/90 disabled:opacity-50"
                    >
                      {textNou.trim() === '' ? 'Șterge textul ales' : 'Aplică modificarea'}
                    </button>
                  </div>
                )}
                {eroare && bytes && <p className="mt-2 text-xs font-semibold leading-snug text-[#ff8a9f]">{eroare}</p>}
                {avertizari.map((a) => (
                  <p key={a} className="mt-2 flex gap-1.5 text-xs leading-snug text-[#fbbf24]">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                    {a}
                  </p>
                ))}
              </section>

              {chips.length > 0 && (
                <section>
                  <div className="mb-1.5 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]">GĂSITE AUTOMAT PE PAGINĂ</div>
                  <div className="flex max-h-[190px] flex-col gap-1 overflow-y-auto pr-1">
                    {chips.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        disabled={ocupat}
                        onClick={() => {
                          ancora.current = ch.cuvinte[0].id
                          setAlese(ch.cuvinte.map((c) => c.id))
                          setTextNou(ch.valoare)
                          setEroare('')
                          setAvertizari([])
                        }}
                        className={cn(
                          'flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                          alese.join() === ch.cuvinte.map((c) => c.id).join()
                            ? 'border-[#f59e0b]/60 bg-[#f59e0b]/10'
                            : 'border-[#253150] bg-white/[.02] hover:bg-white/[.06]',
                        )}
                      >
                        <span className="truncate text-[11px] text-[#8b9ab5]">{ch.eticheta}</span>
                        <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-[#e2e8f5]">{ch.valoare}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {randare && randare.nrPagini > 1 && (
                <section className="rounded-2xl border border-[#00f5a0]/25 bg-[#00f5a0]/[.04] p-3.5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-extrabold tracking-[.1em] text-[#8ea0c4]">
                    <Files className="size-3" aria-hidden="true" />
                    SEPARĂ PAGINI
                  </div>
                  <p className="mb-2 text-xs leading-relaxed text-[#94a3b8]">Apasă pe paginile pe care le vrei într-un PDF nou (le vezi în stânga).</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: randare.nrPagini }, (_, i) => {
                      const bifata = paginiAlese.includes(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          aria-pressed={bifata}
                          disabled={ocupat}
                          onClick={() => {
                            setPaginiAlese((l) => (bifata ? l.filter((x) => x !== i) : [...l, i]))
                            if (!bifata && i !== pagina) {
                              setPagina(i)
                              setAlese([])
                            }
                          }}
                          className={cn(
                            'h-8 min-w-8 rounded-[9px] border px-2 text-[12.5px] font-bold tabular-nums transition-colors disabled:opacity-50',
                            bifata
                              ? 'border-[#00f5a0]/70 bg-[#00f5a0]/20 text-[#00f5a0]'
                              : 'border-[#253150] bg-white/[.02] text-[#cbd5e1] hover:bg-white/[.06]',
                            i === pagina && !bifata && 'border-[#60a5fa]/70',
                          )}
                        >
                          {i + 1}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={ocupat || paginiAlese.length === 0}
                    onClick={salveazaPagini}
                    className="mt-2.5 flex h-9 w-full items-center justify-center gap-2 rounded-[10px] border border-[#00f5a0]/50 bg-[#00f5a0]/15 px-4 text-[12.5px] font-extrabold text-[#00f5a0] transition-colors hover:bg-[#00f5a0]/25 disabled:opacity-40"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    {paginiAlese.length === 0
                      ? 'Alege cel puțin o pagină'
                      : paginiAlese.length === 1
                        ? `Salvează pagina ${paginiAlese[0] + 1} ca PDF nou`
                        : `Salvează ${paginiAlese.length} pagini ca PDF nou`}
                  </button>
                </section>
              )}

              <section>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]">
                    <ScrollText className="size-3" aria-hidden="true" />
                    JURNAL MODIFICĂRI
                  </span>
                  {istoric.length > 0 && (
                    <button
                      type="button"
                      disabled={ocupat}
                      onClick={anuleazaUltima}
                      className="flex items-center gap-1 text-[11px] font-semibold text-[#93c5fd] hover:underline disabled:opacity-50"
                    >
                      <Undo2 className="size-3" aria-hidden="true" />
                      Anulează ultima
                    </button>
                  )}
                </div>
                {jurnal.length === 0 ? (
                  <p className="text-xs text-[#64748b]">Nicio modificare încă. Originalul rămâne neschimbat.</p>
                ) : (
                  <ol className="flex max-h-[130px] flex-col gap-1 overflow-y-auto text-xs">
                    {jurnal.map((j, i) => (
                      <li key={i} className="rounded-lg border border-[#253150] bg-white/[.02] px-2.5 py-1.5 text-[#cbd5e1]">
                        <span className="text-[#7b8aa6]">p.{j.pagina} · </span>
                        <span className="text-[#fde68a]">{j.din}</span> → <span className="font-bold text-[#3ddc97]">{j.in}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="mt-auto flex flex-col gap-2">
                <button
                  type="button"
                  disabled={ocupat || jurnal.length === 0}
                  onClick={descarcaPdf}
                  className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#00f5a0]/50 bg-[#00f5a0]/15 px-4 text-[13px] font-extrabold text-[#00f5a0] transition-colors hover:bg-[#00f5a0]/25 disabled:opacity-40"
                >
                  <Download className="size-4" aria-hidden="true" />
                  Descarcă PDF-ul modificat
                </button>
                <button
                  type="button"
                  disabled={jurnal.length === 0}
                  onClick={descarcaJurnal}
                  className="flex h-9 items-center justify-center gap-2 rounded-[10px] border border-[#2c3a5c] bg-[#1a2335] px-4 text-xs font-bold text-[#e2e8f5] transition-colors hover:bg-[#222d46] disabled:opacity-40"
                >
                  <FileText className="size-3.5" aria-hidden="true" />
                  Descarcă jurnalul (.txt)
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
