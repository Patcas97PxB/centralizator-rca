import { supabase } from './supabase'
import { ESTE_DEMO, demoDosare, demoInlocuiesteDosare, demoSalveazaDosar, demoStergeDosar } from './demo'
import { normalizeazaDosar, type Dosar } from './types'

// Tabelul `dosare` (un rand per dosar, coloana `data` jsonb + `updated_at`) a fost creat
// la pasul anterior (supabase/migrations/20260921120000_dosare_servicii_per_row.sql).
// Fiecare mutatie stie exact ce dosar s-a schimbat, deci scrie/sterge doar randul lui.
//
// Protectie la suprascriere: o salvare a unui dosar existent reuseste doar daca randul din
// baza de date are inca `updated_at`-ul pe care l-a vazut aplicatia cand a incarcat dosarul.
// Daca intre timp l-a modificat altcineva (alt telefon/PC), salvarea e refuzata cu
// `ConflictSalvare`, ca sa nu stearga tacit modificarile celuilalt.

interface DosarRow {
  id: string
  data: Omit<Dosar, 'updatedAt'>
  updated_at: string
}

export class ConflictSalvare extends Error {
  constructor() {
    super('Dosarul a fost modificat în altă parte (alt dispozitiv sau altă filă) după ce l-ai deschis.')
    this.name = 'ConflictSalvare'
  }
}

export async function fetchDosare(): Promise<Dosar[]> {
  if (ESTE_DEMO) return (await demoDosare()).map(normalizeazaDosar)
  const { data, error } = await supabase.from('dosare').select('id, data, updated_at')
  if (error) throw error
  return (data as DosarRow[]).map((r) => normalizeazaDosar({ ...r.data, id: r.id, updatedAt: r.updated_at }))
}

/**
 * `baza` = `updated_at` pe care s-a bazat modificarea (undefined = dosar nou).
 * `forteaza` = suprascrie oricum (alegerea explicita a utilizatorului, sau restaurare).
 */
export async function saveDosarRemote(d: Dosar, baza: string | undefined, forteaza = false): Promise<string> {
  if (ESTE_DEMO) return demoSalveazaDosar(d)
  const { updatedAt: _updatedAt, ...rest } = d
  const updated_at = new Date().toISOString()
  if (forteaza) {
    const { error } = await supabase.from('dosare').upsert({ id: d.id, data: rest, updated_at })
    if (error) throw error
  } else if (baza === undefined) {
    const { error } = await supabase.from('dosare').insert({ id: d.id, data: rest, updated_at })
    if (error) throw error.code === '23505' ? new ConflictSalvare() : error
  } else {
    const { data, error } = await supabase
      .from('dosare')
      .update({ data: rest, updated_at })
      .eq('id', d.id)
      .eq('updated_at', baza)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) throw new ConflictSalvare()
  }
  return updated_at
}

export async function deleteDosarRemote(id: string): Promise<void> {
  if (ESTE_DEMO) return demoStergeDosar(id)
  const { error } = await supabase.from('dosare').delete().eq('id', id)
  if (error) throw error
}

// Import de backup: utilizatorul confirma explicit ca vrea sa inlocuiasca TOT ce e salvat,
// deci aici (doar aici) e corect sa stergem si randurile ramase care nu mai apar in lista noua.
// Dosarele sterse/suprascrise raman recuperabile din „Recuperare" (istoric din baza de date).
export async function inlocuiesteToateDosarele(listaNoua: Dosar[]): Promise<void> {
  if (ESTE_DEMO) return demoInlocuiesteDosare(listaNoua)
  const { data, error } = await supabase.from('dosare').select('id')
  if (error) throw error
  const idNoi = new Set(listaNoua.map((d) => d.id))
  const deSters = (data ?? []).map((r) => r.id).filter((id) => !idNoi.has(id))
  if (deSters.length) {
    const { error: delErr } = await supabase.from('dosare').delete().in('id', deSters)
    if (delErr) throw delErr
  }
  for (const d of listaNoua) await saveDosarRemote(d, undefined, true)
}

export interface IntrareIstoric {
  id: number
  dosarId: string
  op: 'update' | 'delete'
  creat: string
  dosar: Dosar
}

// Citeste istoricul (tabelul `dosare_istoric`, umplut de trigger — vezi migrarea
// 20261003120000_dosare_istoric.sql). `sters` = dosarul nu mai exista in tabelul `dosare`.
export async function fetchIstoric(): Promise<{ intrari: IntrareIstoric[]; idExistente: Set<string> }> {
  if (ESTE_DEMO) return { intrari: [], idExistente: new Set() }
  const [ist, ex] = await Promise.all([
    supabase.from('dosare_istoric').select('id, dosar_id, op, data, created_at').order('id', { ascending: false }).limit(400),
    supabase.from('dosare').select('id'),
  ])
  if (ist.error) throw ist.error
  if (ex.error) throw ex.error
  const intrari = (ist.data as { id: number; dosar_id: string; op: 'update' | 'delete'; data: Dosar; created_at: string }[]).map((r) => ({
    id: r.id,
    dosarId: r.dosar_id,
    op: r.op,
    creat: r.created_at,
    dosar: normalizeazaDosar({ ...r.data, id: r.dosar_id }),
  }))
  return { intrari, idExistente: new Set((ex.data ?? []).map((r) => r.id as string)) }
}
