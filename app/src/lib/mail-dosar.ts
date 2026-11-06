import { ETICHETE_VECHI } from './documente'
import type { Dosar } from './types'

// Unealta „Creare mail” (04.11.2026, cererea utilizatorului): doar subiectul și textul mailului către asigurator,
// după modelul lui (destinatarii și CC-ul le pune el). Ce documente are dosarul → „Am atașat următoarele
// documente”, ce lipsește → „Necesar”. Fiecare rând se poate muta de mână (atașat / necesar / scos).

export type StareRand = 'atasat' | 'necesar' | 'scos'

/** Rândurile din mail, în ordinea din modelul utilizatorului, și tipul de document din aplicație de care țin.
 * RCA și talonul vinovatului sunt în aplicație la „Documente vinovat”; Termeni și condiții + GDPR se semnează
 * cu contractul, deci țin de contract. */
export const RANDURI_MAIL: { text: string; cheie: string }[] = [
  { text: 'NC', cheie: 'nc' },
  { text: 'DEVIZ', cheie: 'deviz' },
  { text: 'DOCUMENTE VINOVAT', cheie: 'doc_vinovat' },
  { text: 'DOCUMENTE PAGUBIT', cheie: 'doc_pagubit' },
  { text: 'RCA VINOVAT', cheie: 'doc_vinovat' },
  { text: 'TALON VINOVAT', cheie: 'doc_vinovat' },
  { text: 'AMIABILA', cheie: 'amiabila' },
  { text: 'CERERE DESPĂGUBIRE', cheie: 'cerere_despagubire' },
  { text: 'CESIUNE CREANTA', cheie: 'cesiune' },
  { text: 'DOCUMENT INTRARE - IEȘIRE', cheie: 'intrare_iesire' },
  { text: 'CONTRACT', cheie: 'contract' },
  { text: 'PV', cheie: 'pv_predare' },
  { text: 'TERMENI ȘI CONDIȚII', cheie: 'contract' },
  { text: 'GDPR', cheie: 'contract' },
]

/** Tipurile de documente prezente (bifate în dosar + găsite în folderul de pe laptop + contractul citit). */
export function tipuriPrezente(d: Dosar, locale: string[] = []): Set<string> {
  const docs = Array.isArray(d.documente) ? d.documente : []
  const s = new Set([...docs.map((x) => ETICHETE_VECHI[x.eticheta] ?? x.eticheta), ...locale])
  if (d.contractFinalIncarcat || d.zileContractFinal) s.add('contract')
  return s
}

/** Starea propusă pentru fiecare rând: prezent → atașat, „nu se aplică” → scos, altfel necesar. */
export function stariDinDosar(d: Dosar | null, locale: string[] = []): StareRand[] {
  if (!d) return RANDURI_MAIL.map(() => 'necesar')
  const prezente = tipuriPrezente(d, locale)
  const optionale = Array.isArray(d.etichetaOptionale) ? d.etichetaOptionale : []
  return RANDURI_MAIL.map((r) => (prezente.has(r.cheie) ? 'atasat' : r.cheie !== 'contract' && optionale.includes(r.cheie) ? 'scos' : 'necesar'))
}

export interface CampuriMail {
  subiect: string
  nrDosar: string
  model: string
  proprietar: string
  stare: string
  lead: string
  obs: string
}

const MARE = (s?: string | null) => (s ?? '').trim().toLocaleUpperCase('ro-RO')

export function campuriDinDosar(d: Dosar | null, agentie: string, lead: string): CampuriMail {
  if (!d) return { subiect: '', nrDosar: '', model: '', proprietar: '', stare: '', lead, obs: '' }
  // „BH27MLN/ RCA/ RA23/BH/26/33238616/ ASIROM ORADEA”
  const subiect = [MARE(d.nrAutoPagubit), 'RCA', MARE(d.nrDosar), [MARE(d.asigurator), MARE(agentie)].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join('/ ')
  return {
    subiect,
    nrDosar: MARE(d.nrDosar),
    model: MARE(d.marcaModel),
    proprietar: MARE(d.proprietarPagubit || d.numeClient),
    stare: d.vehicul === 'nedeplasabil' ? 'NEDEPLASABILA' : 'DEPLASABILA',
    // Lead = service-ul ales în dosar (06.11.2026); fără service, valoarea obișnuită (WALK IN)
    lead: MARE(d.service) || lead,
    obs: '',
  }
}

const SALUT = 'Buna,'
const CERERE = 'Va rog sa ne spuneți dacă sunt in regula documentele si dacă putem oferi masina de inlocuire pentru aceasta solicitare si pe ce perioada.'

function liste(stari: StareRand[]) {
  return {
    atasate: RANDURI_MAIL.filter((_, i) => stari[i] === 'atasat').map((r) => r.text),
    necesare: RANDURI_MAIL.filter((_, i) => stari[i] === 'necesar').map((r) => r.text),
  }
}

const RANDURI_DATE = (c: CampuriMail): [string, string][] => [
  ['Dosar daună nr.:', c.nrDosar],
  ['Model masina:', c.model],
  ['Proprietar talon:', c.proprietar],
  ['Stare mașină:', c.stare],
  ['Lead:', c.lead],
  ['Obs.:', c.obs],
]

/** Textul simplu (și pentru previzualizare). */
export function textMail(c: CampuriMail, stari: StareRand[]): string {
  const { atasate, necesare } = liste(stari)
  const parti = [SALUT, CERERE, RANDURI_DATE(c).map(([e, v]) => `${e} ${v}`.trimEnd()).join('\n')]
  if (atasate.length) parti.push('Am atașat următoarele documente:\n' + atasate.map((x) => '• ' + x).join('\n'))
  if (necesare.length) parti.push('Necesar:\n' + necesare.map((x) => '• ' + x).join('\n'))
  return parti.join('\n\n')
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Varianta formatată (bold, subliniat, liste), ca în mailurile utilizatorului — se lipește așa în Gmail. */
export function htmlMail(c: CampuriMail, stari: StareRand[]): string {
  const { atasate, necesare } = liste(stari)
  const ul = (xs: string[]) => '<ul>' + xs.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>'
  let h = `<div style="font-family:Arial,sans-serif;font-size:13px">`
  h += `<p>${SALUT}</p><p>${esc(CERERE)}</p>`
  // ca în modelul utilizatorului: la „Lead” e îngroșată și valoarea („Lead: WALK IN” tot bold)
  h += '<p>' + RANDURI_DATE(c).map(([e, v]) => (e === 'Lead:' ? `<b>${esc(e)} ${esc(v)}</b>` : `<b>${esc(e)}</b> ${esc(v)}`)).join('<br>') + '</p>'
  if (atasate.length) h += `<p><b><u>Am atașat următoarele documente</u></b>:</p>${ul(atasate)}`
  if (necesare.length) h += `<p><b><u>Necesar</u></b>:</p>${ul(necesare)}`
  return h + '</div>'
}
