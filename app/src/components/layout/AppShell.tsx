import type { CSSProperties, ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { LightRay } from './LightRay'
import { MobileBottomNav } from './MobileBottomNav'
import type { DeSunat } from '@/lib/rca-calc'
import type { SectionKey } from './nav-items'

export function AppShell({
  active,
  onSelect,
  headerTitle,
  headerSubtitle,
  deSunat,
  onAlegeDosar,
  children,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  headerTitle: string
  headerSubtitle?: string
  deSunat: DeSunat[]
  onAlegeDosar: (id: string) => void
  children: ReactNode
}) {
  return (
    <SidebarProvider style={{ '--sidebar-width': '245px' } as CSSProperties}>
      <LightRay />
      <AppSidebar active={active} onSelect={onSelect} badgeDosare={deSunat.length} />
      <SidebarInset>
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          deSunat={deSunat}
          onAlegeDosar={onAlegeDosar}
        />
        <main className="flex-1 pb-[84px] md:pb-0">{children}</main>
        <MobileBottomNav active={active} onSelect={onSelect} badgeDosare={deSunat.length} />
      </SidebarInset>
    </SidebarProvider>
  )
}
