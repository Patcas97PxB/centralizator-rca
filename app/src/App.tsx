import { useState } from 'react'
import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/layout/AppShell'
import { NAV_ITEMS, type SectionKey } from '@/components/layout/nav-items'
import { ComingSoonPage } from '@/components/ComingSoonPage'
import { DosarePage } from '@/components/dosare/DosarePage'
import { RapoartePage } from '@/components/rapoarte/RapoartePage'
import { ServiciiPage } from '@/components/servicii/ServiciiPage'
import { DosareProvider, useDosareContext } from '@/contexts/DosareContext'
import { TooltipProvider } from '@/components/ui/tooltip'

const TITLURI: Record<SectionKey, { title: string; subtitle: string }> = {
  dosare: { title: 'Toate dosarele RCA. Un singur loc.', subtitle: 'Urmărește, gestionează, rezolvă mai rapid.' },
  dashboard: { title: 'Dashboard', subtitle: 'În curând.' },
  servicii: { title: 'Service-uri', subtitle: 'Gestionează lista de service-uri.' },
  rapoarte: { title: 'Rapoarte', subtitle: 'Comision și verificare tarif din grilă.' },
  setari: { title: 'Setări', subtitle: 'În curând.' },
}

function AppContent() {
  const [active, setActive] = useState<SectionKey>('dosare')
  const { depasiteCount, arataDoarDepasite } = useDosareContext()
  const { title, subtitle } = TITLURI[active]

  return (
    <AppShell
      active={active}
      onSelect={setActive}
      headerTitle={title}
      headerSubtitle={subtitle}
      notificari={depasiteCount}
      onNotificariClick={() => {
        setActive('dosare')
        arataDoarDepasite()
      }}
    >
      {active === 'dosare' && <DosarePage />}
      {active === 'rapoarte' && <RapoartePage />}
      {active === 'servicii' && <ServiciiPage />}
      {(active === 'dashboard' || active === 'setari') && (
        <ComingSoonPage label={TITLURI[active].title} icon={NAV_ITEMS.find((i) => i.key === active)!.icon} />
      )}
    </AppShell>
  )
}

export default function App() {
  return (
    <TooltipProvider>
      <AuthGate>
        <DosareProvider enabled>
          <AppContent />
        </DosareProvider>
      </AuthGate>
    </TooltipProvider>
  )
}
