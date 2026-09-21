import { Lightbulb } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NAV_ITEMS, type SectionKey } from './nav-items'

export function AppSidebar({
  active,
  onSelect,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
}) {
  return (
    <Sidebar collapsible="offcanvas" className="border-sidebar-border">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 px-1">
          <img src="/icons/logo.png" alt="" className="h-9 w-auto" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold leading-tight text-sidebar-foreground">
              Centralizator
            </div>
            <div className="truncate text-sm font-bold leading-tight text-sidebar-foreground">RCA</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {NAV_ITEMS.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                isActive={active === item.key}
                onClick={() => onSelect(item.key)}
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3.5 text-sidebar-foreground">
          <Lightbulb className="mb-2 size-4 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold">Lucrează mai eficient!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Folosește căutarea și filtrele rapide ca să găsești un dosar în câteva secunde.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
