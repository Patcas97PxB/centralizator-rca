import { useCallback, useEffect, useState } from 'react'
import { deleteDosarRemote, fetchDosare, saveDosarRemote } from '@/lib/dosare-storage'
import type { Dosar } from '@/lib/types'

export function useDosare(enabled: boolean) {
  const [dosare, setDosare] = useState<Dosar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    if (enabled) reload()
  }, [enabled, reload])

  const salveazaDosar = useCallback(async (d: Dosar) => {
    const updatedAt = await saveDosarRemote(d)
    setDosare((prev) => {
      const next = { ...d, updatedAt }
      const idx = prev.findIndex((x) => x.id === d.id)
      if (idx === -1) return [next, ...prev]
      const copy = prev.slice()
      copy[idx] = next
      return copy
    })
  }, [])

  const stergeDosar = useCallback(async (id: string) => {
    await deleteDosarRemote(id)
    setDosare((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { dosare, loading, error, reload, salveazaDosar, stergeDosar }
}
