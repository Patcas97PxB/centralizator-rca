import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteDosarRemote, fetchDosare, saveDosarRemote } from '@/lib/dosare-storage'
import type { Dosar } from '@/lib/types'

// Per dosar, ce versiuni (updated_at) a produs aceasta sesiune prin propriile salvari.
// O salvare bazata pe o versiune veche DE-A NOASTRA (ex. salvari automate rapide din
// modalul de documente) nu e conflict; doar o modificare venita din alta parte e.
interface UrmaSalvari {
  vechi: Set<string>
  ultima: string
}

export function useDosare(enabled: boolean) {
  const [dosare, setDosare] = useState<Dosar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const urma = useRef(new Map<string, UrmaSalvari>())
  const coada = useRef(new Map<string, Promise<unknown>>())

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
      const baza = d.updatedAt && u?.vechi.has(d.updatedAt) ? u.ultima : d.updatedAt
      const updatedAt = await saveDosarRemote(d, baza, forteaza)
      const vechi = new Set(u?.vechi)
      if (baza) vechi.add(baza)
      if (d.updatedAt) vechi.add(d.updatedAt)
      urma.current.set(d.id, { vechi, ultima: updatedAt })
      setDosare((prev) => {
        const next = { ...d, updatedAt }
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
