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
  /** În dreapta rândului mare (data relevantă). */
  data: string
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
      data: d.start ? `predare ${fmtDate(d.start)}` : '',
      sub: 'nepredată',
      procent: 0,
    }
  }
  if (finalizat) {
    return { mare: 'Finalizat', data: '', sub: total ? `${cuZile(total)} decontabile` : 'închis', procent: 100 }
  }
  if (d.preluatBifat) {
    return {
      mare: 'Preluată · închide contractul',
      data: d.preluatLa ? `preluată ${fmtDate(d.preluatLa)}` : '',
      sub: total ? `${cuZile(total)} decontabile` : '',
      procent: 100,
    }
  }
  if (rca.zile === null) {
    if (u.bigNum === '?') return { mare: d.dte ? 'Ofertă de despăgubire neprimită' : 'Fără termen', data: '', sub: d.dte ? '' : rca.formula, procent: 0 }
    return { mare: `${cuZile(Number(u.bigNum))} de la predare`, data: d.start ? `predat ${fmtDate(d.start)}` : '', sub: 'fără zile din deviz', procent: 0 }
  }
  const data = rca.dataPreluare ? `termen ${fmtDate(rca.dataPreluare)}` : ''
  if (u.depasit) return { mare: `${cuZile(Number(u.bigNum.replace('+', '')))} peste termen`, data, sub: ziuaDin, procent }
  if (u.bigLabel === 'se preia AZI') return { mare: 'Se preia azi', data, sub: ziuaDin, procent }
  if (u.bigLabel.startsWith('zile decontabile')) return { mare: `${cuZile(total ?? 0)} decontabile`, data, sub: ziuaDin, procent }
  return { mare: `${cuZile(Number(u.bigNum))} rămase`, data, sub: ziuaDin, procent }
}
