import { type AnalizaDeviz } from './deviz-analiza'
import { extractFromText, type RezultatExtractie } from './extractie'
import { citesteDeviz, estePdf, pdfToImageBlobs, readPdfText } from './pdf-ocr'
import { paddleDisponibil, paddleIncarcat, paddleText } from './paddle-ocr'

// PRELUARE DATE: citirea unui document (NC, PV, deviz) din PDF-uri si poze.
// - PDF cu text: direct, ca inainte (fara OCR).
// - Poze / PDF scanat: PaddleOCR (mai precis decat Tesseract pe poze cu telefonul — testat pe 26 de
//   NC-uri reale), cand browserul are placa video (WebGPU); altfel Tesseract, ca inainte.
// - Zilele din deviz raman pe Tesseract (citesteDeviz): regulile de devize sunt reglate pe textul lui.
//   Tesseract ruleaza doar daca documentul pare deviz, ca la NC-uri sa nu se piarda timp.

const CAMPURI = ['nrDosar', 'nrAuto', 'marcaModel', 'asigurator'] as const
const PARE_DEVIZ = /manoper|vopsitor|audatex|gt\s*estimate|total\s*cl\b/i

export interface DocumentCitit {
  text: string
  ocr: boolean
  analiza: AnalizaDeviz | null
  extras: RezultatExtractie
}

function completeaza(a: RezultatExtractie, b: RezultatExtractie): RezultatExtractie {
  const r = { ...a }
  for (const k of CAMPURI) if (!r[k] && b[k]) r[k] = b[k]
  r.extraPlates = [...new Set([...a.extraPlates, ...b.extraPlates])]
  r.extraDates = [...new Set([...a.extraDates, ...b.extraDates])]
  r.extraPhones = [...new Set([...a.extraPhones, ...b.extraPhones])]
  return r
}

async function cuTesseract(files: File[], onProgres?: (m: string) => void): Promise<DocumentCitit> {
  const r = await citesteDeviz(files, onProgres)
  return { ...r, extras: extractFromText(r.text) }
}

export async function citesteDocument(files: File[], onProgres?: (mesaj: string) => void): Promise<DocumentCitit> {
  if (!paddleDisponibil()) return cuTesseract(files, onProgres)

  let textPdf = ''
  const imagini: Blob[] = []
  for (const f of files) {
    if (estePdf(f)) {
      onProgres?.('Se citește ' + f.name + '…')
      const t = await readPdfText(f)
      if (t.trim().length > 40) textPdf += t + '\n'
      // PaddleOCR: ~200 DPI (scale 2,75). La 144 DPI se pierdeau detalii (Allianz "CJ/"), la 288 DPI
      // (cat foloseste Tesseract) e mult mai lent.
      else imagini.push(...(await pdfToImageBlobs(f, 8, 2.75)))
    } else {
      imagini.push(f)
    }
  }
  if (imagini.length === 0) return cuTesseract(files, onProgres) // doar PDF-uri cu text: fara OCR

  let textPoze = ''
  try {
    if (!paddleIncarcat()) onProgres?.('Pregătesc citirea (prima dată se descarcă ~16 MB)…')
    for (const [i, img] of imagini.entries()) {
      if (i > 0 || paddleIncarcat()) onProgres?.(imagini.length > 1 ? `Citesc pagina ${i + 1} din ${imagini.length}…` : 'Citesc documentul…')
      textPoze += (await paddleText(img)) + '\n'
      // Deviz: restul paginilor le citeste Tesseract (pentru zile), nu le mai citim de doua ori.
      if (PARE_DEVIZ.test(textPdf + textPoze)) break
    }
  } catch (e) {
    console.warn('PaddleOCR a esuat, folosesc Tesseract', e)
    return cuTesseract(files, onProgres)
  }

  let text = textPdf + textPoze
  let extras = extractFromText(text)
  let analiza: AnalizaDeviz | null = null
  if (PARE_DEVIZ.test(text)) {
    const t = await citesteDeviz(files, onProgres)
    analiza = t.analiza
    extras = completeaza(extras, extractFromText(t.text))
    text = t.text
  }
  return { text, ocr: true, analiza, extras }
}
