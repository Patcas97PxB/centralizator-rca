import { supabase } from './supabase'
import { normalizeazaDosar, type Dosar } from './types'

// Tabelul `dosare` (un rand per dosar, coloana `data` jsonb + `updated_at`) a fost creat
// la pasul anterior (supabase/migrations/20260921120000_dosare_servicii_per_row.sql).
// Site-ul vechi (index.html) migreaza automat, o singura data, datele ramase in blob-ul
// vechi `app_storage` — noua aplicatie presupune ca migrarea aia a rulat deja (site-ul
// vechi ramane live pana la cutover) si vorbeste direct cu tabelul nou, fara sa reia
// migrarea. Spre deosebire de index.html (care reface la fiecare salvare tot array-ul
// local), aici fiecare mutatie stie exact ce dosar s-a schimbat, deci scrie/sterge doar
// randul lui — nu mai e nevoie de trucul "rescrie tot ce stii local" din pasul anterior.

interface DosarRow {
  id: string
  data: Omit<Dosar, 'updatedAt'>
  updated_at: string
}

export async function fetchDosare(): Promise<Dosar[]> {
  const { data, error } = await supabase.from('dosare').select('id, data, updated_at')
  if (error) throw error
  return (data as DosarRow[]).map((r) => normalizeazaDosar({ ...r.data, id: r.id, updatedAt: r.updated_at }))
}

export async function saveDosarRemote(d: Dosar): Promise<string> {
  const { updatedAt: _updatedAt, ...rest } = d
  const updated_at = new Date().toISOString()
  const { error } = await supabase.from('dosare').upsert({ id: d.id, data: rest, updated_at })
  if (error) throw error
  return updated_at
}

export async function deleteDosarRemote(id: string): Promise<void> {
  const { error } = await supabase.from('dosare').delete().eq('id', id)
  if (error) throw error
}

// Import de backup: utilizatorul confirma explicit ca vrea sa inlocuiasca TOT ce e salvat,
// deci aici (doar aici) e corect sa stergem si randurile ramase care nu mai apar in lista noua.
export async function inlocuiesteToateDosarele(listaNoua: Dosar[]): Promise<void> {
  const { data, error } = await supabase.from('dosare').select('id')
  if (error) throw error
  const idNoi = new Set(listaNoua.map((d) => d.id))
  const deSters = (data ?? []).map((r) => r.id).filter((id) => !idNoi.has(id))
  if (deSters.length) {
    const { error: delErr } = await supabase.from('dosare').delete().in('id', deSters)
    if (delErr) throw delErr
  }
  for (const d of listaNoua) await saveDosarRemote(d)
}
