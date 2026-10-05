// Portat din index.html — citire text din PDF (pdf.js) si OCR pe poze/PDF-uri scanate
// (Tesseract.js), incarcate global din CDN (vezi index.html). Acelasi comportament:
// scale 4 (~288 DPI) la randarea paginilor PDF pentru OCR, ca sa nu rateze numere de
// inmatriculare/tabele dense.
import { analizaDeviz, type AnalizaDeviz } from './deviz-analiza'

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
  recognize: (item: Blob | File | HTMLCanvasElement, lang: string) => Promise<{ data: { text: string } }>
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
export async function pdfToImageBlobs(file: File, maxPages = 8, scale = 4): Promise<Blob[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf, disableWorker: true }).promise
  const n = Math.min(pdf.numPages, maxPages)
  const blobs: Blob[] = []
  for (let i = 1; i <= n; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) blobs.push(blob)
  }
  return blobs
}

// Pregatire pentru a doua citire, cand prima n-a gasit nimic (poze de ecran / scanari slabe, ex. deviz Audatex pozat de pe monitor
// si pus pe o pagina A4): tonuri de gri, taiem marginile albe (pagina goala din jurul pozei) si
// impartim fiecare pixel la fundalul local (maximul pe blocuri de 16 px, netezit), ca hartia/ecranul
// sa devina alb uniform si textul negru — dispar umbrele, nuanta monitorului si o parte din moiré.
const BLOC = 16
async function pregatestePentruOcr(item: Blob): Promise<HTMLCanvasElement | Blob> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(item)
  } catch {
    return item // format necunoscut: lasam Tesseract sa decida
  }
  const W0 = bmp.width
  const H0 = bmp.height
  const c0 = document.createElement('canvas')
  c0.width = W0
  c0.height = H0
  const ctx0 = c0.getContext('2d', { willReadFrequently: true })!
  ctx0.drawImage(bmp, 0, 0)
  bmp.close()
  const src = ctx0.getImageData(0, 0, W0, H0).data
  const gri = new Float32Array(W0 * H0)
  for (let i = 0; i < gri.length; i++) gri[i] = (src[4 * i] + src[4 * i + 1] + src[4 * i + 2]) / 3

  // Marginile aproape albe (media randului/coloanei > 250).
  const rand = (y: number) => {
    let s = 0
    for (let x = 0; x < W0; x++) s += gri[y * W0 + x]
    return s / W0
  }
  const col = (x: number, y0: number, y1: number) => {
    let s = 0
    for (let y = y0; y <= y1; y++) s += gri[y * W0 + x]
    return s / (y1 - y0 + 1)
  }
  let y0 = 0
  let y1 = H0 - 1
  while (y0 < y1 && rand(y0) > 250) y0++
  while (y1 > y0 && rand(y1) > 250) y1--
  let x0 = 0
  let x1 = W0 - 1
  while (x0 < x1 && col(x0, y0, y1) > 250) x0++
  while (x1 > x0 && col(x1, y0, y1) > 250) x1--
  const W = x1 - x0 + 1
  const H = y1 - y0 + 1
  if (W < 50 || H < 50) return item

  // Fundal: maximul pe blocuri BLOC×BLOC (din imaginea estompata 3×3, ca dungile de moiré sa nu
  // ridice fundalul), netezit 3×3, apoi interpolat biliniar.
  const est = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= H) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= W) continue
          s += gri[(yy + y0) * W0 + xx + x0]
          n++
        }
      }
      est[y * W + x] = s / n
    }
  }
  const bw = Math.ceil(W / BLOC)
  const bh = Math.ceil(H / BLOC)
  const max = new Float32Array(bw * bh)
  for (let y = 0; y < H; y++) {
    const by = (y / BLOC) | 0
    for (let x = 0; x < W; x++) {
      const v = est[y * W + x]
      const k = by * bw + ((x / BLOC) | 0)
      if (v > max[k]) max[k] = v
    }
  }
  const fundal = new Float32Array(bw * bh)
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let s = 0
      let n = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = by + dy
          const xx = bx + dx
          if (yy >= 0 && yy < bh && xx >= 0 && xx < bw) {
            s += max[yy * bw + xx]
            n++
          }
        }
      }
      fundal[by * bw + bx] = Math.max(s / n, 1)
    }
  }
  const norm = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const fy = Math.min(Math.max(y / BLOC - 0.5, 0), bh - 1)
    const ya = fy | 0
    const yb = Math.min(ya + 1, bh - 1)
    const ty = fy - ya
    for (let x = 0; x < W; x++) {
      const fx = Math.min(Math.max(x / BLOC - 0.5, 0), bw - 1)
      const xa = fx | 0
      const xb = Math.min(xa + 1, bw - 1)
      const tx = fx - xa
      const f =
        (fundal[ya * bw + xa] * (1 - tx) + fundal[ya * bw + xb] * tx) * (1 - ty) +
        (fundal[yb * bw + xa] * (1 - tx) + fundal[yb * bw + xb] * tx) * ty
      norm[y * W + x] = Math.min(255, (gri[(y + y0) * W0 + x + x0] / f) * 255)
    }
  }

  // Estompare gaussiana usoara (sigma 1,5): sterge dungile fine de moiré ramase de la ecran.
  const K = [-3, -2, -1, 0, 1, 2, 3].map((i) => Math.exp((-i * i) / 4.5))
  const sumK = K.reduce((a, b) => a + b, 0)
  const tmp = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0
      for (let i = -3; i <= 3; i++) s += norm[y * W + Math.min(W - 1, Math.max(0, x + i))] * K[i + 3]
      tmp[y * W + x] = s / sumK
    }
  }
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const ctx = out.getContext('2d')!
  const img = ctx.createImageData(W, H)
  const d = img.data
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let s = 0
      for (let i = -3; i <= 3; i++) s += tmp[Math.min(H - 1, Math.max(0, y + i)) * W + x] * K[i + 3]
      const o = 4 * (y * W + x)
      d[o] = d[o + 1] = d[o + 2] = s / sumK
      d[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return out
}

// Pozele mici (ex. trimise prin WhatsApp/chat, ~1100 px latime) au litere de ~12 px, prea mici
// pentru Tesseract: NC-ul EazyInsure dadea nr. auto "Btoasu" la marimea originala si "B1045MM"
// marita 2x. Le marim pana la ~2400 px (cel mult 2,5x); pozele mari raman neatinse.
const LATIME_MINIMA_OCR = 1600
async function marestePozaMica(item: Blob): Promise<HTMLCanvasElement | Blob> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(item)
  } catch {
    return item
  }
  if (bmp.width >= LATIME_MINIMA_OCR) {
    bmp.close()
    return item
  }
  const f = Math.min(2.5, 2400 / bmp.width)
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * f)
  c.height = Math.round(bmp.height * f)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  bmp.close()
  return c
}

export async function ocrImageToText(
  blobOrFile: Blob | Blob[],
  onPagina?: (pagina: number, total: number) => void,
  pregatire = false,
): Promise<string> {
  if (typeof Tesseract === 'undefined') throw { code: 'not_declared' }
  const items = Array.isArray(blobOrFile) ? blobOrFile : [blobOrFile]
  let combined = ''
  for (const [i, item] of items.entries()) {
    onPagina?.(i + 1, items.length)
    const { data } = await Tesseract.recognize(pregatire ? await pregatestePentruOcr(item) : await marestePozaMica(item), 'ron+eng')
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

export function estePdf(f: File): boolean {
  return f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
}

// Textul din unul sau mai multe fisiere, ca dintr-un singur document (ex. cele 4 poze ale unui deviz):
// PDF cu text → textul direct; PDF scanat → OCR pe pagini; pozele → OCR, toate odata.
// `onProgres` primeste un mesaj scurt pentru UI ("Citesc pagina 2 din 4…").
export async function textDinFisiere(
  files: File[],
  onProgres?: (mesaj: string) => void,
  pregatire = false,
): Promise<{ text: string; ocr: boolean }> {
  let text = ''
  let ocr = false
  const poze = files.filter((f) => !estePdf(f))
  for (const f of files.filter(estePdf)) {
    if (!pdfLibDisponibil()) throw new Error('Biblioteca de citire PDF nu s-a încărcat. Verifică internetul și reîncarcă pagina.')
    onProgres?.('Se citește ' + f.name + '…')
    const t = await readPdfText(f)
    if (t.trim().length > 40) {
      text += t + '\n'
    } else {
      ocr = true
      const imagini = await pdfToImageBlobs(f, 8)
      text += (await ocrImageToText(imagini, (i, n) => onProgres?.(`Citesc pagina ${i} din ${n}…`), pregatire)) + '\n'
    }
  }
  if (poze.length) {
    ocr = true
    text += await ocrImageToText(poze, (i, n) => onProgres?.(n > 1 ? `Citesc poza ${i} din ${n}…` : 'Citesc poza…'), pregatire)
  }
  return { text, ocr }
}

// Devizul din fisiere: prima citire normala; daca e OCR si nu s-au gasit orele, a doua citire cu
// imaginile curatate (pregatestePentruOcr) — ex. deviz Audatex pozat de pe monitor. Pe pozele bune
// curatarea poate strica citirea, de aceea e doar a doua incercare. `text` ramane cel din prima
// citire (pentru PRELUARE DATE: nr. auto, dosar etc.).
export async function citesteDeviz(
  files: File[],
  onProgres?: (mesaj: string) => void,
): Promise<{ text: string; ocr: boolean; analiza: AnalizaDeviz | null }> {
  const { text, ocr } = await textDinFisiere(files, onProgres)
  const analiza = text.trim().length > 20 ? analizaDeviz(text) : null
  if ((analiza && !analiza.incomplet) || !ocr) return { text, ocr, analiza }
  // Nimic gasit sau doar o parte (ex. manopera fara vopsitorie): a doua citire, cu imaginile curatate.
  onProgres?.('Imagine neclară — o recitesc cu contrast mărit…')
  const aDoua = await textDinFisiere(files, (m) => onProgres?.(m + ' (a doua citire)'), true)
  const a2 = analizaDeviz(aDoua.text)
  let best = a2 ?? analiza
  if (analiza && a2 && a2.incomplet) best = a2.ore > analiza.ore ? a2 : analiza
  return { text, ocr, analiza: best }
}
