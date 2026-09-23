import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import { assetUrl } from '@/lib/asset-url'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/utils'
import { NAV_GROUP_LABELS, NAV_ITEMS, SIDEBAR_ACCENT, type NavGroup, type SectionKey } from './nav-items'

const GROUP_ORDER: NavGroup[] = ['operational', 'administrare']

const TWINKLES = [
  { left: 6, top: '48%', size: 2, delay: '2.3s' },
  { left: 232, top: '58%', size: 3, delay: '.6s' },
  { left: 10, top: '72%', size: 2, delay: '1.7s' },
  { left: 226, top: '80%', size: 3, delay: '2.9s' },
  { left: 120, top: '94%', size: 2, delay: '3.4s' },
  { left: 40, top: '97%', size: 2, delay: '1.9s' },
]

function SidebarDecor({ reduced }: { reduced: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <span className="absolute inset-0" style={{ background: 'linear-gradient(#0a1224 0%, #070b14 45%, #0b0a1c 100%)' }} />
      <span
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(96,165,250,.28) 1px, transparent 1.3px)',
          backgroundSize: '15px 15px',
          maskImage: 'linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,.35) 100%)',
          WebkitMaskImage: 'linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,0) 55%, rgba(0,0,0,.35) 100%)',
        }}
      />
      <span
        className="absolute -left-[90px] -top-[110px] size-[320px] animate-[orbDrift_14s_ease-in-out_infinite] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,.28) 0%, rgba(37,99,235,0) 66%)' }}
      />
      <span
        className="absolute -left-[140px] top-[38%] size-[260px] animate-[orbDrift_20s_ease-in-out_-4s_infinite] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(34,194,255,.22) 0%, rgba(34,194,255,0) 66%)' }}
      />
      <span
        className="absolute -bottom-[130px] -right-[130px] size-[360px] animate-[orbDrift_18s_ease-in-out_-6s_infinite_reverse] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,.45) 0%, rgba(124,58,237,0) 64%)' }}
      />
      <svg viewBox="0 0 245 900" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="sbL1" x1="0" x2="1">
            <stop offset="0" stopColor="#3d8bff" stopOpacity="0" />
            <stop offset=".5" stopColor="#3d8bff" stopOpacity=".7" />
            <stop offset="1" stopColor="#b26bff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sbL2" x1="0" x2="1">
            <stop offset="0" stopColor="#b26bff" stopOpacity="0" />
            <stop offset=".5" stopColor="#b26bff" stopOpacity=".6" />
            <stop offset="1" stopColor="#00f5a0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-10 600 C 60 550, 130 680, 260 580" fill="none" stroke="url(#sbL1)" strokeWidth="1.4" />
        <path d="M-10 650 C 80 600, 150 730, 260 630" fill="none" stroke="url(#sbL2)" strokeWidth="1.2" />
        <path
          d="M-10 700 C 90 650, 170 790, 260 690"
          fill="none"
          stroke="rgba(0,245,160,.35)"
          strokeWidth="1.2"
          strokeDasharray="4 8"
          style={{ animation: 'dashFlow 3s linear infinite' }}
        />
        <path
          d="M-10 750 C 100 710, 160 830, 260 745"
          fill="none"
          stroke="rgba(96,165,250,.3)"
          strokeWidth="1"
          strokeDasharray="2 10"
          style={{ animation: 'dashFlow 4.5s linear infinite reverse' }}
        />
        <path d="M-10 800 C 70 770, 180 870, 260 800" fill="none" stroke="rgba(178,107,255,.28)" strokeWidth="1" />
      </svg>
      <span
        className="absolute right-0 top-0 h-full w-0.5"
        style={{
          background: 'linear-gradient(180deg, rgba(96,165,250,0) 0, rgba(96,165,250,.95) var(--hdrH, 66px), rgba(124,58,237,.7) 65%, rgba(124,58,237,0) 100%)',
          boxShadow: '0 0 12px 1px rgba(96,165,250,.45)',
        }}
      />
      {!reduced && (
        <>
          <span
            className="absolute right-0 h-20 w-0.5 animate-[rayLoopV_8s_linear_infinite]"
            style={{
              background: 'linear-gradient(rgba(255,255,255,0), #fff, rgba(255,255,255,0))',
              boxShadow: '0 0 14px 2px rgba(191,219,254,.9)',
            }}
          />
          {TWINKLES.map((t) => (
            <span
              key={`${t.left}-${t.top}`}
              className="absolute animate-[twinkle_3.2s_ease-in-out_infinite] rounded-full bg-[#dbeafe]"
              style={{
                left: t.left,
                top: t.top,
                width: t.size,
                height: t.size,
                animationDelay: t.delay,
                boxShadow: '0 0 6px 1px rgba(191,219,254,.9)',
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

const LEGENDA_CULOARE = [
  { color: '#3d8bff', nume: 'Programare', detaliu: 'de predat', titlu: 'Programare: De predat / în așteptare' },
  { color: '#00f5a0', nume: 'În grafic', detaliu: '3+ zile', titlu: 'În grafic: 3+ zile rămase' },
  { color: '#fbbf24', nume: 'Atenție', detaliu: '1–2 zile', titlu: 'Atenție: 1–2 zile rămase' },
  { color: '#ff4d6d', nume: 'Urgență', detaliu: 'expirat', titlu: 'Urgență: Zile expirate' },
  { color: '#94a3b8', nume: 'Finalizat', detaliu: 'arhivă', titlu: 'Finalizat: Arhivat / inactiv' },
]
const LEGENDA_ETICHETE = [
  { color: '#e879f9', nume: 'Blochaj documente', detaliu: 'acte / deviz', titlu: 'Blocaj documente: Lipsesc acte / deviz' },
  { color: '#fb923c', nume: 'De sunat', detaliu: 'mașină gata', titlu: 'De sunat: Mașina e gata' },
]

const SECTION_LABEL = 'px-2 pb-1.5 pt-2 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]'

function Legenda() {
  return (
    <div className="rounded-2xl border border-[#1c273f] bg-[#101828]/[.72] p-3.5 backdrop-blur-[8px]">
      <div className="mb-[9px] text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]">CULOARE CARD</div>
      <div className="flex flex-col gap-[5px]">
        {LEGENDA_CULOARE.map((l) => (
          <div key={l.nume} title={l.titlu} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            <span className="h-[11px] w-1 shrink-0 rounded-sm" style={{ background: l.color, boxShadow: `0 0 8px 1px ${l.color}99` }} />
            <span className="text-[11px] font-extrabold text-[#e2e8f5]">{l.nume}</span>
            <span className="min-w-0 truncate text-[10.5px] text-[#8b9ab5]">{l.detaliu}</span>
          </div>
        ))}
      </div>
      <div className="mb-[7px] mt-[9px] h-px bg-[#1c273f]" />
      <div className="mb-[9px] text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]">ETICHETE</div>
      <div className="flex flex-col gap-[5px]">
        {LEGENDA_ETICHETE.map((l) => (
          <div key={l.nume} title={l.titlu} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            <span className="size-[9px] shrink-0 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px 1px ${l.color}99` }} />
            <span className="text-[11px] font-extrabold text-[#e2e8f5]">{l.nume}</span>
            <span className="min-w-0 truncate text-[10.5px] text-[#8b9ab5]">{l.detaliu}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AppSidebar({
  active,
  onSelect,
  badgeDosare = 0,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  badgeDosare?: number
}) {
  const reduced = usePrefersReducedMotion()
  return (
    <Sidebar collapsible="offcanvas" className="border-[#1c273f] [&_[data-sidebar=sidebar]]:bg-[#070b14]">
      <SidebarDecor reduced={reduced} />
      <SidebarHeader className="relative z-10 flex-row items-center px-[18px] pb-[18px] pt-5">
        <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="block h-[52px] w-auto max-w-full" />
      </SidebarHeader>
      <div
        className="relative z-10 mx-3.5 mb-2.5 h-px"
        style={{ background: 'linear-gradient(90deg, #1c273f, rgba(28,39,63,0))' }}
      />
      <SidebarContent className="relative z-10 gap-0 px-2.5">
        <nav className="flex flex-col gap-0.5">
          {GROUP_ORDER.map((group, gi) => (
            <div key={group} className="flex flex-col gap-0.5">
              {gi > 0 && <div className="mx-2 mb-0.5 mt-2.5 h-px bg-[#141d30]" />}
              <div className={SECTION_LABEL}>{NAV_GROUP_LABELS[group].toUpperCase()}</div>
              {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                const on = active === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelect(item.key)}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'relative flex h-[46px] w-full items-center gap-3 rounded-[13px] px-2.5 text-left text-sm font-bold transition-colors',
                      on ? 'bg-[#18233c] text-[#f8fafc]' : 'text-[#9aa8c1] hover:bg-white/5 hover:text-[#e2e8f5]',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn('absolute -left-2.5 top-[13px] h-5 w-[3px] rounded-r-[3px]', on && 'animate-[railBreathe_2.4s_ease-in-out_infinite]')}
                      style={
                        on
                          ? { background: SIDEBAR_ACCENT, boxShadow: '0 0 14px 2px rgba(37,99,235,.667)' }
                          : { background: 'transparent' }
                      }
                    />
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors"
                      style={
                        on
                          ? { borderColor: 'rgba(37,99,235,.6)', background: 'rgba(37,99,235,.18)', color: '#bfdbfe' }
                          : { borderColor: '#1e2a45', background: 'rgba(255,255,255,.035)', color: '#8fa0bd' }
                      }
                    >
                      <item.icon className="size-[19px]" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {item.key === 'dosare' && badgeDosare > 0 && (
                      <span className="rounded-full border border-[#ef4444]/45 bg-[#ef4444]/[.16] px-[7px] py-0.5 text-[10px] font-extrabold text-[#fca5a5]">
                        {badgeDosare}
                      </span>
                    )}
                    {!item.disponibil && (
                      <span className="rounded-full border border-[#253150] bg-[#131c2e] px-[7px] py-0.5 text-[9px] font-extrabold tracking-[.04em] text-[#64748b]">
                        SOON
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </SidebarContent>
      <SidebarFooter className="relative z-10 mt-auto px-3.5 pb-3.5 pt-3">
        <Legenda />
      </SidebarFooter>
    </Sidebar>
  )
}
