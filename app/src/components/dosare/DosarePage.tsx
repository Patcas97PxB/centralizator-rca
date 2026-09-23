import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { filtreImplicite } from '@/lib/dosare-filter'
import { exportDosareXlsx } from '@/lib/xlsx-export'
import type { Dosar } from '@/lib/types'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { staggerDelay } from '@/lib/motion'
import { prioritateDosar, zileLaTermen } from '@/lib/rca-calc'
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

  // Un dosar tocmai finalizat ramane pe loc cat dureaza animatia de finalizare (~2,3 s), apoi
  // coboara direct jos. Pana atunci se sorteaza cu statusul de dinainte.
  const [inCelebrare, setInCelebrare] = useState<Record<string, Dosar['status']>>({})
  const statusuriAnterioare = useRef<Map<string, Dosar['status']>>(new Map())
  useEffect(() => {
    const nou: Record<string, Dosar['status']> = {}
    for (const d of dosare) {
      const prev = statusuriAnterioare.current.get(d.id)
      if (prev && prev !== 'finalizat' && d.status === 'finalizat') nou[d.id] = prev
    }
    statusuriAnterioare.current = new Map(dosare.map((d) => [d.id, d.status]))
    const ids = Object.keys(nou)
    if (ids.length === 0) return
    setInCelebrare((c) => ({ ...c, ...nou }))
    const t = window.setTimeout(() => {
      setInCelebrare((c) => {
        const copie = { ...c }
        ids.forEach((id) => delete copie[id])
        return copie
      })
    }, 2500)
    return () => window.clearTimeout(t)
  }, [dosare])

  const ordonate = useMemo(() => {
    if (filtre.sortare !== 'actualizare') return filtrate
    const efectiv = (d: Dosar): Dosar => (inCelebrare[d.id] ? { ...d, status: inCelebrare[d.id] } : d)
    return filtrate
      .map((d, i) => ({ d, i, e: efectiv(d) }))
      .sort((a, b) => {
        const pa = prioritateDosar(a.e)
        const pb = prioritateDosar(b.e)
        if (pa !== pb) return pa - pb
        const za = zileLaTermen(a.e) ?? 999
        const zb = zileLaTermen(b.e) ?? 999
        if (za !== zb) return za - zb
        return a.i - b.i
      })
      .map((x) => x.d)
  }, [filtrate, filtre.sortare, inCelebrare])

  // Cand se schimba ordinea, cardurile "aluneca" la noul loc in loc sa sara.
  const carduri = useRef<Map<string, HTMLElement>>(new Map())
  const pozitii = useRef<Map<string, { x: number; y: number }>>(new Map())
  useLayoutEffect(() => {
    const noi = new Map<string, { x: number; y: number }>()
    carduri.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      noi.set(id, { x: r.left + window.scrollX, y: r.top + window.scrollY })
    })
    noi.forEach((n, id) => {
      const p = pozitii.current.get(id)
      const el = carduri.current.get(id)
      if (p && el && (Math.abs(p.x - n.x) > 1 || Math.abs(p.y - n.y) > 1)) {
        el.animate(
          [{ transform: `translate(${p.x - n.x}px, ${p.y - n.y}px)` }, { transform: 'none' }],
          { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)' },
        )
      }
    })
    pozitii.current = noi
  })

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
              {ordonate.map((d, i) => (
                <div
                  key={d.id}
                  ref={(el) => {
                    if (el) carduri.current.set(d.id, el)
                    else carduri.current.delete(d.id)
                  }}
                  id={`dosar-${d.id}`} className="animate-fade-up min-w-0 rounded-[18px]" style={staggerDelay(i)}>
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
