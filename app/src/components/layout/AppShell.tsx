import type { CSSProperties, ReactNode } from 'react'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { LightRay } from './LightRay'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileTopNav } from './MobileTopNav'
import { DemoBanner } from './DemoBanner'
import { ESTE_DEMO } from '@/lib/demo'
import type { DeSunat } from '@/lib/rca-calc'
import type { SectionKey } from './nav-items'

export function AppShell({
  active,
  onSelect,
  headerTitle,
  headerSubtitle,
  deSunat,
  onAlegeDosar,
  onNou,
  onDeviz,
  onPdf,
  children,
}: {
  active: SectionKey
  onSelect: (key: SectionKey) => void
  headerTitle: string
  headerSubtitle?: string
  deSunat: DeSunat[]
  onAlegeDosar: (id: string) => void
  onNou: () => void
  onDeviz: () => void
  onPdf: () => void
  children: ReactNode
}) {
  return (
    <SidebarProvider style={{ '--sidebar-width': '245px' } as CSSProperties}>
      <LightRay />
      <AppSidebar active={active} onSelect={onSelect} badgeDosare={deSunat.length} />
      <SidebarInset>
        {ESTE_DEMO && <DemoBanner />}
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          deSunat={deSunat}
          onAlegeDosar={onAlegeDosar}
        />
        <MobileTopNav active={active} onSelect={onSelect} badgeDosare={deSunat.length} />
        <main className="flex-1 pb-[96px] md:pb-0">{children}</main>
        <MobileBottomNav onNou={onNou} onDeviz={onDeviz} onPdf={onPdf} />
      </SidebarInset>
    </SidebarProvider>
  )
}
