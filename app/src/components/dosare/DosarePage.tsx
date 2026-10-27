import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { filtreImplicite, numaraEtape } from '@/lib/dosare-filter'
import { remindere } from '@/lib/reminder'
import { exportDosareXlsx } from '@/lib/xlsx-export'
import type { Dosar } from '@/lib/types'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { prioritateDosar, zileLaTermen } from '@/lib/rca-calc'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FilterBar } from './FilterBar'
import { DosarCard } from './DosarCard'
import { DosarFormModal } from './DosarFormModal'
import { DocumenteModal } from './DocumenteModal'
import { DosarPanou } from './DosarPanou'
import { DeFacutAzi } from './DeFacutAzi'
import { EtapeTabs } from './EtapeTabs'

/** Actiune ceruta din bara de jos de pe mobil (id nou la fiecare apasare). */
export type ActiuneRapida = { id: number; tip: 'nou' } | { id: number; tip: 'deviz'; an: AnalizaDeviz }

export function DosarePage({ actiune }: { actiune?: ActiuneRapida | null }) {
  const {
    dosare, filtrate, servicii, loading, error, filtre, setFiltre,
    salveazaDosar, salveazaRapid, stergeDosar, deSunat,
  } = useDosareContext()
  const [modalDeschis, setModalDeschis] = useState(false)
  const [dosarActiv, setDosarActiv] = useState<Dosar | null>(null)
  const [initialDraft, setInitialDraft] = useState<Partial<Dosar> | null>(null)
  const [docsId, setDocsId] = useState<string | null>(null)
  // Panoul lateral al dosarului (click pe card). Când din panou deschizi Editează/Documente, panoul se închide
  // și revine după ce închizi fereastra (două ferestre suprapuse se încurcă la click).
  const [panouId, setPanouId] = useState<string | null>(null)
  const [panouRevenire, setPanouRevenire] = useState<string | null>(null)
  function revinoLaPanou() {
    if (panouRevenire) setPanouId(panouRevenire)
    setPanouRevenire(null)
  }
  function dinPanou(id: string, deschide: (id: string) => void) {
    setPanouRevenire(id)
    setPanouId(null)
    deschide(id)
  }

  // Un dosar tocmai finalizat ramane pe loc cat dureaza animatia de finalizare (~1,4 s), apoi
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
    }, 1500)
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
          { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' },
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
  // Actiunile din bara de jos de pe mobil (App → aici): se executa o singura data pe id.
  const ultimaActiune = useRef<number | null>(null)
  useEffect(() => {
    if (!actiune || ultimaActiune.current === actiune.id) return
    ultimaActiune.current = actiune.id
    if (actiune.tip === 'nou') deschideNou()
    else onDevizScanat(actiune.an)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actiune])

  function deschideEditare(id: string) {
    setInitialDraft(null)
    setDosarActiv(dosare.find((x) => x.id === id) ?? null)
    setModalDeschis(true)
  }
  async function onPatch(id: string, patch: Partial<Dosar>) {
    const d = dosare.find((x) => x.id === id)
    if (d) await salveazaRapid({ ...d, ...patch })
  }
  async function onStatusChange(id: string, status: Dosar['status']) {
    const d = dosare.find((x) => x.id === id)
    if (d) await salveazaRapid({ ...d, status })
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-3 md:px-6 md:py-6">
      {error && (
        <div className="animate-fade-up mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        <div className="min-w-0 space-y-4">

          <div className="rounded-[20px] border border-border bg-card p-3">
            <FilterBar filtre={filtre} onChange={setFiltre} servicii={servicii} onExport={() => exportDosareXlsx(filtrate)} nrAleMele={remindere(dosare).length} />
          </div>

          <DeFacutAzi
            dosare={dosare}
            deSunat={deSunat}
            activ={filtre.deFacut}
            onAlege={(deFacut) => setFiltre({ ...filtre, deFacut })}
          />

          <EtapeTabs activ={filtre.status} numar={numaraEtape(dosare, filtre)} onAlege={(status) => setFiltre({ ...filtre, status })} />

          {filtre.doarAmintite && (
            <div className="flex items-center justify-between rounded-xl border border-st-orange/40 bg-st-orange/10 px-3 py-2 text-sm text-st-orange">
              <span>Arăt doar dosarele marcate „Amintește-mi”.</span>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-st-orange hover:text-st-orange" onClick={() => setFiltre({ ...filtre, doarAmintite: false })}>
                <X className="size-3.5" aria-hidden="true" />
                Arată toate
              </Button>
            </div>
          )}

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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-3">
              {ordonate.map((d) => (
                <div
                  key={d.id}
                  ref={(el) => {
                    if (el) carduri.current.set(d.id, el)
                    else carduri.current.delete(d.id)
                  }}
                  id={`dosar-${d.id}`} className="min-w-0 rounded-[14px]">
                  <DosarCard dosar={d} selectat={panouId === d.id} onStatusChange={onStatusChange} onDeschide={setPanouId} onPatch={onPatch} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <DocumenteModal
        open={docsId !== null}
        dosar={dosare.find((x) => x.id === docsId) ?? null}
        onClose={() => {
          setDocsId(null)
          revinoLaPanou()
        }}
        onSave={salveazaDosar}
      />

      <DosarPanou
        dosar={dosare.find((x) => x.id === panouId) ?? null}
        onClose={() => setPanouId(null)}
        onPatch={onPatch}
        onStatusChange={onStatusChange}
        onEditeaza={(id) => dinPanou(id, deschideEditare)}
        onDocumente={(id) => dinPanou(id, setDocsId)}
      />

      <DosarFormModal
        open={modalDeschis}
        dosar={dosarActiv}
        initialDraft={initialDraft}
        servicii={servicii}
        onClose={() => {
          setModalDeschis(false)
          revinoLaPanou()
        }}
        onSave={salveazaDosar}
        onDelete={stergeDosar}
      />
    </div>
  )
}
