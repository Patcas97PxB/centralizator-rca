import { useState } from 'react'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { citesteDeviz, mesajEroareOCR } from '@/lib/pdf-ocr'

export type DevizScanStage = 'idle' | 'scanning' | 'done' | 'error'

export function useDevizScan() {
  const [stage, setStage] = useState<DevizScanStage>('idle')
  const [result, setResult] = useState<AnalizaDeviz | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [fileName, setFileName] = useState('')
  const [progres, setProgres] = useState('')

  async function run(files: File[]) {
    if (files.length === 0) return
    setStage('scanning')
    setFileName(files.length === 1 ? files[0].name : `${files.length} fișiere`)
    setProgres('')
    setErrorMsg('')
    setResult(null)
    try {
      const { analiza: an } = await citesteDeviz(files, setProgres)
      if (an) {
        setResult(an)
        setStage('done')
      } else {
        setErrorMsg(
          'Nu am găsit orele de manoperă. La poze, selectează odată toate paginile devizului (inclusiv cea cu totalurile), clare și drepte — sau introdu zilele manual.',
        )
        setStage('error')
      }
    } catch (e) {
      console.error(e)
      setErrorMsg(e instanceof Error && e.message ? e.message : mesajEroareOCR(e))
      setStage('error')
    }
  }

  function reset() {
    setStage('idle')
    setResult(null)
    setErrorMsg('')
    setFileName('')
    setProgres('')
  }

  return { stage, result, errorMsg, fileName, progres, run, reset }
}
