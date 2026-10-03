// Portat din renderFinanciar()/financiarDosareFiltrate() (index.html) — comisionul si
// alertele de tarif/zile raman identice, doar despartite in date (aici) vs. randare (UI).
import { calculRCA } from './rca-calc'
import { calcTarifGrila, type TarifGrila } from './tarife-grid'
import type { Dosar } from './types'

export type Moneda = 'EUR' | 'lei'

// Contractele Allianz sunt in lei, ale celorlalti asiguratori in EUR (regula stabilita cu utilizatorul).
export function monedaDosar(d: Pick<Dosar, 'asigurator'>): Moneda {
  return (d.asigurator || '').trim().toLowerCase() === 'allianz' ? 'lei' : 'EUR'
}

// Suma scrisa in orice format: „4.375.00”, „4 375,00”, „4,375.00”, „128.00”, „133,50”, „154”.
// Ultimul separator urmat de exact 1–2 cifre la final = zecimale; restul separatorilor sunt de mii.
export function parseSuma(s: string | number | null | undefined): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0
  const t = String(s ?? '').replace(/[^\d.,-]/g, '')
  if (!t) return 0
  const m = t.match(/^(.*?)[.,](\d{1,2})$/)
  const intreg = (m ? m[1] : t).replace(/[.,]/g, '')
  const n = parseFloat(m ? `${intreg}.${m[2]}` : intreg)
  return Number.isFinite(n) ? n : 0
}

/** Suma cu moneda, in format romanesc: „4.375,00 lei”, „128,00 EUR”. */
export function formatSuma(n: number, moneda: Moneda): string {
  return n.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + moneda
}

export type SumePeMoneda = Record<Moneda, number>
export const sumeGoale = (): SumePeMoneda => ({ EUR: 0, lei: 0 })
/** „261,50 EUR + 4.375,00 lei” (monedele cu 0 nu apar; daca ambele sunt 0 → „0,00 EUR”). */
export function formatSumePeMoneda(s: SumePeMoneda): string {
  const parti = (['EUR', 'lei'] as const).filter((m) => s[m]).map((m) => formatSuma(s[m], m))
  return parti.length ? parti.join(' + ') : formatSuma(0, 'EUR')
}

export interface FiltruFinanciar {
  dataFrom: string
  dataTo: string
  service: string
  search: string
}
export const filtruFinanciarImplicit: FiltruFinanciar = { dataFrom: '', dataTo: '', service: '', search: '' }

const fara = (s: string) => s.replace(/[\s\-./]/g, '')

// Cautare libera, ca la Dosare: nr. auto, RBH, nr. dosar, asigurator, service, clasa, marca — si suma
// („4375”, „4.375,00”, „128,00”, „154.88”), cu sau fara spatii/cratime/puncte.
function corespundeCautarii(d: Dosar, search: string): boolean {
  const s = search.trim().toLowerCase()
  if (!s) return true
  const moneda = monedaDosar(d)
  const sume = [d.valoareContract, d.valoareContractCuTVA]
    .map(parseSuma)
    .filter(Boolean)
    .flatMap((n) => [n.toFixed(2), formatSuma(n, moneda), String(Math.round(n))])
  const hay = [d.nrDosar, d.nrRezervare, d.nrAutoPagubit, d.nrAutoInlocuire, d.asigurator, d.service, d.clasaAuto,
    d.marcaModel, d.marcaModelInlocuire, d.valoareContract, d.valoareContractCuTVA, ...sume]
    .join(' ')
    .toLowerCase()
  return hay.includes(s) || fara(hay).includes(fara(s))
}

export function dosareFinanciarFiltrate(dosare: Dosar[], f: FiltruFinanciar): Dosar[] {
  return dosare.filter((d) => {
    if (!corespundeCautarii(d, f.search || '')) return false
    if (f.dataFrom && (!d.start || d.start < f.dataFrom)) return false
    if (f.dataTo && (!d.start || d.start > f.dataTo)) return false
    if (f.service && d.service !== f.service) return false
    return true
  })
}

export interface RandFinanciar {
  dosar: Dosar
  moneda: Moneda
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
  const moneda = monedaDosar(d)
  const valoare = parseSuma(d.valoareContract)
  const procent = d.comisionProcent === 0 || d.comisionProcent ? Number(d.comisionProcent) : 10
  const comision = valoare * (procent / 100)
  const finalizat = d.status === 'finalizat'
  const rca = calculRCA(d)
  const zilePentruTarif = d.zileContractFinal ? Number(d.zileContractFinal) : rca?.zile != null ? rca.zile : Number(d.zileDeviz)
  const tarifAsteptat = calcTarifGrila(d, zilePentruTarif)

  const alerte: string[] = []
  if (tarifAsteptat && valoare && tarifAsteptat.moneda === 'EUR' && Math.abs(tarifAsteptat.total - valoare) > 1) {
    alerte.push(`⚠️ TARIF GREȘIT — ${d.asigurator || ''} ${tarifAsteptat.palier} (${zilePentruTarif} zile): suma așteptată ${tarifAsteptat.total.toFixed(2)} EUR, pe contract ${valoare.toFixed(2)} EUR`)
  } else if (tarifAsteptat && valoare && tarifAsteptat.moneda === 'lei') {
    // Allianz: contractul (in lei) poate fi pe tariful intern sau extern al grupei.
    const ok = [tarifAsteptat.total, tarifAsteptat.totalExtern].some((t) => t != null && Math.abs(t - valoare) <= 1)
    if (!ok) {
      alerte.push(
        `⚠️ TARIF DE VERIFICAT — grilă ${d.asigurator || ''} ${tarifAsteptat.palier} (${zilePentruTarif} zile): intern ${formatSuma(tarifAsteptat.total, 'lei')}` +
          (tarifAsteptat.totalExtern != null ? ` / extern ${formatSuma(tarifAsteptat.totalExtern, 'lei')}` : '') +
          `, pe contract ${formatSuma(valoare, 'lei')}`,
      )
    }
  }
  if (d.zileContractFinal && rca?.zile != null && Number(d.zileContractFinal) !== rca.zile) {
    alerte.push(`⚠️ ZILE DIFERITE — contract: ${d.zileContractFinal} zile, decontabil calculat: ${rca.zile} zile`)
  }

  return {
    dosar: d, moneda, valoare, procent, comision, finalizat, tarifAsteptat, zilePentruTarif, alerte,
    areContract: !!(d.contractFinalIncarcat || d.zileContractFinal || (Array.isArray(d.documente) && d.documente.some((x) => x.eticheta === 'contract'))),
  }
}

export interface GrupServiciu {
  service: string
  randuri: RandFinanciar[]
  subtotal: SumePeMoneda
  subtotalComision: SumePeMoneda
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
      const subtotal = sumeGoale()
      const subtotalComision = sumeGoale()
      for (const r of finalizate) {
        subtotal[r.moneda] += r.valoare
        subtotalComision[r.moneda] += r.comision
      }
      return { service, randuri, subtotal, subtotalComision, nrFinalizate: finalizate.length }
    })
}
