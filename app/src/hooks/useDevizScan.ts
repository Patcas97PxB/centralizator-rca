import { useState } from 'react'
import { analizaDeviz, type AnalizaDeviz } from '@/lib/deviz-analiza'
import { mesajEroareOCR, ocrImageToText, pdfLibDisponibil, pdfToImageBlobs, readPdfText } from '@/lib/pdf-ocr'

export type DevizScanStage = 'idle' | 'scanning' | 'done' | 'error'

export function useDevizScan() {
  const [stage, setStage] = useState<DevizScanStage>('idle')
  const [result, setResult] = useState<AnalizaDeviz | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')

  async function run(file: File) {
    setStage('scanning')
    setFileName(file.name)
    setErrorMsg('')
    setResult(null)
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    try {
      let an: AnalizaDeviz | null = null
      if (!isPdf) {
        const ocrText = await ocrImageToText(file)
        an = ocrText.trim().length > 20 ? analizaDeviz(ocrText) : null
      } else {
        if (!pdfLibDisponibil()) {
          setErrorMsg('Biblioteca de citire PDF nu s-a încărcat. Verifică internetul și reîncarcă pagina.')
          setStage('error')
          return
        }
        const fullText = await readPdfText(file)
        an = analizaDeviz(fullText)
        if (!an && fullText.trim().length < 40) {
          const imgBlobs = await pdfToImageBlobs(file, 8)
          const ocrText = await ocrImageToText(imgBlobs)
          an = ocrText.trim().length > 20 ? analizaDeviz(ocrText) : null
        }
      }
      if (an) {
        setResult(an)
        setStage('done')
      } else {
        setErrorMsg('Nu am găsit orele de manoperă în acest document. La poze, fotografiază pagina cu totalurile (la GT Estimate: „Total exc. reducere (… h)”) clar și drept, sau introdu zilele manual.')
        setStage('error')
      }
    } catch (e) {
      console.error(e)
      setErrorMsg(mesajEroareOCR(e))
      setStage('error')
    }
  }

  function reset() {
    setStage('idle')
    setResult(null)
    setErrorMsg('')
    setFileName('')
  }

  return { stage, result, errorMsg, fileName, run, reset }
}
