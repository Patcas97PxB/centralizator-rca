import { Suspense, lazy, useEffect, useState } from 'react'
import { Calculator, CalendarClock, Coins, FilePen, FileText, NotebookPen } from 'lucide-react'
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
import { SetariPage } from '@/components/setari/SetariPage'
import { NotitePage } from '@/components/notite/NotitePage'
import { DosareProvider, useDosareContext } from '@/contexts/DosareContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ScanDevizCard } from '@/components/dosare/ScanDevizCard'
import type { ActiuneRapida } from '@/components/dosare/DosarePage'
import { VerificareTarif } from '@/components/unelte/VerificareTarif'
import { CalculatorDate } from '@/components/unelte/CalculatorDate'
import { CautareRapida, type ComandaRapida } from '@/components/unelte/CautareRapida'
import { DocIntrareIesireModal } from '@/components/dosare/DocIntrareIesireModal'

// Editorul PDF (MuPDF + pdf-lib) e mare — se incarca doar cand e deschis.
const ModificarPdfModal = lazy(() => import('@/components/dosare/ModificarPdfModal').then((m) => ({ default: m.ModificarPdfModal })))

const TITLURI: Record<SectionKey, { title: string; subtitle: string }> = {
  dosare: { title: 'Toate dosarele RCA. Un singur loc.', subtitle: 'Urmărește, gestionează, rezolvă mai rapid.' },
  notite: { title: 'Notițe', subtitle: 'Ce ai vorbit la telefon — vizibile toată echipa, legate singure de dosar.' },
  dashboard: { title: 'Dashboard', subtitle: 'În curând.' },
  servicii: { title: 'Service-uri', subtitle: 'Lista folosită la completarea dosarelor.' },
  rapoarte: { title: 'Rapoarte', subtitle: 'Comision, verificare tarif din grilă și export financiar.' },
  setari: { title: 'Setări', subtitle: 'Folderul de pe laptop, backup, recuperare.' },
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
  const [tarifDeschis, setTarifDeschis] = useState(false)
  const [dateDeschis, setDateDeschis] = useState(false)
  const [cautareDeschisa, setCautareDeschisa] = useState(false)
  const [docIIDeschis, setDocIIDeschis] = useState(false)
  const deschidePdf = () => {
    setPdfIncarcat(true)
    setPdfDeschis(true)
  }

  // Ctrl+K (Cmd+K pe Mac) deschide căutarea rapidă de oriunde
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCautareDeschisa((o) => !o)
      }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  }, [])
  const ICON = 'size-[18px]'
  const comenzi: ComandaRapida[] = [
    { cheie: 'notite', titlu: 'Notițe', icon: <NotebookPen className={ICON} />, actiune: () => setActive('notite') },
    { cheie: 'deviz', titlu: 'Zile din deviz', icon: <Calculator className={ICON} />, actiune: () => setDevizDeschis(true) },
    { cheie: 'pdf', titlu: 'Modificare PDF', icon: <FilePen className={ICON} />, actiune: deschidePdf },
    { cheie: 'tarif', titlu: 'Verificare tarif', icon: <Coins className={ICON} />, actiune: () => setTarifDeschis(true) },
    { cheie: 'date', titlu: 'Calculator de date', icon: <CalendarClock className={ICON} />, actiune: () => setDateDeschis(true) },
    { cheie: 'intrare-iesire', titlu: 'Document intrare/ieșire', icon: <FileText className={ICON} />, actiune: () => setDocIIDeschis(true) },
  ]
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
      onPdf={deschidePdf}
      onTarif={() => setTarifDeschis(true)}
      onDate={() => setDateDeschis(true)}
      onDocII={() => setDocIIDeschis(true)}
      onCautare={() => setCautareDeschisa(true)}
    >
      {active === 'dosare' && <DosarePage actiune={actiune} onActiuneFolosita={() => setActiune(null)} />}
      {active === 'rapoarte' && <RapoartePage onAlegeDosar={alegeDosar} />}
      {active === 'notite' && <NotitePage onAlegeDosar={alegeDosar} />}
      {active === 'setari' && <SetariPage />}
      {active === 'servicii' && <ServiciiPage />}
      {active === 'dashboard' && (
        <ComingSoonPage label={TITLURI[active].title} icon={NAV_ITEMS.find((i) => i.key === active)!.icon} />
      )}

      <Dialog open={devizDeschis} onOpenChange={setDevizDeschis}>
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-[440px]">
          <ScanDevizCard
            onClose={() => setDevizDeschis(false)}
            onApply={(an: AnalizaDeviz) => {
              setDevizDeschis(false)
              porneste({ tip: 'deviz', an })
            }}
          />
        </DialogContent>
      </Dialog>

      <VerificareTarif open={tarifDeschis} onClose={() => setTarifDeschis(false)} />
      <CalculatorDate open={dateDeschis} onClose={() => setDateDeschis(false)} />
      <DocIntrareIesireModal dosar={null} open={docIIDeschis} onClose={() => setDocIIDeschis(false)} />
      <CautareRapida open={cautareDeschisa} onClose={() => setCautareDeschisa(false)} onAlegeDosar={alegeDosar} comenzi={comenzi} />

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
