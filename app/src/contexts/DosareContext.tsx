import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useDosare } from '@/hooks/useDosare'
import { useServicii } from '@/hooks/useServicii'
import { filtreImplicite, filtreazaSiSorteazaDosare, type DosareFiltre } from '@/lib/dosare-filter'
import { urgentaDosar } from '@/lib/rca-calc'
import { inlocuiesteToateDosarele } from '@/lib/dosare-storage'
import { inlocuiesteToateServiciile } from '@/lib/servicii-storage'
import type { BackupPayload } from '@/lib/backup'
import type { Dosar, Serviciu } from '@/lib/types'

interface DosareContextValue {
  dosare: Dosar[]
  filtrate: Dosar[]
  servicii: Serviciu[]
  loading: boolean
  error: string | null
  filtre: DosareFiltre
  setFiltre: (f: DosareFiltre) => void
  arataDoarDepasite: () => void
  depasiteCount: number
  salveazaDosar: (d: Dosar) => Promise<void>
  stergeDosar: (id: string) => Promise<void>
  salveazaServiciu: (s: Serviciu) => Promise<void>
  stergeServiciu: (id: string) => Promise<void>
  importaBackup: (payload: BackupPayload) => Promise<void>
}

const DosareContext = createContext<DosareContextValue | null>(null)

// O singura sursa de adevar pentru datele de dosare + filtrele curente — atat pagina
// Dosare RCA cat si clopotelul de notificari din Header (care are nevoie de numarul de
// dosare depasite) citesc din acelasi loc, in loc sa se transmita valori intre ele in
// timpul randarii.
export function DosareProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { dosare, loading, error, reload: reloadDosare, salveazaDosar, stergeDosar } = useDosare(enabled)
  const { servicii, reload: reloadServicii, salveazaServiciu, stergeServiciu } = useServicii(enabled)
  const [filtre, setFiltre] = useState<DosareFiltre>(filtreImplicite)

  const depasiteCount = useMemo(
    () => dosare.filter((d) => d.status !== 'finalizat' && urgentaDosar(d).depasit).length,
    [dosare],
  )
  const filtrate = useMemo(() => filtreazaSiSorteazaDosare(dosare, filtre), [dosare, filtre])

  function arataDoarDepasite() {
    setFiltre({ ...filtreImplicite, doarDepasite: true, sortare: 'urgenta' })
  }

  async function importaBackup(payload: BackupPayload) {
    await inlocuiesteToateDosarele(payload.dosare)
    await inlocuiesteToateServiciile(payload.servicii)
    await Promise.all([reloadDosare(), reloadServicii()])
  }

  const value: DosareContextValue = {
    dosare,
    filtrate,
    servicii,
    loading,
    error,
    filtre,
    setFiltre,
    arataDoarDepasite,
    depasiteCount,
    salveazaDosar,
    stergeDosar,
    salveazaServiciu,
    stergeServiciu,
    importaBackup,
  }
  return <DosareContext.Provider value={value}>{children}</DosareContext.Provider>
}

export function useDosareContext() {
  const ctx = useContext(DosareContext)
  if (!ctx) throw new Error('useDosareContext must be used inside DosareProvider')
  return ctx
}
