// Portat din renderFinanciar()/financiarDosareFiltrate() (index.html) — comisionul si
// alertele de tarif/zile raman identice, doar despartite in date (aici) vs. randare (UI).
import { calculRCA } from './rca-calc'
import { calcTarifGrila, type TarifGrila } from './tarife-grid'
import type { Dosar } from './types'

export interface FiltruFinanciar {
  dataFrom: string
  dataTo: string
  service: string
}
export const filtruFinanciarImplicit: FiltruFinanciar = { dataFrom: '', dataTo: '', service: '' }

export function dosareFinanciarFiltrate(dosare: Dosar[], f: FiltruFinanciar): Dosar[] {
  return dosare.filter((d) => {
    if (f.dataFrom && (!d.start || d.start < f.dataFrom)) return false
    if (f.dataTo && (!d.start || d.start > f.dataTo)) return false
    if (f.service && d.service !== f.service) return false
    return true
  })
}

export interface RandFinanciar {
  dosar: Dosar
  valoare: number
  procent: number
  comision: number
  finalizat: boolean
  tarifAsteptat: TarifGrila | null
  zilePentruTarif: number
  alerte: string[]
  areContract: boolean
}

// Prioritate zile pentru verificarea tarifului: zile reale din contractul final > zile
// decontabile calculate > zile deviz (ultima solutie, informativ).
export function randFinanciar(d: Dosar): RandFinanciar {
  const valoare = Number(d.valoareContract) || 0
  const procent = d.comisionProcent === 0 || d.comisionProcent ? Number(d.comisionProcent) : 10
  const comision = valoare * (procent / 100)
  const finalizat = d.status === 'finalizat'
  const rca = calculRCA(d)
  const zilePentruTarif = d.zileContractFinal ? Number(d.zileContractFinal) : rca?.zile != null ? rca.zile : Number(d.zileDeviz)
  const tarifAsteptat = calcTarifGrila(d, zilePentruTarif)

  const alerte: string[] = []
  if (tarifAsteptat && valoare && tarifAsteptat.moneda === 'EUR' && Math.abs(tarifAsteptat.total - valoare) > 1) {
    alerte.push(`⚠️ TARIF GREȘIT — ${d.asigurator || ''} ${tarifAsteptat.palier} (${zilePentruTarif} zile): suma așteptată ${tarifAsteptat.total.toFixed(2)} EUR, pe contract ${valoare.toFixed(2)} EUR`)
  } else if (tarifAsteptat && valoare && tarifAsteptat.moneda !== 'EUR') {
    alerte.push(`ℹ️ ${d.asigurator || ''} (intern, lei): tarif estimat ${tarifAsteptat.total.toFixed(2)} Lei — valută diferită de contract (${valoare.toFixed(2)} EUR), verifică manual.`)
  }
  if (d.zileContractFinal && rca?.zile != null && Number(d.zileContractFinal) !== rca.zile) {
    alerte.push(`⚠️ ZILE DIFERITE — contract: ${d.zileContractFinal} zile, decontabil calculat: ${rca.zile} zile`)
  }

  return {
    dosar: d, valoare, procent, comision, finalizat, tarifAsteptat, zilePentruTarif, alerte,
    areContract: !!(d.contractFinalIncarcat || d.zileContractFinal),
  }
}

export interface GrupServiciu {
  service: string
  randuri: RandFinanciar[]
  subtotal: number
  subtotalComision: number
  nrFinalizate: number
}

export function grupeazaPeService(dosare: Dosar[]): GrupServiciu[] {
  const perService = new Map<string, RandFinanciar[]>()
  dosare.forEach((d) => {
    const serv = d.service || '(fără service)'
    const rand = randFinanciar(d)
    if (!perService.has(serv)) perService.set(serv, [])
    perService.get(serv)!.push(rand)
  })
  return [...perService.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ro'))
    .map(([service, randuri]) => {
      const finalizate = randuri.filter((r) => r.finalizat)
      return {
        service,
        randuri,
        subtotal: finalizate.reduce((s, r) => s + r.valoare, 0),
        subtotalComision: finalizate.reduce((s, r) => s + r.comision, 0),
        nrFinalizate: finalizate.length,
      }
    })
}
