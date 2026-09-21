import { useCallback, useEffect, useState } from 'react'
import { deleteServiciuRemote, fetchServicii, saveServiciuRemote } from '@/lib/servicii-storage'
import type { Serviciu } from '@/lib/types'

export function useServicii(enabled: boolean) {
  const [servicii, setServicii] = useState<Serviciu[]>([])

  const reload = useCallback(async () => {
    setServicii(await fetchServicii())
  }, [])

  useEffect(() => {
    if (enabled) reload().catch(() => setServicii([]))
  }, [enabled, reload])

  const salveazaServiciu = useCallback(async (s: Serviciu) => {
    await saveServiciuRemote(s)
    setServicii((prev) => {
      const idx = prev.findIndex((x) => x.id === s.id)
      if (idx === -1) return [s, ...prev]
      const copy = prev.slice()
      copy[idx] = s
      return copy
    })
  }, [])

  const stergeServiciu = useCallback(async (id: string) => {
    await deleteServiciuRemote(id)
    setServicii((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return { servicii, reload, salveazaServiciu, stergeServiciu }
}
