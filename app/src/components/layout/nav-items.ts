import { FileBarChart, FolderKanban, LayoutDashboard, Settings, Wrench } from 'lucide-react'

export type SectionKey = 'dosare' | 'dashboard' | 'servicii' | 'rapoarte' | 'setari'

export interface NavItem {
  key: SectionKey
  label: string
  icon: typeof FolderKanban
  /** "Dashboard"/"Setări" sunt "in curand" — nu exista deloc in aplicatia veche (vezi planul). */
  disponibil: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dosare', label: 'Dosare RCA', icon: FolderKanban, disponibil: true },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, disponibil: false },
  { key: 'servicii', label: 'Service-uri', icon: Wrench, disponibil: true },
  { key: 'rapoarte', label: 'Rapoarte', icon: FileBarChart, disponibil: true },
  { key: 'setari', label: 'Setări', icon: Settings, disponibil: false },
]
