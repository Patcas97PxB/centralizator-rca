import { assetUrl } from './asset-url'

// PaddleOCR (modelele PP-OCRv4, prin esearch-ocr + ONNX Runtime) — ruleaza in browser, la fel ca
// Tesseract, documentele nu pleaca nicaieri. Pe NC-urile reale din File/Invatare/NC a citit corect
// campurile acolo unde Tesseract greseste (nr. auto, nr. dosar in tabele, poze pe birou).
// Modelele (~16 MB) se descarca doar la prima folosire, apoi raman in cache-ul browserului.
// Placa video (WebGPU) cand exista, altfel procesorul (WASM).

type Rezultat = { text: string; mean: number; box: number[][] }
type OcrInstanta = { ocr: (img: HTMLCanvasElement | string) => Promise<{ parragraphs?: unknown; src: Rezultat[] }> }

let instanta: Promise<OcrInstanta> | null = null
let incarcat = false

/** PaddleOCR doar cu placa video (WebGPU): pe procesor (WASM) e prea lent in browser (minute pe poza). */
export function paddleDisponibil(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

/** Modelele sunt deja incarcate in aceasta sesiune (citirea incepe imediat). */
export function paddleIncarcat(): boolean {
  return incarcat
}

function ocr(): Promise<OcrInstanta> {
  instanta ??= (async () => {
    const [esearch, ort, dic] = await Promise.all([
      import('esearch-ocr'),
      import('onnxruntime-web'),
      // fara caracterul CR: un checkout Windows (CRLF) ar strica dictionarul
      fetch(assetUrl('/ocr-models/ppocr_keys_v1.txt')).then((r) => r.text()).then((t) => t.replace(/\r/g, '')),
    ])
    const providers = (typeof navigator !== 'undefined' && 'gpu' in navigator ? ['webgpu', 'wasm'] : ['wasm']) as ('webgpu' | 'wasm')[]
    const o = (await esearch.init({
      ort: ort as never,
      ortOption: { executionProviders: providers },
      det: { input: assetUrl('/ocr-models/ch_PP-OCRv4_det_infer.onnx') },
      rec: { input: assetUrl('/ocr-models/ch_PP-OCRv4_rec_infer.onnx'), decodeDic: dic },
    })) as unknown as OcrInstanta
    incarcat = true
    return o
  })().catch((e) => {
    instanta = null
    throw e
  })
  return instanta
}

// Fragmentele detectate -> randuri de text, dupa pozitia verticala (ca sa ramana "eticheta valoare"
// pe acelasi rand, cum se asteapta regulile din extractie.js).
function randuri(texts: Rezultat[]): string {
  const items = texts
    .filter((t) => t.box && t.box.length)
    .map((t) => {
      const ys = t.box.map((p) => p[1])
      const xs = t.box.map((p) => p[0])
      const y0 = Math.min(...ys)
      const y1 = Math.max(...ys)
      return { y: (y0 + y1) / 2, h: y1 - y0, x: Math.min(...xs), text: t.text }
    })
    .sort((a, b) => a.y - b.y)
  const rows: { y: number; items: typeof items }[] = []
  for (const it of items) {
    const ultim = rows[rows.length - 1]
    if (ultim && Math.abs(it.y - ultim.y) < Math.max(8, 0.5 * it.h)) ultim.items.push(it)
    else rows.push({ y: it.y, items: [it] })
  }
  return rows.map((r) => r.items.sort((a, b) => a.x - b.x).map((i) => i.text).join(' ')).join('\n')
}

/** Textul dintr-o poza (sau pagina randata) cu PaddleOCR. */
export async function paddleText(img: Blob): Promise<string> {
  const o = await ocr()
  const bmp = await createImageBitmap(img)
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  c.getContext('2d')!.drawImage(bmp, 0, 0)
  bmp.close()
  const r = await o.ocr(c)
  return randuri(r.src)
}
