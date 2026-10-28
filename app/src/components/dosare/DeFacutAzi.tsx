import { X } from 'lucide-react'
import { predareCurand, type DeSunat, type TipAviz } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'
import { cn } from '@/lib/utils'

type Cheie = TipAviz | 'predare'

// Ordinea și textul chipurilor; culoarea punctului = sensul avizului (ca în clopoțel).
const CHIPURI: { cheie: Cheie; text: (n: number) => string; culoare: string }[] = [
  { cheie: 'termen', text: () => 'de sunat', culoare: 'var(--st-red)' },
  { cheie: 'netrimis', text: () => 'de trimis', culoare: 'var(--st-violet)' },
  { cheie: 'deviz', text: () => 'fără deviz', culoare: 'var(--st-cyan)' },
  { cheie: 'predare', text: (n) => (n === 1 ? 'predare azi/mâine' : 'predări azi/mâine'), culoare: 'var(--st-amber)' },
  { cheie: 'manual', text: (n) => (n === 1 ? 'amintire' : 'amintiri'), culoare: 'var(--st-orange)' },
]

// Rândul „De făcut azi" (redesign F3): aceleași avize ca în clopoțel, numărate; click = filtru.
export function DeFacutAzi({
  dosare,
  deSunat,
  activ,
  onAlege,
}: {
  dosare: Dosar[]
  deSunat: DeSunat[]
  activ: Cheie | null
  onAlege: (cheie: Cheie | null) => void
}) {
  const numar: Record<Cheie, number> = { termen: 0, netrimis: 0, deviz: 0, manual: 0, predare: dosare.filter(predareCurand).length }
  for (const a of deSunat) numar[a.tip]++
  const vizibile = CHIPURI.filter((c) => numar[c.cheie] > 0 || activ === c.cheie)

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      <span className="shrink-0 text-[13.5px] font-bold text-foreground">De făcut azi</span>
      {vizibile.length === 0 && <span className="text-[13px] text-tx-3">nimic urgent</span>}
      {vizibile.map((c) => {
        const on = activ === c.cheie
        return (
          <button
            key={c.cheie}
            type="button"
            aria-pressed={on}
            onClick={() => onAlege(on ? null : c.cheie)}
            className={cn(
              'flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors md:h-8 md:px-3 md:text-[12.5px]',
              on ? 'border-primary bg-primary/15 text-foreground' : 'border-border bg-card text-tx-2 hover:bg-surface-hover',
            )}
          >
            <span className="size-2 rounded-full" style={{ background: c.culoare }} />
            <b className="font-extrabold text-foreground">{numar[c.cheie]}</b>
            {c.text(numar[c.cheie])}
            {on && <X className="size-3.5 text-tx-3" aria-label="Scoate filtrul" />}
          </button>
        )
      })}
    </div>
  )
}
