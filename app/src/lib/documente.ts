// Portat 1:1 din index.html (DOCUMENT_LABELS, docStatus, docLabelText) — nu se schimba
// setul de etichete sau regula de "documente complete", doar se tipizeaza.
import type { Dosar } from './types'

export const DOCUMENT_LABELS = [
  { key: 'nc', label: 'Notă constatare (NC)' },
  { key: 'deviz', label: 'Deviz' },
  { key: 'doc_pagubit', label: 'Documente păgubit (permis/buletin/talon/RCA)' },
  { key: 'doc_vinovat', label: 'Documente vinovat (permis/buletin/talon/RCA)' },
  { key: 'amiabila', label: 'Amiabilă / PV poliție' },
  { key: 'cesiune', label: 'Cesiune creanță (CC)' },
  { key: 'cerere_despagubire', label: 'Cerere despăgubire (CD)' },
  // Cheia ramane 'contract' (compatibilitate cu datele existente), dar e "Contract final" — obligatoriu.
  { key: 'contract', label: 'Contract final' },
  { key: 'pv_predare', label: 'PV predare/primire' },
  { key: 'intrare_iesire', label: 'Document intrare-ieșire' },
  { key: 'altele', label: 'Altele' },
] as const

// RCA vinovat / RCA pagubit nu mai sunt tipuri separate: intra la documentele partii respective.
export const ETICHETE_VECHI: Record<string, string> = {
  rca_vinovat: 'doc_vinovat',
  rca_pagubit: 'doc_pagubit',
}

// Etichete care intra in calculul "X/Y documente" — intrare_iesire si altele se urmaresc
// separat, nu conteaza la total.
export const DOCUMENT_LABELS_NUMARATE = DOCUMENT_LABELS.filter(
  (l) => l.key !== 'intrare_iesire' && l.key !== 'altele',
).map((l) => l.key)

export interface DocStatus {
  have: number
  total: number
  missing: string[]
  intrareIesirePrezent: boolean
  complete: boolean
}

type DocInput = Pick<Dosar, 'documente' | 'etichetaOptionale'> & Partial<Pick<Dosar, 'contractFinalIncarcat' | 'zileContractFinal'>>

export function docStatus(d: DocInput): DocStatus {
  const docs = Array.isArray(d.documente) ? d.documente : []
  const optionale = Array.isArray(d.etichetaOptionale) ? d.etichetaOptionale : []
  const prezente = new Set(docs.map((x) => ETICHETE_VECHI[x.eticheta] ?? x.eticheta))
  // Contractul final se considera prezent si cand a fost preluat prin "Contract final" din formular.
  if (d.contractFinalIncarcat || d.zileContractFinal) prezente.add('contract')
  // Contractul final e mereu obligatoriu (nu se poate marca "nu se aplica").
  const necesare = DOCUMENT_LABELS_NUMARATE.filter((k) => k === 'contract' || !optionale.includes(k))
  const have = necesare.filter((k) => prezente.has(k)).length
  const missing = necesare.filter((k) => !prezente.has(k))
  const intrareIesirePrezent = prezente.has('intrare_iesire')
  return { have, total: necesare.length, missing, intrareIesirePrezent, complete: missing.length === 0 }
}

// Ce lipseste ca un dosar sa poata fi marcat "Finalizat": documentele obligatorii + contractul final.
export function lipsuriFinalizare(d: DocInput): string[] {
  return docStatus(d).missing.map(docLabelText)
}

export function docLabelText(key: string): string {
  const l = DOCUMENT_LABELS.find((x) => x.key === key)
  return l ? l.label : key
}

// Portat 1:1 din detectAllDocLabels() (index.html) — detecteaza TOATE etichetele care se
// potrivesc numelui unui fisier (un singur PDF poate contine mai multe documente, ex.
// "CC+CD+PV predare+contract.pdf" -> bifeaza automat toate, nu doar prima gasita).
export function detectAllDocLabels(nume: string): string[] {
  const nLower = (nume || '').toLowerCase()
  const tokens = (nume || '').toUpperCase().split(/[^A-Z0-9ĂÂÎȘȚ]+/).filter(Boolean)
  const found = new Set<string>()
  const ABBR: Record<string, string> = { CC: 'cesiune', CD: 'cerere_despagubire', PV: 'pv_predare', NC: 'nc' }
  tokens.forEach((t) => { if (ABBR[t]) found.add(ABBR[t]) })
  if (/\bnc\d*\b|nota.*constat|constatare/.test(nLower)) found.add('nc')
  if (/deviz/.test(nLower)) found.add('deviz')
  if (/rca.*vinovat|vinovat.*rca/.test(nLower)) found.add('doc_vinovat')
  if (/rca.*pagubit|pagubit.*rca/.test(nLower)) found.add('doc_pagubit')
  if (/amiabil|pv.*politie|politie/.test(nLower)) found.add('amiabila')
  if (/cesiune/.test(nLower)) found.add('cesiune')
  if (/cerere.*despagub/.test(nLower)) found.add('cerere_despagubire')
  if (/pv.*predare|predare.*primire|proces.*verbal/.test(nLower)) found.add('pv_predare')
  if (/contract/.test(nLower)) found.add('contract')
  if (/\bdoc\b.*iesire|iesire.*intrare|intrare.*iesire/.test(nLower)) found.add('intrare_iesire')
  // Documente de identitate/talon — permis, buletin, pasaport, talon (fara sa fie deja RCA) — pe pagubit sau vinovat.
  const identitateSauTalon = /permis|buletin|pasaport|\btalon\b/.test(nLower)
  const ziceVinovat = /vinovat/.test(nLower)
  const zicePagubit = /pagubit/.test(nLower)
  if (identitateSauTalon || /\bdoc\b/.test(nLower)) {
    if (ziceVinovat && !zicePagubit) found.add('doc_vinovat')
    else if (zicePagubit || identitateSauTalon) found.add('doc_pagubit') // implicit: pagubit, daca nu se specifica partea
  }
  if (!found.size) found.add('altele')
  return [...found]
}
export function guessDocLabel(nume: string): string {
  return detectAllDocLabels(nume)[0]
}
