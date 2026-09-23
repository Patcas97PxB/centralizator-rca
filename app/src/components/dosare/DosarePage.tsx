import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { filtreImplicite } from '@/lib/dosare-filter'
import { exportDosareXlsx } from '@/lib/xlsx-export'
import type { Dosar } from '@/lib/types'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { staggerDelay } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LegendaCulori } from './LegendaCulori'
import { FilterBar } from './FilterBar'
import { DosarCard } from './DosarCard'
import { DosarFormModal } from './DosarFormModal'
import { ScanDevizCard } from './ScanDevizCard'
import { ModificarPdfCard } from './ModificarPdfCard'
import { ActivitateRecenta } from '../panel/ActivitateRecenta'
import { StatisticiRapide } from '../panel/StatisticiRapide'

export function DosarePage() {
  const {
    dosare, filtrate, servicii, loading, error, filtre, setFiltre,
    salveazaDosar, stergeDosar,
  } = useDosareContext()
  const [modalDeschis, setModalDeschis] = useState(false)
  const [dosarActiv, setDosarActiv] = useState<Dosar | null>(null)
  const [initialDraft, setInitialDraft] = useState<Partial<Dosar> | null>(null)

  function deschideNou() {
    setDosarActiv(null)
    setInitialDraft(null)
    setModalDeschis(true)
  }
  function onDevizScanat(an: AnalizaDeviz) {
    setDosarActiv(null)
    setInitialDraft({ zileDeviz: String(an.total), zileDevizExplicatie: an.explicatie, zileDevizFormula: an.formulaCalcul })
    setModalDeschis(true)
  }
  function deschideEditare(id: string) {
    setInitialDraft(null)
    setDosarActiv(dosare.find((x) => x.id === id) ?? null)
    setModalDeschis(true)
  }
  async function onPatch(id: string, patch: Partial<Dosar>) {
    const d = dosare.find((x) => x.id === id)
    if (d) await salveazaDosar({ ...d, ...patch })
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
        <div className="animate-fade-up mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 space-y-4">
          <LegendaCulori />

          <div className="rounded-[20px] border border-[#253150] bg-[#10172a] p-3">
            <FilterBar filtre={filtre} onChange={setFiltre} servicii={servicii} onExport={() => exportDosareXlsx(filtrate)} />
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(400px,calc(50%_-_6px))),1fr))] gap-3">
              {filtrate.map((d, i) => (
                <div key={d.id} id={`dosar-${d.id}`} className="animate-fade-up min-w-0 rounded-[18px]" style={staggerDelay(i)}>
                  <DosarCard dosar={d} onStatusChange={onStatusChange} onDeschide={deschideEditare} onPatch={onPatch} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Button onClick={deschideNou} className="btn-brand-gradient hidden h-[42px] w-full gap-2 rounded-[13px] border border-[#bfdbfe]/45 text-sm font-extrabold tracking-[.01em] [text-shadow:0_1px_6px_rgba(0,0,0,.35)] lg:flex">
            <Plus className="size-4" aria-hidden="true" />
            Dosar nou
          </Button>
          <div className="flex flex-col gap-4">
            <ScanDevizCard onApply={onDevizScanat} />
            <ModificarPdfCard />
          </div>
          <ActivitateRecenta dosare={dosare} />
          <StatisticiRapide dosare={dosare} />
        </div>
      </div>

      <button
        type="button"
        onClick={deschideNou}
        className="fixed bottom-[76px] right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 lg:hidden"
        aria-label="Dosar nou"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      <DosarFormModal
        open={modalDeschis}
        dosar={dosarActiv}
        initialDraft={initialDraft}
        servicii={servicii}
        onClose={() => setModalDeschis(false)}
        onSave={salveazaDosar}
        onDelete={stergeDosar}
      />
    </div>
  )
}
