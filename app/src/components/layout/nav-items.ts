import { FileBarChart, FolderKanban, LayoutDashboard, Wrench } from 'lucide-react'

// Trebuie sa ramana sincron cu --primary din index.css (hex literal, ca sa poata primi sufix alpha).
export const SIDEBAR_ACCENT = '#2563eb'

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
