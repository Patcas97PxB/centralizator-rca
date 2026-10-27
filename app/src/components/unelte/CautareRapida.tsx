import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useDosareContext } from '@/contexts/DosareContext'
import { corespundeCautarii } from '@/lib/dosare-filter'
import { normAuto } from '@/lib/folder-local'
import { etapaDosar } from '@/lib/rca-calc'
import { ETAPA_META, type Dosar } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface ComandaRapida {
  cheie: string
  titlu: string
  icon: ReactNode
  actiune: () => void
}

// Căutare rapidă (Ctrl+K de oriunde, sau lupa din antet): scrii nr. auto (și o bucată: „DCM”), RBH,
// nr. dosar, marca, service-ul… → Enter te duce la cardul dosarului. Cu câmpul gol arată uneltele.
// Ordinea: nr. auto care se potrivește exact/la final primele, apoi dosarele nefinalizate.
function scor(d: Dosar, q: string): number {
  const n = normAuto(q)
  const nr = [normAuto(d.nrAutoPagubit || ''), normAuto(d.nrAutoInlocuire || '')]
  let s = d.status === 'finalizat' ? 0 : 10
  if (n && nr.includes(n)) s += 100
  else if (n.length >= 3 && nr.some((x) => x.endsWith(n))) s += 50
  return s
}

export function CautareRapida({ open, onClose, onAlegeDosar, comenzi }: { open: boolean; onClose: () => void; onAlegeDosar: (id: string) => void; comenzi: ComandaRapida[] }) {
  const { dosare } = useDosareContext()
  const [q, setQ] = useState('')
  const [activ, setActiv] = useState(0)
  const listaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setActiv(0)
    }
  }, [open])

  const rezultate = useMemo(() => {
    const t = q.trim()
    if (!t) return []
    return dosare
      .filter((d) => corespundeCautarii(d, t))
      .sort((a, b) => scor(b, t) - scor(a, t))
      .slice(0, 8)
  }, [q, dosare])
  const unelte = q.trim() ? comenzi.filter((c) => c.titlu.toLowerCase().includes(q.trim().toLowerCase())) : comenzi
  const total = rezultate.length + unelte.length

  useEffect(() => setActiv(0), [q])
  useEffect(() => {
    listaRef.current?.querySelector('[data-activ="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [activ])

  function alege(i: number) {
    onClose()
    if (i < rezultate.length) onAlegeDosar(rezultate[i].id)
    else unelte[i - rezultate.length]?.actiune()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-[520px]">
        <DialogTitle className="sr-only">Căutare rapidă</DialogTitle>
        <DialogDescription className="sr-only">Caută un dosar după nr. auto, RBH, nr. dosar sau deschide o unealtă</DialogDescription>
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <Search className="size-[18px] shrink-0 text-tx-3" aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (!total) return
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault()
                setActiv((a) => (a + (e.key === 'ArrowDown' ? 1 : total - 1)) % total)
              } else if (e.key === 'Enter') {
                e.preventDefault()
                alege(activ)
              }
            }}
            placeholder="Caută dosar: nr. auto, RBH, nr. dosar…"
            aria-label="Caută"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-tx-3 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-tx-3 sm:block">Esc</kbd>
        </div>
        <div ref={listaRef} className="max-h-[60vh] overflow-y-auto p-1.5">
          {q.trim() && rezultate.length === 0 && <p className="px-3 py-4 text-[13.5px] text-tx-3">Niciun dosar nu se potrivește.</p>}
          {rezultate.map((d, i) => {
            const meta = ETAPA_META[etapaDosar(d)]
            return (
              <button
                key={d.id}
                type="button"
                data-activ={i === activ}
                onMouseEnter={() => setActiv(i)}
                onClick={() => alege(i)}
                className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left', i === activ && 'bg-surface-hover')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-foreground">
                    {d.nrAutoPagubit || '–'}
                    {d.nrAutoInlocuire && <span className="font-medium text-tx-3"> → </span>}
                    {d.nrAutoInlocuire && <span className="text-tx-2">{d.nrAutoInlocuire}</span>}
                  </span>
                  <span className="block truncate text-[12.5px] text-tx-3">
                    {[d.asigurator, d.nrDosar, d.nrRezervare, d.marcaModel].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-tx-2">
                  <span className="size-[7px] rounded-full" style={{ background: meta.color }} />
                  {meta.label}
                </span>
              </button>
            )
          })}
          {unelte.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-2 text-[12px] font-semibold text-tx-3">Unelte</div>
              {unelte.map((c, k) => {
                const i = rezultate.length + k
                return (
                  <button
                    key={c.cheie}
                    type="button"
                    data-activ={i === activ}
                    onMouseEnter={() => setActiv(i)}
                    onClick={() => alege(i)}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] font-semibold text-foreground', i === activ && 'bg-surface-hover')}
                  >
                    <span className="flex text-tx-3">{c.icon}</span>
                    {c.titlu}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
