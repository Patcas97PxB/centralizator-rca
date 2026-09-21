import { useRef, useState } from 'react'
import { FileScan, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { extractFromText, type RezultatExtractie } from '@/lib/extractie'
import { analizaDeviz, type AnalizaDeviz } from '@/lib/deviz-analiza'
import { suggestClasaFromModel } from '@/lib/clase-auto'
import { mesajEroareOCR, ocrImageToText, pdfLibDisponibil, pdfToImageBlobs, readPdfText } from '@/lib/pdf-ocr'
import type { Dosar } from '@/lib/types'

// Portat din handleFileUpload()/handleDevizOnly() (index.html): PDF cu text -> citire directa;
// PDF scanat sau poza -> OCR (Tesseract.js). Acelasi text extras alimenteaza si extragerea de
// campuri (extractFromText) si analiza devizului (analizaDeviz) — un singur pipeline, nu doua.
function toIsoDate(d: string): string {
  const parts = d.split(/[./]/)
  if (parts.length !== 3) return ''
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

interface ChipTinta {
  field: keyof Dosar
  label: string
}
interface Chip {
  value: string
  tinte: ChipTinta[]
}

function construiesteChips(found: RezultatExtractie): Chip[] {
  const chips: Chip[] = []
  found.extraPlates.forEach((p) =>
    chips.push({ value: p, tinte: [{ field: 'nrAutoPagubit', label: 'Nr. auto păgubit' }, { field: 'nrAutoInlocuire', label: 'Nr. mașină înlocuire' }] }),
  )
  found.extraDates.forEach((d) =>
    chips.push({ value: toIsoDate(d), tinte: [{ field: 'start', label: 'Data predare' }, { field: 'end', label: 'Data preluare' }] }),
  )
  found.extraPhones.forEach((p) =>
    chips.push({ value: p, tinte: [{ field: 'telClient', label: 'Telefon client' }, { field: 'telService', label: 'Telefon service' }] }),
  )
  return chips.filter((c) => c.value)
}

export function PreluareDateSection({
  draft,
  onPatch,
}: {
  draft: Dosar
  onPatch: (patch: Partial<Dosar>) => void
}) {
  const [status, setStatus] = useState('')
  const [analiza, setAnaliza] = useState<AnalizaDeviz | null>(null)
  const [chips, setChips] = useState<Chip[]>([])
  const [seIncarca, setSeIncarca] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function aplicaExtractie(found: RezultatExtractie) {
    const patch: Partial<Dosar> = {}
    if (found.asigurator && !draft.asigurator) patch.asigurator = found.asigurator
    if (found.nrDosar && !draft.nrDosar) patch.nrDosar = found.nrDosar
    if (found.nrAuto && !draft.nrAutoPagubit) patch.nrAutoPagubit = found.nrAuto
    if (found.marcaModel && !draft.marcaModel) patch.marcaModel = found.marcaModel
    if (found.marcaModel && !draft.clasaAuto) {
      const guess = suggestClasaFromModel(found.marcaModel)
      if (guess) patch.clasaAuto = guess
    }
    if (Object.keys(patch).length) onPatch(patch)
    setChips(construiesteChips(found))
  }

  function aplicaAnaliza(an: AnalizaDeviz | null) {
    setAnaliza(an)
    if (an && !draft.zileDeviz) {
      onPatch({ zileDeviz: String(an.total), zileDevizExplicatie: an.explicatie, zileDevizFormula: an.formulaCalcul })
    }
  }

  async function handleFile(file: File) {
    setSeIncarca(true)
    setStatus('')
    setChips([])
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    try {
      if (isPdf) {
        if (!pdfLibDisponibil()) {
          setStatus('Biblioteca de citire PDF nu s-a încărcat. Verifică internetul și reîncarcă pagina.')
          return
        }
        setStatus('Se citește PDF-ul…')
        const fullText = await readPdfText(file)
        if (fullText.trim().length > 40) {
          aplicaExtractie(extractFromText(fullText))
          const an = analizaDeviz(fullText)
          aplicaAnaliza(an)
          setStatus(an ? 'Deviz analizat — zilele de reparație au fost calculate automat.' : 'Date detectate — verifică și completează câmpurile de mai jos.')
          return
        }
        // PDF scanat (fara text) — OCR pe toate paginile, in limita platformei
        setStatus('Se scanează imaginea…')
        const imgBlobs = await pdfToImageBlobs(file, 8)
        const ocrText = await ocrImageToText(imgBlobs)
        if (ocrText.trim().length > 20) {
          aplicaExtractie(extractFromText(ocrText))
          const an = analizaDeviz(ocrText)
          aplicaAnaliza(an)
          setStatus(an ? 'Deviz citit din scanare — zilele de reparație au fost calculate automat.' : 'Date citite din scanare — verifică și completează câmpurile de mai jos.')
        } else {
          setStatus('Nu am putut citi text din acest PDF scanat. Completează manual câmpurile.')
        }
      } else {
        setStatus('Se scanează imaginea…')
        const ocrText = await ocrImageToText(file)
        if (ocrText.trim().length > 20) {
          aplicaExtractie(extractFromText(ocrText))
          const an = analizaDeviz(ocrText)
          aplicaAnaliza(an)
          setStatus(an ? 'Deviz citit din poză — zilele de reparație au fost calculate automat.' : 'Date citite din poză — verifică și completează câmpurile de mai jos.')
        } else {
          setStatus('Nu am putut citi text din această poză. Completează manual câmpurile.')
        }
      }
    } catch (e) {
      console.error(e)
      setStatus(mesajEroareOCR(e))
    } finally {
      setSeIncarca(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileScan className="size-4 text-primary" aria-hidden="true" />
          Preluare date din document
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={seIncarca}
          onClick={() => inputRef.current?.click()}
        >
          <Sparkles className="size-3.5" aria-hidden="true" />
          {seIncarca ? 'Se citește…' : 'PRELUARE DATE'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Notă de constatare, deviz sau orice document PDF/poză — completează automat câmpurile de mai jos.
      </p>

      {status && <p className="text-xs text-foreground">{status}</p>}

      {analiza && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5">
          <p className="text-sm font-semibold text-foreground">{analiza.total} zile de reparație</p>
          <p className="text-xs text-muted-foreground">{analiza.formulaCalcul}</p>
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary"
                >
                  {chip.value}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 space-y-1 p-2">
                <p className="px-1 pb-1 text-xs text-muted-foreground">Pune valoarea în:</p>
                {chip.tinte.map((t) => (
                  <Button
                    key={String(t.field)}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onPatch({ [t.field]: chip.value } as Partial<Dosar>)}
                  >
                    {t.label}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          ))}
        </div>
      )}
    </div>
  )
}
