import type { CSSProperties, ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { MobileBottomNav } from './MobileBottomNav'
import type { SectionKey } from './nav-items'

export function AppShell({
  active,
  onSelect,
  headerTitle,
  headerSubtitle,
  notificari,
  onNotificariClick,
  children,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  headerTitle: string
  headerSubtitle?: string
  notificari: number
  onNotificariClick: () => void
  children: ReactNode
}) {
  return (
    <SidebarProvider style={{ '--sidebar-width': '245px' } as CSSProperties}>
      <AppSidebar active={active} onSelect={onSelect} badgeDosare={notificari} />
      <SidebarInset>
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          notificari={notificari}
          onNotificariClick={onNotificariClick}
        />
        <main className="flex-1 pb-[84px] md:pb-0">{children}</main>
        <MobileBottomNav active={active} onSelect={onSelect} badgeDosare={notificari} />
      </SidebarInset>
    </SidebarProvider>
  )
}
