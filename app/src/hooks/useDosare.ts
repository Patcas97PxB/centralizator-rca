import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteDosarRemote, fetchDosare, saveDosarRemote } from '@/lib/dosare-storage'
import type { Dosar } from '@/lib/types'

// Per dosar, ce versiuni (updated_at) a produs aceasta sesiune prin propriile salvari.
// O salvare bazata pe o versiune veche DE-A NOASTRA (ex. salvari automate rapide din
// modalul de documente) nu e conflict; doar o modificare venita din alta parte e.
interface UrmaSalvari {
  vechi: Set<string>
  ultima: string
  /** versiunile salvate de noi (updated_at → dosar), ca o salvare veche să se poată îmbina */
  obiecte: Map<string, Dosar>
}

const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// O salvare pornită dintr-o versiune mai veche a NOASTRĂ (ex. o acțiune rapidă dintr-un card
// randat înainte de salvarea precedentă) ar scrie tot documentul vechi și ar șterge ce s-a salvat
// între timp. Se păstrează ultima versiune și se aplică peste ea doar câmpurile schimbate în `d`
// față de versiunea din care a pornit.
function imbina(baza: Dosar, ultima: Dosar, d: Dosar): Dosar {
  const out: Record<string, unknown> = { ...ultima }
  const b = baza as unknown as Record<string, unknown>
  const n = d as unknown as Record<string, unknown>
  for (const k of new Set([...Object.keys(b), ...Object.keys(n)])) {
    if (k !== 'updatedAt' && !egal(n[k], b[k])) out[k] = n[k]
  }
  return out as unknown as Dosar
}

export function useDosare(enabled: boolean) {
  const [dosare, setDosare] = useState<Dosar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const urma = useRef(new Map<string, UrmaSalvari>())
  const coada = useRef(new Map<string, Promise<unknown>>())
  const dosareRef = useRef(dosare)
  dosareRef.current = dosare

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDosare(await fetchDosare())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare la încărcarea dosarelor.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reimprospatare linistita (fara indicator de incarcare) — cand te intorci in fila sau
  // reapare conexiunea, ca sa vezi modificarile facute pe alt dispozitiv.
  const reimprospateaza = useCallback(async () => {
    try {
      setDosare(await fetchDosare())
    } catch {
      /* ramane lista curenta */
    }
  }, [])

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

  useEffect(() => {
    if (!enabled) return
    let ultima = Date.now()
    const onVizibil = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < 15_000) return
      ultima = Date.now()
      reimprospateaza()
    }
    document.addEventListener('visibilitychange', onVizibil)
    window.addEventListener('online', reimprospateaza)
    return () => {
      document.removeEventListener('visibilitychange', onVizibil)
      window.removeEventListener('online', reimprospateaza)
    }
  }, [enabled, reimprospateaza])

  // Salvarile aceluiasi dosar ruleaza una dupa alta (nu in paralel), ca fiecare sa vada
  // versiunea lasata de precedenta.
  const salveazaDosar = useCallback(async (d: Dosar, forteaza = false): Promise<string> => {
    const precedent = coada.current.get(d.id) ?? Promise.resolve()
    const run = precedent.catch(() => {}).then(async () => {
      const u = urma.current.get(d.id)
      const dinUrma = !!(d.updatedAt && u?.vechi.has(d.updatedAt))
      const baza = dinUrma ? u!.ultima : d.updatedAt
      const obiecte = new Map(u?.obiecte)
      // versiunea de pe server din care pornește prima salvare (cea din listă, încă nemodificată)
      if (d.updatedAt && !obiecte.has(d.updatedAt)) {
        const dinLista = dosareRef.current.find((x) => x.id === d.id)
        if (dinLista?.updatedAt === d.updatedAt) obiecte.set(d.updatedAt, dinLista)
      }
      const vecheA = dinUrma ? obiecte.get(d.updatedAt!) : undefined
      const ultimaA = dinUrma ? obiecte.get(u!.ultima) : undefined
      const deSalvat = vecheA && ultimaA ? imbina(vecheA, ultimaA, d) : d
      const updatedAt = await saveDosarRemote(deSalvat, baza, forteaza)
      const vechi = new Set(u?.vechi)
      if (baza) vechi.add(baza)
      if (d.updatedAt) vechi.add(d.updatedAt)
      const next = { ...deSalvat, updatedAt }
      obiecte.set(updatedAt, next)
      while (obiecte.size > 12) obiecte.delete(obiecte.keys().next().value!)
      urma.current.set(d.id, { vechi, ultima: updatedAt, obiecte })
      setDosare((prev) => {
        const idx = prev.findIndex((x) => x.id === d.id)
        if (idx === -1) return [next, ...prev]
        const copy = prev.slice()
        copy[idx] = next
        return copy
      })
      return updatedAt
    })
    coada.current.set(d.id, run)
    return run
  }, [])

  const stergeDosar = useCallback(async (id: string) => {
    await deleteDosarRemote(id)
    urma.current.delete(id)
    setDosare((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { dosare, loading, error, reload, reimprospateaza, salveazaDosar, stergeDosar }
}
