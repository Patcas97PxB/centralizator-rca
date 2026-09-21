import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { filtreImplicite } from '@/lib/dosare-filter'
import { exportDosareXlsx } from '@/lib/xlsx-export'
import type { Dosar } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsRow } from './StatsRow'
import { FilterBar } from './FilterBar'
import { DosarCard } from './DosarCard'
import { DosarFormModal } from './DosarFormModal'
import { ActivitateRecenta } from '../panel/ActivitateRecenta'
import { StatisticiRapide } from '../panel/StatisticiRapide'
import { SuportWidget } from '../panel/SuportWidget'

export function DosarePage() {
  const {
    dosare, filtrate, servicii, loading, error, filtre, setFiltre,
    depasiteCount, salveazaDosar, stergeDosar,
  } = useDosareContext()
  const [modalDeschis, setModalDeschis] = useState(false)
  const [dosarActiv, setDosarActiv] = useState<Dosar | null>(null)

  const activeCount = dosare.filter((d) => d.status !== 'finalizat').length
  const inAsteptareCount = dosare.filter((d) => d.status === 'in_asteptare').length

  function deschideNou() {
    setDosarActiv(null)
    setModalDeschis(true)
  }
  function deschideEditare(id: string) {
    setDosarActiv(dosare.find((x) => x.id === id) ?? null)
    setModalDeschis(true)
  }
  async function onStatusChange(id: string, status: Dosar['status']) {
    const d = dosare.find((x) => x.id === id)
    if (d) await salveazaDosar({ ...d, status })
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6 md:py-6">
      <div className="mb-5 md:hidden">
        <h2 className="text-xl font-bold text-foreground">Dosare RCA</h2>
        <p className="text-sm text-muted-foreground">Monitorizează în timp real toate dosarele tale.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <StatsRow
            active={activeCount}
            total={dosare.length}
            depasite={depasiteCount}
            inAsteptare={inAsteptareCount}
            onExport={() => exportDosareXlsx(filtrate)}
          />

          <div className="rounded-2xl border border-border bg-card p-3">
            <FilterBar filtre={filtre} onChange={setFiltre} servicii={servicii} />
          </div>

          {filtre.doarDepasite && (
            <div className="flex items-center justify-between rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
              <span>Arăt doar dosarele depășite.</span>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-warning hover:text-warning" onClick={() => setFiltre(filtreImplicite)}>
                <X className="size-3.5" aria-hidden="true" />
                Renunță
              </Button>
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : filtrate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Niciun dosar nu corespunde filtrelor curente.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtrate.map((d) => (
                <DosarCard key={d.id} dosar={d} onStatusChange={onStatusChange} onDeschide={deschideEditare} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Button onClick={deschideNou} className="hidden w-full gap-2 lg:flex">
            <Plus className="size-4" aria-hidden="true" />
            Dosar nou
          </Button>
          <ActivitateRecenta dosare={dosare} />
          <StatisticiRapide dosare={dosare} />
          <SuportWidget />
        </div>
      </div>

      <button
        type="button"
        onClick={deschideNou}
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 lg:hidden"
        aria-label="Dosar nou"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      <DosarFormModal
        open={modalDeschis}
        dosar={dosarActiv}
        servicii={servicii}
        onClose={() => setModalDeschis(false)}
        onSave={salveazaDosar}
        onDelete={stergeDosar}
      />
    </div>
  )
}
