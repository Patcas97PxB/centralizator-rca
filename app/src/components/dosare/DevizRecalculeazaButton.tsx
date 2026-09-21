import { useRef, useState } from 'react'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { analizaDeviz, type AnalizaDeviz } from '@/lib/deviz-analiza'
import { mesajEroareOCR, ocrImageToText, pdfLibDisponibil, pdfToImageBlobs, readPdfText } from '@/lib/pdf-ocr'
import type { Dosar } from '@/lib/types'

// Portat din handleDevizOnly() (index.html) — buton separat care recalculeaza DOAR zilele
// de reparatie dintr-un deviz, suprascriind explicit valoarea existenta (spre deosebire de
// "PRELUARE DATE" din PreluareDateSection, care nu atinge campul daca e deja completat).
// Util cand vrei sa reactualizezi zilele dintr-un deviz nou/corectat, fara sa umbli la restul
// campurilor. Plasat langa campul "Zile lucratoare din deviz" din formular, nu langa
// PRELUARE DATE, la cererea utilizatorului.
export function DevizRecalculeazaButton({
  onPatch,
}: {
  onPatch: (patch: Partial<Dosar>) => void
}) {
  const [status, setStatus] = useState('')
  const [analiza, setAnaliza] = useState<AnalizaDeviz | null>(null)
  const [seIncarca, setSeIncarca] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setSeIncarca(true)
    setStatus('')
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    try {
      let an: AnalizaDeviz | null = null
      if (!isPdf) {
        setStatus('Se scanează imaginea…')
        const ocrText = await ocrImageToText(file)
        an = ocrText.trim().length > 20 ? analizaDeviz(ocrText) : null
      } else {
        if (!pdfLibDisponibil()) {
          setStatus('Biblioteca de citire PDF nu s-a încărcat. Verifică internetul și reîncarcă pagina.')
          return
        }
        setStatus('Se citește devizul…')
        const fullText = await readPdfText(file)
        an = analizaDeviz(fullText)
        if (!an && fullText.trim().length < 40) {
          setStatus('Se scanează imaginea…')
          const imgBlobs = await pdfToImageBlobs(file, 8)
          const ocrText = await ocrImageToText(imgBlobs)
          an = ocrText.trim().length > 20 ? analizaDeviz(ocrText) : null
        }
      }
      if (an) {
        onPatch({ zileDeviz: String(an.total), zileDevizExplicatie: an.explicatie, zileDevizFormula: an.formulaCalcul })
        setAnaliza(an)
        setStatus(isPdf ? 'Zile recalculate din deviz. Restul câmpurilor nu au fost modificate.' : 'Zile recalculate din poza devizului. Restul câmpurilor nu au fost modificate.')
      } else {
        setStatus('Nu am găsit manopera în acest document — verifică claritatea sau introdu zilele manual.')
      }
    } catch (e) {
      console.error(e)
      setStatus(mesajEroareOCR(e))
    } finally {
      setSeIncarca(false)
    }
  }

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={seIncarca} onClick={() => inputRef.current?.click()}>
          <Calculator className="size-3.5" aria-hidden="true" />
          {seIncarca ? 'Se calculează…' : 'Recalculează zile din deviz'}
        </Button>
        <span className="text-xs text-muted-foreground">Suprascrie doar zilele — restul câmpurilor rămân neatinse.</span>
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
      {status && <p className="text-xs text-foreground">{status}</p>}
      {analiza && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-2.5">
          <p className="text-sm font-semibold text-foreground">{analiza.total} zile de reparație</p>
          <p className="text-xs text-muted-foreground">{analiza.formulaCalcul}</p>
        </div>
      )}
    </div>
  )
}
