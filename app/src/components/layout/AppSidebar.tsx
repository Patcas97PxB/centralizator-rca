import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { assetUrl } from '@/lib/asset-url'
import { cn } from '@/lib/utils'
import { NAV_GROUP_LABELS, NAV_ITEMS, SIDEBAR_ACCENT, type NavGroup, type SectionKey } from './nav-items'

const GROUP_ORDER: NavGroup[] = ['operational', 'administrare']

const SECTION_LABEL = 'px-2 pb-1.5 pt-2 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]'

export function AppSidebar({
  active,
  onSelect,
  badgeDosare = 0,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  badgeDosare?: number
}) {
  const { setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="offcanvas" className="border-[#1c273f] [&_[data-sidebar=sidebar]]:bg-[var(--sidebar)]">
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
                    onClick={() => {
                      onSelect(item.key)
                      setOpenMobile(false)
                    }}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'relative flex h-[46px] w-full items-center gap-3 rounded-[13px] px-2.5 text-left text-sm font-bold transition-colors',
                      on ? 'bg-[#18233c] text-[#f8fafc]' : 'text-[#9aa8c1] hover:bg-white/5 hover:text-[#e2e8f5]',
                    )}
                  >
                    <span
                      aria-hidden
                      className="absolute -left-2.5 top-[13px] h-5 w-[3px] rounded-r-[3px]"
                      style={
                        on
                          ? { background: SIDEBAR_ACCENT }
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
    </Sidebar>
  )
}
