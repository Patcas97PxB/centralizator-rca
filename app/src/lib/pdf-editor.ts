import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import arimoLatinUrl from '@fontsource/arimo/files/arimo-latin-400-normal.woff?url'
import arimoExtUrl from '@fontsource/arimo/files/arimo-latin-ext-400-normal.woff?url'

// Editare de text pe PDF-uri cu text real (nu scanate), in browser:
//  - MuPDF (WASM, incarcat doar cand e nevoie) citeste cuvintele cu pozitiile lor si STERGE definitiv
//    textul ales din fisier (nu doar il acopera);
//  - pdf-lib scrie noul text exact in acelasi loc, cu acelasi font/marime/culoare.
// Originalul nu se modifica niciodata: lucram pe copii in memorie.

export interface Cuvant {
  id: number
  text: string
  /** [x0, y0, x1, y1] in coordonatele paginii randate (origine sus-stanga). */
  rect: [number, number, number, number]
  linie: number
  font: string
  size: number
  /** Culoare RGB 0..1. */
  color: [number, number, number]
  /** Inceputul liniei de baza a textului. */
  origin: [number, number]
}

export interface PaginaRandata {
  latime: number
  inaltime: number
  png: Blob
  cuvinte: Cuvant[]
  nrPagini: number
}

export interface RezultatModificare {
  bytes: Uint8Array
  avertizari: string[]
}

type Mupdf = typeof import('mupdf')
let motor: Promise<Mupdf> | null = null
function incarcaMotor(): Promise<Mupdf> {
  if (!motor) motor = import('mupdf')
  return motor
}

function culoareRgb(c: number[]): [number, number, number] {
  if (c.length === 1) return [c[0], c[0], c[0]]
  if (c.length === 3) return [c[0], c[1], c[2]]
  if (c.length === 4) {
    const [C, M, Y, K] = c
    return [(1 - C) * (1 - K), (1 - M) * (1 - K), (1 - Y) * (1 - K)]
  }
  return [0, 0, 0]
}

function extrageCuvinte(mupdf: Mupdf, page: import('mupdf').Page): Cuvant[] {
  const stext = page.toStructuredText('preserve-whitespace')
  const cuvinte: Cuvant[] = []
  let linie = -1
  let orizontala = true
  let cur: {
    text: string
    x0: number
    y0: number
    x1: number
    y1: number
    origin: [number, number]
    size: number
    font: string
    color: [number, number, number]
  } | null = null

  const inchide = () => {
    if (cur && cur.text) {
      cuvinte.push({
        id: cuvinte.length,
        text: cur.text,
        rect: [cur.x0, cur.y0, cur.x1, cur.y1],
        linie,
        font: cur.font,
        size: cur.size,
        color: cur.color,
        origin: cur.origin,
      })
    }
    cur = null
  }

  stext.walk({
    beginLine(_bbox, _wmode, direction) {
      inchide()
      linie++
      orizontala = Math.abs(direction[1]) < 0.1 && direction[0] > 0
    },
    onChar(c, origin, font, size, quad, color) {
      if (!orizontala) return
      if (/\s/.test(c)) {
        inchide()
        return
      }
      const xs = [quad[0], quad[2], quad[4], quad[6]]
      const ys = [quad[1], quad[3], quad[5], quad[7]]
      const x0 = Math.min(...xs)
      const x1 = Math.max(...xs)
      const y0 = Math.min(...ys)
      const y1 = Math.max(...ys)
      if (!cur) {
        cur = { text: c, x0, y0, x1, y1, origin: [origin[0], origin[1]], size, font: font.getName(), color: culoareRgb(color) }
      } else {
        cur.text += c
        cur.x0 = Math.min(cur.x0, x0)
        cur.x1 = Math.max(cur.x1, x1)
        cur.y0 = Math.min(cur.y0, y0)
        cur.y1 = Math.max(cur.y1, y1)
      }
    },
    endLine() {
      inchide()
    },
  })
  stext.destroy()
  void mupdf
  return cuvinte
}

export async function deschidePdf(bytes: Uint8Array): Promise<number> {
  const mupdf = await incarcaMotor()
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  const n = doc.countPages()
  doc.destroy()
  return n
}

export async function randeazaPagina(bytes: Uint8Array, index: number, scara = 2): Promise<PaginaRandata> {
  const mupdf = await incarcaMotor()
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  try {
    const page = doc.loadPage(index)
    const [x0, y0, x1, y1] = page.getBounds()
    const pix = page.toPixmap(mupdf.Matrix.scale(scara, scara), mupdf.ColorSpace.DeviceRGB, false, true)
    const png = new Blob([pix.asPNG() as BlobPart], { type: 'image/png' })
    pix.destroy()
    const cuvinte = extrageCuvinte(mupdf, page)
    page.destroy()
    return { latime: x1 - x0, inaltime: y1 - y0, png, cuvinte, nrPagini: doc.countPages() }
  } finally {
    doc.destroy()
  }
}

const LATIN = /^[\u0000-ÿıŒœʻʼˆ˚˜ -⁯€™−∕]$/

function fontStandard(nume: string): (typeof StandardFonts)[keyof typeof StandardFonts] {
  const n = nume.toLowerCase()
  const bold = /bold|black|heavy/.test(n)
  const italic = /italic|oblique/.test(n)
  if (/courier|mono/.test(n)) return bold ? StandardFonts.CourierBold : italic ? StandardFonts.CourierOblique : StandardFonts.Courier
  if (/times|serif|georgia/.test(n) && !/sans/.test(n)) return bold ? StandardFonts.TimesRomanBold : italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman
  return bold ? StandardFonts.HelveticaBold : italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica
}

async function octeti(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Nu am putut încărca fontul (' + r.status + ').')
  return r.arrayBuffer()
}

// Cat de inchis arata textul dintr-o zona, pe pagina randata (0 = alb, 255 = negru). Se ia contrastul
// dintre pixelii cei mai inchisi (miezul literelor) si fundal, deci tine cont de culoare, transparenta
// si grosimea literelor — exact ce vede ochiul. null daca zona e goala.
const SCARA_TON = 4
function tonZona(mupdf: Mupdf, page: import('mupdf').Page, rect: [number, number, number, number]): number | null {
  const pix = page.toPixmap(mupdf.Matrix.scale(SCARA_TON, SCARA_TON), mupdf.ColorSpace.DeviceRGB, false, false)
  try {
    const px = pix.getPixels()
    const w = pix.getWidth()
    const h = pix.getHeight()
    const st = pix.getStride()
    const n = pix.getNumberOfComponents()
    const ox = pix.getX()
    const oy = pix.getY()
    const x0 = Math.max(0, Math.floor(rect[0] * SCARA_TON - ox))
    const x1 = Math.min(w, Math.ceil(rect[2] * SCARA_TON - ox))
    const y0 = Math.max(0, Math.floor(rect[1] * SCARA_TON - oy))
    const y1 = Math.min(h, Math.ceil(rect[3] * SCARA_TON - oy))
    const d: number[] = []
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * st + x * n
        d.push(255 - (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]))
      }
    }
    if (d.length < 4) return null
    d.sort((a, b) => a - b)
    const fundal = d[Math.floor(d.length * 0.1)]
    const miez = d[Math.floor(d.length * 0.97)]
    return miez - fundal > 8 ? miez - fundal : null
  } finally {
    pix.destroy()
  }
}

function uniuneRect(cuvinte: Cuvant[]): [number, number, number, number] {
  return [
    Math.min(...cuvinte.map((c) => c.rect[0])),
    Math.min(...cuvinte.map((c) => c.rect[1])),
    Math.max(...cuvinte.map((c) => c.rect[2])),
    Math.max(...cuvinte.map((c) => c.rect[3])),
  ]
}

function acelasiCuvant(a: Cuvant, b: Cuvant): boolean {
  return a.text === b.text && a.rect.every((v, i) => Math.abs(v - b.rect[i]) < 0.6)
}

/**
 * Inlocuieste DOAR cuvintele alese (aceeasi linie) cu `textNou`. Verifica dupa stergere ca restul
 * paginii a ramas identic; daca nu, refuza modificarea.
 */
export async function aplicaModificare(
  bytes: Uint8Array,
  pagina: number,
  alese: Cuvant[],
  textNou: string,
): Promise<RezultatModificare> {
  if (alese.length === 0) throw new Error('Nu ai ales niciun text.')
  const mupdf = await incarcaMotor()
  const avertizari: string[] = []

  // 1) stergere curata cu MuPDF
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf').asPDF()
  if (!doc) throw new Error('Fișierul nu este un PDF valid.')
  let dupaStergere: Uint8Array
  let inainte: Cuvant[]
  let dupa: Cuvant[]
  let tonOriginal: number | null = null
  try {
    const page = doc.loadPage(pagina) as import('mupdf').PDFPage
    inainte = extrageCuvinte(mupdf, page)
    const rect = uniuneRect(alese)
    tonOriginal = tonZona(mupdf, page, rect)
    const annot = page.createAnnotation('Redact')
    annot.setRect(rect)
    page.applyRedactions(false, mupdf.PDFPage.REDACT_IMAGE_NONE, mupdf.PDFPage.REDACT_LINE_ART_NONE, mupdf.PDFPage.REDACT_TEXT_REMOVE)
    dupa = extrageCuvinte(mupdf, page)
    page.destroy()
    const buf = doc.saveToBuffer('garbage=compact,compress')
    dupaStergere = new Uint8Array(buf.asUint8Array())
    buf.destroy()
  } finally {
    doc.destroy()
  }

  // 2) verificare: tot ce nu am ales trebuie sa fi ramas neatins, iar ce am ales sa fi disparut
  const idsAlese = new Set(alese.map((c) => c.id))
  const ramase = inainte.filter((c) => !idsAlese.has(c.id))
  const lipsa = ramase.filter((c) => !dupa.some((d) => acelasiCuvant(c, d)))
  if (lipsa.length > 0) {
    throw new Error(
      'Modificarea ar fi șters și alt text („' + lipsa.slice(0, 4).map((c) => c.text).join('”, „') + '”). N-am aplicat nimic.',
    )
  }
  const raman = alese.filter((c) => dupa.some((d) => acelasiCuvant(c, d)))
  if (raman.length > 0) {
    throw new Error('Textul ales n-a putut fi șters din fișier (poate face parte dintr-o imagine). N-am aplicat nimic.')
  }

  // 3) scrie textul nou exact in acelasi loc
  if (textNou.length === 0) return { bytes: dupaStergere, avertizari }
  const prim = alese[0]

  // Scrie textul cu o anumita culoare peste varianta dupa stergere; intoarce PDF-ul si latimea textului.
  const scrieText = async (col: [number, number, number]) => {
    const pdf = await PDFDocument.load(dupaStergere)
    pdf.registerFontkit(fontkit)
    const pag = pdf.getPage(pagina)
    if (pag.getRotation().angle % 360 !== 0) throw new Error('Paginile rotite nu sunt suportate încă.')
    const crop = pag.getCropBox()
    const x = crop.x + prim.origin[0]
    const y = crop.y + crop.height - prim.origin[1]
    const culoare = rgb(col[0], col[1], col[2])
    const std = await pdf.embedFont(fontStandard(prim.font))
    let encodabil = true
    try {
      std.encodeText(textNou)
    } catch {
      encodabil = false
    }
    let latime: number
    if (encodabil) {
      pag.drawText(textNou, { x, y, size: prim.size, font: std, color: culoare })
      latime = std.widthOfTextAtSize(textNou, prim.size)
    } else {
      // Litere care nu exista in fontul standard (ș, ț, ă...): font cu acoperire completa, pe portiuni.
      const latin: PDFFont = await pdf.embedFont(await octeti(arimoLatinUrl), { subset: true })
      const ext: PDFFont = await pdf.embedFont(await octeti(arimoExtUrl), { subset: true })
      let cx = x
      let run = ''
      let runLatin = true
      const scrie = () => {
        if (!run) return
        const f = runLatin ? latin : ext
        pag.drawText(run, { x: cx, y, size: prim.size, font: f, color: culoare })
        cx += f.widthOfTextAtSize(run, prim.size)
        run = ''
      }
      for (const ch of textNou) {
        const esteLatin = LATIN.test(ch)
        if (run && esteLatin !== runLatin) scrie()
        runLatin = esteLatin
        run += ch
      }
      scrie()
      latime = cx - x
    }
    return { bytes: await pdf.save(), latime, encodabil, latimePagina: pag.getWidth() }
  }

  // Tonul textului nou, masurat pe pagina randata, in zona in care a fost scris.
  const tonNou = (b: Uint8Array, latime: number): number | null => {
    const d = mupdf.Document.openDocument(b, 'application/pdf')
    try {
      const pg = d.loadPage(pagina)
      const r: [number, number, number, number] = [prim.origin[0], Math.min(...alese.map((c) => c.rect[1])), prim.origin[0] + latime, Math.max(...alese.map((c) => c.rect[3]))]
      const t = tonZona(mupdf, pg, r)
      pg.destroy()
      return t
    } finally {
      d.destroy()
    }
  }

  // Scrisul nou iese de regula mai apasat decat originalul (transparenta pierduta, font de rezerva
  // mai gros). Il deschidem la culoare pana arata la fel de inchis ca textul original. Doar deschidem,
  // niciodata nu intunecam peste culoarea originala.
  let culoare: [number, number, number] = [...prim.color]
  let rez = await scrieText(culoare)
  if (tonOriginal !== null) {
    for (let pas = 0; pas < 3; pas++) {
      const t = tonNou(rez.bytes, rez.latime)
      if (t === null || t <= tonOriginal * 1.06) break
      const k = Math.max(0.15, tonOriginal / t)
      culoare = culoare.map((c) => 1 - (1 - c) * k) as [number, number, number]
      rez = await scrieText(culoare)
    }
  }
  const latimeText = rez.latime
  if (!rez.encodabil) {
    avertizari.push('Textul conține litere speciale (ș, ț, ă…): am folosit fontul Arimo, foarte asemănător cu cel din document.')
  }

  // 4) avertizare daca noul text ajunge peste vecinul din dreapta
  const capat = prim.origin[0] + latimeText
  const vecin = inainte
    .filter((c) => c.linie === prim.linie && !idsAlese.has(c.id) && c.rect[0] >= alese[alese.length - 1].rect[2] - 0.5)
    .sort((a, b) => a.rect[0] - b.rect[0])[0]
  if (vecin && capat > vecin.rect[0] - 0.8) {
    avertizari.push('Noul text este mai lung și se apropie de „' + vecin.text + '”. Verifică rezultatul.')
  }
  if (capat > rez.latimePagina - 4) avertizari.push('Noul text ajunge la marginea paginii.')

  return { bytes: new Uint8Array(rez.bytes), avertizari }
}

// Pagini separate: copiaza paginile alese (index de la 0, in ordinea din document) intr-un PDF nou.
// Pleaca de la versiunea curenta, deci pastreaza si modificarile facute deja. Merge si pe PDF-uri scanate.
export async function extragePagini(bytes: Uint8Array, indici: number[]): Promise<Uint8Array> {
  const sursa = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const nou = await PDFDocument.create()
  const ordonate = [...new Set(indici)].sort((a, b) => a - b)
  const pagini = await nou.copyPages(sursa, ordonate)
  pagini.forEach((p) => nou.addPage(p))
  return nou.save()
}
