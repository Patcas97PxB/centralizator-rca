import { Check, Circle } from 'lucide-react'
import { fmtDate } from '@/lib/rca-calc'
import { cn } from '@/lib/utils'
import type { Dosar } from '@/lib/types'

interface Etapa {
  label: string
  done: boolean
  current: boolean
  date?: string
}

// Aproximare vizuala pe baza datelor existente — NU e un istoric real de etape (nu exista
// inca date/ore salvate per etapa). Decizie explicita (vezi planul): se rescrie cand/daca
// se adauga urmarirea reala de etape per dosar.
function calculeazaEtape(d: Dosar): Etapa[] {
  const finalizat = d.status === 'finalizat'
  const doneFlags = [!!d.start, !!d.service, finalizat, finalizat]
  const labels = ['Declanșare', 'Service', 'Reparație', 'Predare']
  const dates = [
    d.start ? fmtDate(d.start) : undefined,
    undefined,
    undefined,
    finalizat && d.end ? fmtDate(d.end) : undefined,
  ]
  const firstPending = doneFlags.findIndex((v) => !v)
  return labels.map((label, i) => ({
    label,
    done: doneFlags[i],
    current: i === firstPending,
    date: dates[i],
  }))
}

export function EtapeBar({ dosar }: { dosar: Dosar }) {
  const etape = calculeazaEtape(dosar)
  return (
    <div className="grid grid-cols-4 gap-1.5 border-t border-border pt-3">
      {etape.map((e) => (
        <div key={e.label} className="flex flex-col items-center gap-1 text-center">
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-full border',
              e.done
                ? 'border-success bg-success/15 text-success'
                : e.current
                  ? 'border-info bg-info/15 text-info'
                  : 'border-border text-muted-foreground',
            )}
          >
            {e.done ? <Check className="size-3" aria-hidden="true" /> : <Circle className="size-2 fill-current" aria-hidden="true" />}
          </span>
          <span className="text-[10px] leading-tight text-muted-foreground">{e.label}</span>
          <span className="text-[10px] leading-tight text-foreground">{e.date ?? '—'}</span>
        </div>
      ))}
    </div>
  )
}
