import { cn } from '@/lib/utils'
import { NAV_ITEMS, SIDEBAR_ACCENT, type SectionKey } from './nav-items'

// Pe mobil (<md) sectiunile (Dosare, Dashboard, Service-uri, Rapoarte) stau sus, sub header —
// bara de jos e rezervata actiunilor rapide (MobileBottomNav).
export function MobileTopNav({
  active,
  onSelect,
  badgeDosare = 0,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  badgeDosare?: number
}) {
  return (
    <nav className="grid grid-cols-4 gap-1.5 border-b border-[#1c273f] px-3 py-2 md:hidden" aria-label="Navigare principală">
      {NAV_ITEMS.map((item) => {
        const on = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-[11px] border px-1 py-1.5 text-[10.5px] font-bold transition-colors',
              on ? 'text-[#f8fafc]' : 'border-[#1e2a45] bg-white/[.03] text-[#9aa8c1] active:bg-white/5',
            )}
            style={on ? { borderColor: 'rgba(37,99,235,.6)', background: 'rgba(37,99,235,.18)', boxShadow: `0 0 14px -4px ${SIDEBAR_ACCENT}` } : undefined}
          >
            <span className="relative">
              <item.icon className="size-[17px]" style={{ color: on ? '#bfdbfe' : '#8fa0bd' }} aria-hidden="true" />
              {item.key === 'dosare' && badgeDosare > 0 && (
                <span className="absolute -right-3 -top-2 flex h-[16px] min-w-[16px] items-center justify-center rounded-full border border-[#ef4444]/45 bg-[#1b1220] px-1 text-[9.5px] font-extrabold text-[#fca5a5]">
                  {badgeDosare}
                </span>
              )}
            </span>
            <span className="max-w-full truncate leading-none">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
