import { todayStr } from './rca-calc'
import { randFinanciar } from './financiar'
import type { Dosar } from './types'

declare const XLSX: {
  utils: { aoa_to_sheet: (rows: unknown[][]) => unknown; book_new: () => unknown; book_append_sheet: (wb: unknown, ws: unknown, name: string) => void }
  write: (wb: unknown, opts: { bookType: string; type: string }) => ArrayBuffer
}

function descarcaBlob(blob: Blob, numeFisier: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = numeFisier
  a.click()
  URL.revokeObjectURL(url)
}

// Portat din exportFinanciarCSV() (index.html) — simplificat la un singur `<a download>`
// (site-ul vechi avea si o cale de rezerva pentru rulare intr-un iframe restrictionat, care
// nu se aplica aici, aplicatia noua ruleaza mereu ca pagina web normala).
export function exportFinanciarCSV(dosare: Dosar[]) {
  let csv = 'Status;Nr RBH;Nr dosar;Service;Nr auto pagubit;Asigurator;Clasa auto;Valoare (EUR, fara TVA);Comision %;Comision (EUR);Tarif grila estimat;Zile contract;Zile decontabil;Alerta\n'
  dosare.forEach((d) => {
    const r = randFinanciar(d)
    const alerte: string[] = []
    if (r.alerte.some((a) => a.includes('TARIF GREȘIT'))) alerte.push('TARIF GRESIT')
    if (r.alerte.some((a) => a.includes('ZILE DIFERITE'))) alerte.push('ZILE DIFERITE')
    if (!r.finalizat) alerte.push('NEFINALIZAT')
    csv += [
      r.finalizat ? 'finalizat' : 'in curs', d.nrRezervare || '', d.nrDosar || '', d.service || '', d.nrAutoPagubit || '', d.asigurator || '', d.clasaAuto || '',
      r.valoare.toFixed(2), r.procent + '%', r.comision.toFixed(2), r.tarifAsteptat ? r.tarifAsteptat.total.toFixed(2) + ' ' + r.tarifAsteptat.moneda : '',
      d.zileContractFinal || '', r.zilePentruTarif || '', alerte.join(' + '),
    ].join(';') + '\n'
  })
  descarcaBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), `financiar-rca-${todayStr()}.csv`)
}

export function exportFinanciarXLSX(dosare: Dosar[]) {
  const header = ['Status', 'Nr RBH', 'Nr dosar', 'Service', 'Nr auto pagubit', 'Asigurator', 'Clasa auto', 'Valoare EUR', 'Comision %', 'Comision EUR', 'Tarif grila estimat', 'Zile contract', 'Zile decontabil']
  const rows = dosare.map((d) => {
    const r = randFinanciar(d)
    return [
      r.finalizat ? 'finalizat' : 'in curs', d.nrRezervare, d.nrDosar, d.service, d.nrAutoPagubit, d.asigurator, d.clasaAuto,
      r.valoare, r.procent, r.comision, r.tarifAsteptat ? `${r.tarifAsteptat.total.toFixed(2)} ${r.tarifAsteptat.moneda}` : '',
      d.zileContractFinal, r.zilePentruTarif,
    ]
  })
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Financiar RCA')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  descarcaBlob(new Blob([buf], { type: 'application/octet-stream' }), `financiar-rca-${todayStr()}.xlsx`)
}
