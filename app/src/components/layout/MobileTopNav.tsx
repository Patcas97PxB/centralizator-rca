import { cn } from '@/lib/utils'
import { useAtentieSetari } from '@/lib/atentie-setari'
import { NAV_ITEMS, type SectionKey } from './nav-items'

// Pe mobil (<md) sectiunile disponibile (Dosare, Notițe, Service-uri, Rapoarte, Setări) stau sus, sub header —
// bara de jos e rezervata actiunilor rapide (MobileBottomNav).
// Sectiunile „in curand" nu ocupa loc pe telefon.
const ITEMS_MOBIL = NAV_ITEMS.filter((i) => i.disponibil)

export function MobileTopNav({
  active,
  onSelect,
  badgeDosare = 0,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  badgeDosare?: number
}) {
  const atentie = useAtentieSetari()
  return (
    <nav style={{ gridTemplateColumns: `repeat(${ITEMS_MOBIL.length}, minmax(0, 1fr))` }} className="grid gap-1 border-b border-border px-3 py-2 md:hidden" aria-label="Navigare principală">
      {ITEMS_MOBIL.map((item) => {
        const on = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'relative flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-colors',
              on ? 'bg-surface-2 text-foreground' : 'text-tx-3 active:bg-surface-hover',
            )}
          >
            <span className="relative">
              <item.icon className={cn('size-[18px]', on ? 'text-accent-tx' : 'text-tx-3')} strokeWidth={1.9} aria-hidden="true" />
              {item.key === 'setari' && (atentie.folder || atentie.backup) && (
                <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-st-amber" aria-label="Cere atenție" />
              )}
              {item.key === 'dosare' && badgeDosare > 0 && (
                <span className="absolute -right-3 -top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border border-st-red/45 bg-card px-1 text-[9.5px] font-extrabold text-st-red-tx">
                  {badgeDosare}
                </span>
              )}
            </span>
            <span className="max-w-full truncate leading-none">{item.scurt ?? item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
