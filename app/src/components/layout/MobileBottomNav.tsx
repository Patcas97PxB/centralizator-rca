import { cn } from '@/lib/utils'
import { NAV_ITEMS, type SectionKey } from './nav-items'

export function MobileBottomNav({
  active,
  onSelect,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-sidebar pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Navigare principală"
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={cn(
            'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium',
            active === item.key ? 'text-primary' : 'text-muted-foreground',
          )}
          aria-current={active === item.key ? 'page' : undefined}
        >
          <item.icon className="size-5" aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </nav>
  )
}
