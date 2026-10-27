import { calculRCA, etapaDosar, fmtDate, todayStr, urgentaDosar, zileScurseDeLaPredare } from './rca-calc'
import type { Dosar } from './types'

// Un singur pas următor pe card, dedus din etapă (redesign F3): predat → preluat → finalizează.
// La dosarele vechi (predarea trecută fără bifă = deja LA CLIENT), „Marchează preluat” pune și bifa Predat.
export type PasUrmator = { eticheta: string; patch: Partial<Dosar> } | { eticheta: string; finalizeaza: true } | null

export function pasUrmator(d: Dosar): PasUrmator {
  switch (etapaDosar(d)) {
    case 'rezervat':
      return { eticheta: 'Marchează predat', patch: { predatBifat: true } }
    case 'la_client':
      return { eticheta: 'Marchează preluat', patch: { predatBifat: true, preluatBifat: true, preluatLa: todayStr() } }
    case 'de_trimis':
      return { eticheta: 'Finalizează', finalizeaza: true }
    default:
      return null
  }
}

// Anularea pasului făcut (din panou): fiecare etapă se poate desface una câte una.
export function anulareUltimulPas(d: Dosar): { eticheta: string; patch: Partial<Dosar> } | null {
  if (d.status === 'finalizat') return { eticheta: 'Redeschide dosarul', patch: { status: 'in_asteptare' } }
  if (d.preluatBifat) return { eticheta: 'Anulează preluarea', patch: { preluatBifat: false, preluatLa: '' } }
  if (d.predatBifat) return { eticheta: 'Anulează predarea', patch: { predatBifat: false, preluatBifat: false, preluatLa: '' } }
  return null
}

export interface TextTermen {
  /** Rândul mare, colorat după termen. */
  mare: string
  /** Sub bară (ziua X din Y, motivul). */
  sub: string
  /** Cât din bară e plină (0–100). */
  procent: number
}

const cuZile = (n: number) => (n === 1 ? '1 zi' : `${n} zile`)

export function textTermen(d: Dosar): TextTermen {
  const u = urgentaDosar(d)
  const rca = calculRCA(d)
  const finalizat = d.status === 'finalizat'
  const scurse = zileScurseDeLaPredare(d.start)
  const total = rca.zile
  const procent = finalizat || d.preluatBifat ? 100 : scurse !== null && total ? Math.max(0, Math.min(100, (scurse / total) * 100)) : 0
  const ziuaDin = scurse !== null && total ? `ziua ${scurse} din ${total}` : ''

  if (u.inaintePredare) {
    return {
      mare: u.bigNum === 'AZI' ? 'Predare azi' : `${cuZile(Number(u.bigNum))} până la predare`,
      sub: 'nepredată',
      procent: 0,
    }
  }
  if (finalizat) {
    return { mare: 'Finalizat', sub: total ? `${cuZile(total)} decontabile` : 'închis', procent: 100 }
  }
  if (d.preluatBifat) {
    return {
      mare: 'Preluată · închide contractul',
      sub: total ? `${cuZile(total)} decontabile` : '',
      procent: 100,
    }
  }
  if (rca.zile === null) {
    if (u.bigNum === '?') return { mare: d.dte ? 'Ofertă de despăgubire neprimită' : 'Fără termen', sub: d.dte ? '' : rca.formula, procent: 0 }
    return { mare: `${cuZile(Number(u.bigNum))} de la predare`, sub: 'fără zile din deviz', procent: 0 }
  }
  if (u.depasit) return { mare: `${cuZile(Number(u.bigNum.replace('+', '')))} peste termen`, sub: ziuaDin, procent }
  if (u.bigLabel === 'se preia AZI') return { mare: 'Se preia azi', sub: ziuaDin, procent }
  if (u.bigLabel.startsWith('zile decontabile')) return { mare: `${cuZile(total ?? 0)} decontabile`, sub: ziuaDin, procent }
  return { mare: `${cuZile(Number(u.bigNum))} rămase`, sub: ziuaDin, procent }
}

export interface DateDosar {
  predare: { eticheta: string; data: string }
  preluare: { eticheta: string; data: string }
}

// Cele două date de pe card și din panou: când s-a predat (sau se predă) mașina și când se preia
// (data reală a preluării, dacă e bifată; altfel termenul calculat).
export function dateDosar(d: Dosar): DateDosar {
  const rca = calculRCA(d)
  const nepredata = etapaDosar(d) === 'rezervat'
  return {
    predare: { eticheta: nepredata ? 'Predare' : 'Predat', data: fmtDate(d.start) || '—' },
    preluare: d.preluatLa
      ? { eticheta: 'Preluat', data: fmtDate(d.preluatLa) }
      : { eticheta: 'Preluare', data: fmtDate(rca.dataPreluare) || '—' },
  }
}
