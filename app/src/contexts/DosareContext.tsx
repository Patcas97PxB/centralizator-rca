import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useDosare } from '@/hooks/useDosare'
import { useServicii } from '@/hooks/useServicii'
import { filtreImplicite, filtreazaSiSorteazaDosare, type DosareFiltre } from '@/lib/dosare-filter'
import { dosareDeSunat, urgentaDosar, type DeSunat } from '@/lib/rca-calc'
import { ConflictSalvare, inlocuiesteToateDosarele } from '@/lib/dosare-storage'
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
  deSunat: DeSunat[]
  /** Arunca ConflictSalvare daca dosarul s-a schimbat in alta parte; `forteaza` suprascrie oricum. */
  salveazaDosar: (d: Dosar, forteaza?: boolean) => Promise<string>
  /** Pentru actiunile rapide (bife, status, comision): la eroare/conflict arata avertizarea si reincarca lista. */
  salveazaRapid: (d: Dosar) => Promise<void>
  /** Reincarca lista (dupa o restaurare / un conflict). */
  reimprospateaza: () => Promise<void>
  /** Mesaj de avertizare afisat sus (ex. o salvare rapida a esuat). */
  avertizare: string
  setAvertizare: (m: string) => void
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
  const { dosare, loading, error, reload: reloadDosare, reimprospateaza, salveazaDosar, stergeDosar } = useDosare(enabled)
  const [avertizare, setAvertizare] = useState('')
  const { servicii, reload: reloadServicii, salveazaServiciu, stergeServiciu } = useServicii(enabled)
  const [filtre, setFiltre] = useState<DosareFiltre>(filtreImplicite)

  const depasiteCount = useMemo(
    () => dosare.filter((d) => d.status !== 'finalizat' && urgentaDosar(d).depasit).length,
    [dosare],
  )
  const deSunat = useMemo(() => dosareDeSunat(dosare), [dosare])
  const filtrate = useMemo(() => filtreazaSiSorteazaDosare(dosare, filtre), [dosare, filtre])

  function arataDoarDepasite() {
    setFiltre({ ...filtreImplicite, doarDepasite: true, sortare: 'urgenta' })
  }

  async function salveazaRapid(d: Dosar) {
    try {
      await salveazaDosar(d)
      setAvertizare('')
    } catch (e) {
      if (e instanceof ConflictSalvare) {
        await reimprospateaza()
        setAvertizare('Dosarul a fost modificat în altă parte, așa că modificarea ta nu s-a salvat. Am reîncărcat versiunea nouă — refă modificarea.')
      } else {
        setAvertizare('Nu s-a putut salva: ' + (e instanceof Error ? e.message : 'eroare necunoscută') + '. Verifică conexiunea și încearcă din nou.')
      }
    }
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
    deSunat,
    salveazaDosar,
    salveazaRapid,
    reimprospateaza,
    avertizare,
    setAvertizare,
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
