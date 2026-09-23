import { cn } from '@/lib/utils'
import { NAV_ITEMS, SIDEBAR_ACCENT, type SectionKey } from './nav-items'

export function MobileBottomNav({
  active,
  onSelect,
  badgeDosare = 0,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  badgeDosare?: number
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex gap-0.5 border-t border-[#1c273f] px-1.5 pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] md:hidden"
      style={{ background: 'linear-gradient(#0a1224f2, #070b14f2)' }}
      aria-label="Navigare principală"
    >
      {NAV_ITEMS.map((item) => {
        const on = active === item.key
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 rounded-[13px] py-1.5 text-[11px] font-bold transition-colors',
              on ? 'bg-[#18233c] text-[#f8fafc]' : 'text-[#9aa8c1] active:bg-white/5',
            )}
          >
            <span
              aria-hidden
              className={cn('absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 rounded-b-[3px]', on && 'animate-[railBreathe_2.4s_ease-in-out_infinite]')}
              style={on ? { background: SIDEBAR_ACCENT, boxShadow: '0 0 14px 2px rgba(37,99,235,.667)' } : { background: 'transparent' }}
            />
            <span
              className="relative flex size-8 items-center justify-center rounded-[10px] border transition-colors"
              style={
                on
                  ? { borderColor: 'rgba(37,99,235,.6)', background: 'rgba(37,99,235,.18)', color: '#bfdbfe' }
                  : { borderColor: '#1e2a45', background: 'rgba(255,255,255,.035)', color: '#8fa0bd' }
              }
            >
              <item.icon className="size-[19px]" aria-hidden="true" />
              {item.key === 'dosare' && badgeDosare > 0 && (
                <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#ef4444]/45 bg-[#1b1220] px-1 text-[10px] font-extrabold text-[#fca5a5]">
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
