import { useState } from 'react'
import { filtreImplicite } from '@/lib/dosare-filter'
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
  servicii: { title: 'Service-uri', subtitle: 'Lista folosită la completarea dosarelor.' },
  rapoarte: { title: 'Rapoarte', subtitle: 'Comision, verificare tarif din grilă și export financiar.' },
  setari: { title: 'Setări', subtitle: 'În curând.' },
}

function AppContent() {
  const [active, setActive] = useState<SectionKey>('dosare')
  const { deSunat, setFiltre } = useDosareContext()
  const { title, subtitle } = TITLURI[active]

  // Te duce la cardul dosarului: comuta pe Dosare, scoate filtrele care l-ar ascunde, deruleaza
  // pana la el si il evidentiaza scurt.
  function alegeDosar(id: string) {
    setActive('dosare')
    setFiltre(filtreImplicite)
    let incercari = 0
    const cauta = () => {
      const el = document.getElementById('dosar-' + id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.remove('dosar-evidentiat')
        void el.offsetWidth
        el.classList.add('dosar-evidentiat')
        window.setTimeout(() => el.classList.remove('dosar-evidentiat'), 2600)
      } else if (incercari++ < 30) {
        window.setTimeout(cauta, 50)
      }
    }
    window.setTimeout(cauta, 50)
  }

  return (
    <AppShell
      active={active}
      onSelect={setActive}
      headerTitle={title}
      headerSubtitle={subtitle}
      deSunat={deSunat}
      onAlegeDosar={alegeDosar}
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
