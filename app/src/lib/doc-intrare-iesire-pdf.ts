import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import arimoLatinUrl from '@fontsource/arimo/files/arimo-latin-400-normal.woff?url'
import arimoExtUrl from '@fontsource/arimo/files/arimo-latin-ext-400-normal.woff?url'
import arimoLatinBoldUrl from '@fontsource/arimo/files/arimo-latin-700-normal.woff?url'
import arimoExtBoldUrl from '@fontsource/arimo/files/arimo-latin-ext-700-normal.woff?url'
import { numeFisier, type DateIntrareIesire } from './doc-intrare-iesire'

// „Document de intrare/ieșire din service" ca PDF, desenat cu pdf-lib dupa sablonul .odt al
// service-ului (acelasi titlu, rand de comanda, tabel 2×2 si subsol). Un singur font peste tot
// (Arimo, cu ș/ț/ă) si o singura marime (12) — cererea utilizatorului, 26.10.2026; doar titlul e
// ingrosat si mai mare. Incarcat lazy — pdf-lib nu intra in pachetul principal.

const A4 = { w: 595.28, h: 841.89 }
const NEGRU = rgb(0, 0, 0)
const PUNCTE = '…………………………'
const MARIME = 12
const MARIME_TITLU = 16
// Arimo vine in doua bucati: „latin" (inclusiv â, î) si „latin-ext" (ă, ș, ț...).
const LATIN = /^[\u0000-ÿıŒœʻʼˆ˚˜ -⁯€™−∕]$/

async function octeti(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Nu am putut încărca fontul (' + r.status + ').')
  return r.arrayBuffer()
}

type Font = { latin: PDFFont; ext: PDFFont }
type Bucata = { text: string; font: PDFFont }

/** Imparte textul pe cele doua bucati ale fontului (latin / latin-ext). */
function bucati(text: string, f: Font): Bucata[] {
  const out: Bucata[] = []
  for (const ch of text) {
    const font = LATIN.test(ch) ? f.latin : f.ext
    const ult = out[out.length - 1]
    if (ult && ult.font === font) ult.text += ch
    else out.push({ text: ch, font })
  }
  return out
}

const latime = (b: Bucata[], size: number) => b.reduce((s, x) => s + x.font.widthOfTextAtSize(x.text, size), 0)

/** Scrie pe pagina; `top` = linia de baza masurata de sus. */
function scrie(pag: PDFPage, b: Bucata[], x: number, top: number, size: number) {
  let cx = x
  for (const x0 of b) {
    pag.drawText(x0.text, { x: cx, y: A4.h - top, size, font: x0.font, color: NEGRU })
    cx += x0.font.widthOfTextAtSize(x0.text, size)
  }
  return cx
}

/** Text centrat intre x1 si x2; se micsoreaza doar daca nu incape. */
function centrat(pag: PDFPage, b: Bucata[], x1: number, x2: number, top: number, size: number) {
  const max = x2 - x1 - 12
  let s = size
  while (s > 6 && latime(b, s) > max) s -= 0.5
  scrie(pag, b, (x1 + x2) / 2 - latime(b, s) / 2, top, s)
}

export async function construiestePdf(x: DateIntrareIesire): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  pdf.setTitle('Document de intrare/ieșire din service')
  const [l, e, lb, eb] = await Promise.all([arimoLatinUrl, arimoExtUrl, arimoLatinBoldUrl, arimoExtBoldUrl].map(octeti))
  const normal: Font = { latin: await pdf.embedFont(l, { subset: true }), ext: await pdf.embedFont(e, { subset: true }) }
  const bold: Font = { latin: await pdf.embedFont(lb, { subset: true }), ext: await pdf.embedFont(eb, { subset: true }) }
  const pag = pdf.addPage([A4.w, A4.h])
  const T = (s: string) => bucati(s, normal)
  const mare = (s: string) => s.trim().toLocaleUpperCase('ro-RO')

  // Titlu
  centrat(pag, bucati('DOCUMENT DE INTRARE/IESIRE DIN SERVICE', bold), 0, A4.w, 230, MARIME_TITLU)

  // „Document aferent comenzi nr. X din data de Y" — tot randul in acelasi font si marime
  const nr = mare(x.nrComanda) || PUNCTE
  const data = x.dataComanda.trim() || PUNCTE
  centrat(pag, T(`Document aferent comenzi nr. ${nr} din data de ${data}`), 40, A4.w - 40, 296, MARIME)

  // Tabelul (2 coloane, 2 randuri; in dreapta sus o linie intre Tip auto si Nr. inmatriculare)
  const X1 = 56.7
  const XM = 294.9
  const X2 = 538.6
  const Y1 = 397.6
  const YR = 449
  const YM = 500.4
  const Y2 = 556
  const linie = (xa: number, ya: number, xb: number, yb: number) =>
    pag.drawLine({ start: { x: xa, y: A4.h - ya }, end: { x: xb, y: A4.h - yb }, thickness: 0.6, color: NEGRU })
  linie(X1, Y1, X2, Y1)
  linie(X1, YM, X2, YM)
  linie(X1, Y2, X2, Y2)
  linie(X1, Y1, X1, Y2)
  linie(XM, Y1, XM, Y2)
  linie(X2, Y1, X2, Y2)
  linie(XM, YR, X2, YR)

  const PAD = 4
  const eticheta = (s: string, x0: number, sus: number) => scrie(pag, T(s), x0 + PAD, sus + 14, MARIME)
  const valoare = (s: string, xa: number, xb: number, sus: number, jos: number) =>
    centrat(pag, T(s), xa, xb, (sus + 14 + jos) / 2 + 6, MARIME)

  eticheta('CLIENT:', X1, Y1)
  valoare(mare(x.client), X1, XM, Y1 + 10, YM)

  eticheta('TIP AUTO:', XM, Y1)
  valoare(mare(x.tipAuto), XM, X2, Y1, YR)
  eticheta('NR. INMATRICULARE:', XM, YR)
  valoare(mare(x.nrAuto), XM, X2, YR, YM)

  eticheta('DATA INTRARE REPARATIE:', X1, YM)
  valoare(x.dataIntrare.trim(), X1, XM, YM, Y2)
  eticheta('DATA IESIRE REPARATIE:', XM, YM)
  valoare(x.dataIesire.trim(), XM, X2, YM, Y2)

  // Subsol
  scrie(pag, T('SEMNATURA SERVICE:'), X1, 742, MARIME)

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
