import type { ReactNode } from 'react'
import { Calculator, CalendarClock, Coins, FilePen } from 'lucide-react'
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from '@/components/ui/sidebar'
import { useAtentieSetari } from '@/lib/atentie-setari'
import { assetUrl } from '@/lib/asset-url'
import { notitaScadenta, useNotite } from '@/lib/notite'
import { cn } from '@/lib/utils'
import { NAV_GROUP_LABELS, NAV_ITEMS, type NavGroup, type SectionKey } from './nav-items'

const GROUP_ORDER: NavGroup[] = ['operational', 'administrare']

// Meniul lateral „Liniștit”: iconițe simple (fără țigle cu chenar), etichete de grup normale, elementul
// activ doar cu fundal ușor + iconiță albastră. Secțiunile „în curând” nu apar.
const GRUP = 'px-3 pb-1 pt-4 text-[12px] font-semibold text-tx-3 first:pt-1'
const RAND =
  'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[14px] font-semibold transition-colors'

function Rand({ on, icon, label, onClick, dupa }: { on?: boolean; icon: ReactNode; label: string; onClick: () => void; dupa?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? 'page' : undefined}
      className={cn(RAND, on ? 'bg-surface-2 text-foreground' : 'text-tx-2 hover:bg-surface-hover hover:text-foreground')}
    >
      <span className={cn('flex shrink-0', on ? 'text-accent-tx' : 'text-tx-3')}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {dupa}
    </button>
  )
}

export function AppSidebar({
  active,
  onSelect,
  badgeDosare = 0,
  onDeviz,
  onPdf,
  onTarif,
  onDate,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  badgeDosare?: number
  onDeviz: () => void
  onPdf: () => void
  onTarif: () => void
  onDate: () => void
}) {
  const { setOpenMobile } = useSidebar()
  const atentie = useAtentieSetari()
  const setariAtentie = atentie.folder || atentie.backup
  const notiteAzi = useNotite().notite.filter(notitaScadenta).length
  const ICON = 'size-[18px]'
  const randSectiune = (item: (typeof NAV_ITEMS)[number]) => (
    <Rand
      key={item.key}
      on={active === item.key}
      icon={<item.icon className={ICON} strokeWidth={1.9} aria-hidden="true" />}
      label={item.label}
      onClick={() => {
        onSelect(item.key)
        setOpenMobile(false)
      }}
      dupa={
        item.key === 'dosare' && badgeDosare > 0 ? (
          <span className="rounded-full bg-st-red/15 px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-st-red-tx" title="De făcut în clopoțel">
            {badgeDosare}
          </span>
        ) : item.key === 'notite' && notiteAzi > 0 ? (
          <span className="rounded-full bg-st-orange/15 px-2 py-0.5 text-[11.5px] font-bold tabular-nums text-st-orange-tx" title="Notițe cu amintire azi">
            {notiteAzi}
          </span>
        ) : item.key === 'setari' && setariAtentie ? (
          <span className="size-2 rounded-full bg-st-amber" title={atentie.folder ? 'Folderul de pe laptop așteaptă permisiunea' : 'E timpul pentru un backup'} />
        ) : null
      }
    />
  )
  return (
    <Sidebar collapsible="offcanvas" className="border-border [&_[data-sidebar=sidebar]]:bg-[var(--sidebar)]">
      <SidebarHeader className="flex-row items-center px-5 pb-4 pt-5">
        <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="block h-10 w-auto max-w-full light:hidden" />
        <img src={assetUrl('/icons/logo-light.png')} alt="Centralizator RCA" className="hidden h-10 w-auto max-w-full light:block" />
      </SidebarHeader>
      <SidebarContent className="gap-0 px-2.5">
        <nav className="flex flex-col gap-0.5">
          {GROUP_ORDER.map((group) => (
            <div key={group} className="flex flex-col gap-0.5">
              <div className={GRUP}>{NAV_GROUP_LABELS[group]}</div>
              {NAV_ITEMS.filter((item) => item.group === group && item.disponibil).map(randSectiune)}
            </div>
          ))}
        </nav>
        {/* Unelte (redesign F4): mutate din coloana din dreapta a paginii Dosare */}
        <div className="mt-auto flex flex-col gap-0.5 pb-4 pt-6">
          <div className={GRUP}>{NAV_GROUP_LABELS.unelte}</div>
          {NAV_ITEMS.filter((item) => item.group === 'unelte').map(randSectiune)}
          {[
            { label: 'Zile din deviz', icon: Calculator, onClick: onDeviz },
            { label: 'Modificare PDF', icon: FilePen, onClick: onPdf },
            { label: 'Verificare tarif', icon: Coins, onClick: onTarif },
            { label: 'Calculator de date', icon: CalendarClock, onClick: onDate },
          ].map((u) => (
            <Rand
              key={u.label}
              icon={<u.icon className={ICON} strokeWidth={1.9} aria-hidden="true" />}
              label={u.label}
              onClick={() => {
                u.onClick()
                setOpenMobile(false)
              }}
            />
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  )
}
