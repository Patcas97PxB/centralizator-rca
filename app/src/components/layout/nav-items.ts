import { ChartColumn, FolderOpen, LayoutDashboard, NotebookPen, Settings, Wrench } from 'lucide-react'

// Bara elementului activ din meniu (= --primary din index.css).
export const SIDEBAR_ACCENT = 'var(--primary)'

export type SectionKey = 'dosare' | 'notite' | 'dashboard' | 'servicii' | 'rapoarte' | 'setari'

export type NavGroup = 'operational' | 'administrare'

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  operational: 'Lucru',
  administrare: 'Administrare',
}

export interface NavItem {
  key: SectionKey
  label: string
  /** Eticheta din bara de sus de pe telefon (5 coloane înguste). */
  scurt?: string
  icon: typeof FolderOpen
  group: NavGroup
  /** „Dashboard” e „în curând” — nu apare în meniu până nu există. */
  disponibil: boolean
}

// Iconițe lucide cu același contur (redesign: fără țigle cu chenar în jurul lor).
export const NAV_ITEMS: NavItem[] = [
  { key: 'dosare', label: 'Dosare RCA', scurt: 'Dosare', icon: FolderOpen, group: 'operational', disponibil: true },
  { key: 'notite', label: 'Notițe', icon: NotebookPen, group: 'operational', disponibil: true },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'operational', disponibil: false },
  { key: 'servicii', label: 'Service-uri', scurt: 'Service', icon: Wrench, group: 'administrare', disponibil: true },
  { key: 'rapoarte', label: 'Rapoarte', icon: ChartColumn, group: 'administrare', disponibil: true },
  { key: 'setari', label: 'Setări', icon: Settings, group: 'administrare', disponibil: true },
]
