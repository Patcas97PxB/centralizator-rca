// Portat 1:1 din index.html (functiile de calcul al termenului RCA si al zilelor
// lucratoare/sarbatorilor legale RO) — logica NU se reinterpreteaza, doar se tipizeaza.
// Sursa: index.html, sectiunile "Romanian legal holidays" si "Calcul zile conform grila
// tarifara RCA" (functiile orthodoxEasterUTC, isHoliday, businessDaysBetween, calculRCA,
// calculRCAInterna, zileRamase etc.)
import type { Dosar } from './types'

export function isoLocal(dateObj: Date): string {
  const y = dateObj.getFullYear()
  const m = String(dateObj.getMonth() + 1).padStart(2, '0')
  const z = String(dateObj.getDate()).padStart(2, '0')
  return `${y}-${m}-${z}`
}
export function todayStr(): string {
  return isoLocal(new Date())
}
export function fmtDate(d?: string | null): string {
  if (!d) return '–'
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

// ---------- Sarbatori legale RO (incl. Paste ortodox/Rusalii) ----------
function orthodoxEasterUTC(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  const julian = new Date(Date.UTC(year, month - 1, day))
  julian.setUTCDate(julian.getUTCDate() + 13) // Julian->Gregorian offset, valid 1900-2099
  return julian
}
const holidayCache: Record<number, Set<string>> = {}
function getHolidaySet(year: number): Set<string> {
  if (holidayCache[year]) return holidayCache[year]
  const set = new Set<string>()
  const key = (y: number, m: number, d: number) => `${y}-${m}-${d}`
  ;([[1, 1], [1, 2], [1, 24], [5, 1], [6, 1], [8, 15], [11, 30], [12, 1], [12, 25], [12, 26]] as const).forEach(
    ([m, d]) => set.add(key(year, m, d)),
  )
  const easter = orthodoxEasterUTC(year)
  const easterMon = new Date(easter)
  easterMon.setUTCDate(easter.getUTCDate() + 1)
  const pentecost = new Date(easter)
  pentecost.setUTCDate(easter.getUTCDate() + 49)
  const pentecostMon = new Date(easter)
  pentecostMon.setUTCDate(easter.getUTCDate() + 50)
  ;[easter, easterMon, pentecost, pentecostMon].forEach((d) =>
    set.add(key(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())),
  )
  holidayCache[year] = set
  return set
}
export function isHoliday(date: Date): boolean {
  const set = getHolidaySet(date.getFullYear())
  return set.has(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)
}

export function businessDaysBetween(startStr: string, endStr?: string | null): number {
  if (!startStr) return 0
  const start = new Date(startStr + 'T00:00:00')
  const end = endStr ? new Date(endStr + 'T00:00:00') : new Date(new Date().toDateString())
  if (end < start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6 && !isHoliday(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function colorClass(days: number): 'c-red' | 'c-yellow' | 'c-green' {
  if (days <= 0) return 'c-red'
  if (days <= 2) return 'c-yellow'
  return 'c-green'
}

export function insurerGroup(asig?: string | null): 'allianz' | 'general' | null {
  if (!asig) return null
  return asig.toLowerCase().includes('allianz') ? 'allianz' : 'general'
}

export function calendarDaysBetween(startStr: string, endStr?: string | null): number {
  if (!startStr) return 0
  const start = new Date(startStr + 'T00:00:00')
  const end = endStr ? new Date(endStr + 'T00:00:00') : new Date(new Date().toDateString())
  if (end < start) return 0
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
}
export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return isoLocal(d)
}
// Numaratoarea incepe A DOUA ZI dupa predare. Zilele din deviz sunt zile lucratoare (sar
// peste weekend/sarbatori); ziua de intrare-iesire e ziua calendaristica urmatoare.
// Returneaza cate zile libere s-au sarit in intervalul zilelor de deviz.
function weekendFreeDaysForWorkingSpan(startStr: string, workingDays: number): number {
  const cur = new Date(startStr + 'T00:00:00')
  cur.setDate(cur.getDate() + 1) // prima zi numarata e a doua zi dupa predare
  let worked = 0
  let free = 0
  while (worked < workingDays) {
    const dow = cur.getDay()
    if (dow === 0 || dow === 6 || isHoliday(cur)) free++
    else worked++
    if (worked < workingDays) cur.setDate(cur.getDate() + 1)
  }
  return free
}
// Cate zile mai poate tine clientul masina: de azi pana la data limita de preluare.
export function zileRamase(dataPreluare?: string | null): number | null {
  if (!dataPreluare) return null
  const azi = new Date(new Date().toDateString())
  const limita = new Date(dataPreluare + 'T00:00:00')
  return Math.round((limita.getTime() - azi.getTime()) / 86400000)
}
// Cate zile au trecut de la predarea masinii de inlocuire, pana la momentul actual
// (folosit cand nu exista deviz/zile introduse).
export function zileScurseDeLaPredare(startStr?: string | null): number | null {
  if (!startStr) return null
  const azi = new Date(new Date().toDateString())
  const start = new Date(startStr + 'T00:00:00')
  const diff = Math.round((azi.getTime() - start.getTime()) / 86400000)
  return diff >= 0 ? diff : null
}
// Zile decontabile reale: de a doua zi dupa predare pana la data preluarii, inclusiv.
export function zileDecontabileReale(startStr?: string | null, endStr?: string | null): number | null {
  if (!startStr || !endStr) return null
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

export interface RezultatCalculRCA {
  zile: number | null
  dataPreluare: string | null
  formula: string
  alerta?: string | null
  alertaTitle?: string
}

function calculRCAInterna(d: Dosar): RezultatCalculRCA {
  const group = insurerGroup(d.asigurator)
  if (!group) return { zile: null, dataPreluare: null, formula: 'Completează asiguratorul pentru calcul.' }

  if (d.dte) {
    const startRef = d.dataNcAr || d.start
    if (!startRef) return { zile: null, dataPreluare: null, formula: 'DTE: completează data predare sau data NC pentru calcul.' }
    const zile = calendarDaysBetween(startRef, d.dataOferta || null)
    return {
      zile,
      dataPreluare: d.dataOferta || null,
      formula: `DTE — de la ${d.dataNcAr ? 'NC' : 'predare'} până la ofertă de despăgubire${d.dataOferta ? '' : ' (în curs, ofertă neprimită încă)'}`,
    }
  }

  const vehicul = d.vehicul || 'deplasabil'
  if (vehicul === 'deplasabil') {
    const zileDeviz = Number(d.zileDeviz) || 0
    if (!zileDeviz) return { zile: null, dataPreluare: null, formula: 'Introdu zilele de lucru din deviz pentru calcul.' }
    if (!d.start) return { zile: null, dataPreluare: null, formula: 'Introdu data predare pentru calcul.' }
    const freeDays = weekendFreeDaysForWorkingSpan(d.start, zileDeviz)
    const zileTotale = zileDeviz + freeDays + 1
    const preluare = addDaysIso(d.start, zileTotale)
    const reale = zileDecontabileReale(d.start, d.end)
    return {
      zile: zileTotale,
      dataPreluare: preluare,
      formula: `${zileDeviz} zile deviz + ${freeDays} weekend/zi liberă + 1 zi intrare-ieșire`,
      alerta: reale !== null && reale > zileTotale ? `Mașina a stat ${reale} zile, cu ${reale - zileTotale} peste calcul.` : null,
    }
  }

  if (group === 'allianz') {
    const zileDeviz = Number(d.zileDeviz) || 0
    if (!zileDeviz) {
      return {
        zile: null,
        dataPreluare: null,
        formula: 'Introdu zilele de lucru din deviz pentru calcul (Allianz: 13 + deviz).',
        alerta: 'Încarcă devizul și pregătește documentele justificative.',
        alertaTitle: 'DEVIZ + DOCUMENTE JUSTIFICATIVE',
      }
    }
    if (!d.start) {
      return {
        zile: null,
        dataPreluare: null,
        formula: 'Introdu data predare pentru calcul.',
        alerta: 'Pregătește documentele justificative.',
        alertaTitle: 'DOCUMENTE JUSTIFICATIVE',
      }
    }
    const zileTotale = 13 + zileDeviz
    const reale = zileDecontabileReale(d.start, d.end)
    return {
      zile: zileTotale,
      dataPreluare: addDaysIso(d.start, zileTotale),
      formula: '13 zile + deviz (Allianz, nedeplasabil)',
      alerta:
        reale !== null && reale > zileTotale
          ? `Mașina a stat ${reale} zile, cu ${reale - zileTotale} peste calcul.`
          : 'Pregătește documentele justificative.',
      alertaTitle: 'DOCUMENTE JUSTIFICATIVE',
    }
  }

  if (!d.start) {
    return {
      zile: null,
      dataPreluare: null,
      formula: 'Introdu data predare pentru calcul.',
      alerta: 'Încarcă devizul și pregătește documentele justificative.',
      alertaTitle: 'DEVIZ + DOCUMENTE JUSTIFICATIVE',
    }
  }
  const zileDevizN = Number(d.zileDeviz) || 0
  if (!zileDevizN) {
    return {
      zile: null,
      dataPreluare: null,
      formula: 'Nedeplasabil: introdu zilele din deviz, ca să putem verifica dacă se depășesc.',
      alerta: 'Încarcă devizul și pregătește documentele justificative.',
      alertaTitle: 'DEVIZ + DOCUMENTE JUSTIFICATIVE',
    }
  }
  const norma = d.dataPolita ? (d.dataPolita >= '2025-07-01' ? 'norma18' : 'hg1326') : null

  // Acoperirea de baza data de deviz (ca la deplasabile): deviz + weekend/zile libere + 1 zi intrare-iesire
  const freeDaysN = weekendFreeDaysForWorkingSpan(d.start, zileDevizN)
  let zileAcoperite = zileDevizN + freeDaysN + 1
  let note = `${zileDevizN} zile deviz + ${freeDaysN} weekend/zi liberă + 1 zi intrare-ieșire`

  // Plafon de 30 zile de la NC/AR, doar sub HG1326/2023
  if (norma === 'hg1326' && d.dataNcAr) {
    const cutoff = addDaysIso(d.dataNcAr, 30)
    const zileLaCutoff = zileDecontabileReale(d.start, cutoff) || 0
    if (zileAcoperite > zileLaCutoff) {
      zileAcoperite = zileLaCutoff
      note += ' — LIMITAT la 30 zile de la NC/AR (HG1326/2023)'
    }
  } else if (!norma) {
    note += ' — completează data poliței pentru verificarea plafonului de 30 zile'
  }

  const reale = zileDecontabileReale(d.start, d.end)
  const depasire = reale !== null ? reale - zileAcoperite : 0
  return {
    zile: zileAcoperite,
    dataPreluare: addDaysIso(d.start, zileAcoperite),
    formula: `Nedeplasabil — acoperit de deviz: ${note}${!d.end ? ' (în curs)' : ''}`,
    alerta: depasire > 0 ? `Mașina a stat ${reale} zile, cu ${depasire} peste calcul.` : null,
  }
}

export function calculRCA(d: Dosar): RezultatCalculRCA {
  const r = calculRCAInterna(d)
  // Contractul final e sursa de adevar pentru bani — daca exista, are prioritate fata de formula din deviz.
  if (r && r.zile != null && d.zileContractFinal) {
    const zc = Number(d.zileContractFinal)
    if (zc && zc !== r.zile) {
      r.formula = `Contract final: ${zc} zile (formula din deviz dădea ${r.zile} zile — s-a folosit contractul)`
      r.zile = zc
      if (d.start) r.dataPreluare = addDaysIso(d.start, zc)
    } else if (zc) {
      r.formula += ' — confirmat de contractul final'
    }
  }
  return r
}

export interface UrgentaDosar {
  bigNum: string
  bigLabel: string
  cls: 'c-red' | 'c-yellow' | 'c-green' | 'c-albastru'
  /** true daca dosarul e peste termenul de preluare (intra la statistica "Depasite"). */
  depasit: boolean
}

// Portat din render() (index.html) — logica "numarului mare" care arata cate zile mai
// poate tine clientul masina (sau cat a durat, daca e finalizat). Determina si culoarea
// de urgenta a cardului.
export function urgentaDosar(d: Dosar): UrgentaDosar {
  const rca = calculRCA(d)
  const finalizat = d.status === 'finalizat'
  const ramase = zileRamase(rca.dataPreluare)
  const panaLaPredare = zileRamase(d.start) // > 0 => predarea e in viitor
  const viitor = !finalizat && panaLaPredare !== null && panaLaPredare > 0

  if (viitor && panaLaPredare !== null) {
    return {
      bigNum: String(panaLaPredare),
      bigLabel: panaLaPredare === 1 ? 'zi până la predare' : 'zile până la predare',
      cls: 'c-albastru',
      depasit: false,
    }
  }
  if (rca.zile === null) {
    const scurse = !d.dte ? zileScurseDeLaPredare(d.start) : null
    if (scurse !== null) {
      return {
        bigNum: String(scurse),
        bigLabel: (scurse === 1 ? 'zi de la predare' : 'zile de la predare') + ' (fără deviz)',
        cls: 'c-albastru',
        depasit: false,
      }
    }
    return {
      bigNum: '?',
      bigLabel: d.dte ? 'ofertă de despăgubire neprimită' : rca.formula,
      cls: d.dte ? 'c-red' : 'c-albastru',
      depasit: false,
    }
  }
  if (finalizat) {
    return { bigNum: String(rca.zile), bigLabel: 'zile decontabile (finalizat)', cls: 'c-green', depasit: false }
  }
  if (ramase === null) {
    return { bigNum: String(rca.zile), bigLabel: 'zile decontabile', cls: colorClass(rca.zile), depasit: false }
  }
  if (ramase < 0) {
    return {
      bigNum: '+' + Math.abs(ramase),
      bigLabel: Math.abs(ramase) === 1 ? 'zi PESTE termen' : 'zile PESTE termen',
      cls: 'c-red',
      depasit: true,
    }
  }
  if (ramase === 0) {
    return { bigNum: '0', bigLabel: 'se preia AZI', cls: 'c-red', depasit: false }
  }
  return {
    bigNum: String(ramase),
    bigLabel: ramase === 1 ? 'zi rămasă la client' : 'zile rămase la client',
    cls: colorClass(ramase),
    depasit: false,
  }
}

export interface DeSunat {
  dosar: Dosar
  /** Zile pana expira termenul (0 = azi, negativ = depasit). */
  zile: number
}

// Zile pana la termenul de preluare; null daca dosarul nu are termen activ (finalizat,
// predare in viitor sau fara deviz/zile).
export function zileLaTermen(d: Dosar): number | null {
  if (d.status === 'finalizat') return null
  const panaLaPredare = zileRamase(d.start)
  if (panaLaPredare !== null && panaLaPredare > 0) return null
  const rca = calculRCA(d)
  if (rca.zile === null) return null
  return zileRamase(rca.dataPreluare)
}

// "De sunat": dosarele care mai au cel mult 2 zile pana la termen (inclusiv cele expirate).
export function esteDeSunat(d: Dosar): boolean {
  const z = zileLaTermen(d)
  return z !== null && z <= 2
}

export function dosareDeSunat(dosare: Dosar[]): DeSunat[] {
  const out: DeSunat[] = []
  for (const dosar of dosare) {
    const zile = zileLaTermen(dosar)
    if (zile !== null && zile <= 2) out.push({ dosar, zile })
  }
  return out.sort((a, b) => a.zile - b.zile)
}
