import contentXml from './sabloane/intrare-iesire/content.xml?raw'
import manifestXml from './sabloane/intrare-iesire/manifest.xml?raw'
import metaXml from './sabloane/intrare-iesire/meta.xml?raw'
import stylesXml from './sabloane/intrare-iesire/styles.xml?raw'
import { calculRCA, fmtDate } from './rca-calc'
import type { Dosar } from './types'

// „Document de intrare/ieșire din service" — sablonul .odt primit de la utilizator (LibreOffice),
// desfacut in sabloane/intrare-iesire/ cu {{LOCURI}} de completat. Fisierul se construieste in
// browser (zip fara compresie), nu trece prin niciun server.

export interface DateIntrareIesire {
  nrComanda: string
  dataComanda: string
  client: string
  tipAuto: string
  nrAuto: string
  dataIntrare: string
  dataIesire: string
}

const PUNCTE = '…………………………'

/** „BH19BGE" → „BH - 19 - BGE" (ca in documentele completate de mana). Altceva ramane neschimbat. */
export function formatNrAuto(nr: string): string {
  const curat = nr.toLocaleUpperCase('ro-RO').replace(/[\s\-–]/g, '')
  const m = /^([A-Z]{1,2})(\d{2,3})([A-Z]{3})$/.exec(curat)
  return m ? `${m[1]} - ${m[2]} - ${m[3]}` : nr.trim().toLocaleUpperCase('ro-RO')
}

const dataSauGol = (d?: string | null) => (d ? fmtDate(d) : '')

/** Valorile propuse din dosar; utilizatorul le poate schimba in fereastra inainte de descarcare. */
/** Butonul e activ doar dupa ce s-a incarcat contractul final. */
export const areContractFinal = (d: Dosar) => !!(d.contractFinalIncarcat || d.zileContractFinal || d.valoareContract)

export function dateDinDosar(d: Dosar): DateIntrareIesire {
  return {
    nrComanda: d.nrDosar ?? '',
    dataComanda: '',
    client: d.numeClient || d.proprietarPagubit || '',
    tipAuto: (d.marcaModel ?? '').toLocaleUpperCase('ro-RO'),
    nrAuto: formatNrAuto(d.nrAutoPagubit ?? ''),
    // datele reale din contractul final, altfel cele din dosar
    dataIntrare: dataSauGol(d.dataPlecareContract || d.start),
    dataIesire: dataSauGol(d.dataPredareContract || calculRCA(d).dataPreluare || d.end),
  }
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function completeaza(x: DateIntrareIesire): string {
  const v: Record<string, string> = {
    NR_COMANDA: x.nrComanda.trim() || PUNCTE,
    DATA_COMANDA: x.dataComanda.trim() || PUNCTE,
    CLIENT: x.client.trim().toLocaleUpperCase('ro-RO'),
    TIP_AUTO: x.tipAuto.trim().toLocaleUpperCase('ro-RO'),
    NR_AUTO: x.nrAuto.trim().toLocaleUpperCase('ro-RO'),
    DATA_INTRARE: x.dataIntrare.trim(),
    DATA_IESIRE: x.dataIesire.trim(),
  }
  return contentXml.replace(/\{\{([A-Z_]+)\}\}/g, (_, k: string) => esc(v[k] ?? ''))
}

// ---------- zip minimal (metoda STORE) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(b: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const acum = new Date()
  const dosTime = (acum.getHours() << 11) | (acum.getMinutes() << 5) | (acum.getSeconds() >> 1)
  const dosDate = ((acum.getFullYear() - 1980) << 9) | ((acum.getMonth() + 1) << 5) | acum.getDate()
  const locale: Uint8Array[] = []
  const centrale: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const nume = enc.encode(f.name)
    const crc = crc32(f.data)
    const h = new DataView(new ArrayBuffer(30))
    h.setUint32(0, 0x04034b50, true)
    h.setUint16(4, 20, true)
    h.setUint16(6, 0x0800, true) // nume UTF-8
    h.setUint16(8, 0, true) // STORE
    h.setUint16(10, dosTime, true)
    h.setUint16(12, dosDate, true)
    h.setUint32(14, crc, true)
    h.setUint32(18, f.data.length, true)
    h.setUint32(22, f.data.length, true)
    h.setUint16(26, nume.length, true)
    locale.push(new Uint8Array(h.buffer), nume, f.data)

    const c = new DataView(new ArrayBuffer(46))
    c.setUint32(0, 0x02014b50, true)
    c.setUint16(4, 20, true)
    c.setUint16(6, 20, true)
    c.setUint16(8, 0x0800, true)
    c.setUint16(10, 0, true)
    c.setUint16(12, dosTime, true)
    c.setUint16(14, dosDate, true)
    c.setUint32(16, crc, true)
    c.setUint32(20, f.data.length, true)
    c.setUint32(24, f.data.length, true)
    c.setUint16(28, nume.length, true)
    c.setUint32(42, offset, true)
    centrale.push(new Uint8Array(c.buffer), nume)
    offset += 30 + nume.length + f.data.length
  }
  const marimeCentral = centrale.reduce((s, x) => s + x.length, 0)
  const e = new DataView(new ArrayBuffer(22))
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, files.length, true)
  e.setUint16(10, files.length, true)
  e.setUint32(12, marimeCentral, true)
  e.setUint32(16, offset, true)
  const parti = [...locale, ...centrale, new Uint8Array(e.buffer)]
  const out = new Uint8Array(parti.reduce((s, x) => s + x.length, 0))
  let p = 0
  for (const x of parti) {
    out.set(x, p)
    p += x.length
  }
  return out
}

export function construiesteOdt(x: DateIntrareIesire): Blob {
  const enc = new TextEncoder()
  const zip = zipStore([
    // „mimetype" trebuie sa fie primul si necomprimat (regula ODF)
    { name: 'mimetype', data: enc.encode('application/vnd.oasis.opendocument.text') },
    { name: 'META-INF/manifest.xml', data: enc.encode(manifestXml) },
    { name: 'meta.xml', data: enc.encode(metaXml) },
    { name: 'styles.xml', data: enc.encode(stylesXml) },
    { name: 'content.xml', data: enc.encode(completeaza(x)) },
  ])
  return new Blob([zip as BlobPart], { type: 'application/vnd.oasis.opendocument.text' })
}

export function numeFisier(x: DateIntrareIesire): string {
  // „- de semnat”: documentul descărcat încă nu e semnat de service (cererea utilizatorului)
  const nr = x.nrAuto.replace(/[\s\-–]/g, '').replace(/[\\/:*?"<>|]/g, '').toLocaleUpperCase('ro-RO')
  return `Document intrare iesire ${nr ? nr + ' ' : ''}- de semnat.odt`
}

export function descarcaOdt(x: DateIntrareIesire) {
  const url = URL.createObjectURL(construiesteOdt(x))
  const a = document.createElement('a')
  a.href = url
  a.download = numeFisier(x)
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
