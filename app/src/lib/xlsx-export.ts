import { calculRCA, fmtDate, zileRamase } from './rca-calc'
import { STATUS_META, type Dosar } from './types'

// xlsx (SheetJS) e incarcat global din CDN (vezi index.html) — la fel ca in site-ul
// actual, nu din npm (pachetul npm are vulnerabilitati fara fix).
declare const XLSX: {
  utils: {
    aoa_to_sheet: (rows: unknown[][]) => unknown
    book_new: () => unknown
    book_append_sheet: (wb: unknown, ws: unknown, name: string) => void
  }
  write: (wb: unknown, opts: { bookType: string; type: string }) => ArrayBuffer
}

export function exportDosareXlsx(dosare: Dosar[]) {
  const header = [
    'Nr. dosar', 'Nr. auto păgubit', 'Marcă/model', 'Asigurator', 'Nr. rezervare (RBH)',
    'Status', 'Data predare', 'Data preluare', 'Zile rămase', 'Telefon client',
    'Service', 'Telefon service',
  ]
  const rows = dosare.map((d) => {
    const rca = calculRCA(d)
    const ramase = zileRamase(rca.dataPreluare)
    return [
      d.nrDosar, d.nrAutoPagubit, d.marcaModel, d.asigurator, d.nrRezervare,
      STATUS_META[d.status]?.label ?? d.status, fmtDate(d.start), fmtDate(d.end),
      ramase ?? '', d.telClient, d.service, d.telService,
    ]
  })
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dosare RCA')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dosare-rca-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
