import type { Dosar } from './types'

// Tot ce se scrie in dosar (de mana sau din PRELUARE DATE / contract) se salveaza cu MAJUSCULE.
// Exceptii: campurile alese din liste (asigurator, status, vehicul, clasa, service) — trebuie sa ramana
// exact ca in lista, altfel nu se mai potrivesc (filtre, rapoarte, verificarea contractului).
const CAMPURI_MAJUSCULE = ['nrDosar', 'nrRezervare', 'nrAutoPagubit', 'nrAutoInlocuire', 'marcaModel', 'marcaModelInlocuire', 'proprietarPagubit', 'notes'] as const
export function majuscule<T extends Partial<Dosar>>(d: T): T {
  const out = { ...d }
  for (const k of CAMPURI_MAJUSCULE) {
    const v = out[k]
    if (typeof v === 'string') (out as Record<string, unknown>)[k] = v.toLocaleUpperCase('ro-RO')
  }
  return out
}

// Acelasi format peste tot (cerinta utilizatorului): nr. auto romanesc fara spatii/cratime („B83ATN"),
// nr. rezervare cu prefix „RBH 29851". Ce nu arata a nr. RO / a RBH ramane cum a fost scris.
// Comparatiile cu contractul/folderul de pe laptop normalizeaza oricum (normPlate, cifre, normAuto).
const RE_NR_RO = /^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/
export function formatNrAuto(v: string): string {
  const c = v.toLocaleUpperCase('ro-RO').replace(/[\s-]/g, '')
  return RE_NR_RO.test(c) ? c : v
}
export function formatRbh(v: string): string {
  const m = v.trim().match(/^(?:RBH)?[\s/-]*(\d+)$/i)
  return m ? `RBH ${m[1]}` : v
}
export function formatCanonic<T extends Partial<Dosar>>(d: T): T {
  const out = { ...d }
  if (typeof out.nrAutoPagubit === 'string') out.nrAutoPagubit = formatNrAuto(out.nrAutoPagubit)
  if (typeof out.nrAutoInlocuire === 'string') out.nrAutoInlocuire = formatNrAuto(out.nrAutoInlocuire)
  if (typeof out.nrRezervare === 'string') out.nrRezervare = formatRbh(out.nrRezervare)
  return out
}
