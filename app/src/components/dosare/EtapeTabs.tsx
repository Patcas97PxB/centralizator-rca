import { ETAPA_META, type Etapa } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABURI: { cheie: Etapa | 'toate'; nume: string }[] = [
  { cheie: 'toate', nume: 'Toate' },
  { cheie: 'rezervat', nume: 'De predat' },
  { cheie: 'la_client', nume: 'La client' },
  { cheie: 'de_trimis', nume: 'De trimis' },
  { cheie: 'finalizat', nume: 'Finalizate' },
]

// Etapele ca tab-uri (redesign F3) — un click, fără meniu; numărul ține cont de celelalte filtre.
export function EtapeTabs({
  activ,
  numar,
  onAlege,
}: {
  activ: Etapa | 'toate'
  numar: Record<Etapa | 'toate', number>
  onAlege: (cheie: Etapa | 'toate') => void
}) {
  return (
    <div role="tablist" aria-label="Etape" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
      {TABURI.map((t) => {
        const on = activ === t.cheie
        return (
          <button
            key={t.cheie}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onAlege(t.cheie)}
            className={cn(
              '-mb-px flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13.5px] font-semibold transition-colors md:min-h-10',
              on ? 'border-primary text-foreground' : 'border-transparent text-tx-3 hover:text-foreground',
            )}
          >
            {t.cheie !== 'toate' && <span className="size-[7px] rounded-full" style={{ background: ETAPA_META[t.cheie].color }} />}
            {t.nume}
            <span className={cn('tabular-nums', on ? 'text-tx-2' : 'text-tx-3')}>{numar[t.cheie]}</span>
          </button>
        )
      })}
    </div>
  )
}
