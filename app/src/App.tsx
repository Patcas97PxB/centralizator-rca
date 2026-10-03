import { Suspense, lazy, useState } from 'react'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { filtreImplicite } from '@/lib/dosare-filter'
import { mergiLaCardDosar } from '@/lib/mergi-la-dosar'
import { AuthGate } from '@/components/AuthGate'
import { AppShell } from '@/components/layout/AppShell'
import { NAV_ITEMS, type SectionKey } from '@/components/layout/nav-items'
import { ComingSoonPage } from '@/components/ComingSoonPage'
import { DosarePage } from '@/components/dosare/DosarePage'
import { RapoartePage } from '@/components/rapoarte/RapoartePage'
import { ServiciiPage } from '@/components/servicii/ServiciiPage'
import { DosareProvider, useDosareContext } from '@/contexts/DosareContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ScanDevizCard } from '@/components/dosare/ScanDevizCard'
import type { ActiuneRapida } from '@/components/dosare/DosarePage'

// Editorul PDF (MuPDF + pdf-lib) e mare — se incarca doar cand e deschis.
const ModificarPdfModal = lazy(() => import('@/components/dosare/ModificarPdfModal').then((m) => ({ default: m.ModificarPdfModal })))

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
  // Actiunile din bara de jos de pe mobil. „Dosar nou” si rezultatul „Zile din deviz” deschid formularul
  // din pagina Dosare (comutam pe ea daca e nevoie); „Modificare PDF” merge din orice pagina.
  const [actiune, setActiune] = useState<ActiuneRapida | null>(null)
  const [devizDeschis, setDevizDeschis] = useState(false)
  const [pdfDeschis, setPdfDeschis] = useState(false)
  const [pdfIncarcat, setPdfIncarcat] = useState(false)
  function porneste(a: { tip: 'nou' } | { tip: 'deviz'; an: AnalizaDeviz }) {
    setActive('dosare')
    setActiune({ ...a, id: Date.now() } as ActiuneRapida)
  }

  function alegeDosar(id: string) {
    setActive('dosare')
    setFiltre(filtreImplicite)
    mergiLaCardDosar(id)
  }

  return (
    <AppShell
      active={active}
      onSelect={setActive}
      headerTitle={title}
      headerSubtitle={subtitle}
      deSunat={deSunat}
      onAlegeDosar={alegeDosar}
      onNou={() => porneste({ tip: 'nou' })}
      onDeviz={() => setDevizDeschis(true)}
      onPdf={() => {
        setPdfIncarcat(true)
        setPdfDeschis(true)
      }}
    >
      {active === 'dosare' && <DosarePage actiune={actiune} />}
      {active === 'rapoarte' && <RapoartePage />}
      {active === 'servicii' && <ServiciiPage />}
      {(active === 'dashboard' || active === 'setari') && (
        <ComingSoonPage label={TITLURI[active].title} icon={NAV_ITEMS.find((i) => i.key === active)!.icon} />
      )}

      <Dialog open={devizDeschis} onOpenChange={setDevizDeschis}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-3 rounded-[22px] border border-[#2c3a5c] bg-[#0d1524] bg-none p-4 sm:max-w-[380px]">
          <DialogTitle className="sr-only">Zile din deviz</DialogTitle>
          <ScanDevizCard
            onApply={(an: AnalizaDeviz) => {
              setDevizDeschis(false)
              porneste({ tip: 'deviz', an })
            }}
          />
        </DialogContent>
      </Dialog>

      {pdfIncarcat && (
        <Suspense fallback={null}>
          <ModificarPdfModal open={pdfDeschis} onClose={() => setPdfDeschis(false)} />
        </Suspense>
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
