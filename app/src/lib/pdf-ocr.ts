// Portat din index.html — citire text din PDF (pdf.js) si OCR pe poze/PDF-uri scanate
// (Tesseract.js), incarcate global din CDN (vezi index.html). Acelasi comportament:
// scale 4 (~288 DPI) la randarea paginilor PDF pentru OCR, ca sa nu rateze numere de
// inmatriculare/tabele dense.
declare const pdfjsLib: {
  getDocument: (opts: { data: ArrayBuffer; disableWorker: boolean }) => { promise: Promise<PdfDocument> }
}
interface PdfDocument {
  numPages: number
  getPage: (n: number) => Promise<PdfPage>
}
interface PdfPage {
  getTextContent: () => Promise<{ items: { str: string }[] }>
  getViewport: (opts: { scale: number }) => { width: number; height: number }
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> }
}
declare const Tesseract: {
  recognize: (item: Blob | File, lang: string) => Promise<{ data: { text: string } }>
}

export function pdfLibDisponibil(): boolean {
  return typeof pdfjsLib !== 'undefined'
}

export async function readPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf, disableWorker: true }).promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    fullText += content.items.map((it) => it.str).join(' ') + '\n'
  }
  return fullText
}

// Randeaza paginile unui PDF scanat (fara text) ca imagini, pentru OCR. Devizele Audatex au
// uneori mai multe pagini (totalul de ore poate fi pe alta pagina decat prima) — trimitem
// toate, in limita platformei (8 — vezi getImageLimits in index.html, acelasi plafon).
export async function pdfToImageBlobs(file: File, maxPages = 8): Promise<Blob[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf, disableWorker: true }).promise
  const n = Math.min(pdf.numPages, maxPages)
  const blobs: Blob[] = []
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 4 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) blobs.push(blob)
  }
  return blobs
}

export async function ocrImageToText(blobOrFile: Blob | Blob[]): Promise<string> {
  if (typeof Tesseract === 'undefined') throw { code: 'not_declared' }
  const items = Array.isArray(blobOrFile) ? blobOrFile : [blobOrFile]
  let combined = ''
  for (const item of items) {
    const { data } = await Tesseract.recognize(item as File, 'ron+eng')
    combined += (data && data.text ? data.text : '') + '\n'
  }
  return combined
}

export function mesajEroareOCR(e: unknown): string {
  const cod = (e as { code?: string })?.code
  if (cod === 'not_declared') return 'Citirea automată din poze nu s-a putut încărca (verifică internetul) — încearcă din nou sau completează manual.'
  if (cod === 'image_rejected') return 'Acest fișier nu poate fi citit automat (verifică formatul: JPEG, PNG, WEBP sau GIF).'
  return 'Nu am putut citi automat această poză. Completează manual câmpurile.'
}
