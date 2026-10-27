import { FileBarChart, FolderKanban, LayoutDashboard, Wrench } from 'lucide-react'

// Bara elementului activ din meniu (= --primary din index.css).
export const SIDEBAR_ACCENT = 'var(--primary)'

export type SectionKey = 'dosare' | 'dashboard' | 'servicii' | 'rapoarte' | 'setari'

export type NavGroup = 'operational' | 'administrare'

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  operational: 'Operațional',
  administrare: 'Administrare',
}

export interface NavItem {
  key: SectionKey
  label: string
  icon: typeof FolderKanban
  group: NavGroup
  /** "Dashboard"/"Setări" sunt "in curand" — nu exista deloc in aplicatia veche (vezi planul). */
  disponibil: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dosare', label: 'Dosare RCA', icon: FolderKanban, group: 'operational', disponibil: true },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'operational', disponibil: false },
  { key: 'servicii', label: 'Service-uri', icon: Wrench, group: 'administrare', disponibil: true },
  { key: 'rapoarte', label: 'Rapoarte', icon: FileBarChart, group: 'administrare', disponibil: true },
]
