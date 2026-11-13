import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  ChartColumn,
  CircleCheck,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Plus,
  Search,
  Settings,
  Workflow,
  Wrench,
} from 'lucide-react'
import { laPornireTur, marcheazaTurVazut, turVazut } from '@/lib/tur'
import { cn } from '@/lib/utils'

// Tutorialul interactiv: la prima intrare întreabă „Vrei un tutorial?”, apoi trece pe rând prin
// butoanele reale ale aplicației — restul ecranului se întunecă, butonul rămâne luminat (și „respiră”
// ușor = zoom), o săgeată îl arată, iar lângă el apare explicația. Țintele sunt elementele cu
// `data-tur="…"`; dacă una nu e pe ecran (telefon, listă goală) se ia următoarea din listă sau pasul
// se arată în centru. Nu schimbă nimic în dosare.

type Loc = 'sus' | 'jos' | 'stanga' | 'dreapta'
interface Pas {
  /** valori `data-tur`, în ordinea preferinței; prima vizibilă e ținta */
  tinte: string[]
  icon: typeof Plus
  titlu: string
  text: (tinta: string | null, telefon: boolean) => ReactNode
  /** butoanele mici „respiră” (zoom); zonele mari doar se luminează */
  zoom?: boolean
}

const Punct = ({ culoare, children }: { culoare: string; children: ReactNode }) => (
  <span className="flex items-center gap-2">
    <span className="size-2.5 shrink-0 rounded-full" style={{ background: culoare }} />
    <span>{children}</span>
  </span>
)

const PASI: Pas[] = [
  {
    tinte: ['nou'],
    icon: Plus,
    titlu: 'Dosar nou',
    zoom: true,
    text: () => (
      <>
        De aici adaugi un dosar. În formular, la <b>PRELUARE DATE</b>, încarci nota de constatare sau devizul și câmpurile se
        completează singure.
      </>
    ),
  },
  {
    tinte: ['filtre'],
    icon: Search,
    titlu: 'Caută și filtrează',
    text: (_t, telefon) => (
      <>
        Scrii nr. auto, nr. dosar, RBH sau service-ul și rămân doar dosarele potrivite.
        {!telefon && (
          <>
            {' '}
            Cu <b>Ctrl + K</b> cauți de oriunde din aplicație.
          </>
        )}
      </>
    ),
  },
  {
    tinte: ['azi'],
    icon: ListChecks,
    titlu: 'De făcut azi',
    text: () => (
      <>Aici apare ce e urgent: clienți de sunat, dosare de trimis, predări de azi și de mâine. Un click arată doar acele dosare.</>
    ),
  },
  {
    tinte: ['etape'],
    icon: Workflow,
    titlu: 'Etapele dosarului',
    text: () => (
      <>
        Fiecare dosar trece prin <b>De predat → La client → De trimis → Finalizat</b>. Etapa se schimbă singură când marchezi pasul
        următor pe card.
      </>
    ),
  },
  {
    tinte: ['card', 'gol'],
    icon: LayoutGrid,
    titlu: 'Cardul dosarului',
    text: (tinta) => (
      <>
        {tinta === 'card' ? 'Fiecare dosar e un card.' : 'Aici apar dosarele, fiecare pe cardul lui.'} Culoarea arată termenul:
        <span className="my-2 flex flex-col gap-1">
          <Punct culoare="var(--st-red)">roșu — termen depășit sau azi</Punct>
          <Punct culoare="var(--st-amber)">galben — mai sunt 1–2 zile</Punct>
          <Punct culoare="var(--st-green)">verde — 3 zile sau mai mult</Punct>
        </span>
        Click pe card deschide detaliile, documentele și observațiile.
      </>
    ),
  },
  {
    tinte: ['clopotel'],
    icon: Bell,
    titlu: 'Clopoțelul',
    zoom: true,
    text: () => (
      <>
        Îți amintește ce ai de făcut: termene aproape, dosare netrimise, devize lipsă și reminderele puse de tine cu „Amintește-mi”.
      </>
    ),
  },
  {
    tinte: ['unelte'],
    icon: Wrench,
    titlu: 'Unelte',
    text: (_t, telefon) =>
      telefon ? (
        <>
          Jos ai <b>Zile din deviz</b> (din PDF sau poză) și <b>Modificare PDF</b>. Restul uneltelor le găsești la lupa din antet.
        </>
      ) : (
        <>
          Notițe, <b>Zile din deviz</b> (din PDF sau poză), Modificare PDF, Verificare tarif, Calculator de date, Creare mail și
          Document intrare/ieșire.
        </>
      ),
  },
  {
    tinte: ['nav-rapoarte'],
    icon: ChartColumn,
    titlu: 'Rapoarte',
    zoom: true,
    text: () => <>Valorile contractelor, verificarea tarifului după grilă, statistici și exportul în Excel.</>,
  },
  {
    tinte: ['nav-setari'],
    icon: Settings,
    titlu: 'Setări',
    zoom: true,
    text: () => (
      <>
        Folderul de pe laptop, backup-ul și tema Dark / Light. Tot de aici poți <b>relua tutorialul</b> oricând.
      </>
    ),
  },
]

const vizibil = (el: Element) => {
  const r = el.getBoundingClientRect()
  return r.width > 0 && r.height > 0
}
function gasesteTinta(pas: Pas): { el: HTMLElement; nume: string } | null {
  for (const nume of pas.tinte) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tur="${nume}"]`)) {
      if (vizibil(el)) return { el, nume }
    }
  }
  return null
}

interface Zona {
  top: number
  left: number
  width: number
  height: number
}
const MARGINE = 12 // distanța minimă a explicației față de marginea ecranului
const SPATIU = 46 // locul săgeții, între țintă și explicație
const LUMINA = 6 // cu cât e mai mare zona luminată decât butonul

interface Asezare {
  loc: Loc
  top: number
  left: number
  w: number
  h: number
  /** explicația stă peste zona luminată (nu a încăput lângă ea) — fără săgeată */
  peste?: boolean
}
function asaza(z: Zona, w: number, h: number, vw: number, vh: number): Asezare {
  const incape: Record<Loc, boolean> = {
    jos: vh - (z.top + z.height) >= h + SPATIU + MARGINE,
    sus: z.top >= h + SPATIU + MARGINE,
    dreapta: vw - (z.left + z.width) >= w + SPATIU + MARGINE,
    stanga: z.left >= w + SPATIU + MARGINE,
  }
  // meniul lateral (îngust, lipit de stânga) → explicația în dreapta lui; altfel sub, apoi deasupra
  const lateral = z.left < 260 && z.width <= 260
  const ordine: Loc[] = lateral ? ['dreapta', 'jos', 'sus', 'stanga'] : ['jos', 'sus', 'dreapta', 'stanga']
  const cx = z.left + z.width / 2
  const cy = z.top + z.height / 2
  let loc = ordine.find((l) => incape[l])
  if (!loc && z.width >= 2 * w + SPATIU) {
    // ecran scund (laptop 1366×768) și țintă lată cât pagina: explicația stă peste capătul din dreapta
    // al zonei luminate — mijlocul și stânga ei rămân la vedere
    return { loc: 'dreapta', top: Math.max(MARGINE, Math.min(cy - h / 2, vh - h - MARGINE)), left: z.left + z.width - w - 10, w, h, peste: true }
  }
  loc ??= cy < vh / 2 ? 'jos' : 'sus'
  let top = loc === 'jos' ? z.top + z.height + SPATIU : loc === 'sus' ? z.top - SPATIU - h : cy - h / 2
  let left = loc === 'dreapta' ? z.left + z.width + SPATIU : loc === 'stanga' ? z.left - SPATIU - w : cx - w / 2
  top = Math.max(MARGINE, Math.min(top, vh - h - MARGINE))
  left = Math.max(MARGINE, Math.min(left, vw - w - MARGINE))
  return { loc, top, left, w, h }
}

const SAGEATA: Record<Loc, typeof ArrowUp> = { jos: ArrowUp, sus: ArrowDown, dreapta: ArrowLeft, stanga: ArrowRight }
const BTN_PRIMAR =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground'
const BTN_SECUNDAR =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border-strong px-3.5 text-[13.5px] font-bold text-foreground transition-colors hover:bg-surface-hover'
const BTN_TEXT = 'h-10 rounded-lg px-2 text-[13px] font-semibold text-tx-3 transition-colors hover:text-foreground'

type Faza = 'inchis' | 'intrebare' | 'final' | number

export function Tur({ gata, onDosare, onNou }: { /** datele s-au încărcat */ gata: boolean; onDosare: () => void; onNou: () => void }) {
  const [faza, setFaza] = useState<Faza>('inchis')
  const [zona, setZona] = useState<Zona | null>(null)
  const [numeTinta, setNumeTinta] = useState<string | null>(null)
  const [loc, setLoc] = useState<Asezare | null>(null)
  const cutie = useRef<HTMLDivElement>(null)
  const primar = useRef<HTMLButtonElement>(null)
  const intrebat = useRef(false)

  // Prima intrare: întrebarea apare o singură dată, după ce s-au încărcat dosarele.
  useEffect(() => {
    if (!gata || intrebat.current || turVazut()) return
    intrebat.current = true
    const t = setTimeout(() => {
      // dacă e deja o fereastră deschisă (ex. a pornit direct un formular), nu ne băgăm peste ea
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      setFaza('intrebare')
    }, 700)
    return () => clearTimeout(t)
  }, [gata])

  useEffect(
    () =>
      laPornireTur(() => {
        onDosare()
        setFaza(0)
      }),
    [onDosare],
  )

  const inchide = useCallback(() => {
    marcheazaTurVazut()
    setFaza('inchis')
  }, [])
  const porneste = () => {
    onDosare()
    setFaza(0)
  }
  const inainte = useCallback(() => setFaza((f) => (typeof f === 'number' ? (f + 1 < PASI.length ? f + 1 : 'final') : f)), [])
  const inapoi = useCallback(() => setFaza((f) => (f === 'final' ? PASI.length - 1 : typeof f === 'number' && f > 0 ? f - 1 : f)), [])

  const pas = typeof faza === 'number' ? PASI[faza] : null

  // Ținta pasului: o aducem pe ecran, o măsurăm și o urmărim (redimensionare, derulare, lista care se
  // încarcă). Butoanele mici primesc clasa de zoom cât timp sunt arătate.
  useLayoutEffect(() => {
    if (!pas) {
      setZona(null)
      setNumeTinta(null)
      return
    }
    let el: HTMLElement | null = null
    let viu = true
    const masoara = () => {
      if (!viu) return
      const g = gasesteTinta(pas)
      if (g?.el !== el) {
        el?.classList.remove('tur-zoom')
        el = g?.el ?? null
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.top < 70 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior })
          if (pas.zoom) el.classList.add('tur-zoom')
        }
        setNumeTinta(g?.nume ?? null)
      }
      if (!el) return setZona(null)
      const r = el.getBoundingClientRect()
      // zona luminată nu iese din ecran (meniul lateral e înalt cât pagina)
      const top = Math.max(4, r.top - LUMINA)
      const left = Math.max(4, r.left - LUMINA)
      const z = {
        top,
        left,
        width: Math.min(window.innerWidth - 4, r.right + LUMINA) - left,
        height: Math.min(window.innerHeight - 4, r.bottom + LUMINA) - top,
      }
      setZona((v) => (v && v.top === z.top && v.left === z.left && v.width === z.width && v.height === z.height ? v : z))
    }
    masoara()
    const t = setInterval(masoara, 250)
    window.addEventListener('resize', masoara)
    window.addEventListener('scroll', masoara, true)
    return () => {
      viu = false
      clearInterval(t)
      window.removeEventListener('resize', masoara)
      window.removeEventListener('scroll', masoara, true)
      el?.classList.remove('tur-zoom')
    }
  }, [pas])

  // Locul explicației, după ce îi știm mărimea.
  useLayoutEffect(() => {
    const c = cutie.current
    if (!c || !zona) return setLoc(null)
    setLoc(asaza(zona, c.offsetWidth, c.offsetHeight, window.innerWidth, window.innerHeight))
  }, [zona, faza, numeTinta])

  useEffect(() => {
    if (faza === 'inchis') return
    primar.current?.focus({ preventScroll: true })
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        inchide()
      } else if (typeof faza === 'number' || faza === 'final') {
        if (e.key === 'ArrowRight' && faza !== 'final') inainte()
        else if (e.key === 'ArrowLeft') inapoi()
      }
    }
    window.addEventListener('keydown', taste, true)
    return () => window.removeEventListener('keydown', taste, true)
  }, [faza, inchide, inainte, inapoi])

  if (faza === 'inchis') return null

  const telefon = window.innerWidth < 768
  const centrat = !pas || !zona
  const Sageata = loc && !loc.peste ? SAGEATA[loc.loc] : null
  // săgeata stă în spațiul dintre explicație și țintă, în dreptul țintei
  const sageataStil = (() => {
    if (!loc || !zona) return undefined
    const { w, h } = loc
    const S = 30
    const intre = (v: number, a: number, b: number) => Math.max(a, Math.min(v, b))
    if (loc.loc === 'jos' || loc.loc === 'sus') {
      const x = intre(zona.left + zona.width / 2, loc.left + 24, loc.left + w - 24) - S / 2
      return { left: x, top: loc.loc === 'jos' ? loc.top - SPATIU + (SPATIU - S) / 2 : loc.top + h + (SPATIU - S) / 2 }
    }
    const y = intre(zona.top + zona.height / 2, loc.top + 24, loc.top + h - 24) - S / 2
    return { top: y, left: loc.loc === 'dreapta' ? loc.left - SPATIU + (SPATIU - S) / 2 : loc.left + w + (SPATIU - S) / 2 }
  })()

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/* prinde click-urile: cât ține tutorialul, aplicația de dedesubt nu se apasă din greșeală */}
      <div className={cn('absolute inset-0', centrat && 'bg-[rgba(3,7,18,.72)]')} />

      {pas && zona && (
        <button
          type="button"
          aria-label="Mai departe"
          onClick={inainte}
          className="tur-lumina absolute cursor-pointer rounded-[12px]"
          style={{ top: zona.top, left: zona.left, width: zona.width, height: zona.height }}
        />
      )}

      {Sageata && sageataStil && (
        <span className={cn('pointer-events-none absolute text-accent-tx', `tur-sageata-${loc!.loc}`)} style={sageataStil} aria-hidden="true">
          <Sageata className="size-[30px]" strokeWidth={2.6} />
        </span>
      )}

      <div
        ref={cutie}
        key={String(faza)}
        aria-live="polite"
        className={cn(
          'tur-cutie absolute w-[min(360px,calc(100vw-24px))] rounded-[16px] border border-border-strong bg-card p-5 shadow-[0_18px_50px_rgba(0,0,0,.45)]',
          centrat && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        )}
        style={centrat ? undefined : loc ? { top: loc.top, left: loc.left } : { top: 0, left: 0, visibility: 'hidden' }}
      >
        {faza === 'intrebare' && (
          <>
            <span className="tur-icon mb-3.5 flex size-12 items-center justify-center rounded-[14px] bg-primary/15 text-accent-tx">
              <GraduationCap className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-[18px] font-extrabold tracking-[-.01em] text-foreground">Bine ai venit! Vrei un tutorial?</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-tx-2">
              Îți arăt, în mai puțin de un minut, unde e fiecare lucru: cum adaugi un dosar, ce înseamnă culorile și unde sunt uneltele.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={BTN_SECUNDAR} onClick={inchide}>
                Nu acum
              </button>
              <button ref={primar} type="button" className={BTN_PRIMAR} onClick={porneste}>
                Da, arată-mi
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3.5 text-[12px] text-tx-3">Îl poți porni oricând din Setări → Tutorial.</p>
          </>
        )}

        {pas && typeof faza === 'number' && (
          <>
            <div className="flex items-center gap-3">
              <span className="tur-icon flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/15 text-accent-tx">
                <pas.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-tx-3">
                  Pasul {faza + 1} din {PASI.length}
                </p>
                <h2 className="text-[16.5px] font-extrabold tracking-[-.01em] text-foreground">{pas.titlu}</h2>
              </div>
            </div>
            <div className="mt-3 text-[13.5px] leading-relaxed text-tx-2 [&_b]:font-bold [&_b]:text-foreground">{pas.text(numeTinta, telefon)}</div>
            <div className="mt-4 flex items-center gap-1" aria-hidden="true">
              {PASI.map((_, i) => (
                <span key={i} className={cn('h-1.5 rounded-full transition-all', i === faza ? 'w-5 bg-primary' : i < faza ? 'w-1.5 bg-accent-tx/60' : 'w-1.5 bg-border-strong')} />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" className={BTN_TEXT} onClick={inchide}>
                Închide
              </button>
              <span className="flex-1" />
              {faza > 0 && (
                <button type="button" className={BTN_SECUNDAR} onClick={inapoi}>
                  Înapoi
                </button>
              )}
              <button ref={primar} type="button" className={BTN_PRIMAR} onClick={inainte}>
                {faza + 1 < PASI.length ? 'Înainte' : 'Gata'}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {faza === 'final' && (
          <>
            <span className="tur-icon mb-3.5 flex size-12 items-center justify-center rounded-[14px] bg-st-green/15 text-st-green-tx">
              <CircleCheck className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-[18px] font-extrabold tracking-[-.01em] text-foreground">Asta e tot</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-tx-2">
              Cel mai simplu e să încerci: adaugă un dosar și urmărește-l de la predare până la finalizare.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className={BTN_SECUNDAR} onClick={inchide}>
                Închide
              </button>
              <button
                ref={primar}
                type="button"
                className={BTN_PRIMAR}
                onClick={() => {
                  inchide()
                  onNou()
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Adaugă un dosar
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
