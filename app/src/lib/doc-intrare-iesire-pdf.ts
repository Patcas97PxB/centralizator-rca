import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import arimoLatinUrl from '@fontsource/arimo/files/arimo-latin-400-normal.woff?url'
import arimoExtUrl from '@fontsource/arimo/files/arimo-latin-ext-400-normal.woff?url'
import { numeFisier, type DateIntrareIesire } from './doc-intrare-iesire'

// „Document de intrare/ieșire din service" ca PDF, desenat cu pdf-lib dupa sablonul .odt al
// service-ului (aceleasi pozitii, marimi si fonturi: Times pentru textul fix, sans pentru valori,
// ca in documentele completate de mana). Incarcat lazy — pdf-lib nu intra in pachetul principal.

const A4 = { w: 595.28, h: 841.89 }
const NEGRU = rgb(0, 0, 0)
const PUNCTE = '…………………………'
// Arimo vine in doua bucati: „latin" (inclusiv â, î) si „latin-ext" (ă, ș, ț...).
const LATIN = /^[\u0000-ÿıŒœʻʼˆ˚˜ -⁯€™−∕]$/

async function octeti(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Nu am putut încărca fontul (' + r.status + ').')
  return r.arrayBuffer()
}

interface Fonturi {
  times: PDFFont
  timesBold: PDFFont
  sans: PDFFont
  sansExt: PDFFont
}

type Bucata = { text: string; font: PDFFont }

/** Imparte textul pe fonturi: Times daca se poate, altfel Arimo (latin / latin-ext pe portiuni). */
function bucati(text: string, f: Fonturi, serif: boolean): Bucata[] {
  if (serif) {
    try {
      f.times.encodeText(text)
      return [{ text, font: f.times }]
    } catch {
      /* are ș/ț/ă — trece pe Arimo */
    }
  }
  const out: Bucata[] = []
  for (const ch of text) {
    const font = LATIN.test(ch) ? f.sans : f.sansExt
    const ult = out[out.length - 1]
    if (ult && ult.font === font) ult.text += ch
    else out.push({ text: ch, font })
  }
  return out
}

const latime = (b: Bucata[], size: number) => b.reduce((s, x) => s + x.font.widthOfTextAtSize(x.text, size), 0)

/** Scrie pe pagina; `top` = linia de baza masurata de sus (ca in sablon). */
function scrie(pag: PDFPage, b: Bucata[], x: number, top: number, size: number) {
  let cx = x
  for (const x0 of b) {
    pag.drawText(x0.text, { x: cx, y: A4.h - top, size, font: x0.font, color: NEGRU })
    cx += x0.font.widthOfTextAtSize(x0.text, size)
  }
  return cx
}

/** Text centrat intre x1 si x2; se micsoreaza daca nu incape. */
function centrat(pag: PDFPage, b: Bucata[], x1: number, x2: number, top: number, size: number) {
  const max = x2 - x1 - 10
  let s = size
  while (s > 6 && latime(b, s) > max) s -= 0.5
  scrie(pag, b, (x1 + x2) / 2 - latime(b, s) / 2, top, s)
}

export async function construiestePdf(x: DateIntrareIesire): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle('Document de intrare/ieșire din service')
  const [latinB, extB] = await Promise.all([octeti(arimoLatinUrl), octeti(arimoExtUrl)])
  const f: Fonturi = {
    times: await pdf.embedFont(StandardFonts.TimesRoman),
    timesBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    sans: await pdf.embedFont(latinB, { subset: true }),
    sansExt: await pdf.embedFont(extB, { subset: true }),
  }
  const pag = pdf.addPage([A4.w, A4.h])
  const T = (s: string): Bucata[] => [{ text: s, font: f.times }]
  const mare = (s: string) => s.trim().toLocaleUpperCase('ro-RO')

  // Titlu
  const titlu: Bucata[] = [{ text: 'DOCUMENT DE INTRARE/IESIRE DIN SERVICE', font: f.timesBold }]
  centrat(pag, titlu, 0, A4.w, 230.4, 20)

  // „Document aferent comenzi nr. X din data de Y" — textul fix Times 12, valorile sans 16,5
  const nr = x.nrComanda.trim()
  const data = x.dataComanda.trim()
  const valoare = (s: string): { b: Bucata[]; size: number } =>
    s ? { b: bucati(mare(s), f, false), size: 16.5 } : { b: T(PUNCTE), size: 12 }
  const parti = [
    { b: T('Document aferent comenzi nr. '), size: 12 },
    valoare(nr),
    { b: T(' din data de '), size: 12 },
    valoare(data),
  ]
  let k = 1
  const lat = () => parti.reduce((s, p) => s + latime(p.b, p.size * (p.size > 12 ? k : 1)), 0)
  while (lat() > A4.w - 100 && k > 0.5) k -= 0.05
  let cx = A4.w / 2 - lat() / 2
  for (const p of parti) cx = scrie(pag, p.b, cx, 296.7, p.size * (p.size > 12 ? k : 1))

  // Tabelul (2 coloane, 2 randuri; in dreapta sus o linie intre Tip auto si Nr. inmatriculare)
  const X1 = 56.7
  const XM = 294.9
  const X2 = 538.6
  const Y1 = 397.6
  const YM = 481.3
  const Y2 = 537.7
  const linie = (xa: number, ya: number, xb: number, yb: number) =>
    pag.drawLine({ start: { x: xa, y: A4.h - ya }, end: { x: xb, y: A4.h - yb }, thickness: 0.6, color: NEGRU })
  linie(X1, Y1, X2, Y1)
  linie(X1, YM, X2, YM)
  linie(X1, Y2, X2, Y2)
  linie(X1, Y1, X1, Y2)
  linie(XM, Y1, XM, Y2)
  linie(X2, Y1, X2, Y2)
  linie(XM, 446.6, X2, 446.6)

  scrie(pag, T('CLIENT:'), 59.6, 421.4, 10)
  centrat(pag, bucati(mare(x.client), f, false), X1, XM, 446.4, 12)

  scrie(pag, T('TIP AUTO:'), 297.7, 409.8, 10)
  centrat(pag, bucati(mare(x.tipAuto), f, true), XM, X2, 421.4, 10)
  scrie(pag, T('NR. INMATRICULARE:'), 297.7, 456.1, 10)
  centrat(pag, bucati(mare(x.nrAuto), f, false), XM, X2, 474.7, 16.5)

  scrie(pag, T('DATA INTRARE REPARATIE:'), 59.6, 493.6, 10)
  centrat(pag, bucati(x.dataIntrare.trim(), f, true), X1, XM, 518.5, 12)
  scrie(pag, T('DATA IESIRE REPARATIE:'), 297.7, 493.6, 10)
  centrat(pag, bucati(x.dataIesire.trim(), f, true), XM, X2, 518.5, 12)

  // Subsol
  scrie(pag, T('SEMNATURA SERVICE:'), 56.8, 742.1, 8)

  return pdf.save()
}

export async function descarcaPdf(x: DateIntrareIesire) {
  const bytes = await construiestePdf(x)
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = numeFisier(x).replace(/\.odt$/, '.pdf')
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
