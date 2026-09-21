import { supabase } from './supabase'
import type { Serviciu } from './types'

export async function fetchServicii(): Promise<Serviciu[]> {
  const { data, error } = await supabase.from('servicii').select('id, data')
  if (error) throw error
  return (data as { id: string; data: Serviciu }[]).map((r) => ({ ...r.data, id: r.id }))
}

export async function saveServiciuRemote(s: Serviciu): Promise<void> {
  const { error } = await supabase.from('servicii').upsert({ id: s.id, data: s, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function deleteServiciuRemote(id: string): Promise<void> {
  const { error } = await supabase.from('servicii').delete().eq('id', id)
  if (error) throw error
}

// Import de backup: la fel ca la dosare, aici (si doar aici) e corect sa stergem randurile
// ramase care nu mai apar in lista noua.
export async function inlocuiesteToateServiciile(listaNoua: Serviciu[]): Promise<void> {
  const { data, error } = await supabase.from('servicii').select('id')
  if (error) throw error
  const idNoi = new Set(listaNoua.map((s) => s.id))
  const deSters = (data ?? []).map((r) => r.id).filter((id) => !idNoi.has(id))
  if (deSters.length) {
    const { error: delErr } = await supabase.from('servicii').delete().in('id', deSters)
    if (delErr) throw delErr
  }
  for (const s of listaNoua) await saveServiciuRemote(s)
}
