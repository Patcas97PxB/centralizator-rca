import type { Dosar } from './types'

// Tot ce se scrie in dosar (de mana sau din PRELUARE DATE / contract) se salveaza cu MAJUSCULE.
// Exceptii: campurile alese din liste (asigurator, status, vehicul, clasa, service) — trebuie sa ramana
// exact ca in lista, altfel nu se mai potrivesc (filtre, rapoarte, verificarea contractului).
const CAMPURI_MAJUSCULE = ['nrDosar', 'nrRezervare', 'nrAutoPagubit', 'nrAutoInlocuire', 'marcaModel', 'marcaModelInlocuire', 'notes'] as const
export function majuscule<T extends Partial<Dosar>>(d: T): T {
  const out = { ...d }
  for (const k of CAMPURI_MAJUSCULE) {
    const v = out[k]
    if (typeof v === 'string') (out as Record<string, unknown>)[k] = v.toLocaleUpperCase('ro-RO')
  }
  return out
}
