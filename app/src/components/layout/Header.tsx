import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ChevronDown, Laptop, LogOut, Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { assetUrl } from '@/lib/asset-url'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DeSunat, TipAviz } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'
import { permiteCitirea, useFolderLocal } from '@/lib/folder-local'
import { ESTE_DEMO } from '@/lib/demo'
import { initiale, numeDinEmail } from '@/lib/autentificare'
import { useDosareContext } from '@/contexts/DosareContext'
import { faraReminder, fmtZi, peste, remindere, reminderScadent, textCand } from '@/lib/reminder'
import { cn } from '@/lib/utils'
import { STARE } from '@/lib/culori'

type Tab = 'toate' | 'ale_mele'
const CHEIE_TAB = 'rca-clopotel-tab'
function tabSalvat(): Tab {
  try {
    return localStorage.getItem(CHEIE_TAB) === 'ale_mele' ? 'ale_mele' : 'toate'
  } catch {
    return 'toate'
  }
}

const zileText = (n: number) => (n === 1 ? '1 zi' : `${n} zile`)

// Textul fiecarui aviz din clopotel: culoarea, pastila din dreapta si ce ai de facut.
function descriereAviz(tip: TipAviz, zile: number | null, d: Dosar): { culoare: string; eticheta: string; detaliu: string } {
  switch (tip) {
    case 'termen':
      return {
        culoare: zile !== null && zile <= 0 ? STARE.rosu : STARE.galben,
        eticheta: zile === null ? 'termen' : zile < 0 ? `expirat (+${Math.abs(zile)})` : zile === 0 ? 'azi' : zileText(zile),
        detaliu: d.telClient
          ? `Sună clientul: ${d.telClient}`
          : `${zile !== null && zile < 0 ? 'Termen depășit' : 'Termen aproape'} · fără telefon client`,
      }
    case 'deviz':
      return {
        culoare: STARE.albastru,
        eticheta: 'fără deviz',
        detaliu: `Sună service-ul după deviz${d.telService ? `: ${d.telService}` : ''} · predată de ${zileText(zile ?? 0)}`,
      }
    case 'netrimis':
      return {
        culoare: STARE.mov,
        eticheta: 'netrimis',
        detaliu: `Preluată de ${zileText(zile ?? 0)} · centralizează documentele și trimite mailul`,
      }
    default:
      return {
        culoare: STARE.portocaliu,
        eticheta: textCand(d.amintesteLa),
        detaliu: d.amintesteNota
          ? d.amintesteNota + (/client/i.test(d.amintesteNota) && d.telClient ? `: ${d.telClient}` : /service/i.test(d.amintesteNota) && d.telService ? `: ${d.telService}` : '')
          : 'Amintește-mi (marcat de tine)',
      }
  }
}

// Numele celui logat (din adresa Autonom, vezi lib/autentificare.ts). In varianta de test (/demo/)
// nu apare un nume real.
const ROL_UTILIZATOR = 'Autonom'

export function Header({
  title,
  subtitle,
  deSunat,
  onAlegeDosar,
  onNou,
}: {
  title: string
  subtitle?: string
  deSunat: DeSunat[]
  onAlegeDosar: (id: string) => void
  onNou: () => void
}) {
  const [deschis, setDeschis] = useState(false)
  const [tab, setTabState] = useState<Tab>(tabSalvat)
  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      localStorage.setItem(CHEIE_TAB, t)
    } catch {
      /* fara stocare: ramane doar pe sesiune */
    }
  }
  const { dosare, salveazaRapid } = useDosareContext()
  const aleMele = remindere(dosare)
  const { logout, email } = useAuth()
  const NUME_UTILIZATOR = ESTE_DEMO ? 'DEMO' : numeDinEmail(email)
  const INITIALE_UTILIZATOR = ESTE_DEMO ? 'D' : initiale(NUME_UTILIZATOR)
  const folder = useFolderLocal()
  // Chrome cere din nou voie la folderul de pe laptop la fiecare pornire: atunci (doar atunci) apare aici un
  // buton, ca permisiunea să fie la un click; restul setărilor folderului sunt în Setări.
  const folderAsteapta = folder.suportat && !!folder.nume && folder.permis !== 'granted'
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const sync = () => document.documentElement.style.setProperty('--hdrH', el.offsetHeight + 'px')
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header ref={headerRef} className="isolate sticky top-0 z-30 flex min-h-[58px] flex-wrap items-center gap-3 overflow-hidden px-4 py-3 backdrop-blur-[14px] md:px-6 md:py-[14px]"
      style={{ background: 'color-mix(in srgb, var(--background) 94%, transparent)' }}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'var(--border)' }}
      />
      <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-8 w-auto md:hidden" />

      <div className="hidden min-w-0 md:block">
        <h1 className="truncate text-[19px] font-extrabold tracking-[-.015em] text-foreground">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-tx-3">{subtitle}</p>}
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        {folderAsteapta && (
          <button
            type="button"
            onClick={() => void permiteCitirea()}
            title={`Dă voie aplicației să citească folderul „${folder.nume}” de pe laptop`}
            className="flex h-[34px] items-center gap-1.5 rounded-[10px] border border-st-amber/50 bg-st-amber/10 px-2.5 text-[12.5px] font-bold text-st-amber-tx transition-colors hover:bg-st-amber/20"
          >
            <Laptop className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Permite folderul</span>
          </button>
        )}
        <button
          type="button"
          onClick={onNou}
          className="hidden h-[34px] items-center gap-1.5 rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex"
        >
          <Plus className="size-4" aria-hidden="true" />
          Dosar nou
        </button>

        <Popover open={deschis} onOpenChange={setDeschis}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex size-[34px] items-center justify-center rounded-[10px] border border-border bg-border/[.28] text-tx-2 transition-colors hover:bg-border/60 hover:text-white"
              aria-label={deSunat.length > 0 ? `${deSunat.length} ${deSunat.length === 1 ? "aviz" : "avize"}` : 'Notificări'}
            >
              <Bell className="size-4" aria-hidden="true" />
              {deSunat.length > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-st-red px-[5px] text-[10px] font-extrabold text-white"
                  style={{ boxShadow: '0 0 0 2px var(--background)' }}
                >
                  {deSunat.length > 9 ? '9+' : deSunat.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-1.5rem)] gap-0 rounded-2xl border-border bg-card p-0">
            <div className="flex items-center justify-between border-b border-border px-4 pb-2 pt-3">
              <span className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
                <Bell className="size-4 text-st-orange" aria-hidden="true" />
                De făcut
              </span>
              <div className="flex rounded-full border border-border bg-card p-0.5 text-[11px] font-bold" role="tablist">
                {([['toate', 'Toate', deSunat.length], ['ale_mele', 'Ale mele', aleMele.length]] as const).map(([k, label, n]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={cn(
                      'rounded-full px-2.5 py-1 transition-colors',
                      tab === k ? (k === 'ale_mele' ? 'bg-st-orange/20 text-st-orange' : 'bg-border text-white') : 'text-tx-3 hover:text-tx-2',
                    )}
                  >
                    {label} {n}
                  </button>
                ))}
              </div>
            </div>
            {tab === 'toate' ? (
              deSunat.length === 0 ? (
                <p className="px-4 py-6 text-center text-[12.5px] text-tx-3">Nimic de făcut acum.</p>
              ) : (
                <ul className="max-h-[340px] overflow-y-auto p-1.5">
                  {deSunat.map(({ dosar, zile, tip }) => {
                    const { culoare, eticheta, detaliu } = descriereAviz(tip, zile, dosar)
                    return (
                      <li key={dosar.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setDeschis(false)
                            onAlegeDosar(dosar.id)
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ background: culoare }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-bold text-foreground">
                              {dosar.nrAutoPagubit || dosar.nrDosar || '—'}
                              {dosar.marcaModel && <span className="font-medium text-tx-3"> · {dosar.marcaModel}</span>}
                            </span>
                            <span className="block truncate text-[11px] text-tx-3">{detaliu}</span>
                          </span>
                          <span
                            className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase"
                            style={{ color: culoare, borderColor: `${culoare}66`, background: `${culoare}1f` }}
                          >
                            {eticheta}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )
            ) : aleMele.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] leading-relaxed text-tx-3">
                Nu ai remindere.
                <br />
                Pe card, apasă pe etapă → „Amintește-mi…”.
              </p>
            ) : (
              <ul className="max-h-[340px] overflow-y-auto p-1.5">
                {aleMele.map((dosar) => {
                  const scadent = reminderScadent(dosar)
                  const culoare = scadent ? STARE.portocaliu : STARE.gri
                  return (
                    <li key={dosar.id} className="flex items-center gap-1 rounded-xl pr-1 transition-colors hover:bg-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setDeschis(false)
                          onAlegeDosar(dosar.id)
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 px-2.5 py-2 text-left"
                      >
                        <span className="size-2 shrink-0 rounded-full" style={{ background: culoare }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-foreground">
                            {dosar.nrAutoPagubit || dosar.nrDosar || '—'}
                            {dosar.marcaModel && <span className="font-medium text-tx-3"> · {dosar.marcaModel}</span>}
                          </span>
                          <span className="block truncate text-[11px] text-tx-3">
                            {dosar.amintesteNota || 'Amintește-mi'}
                            {dosar.amintesteLa && !scadent ? ` · ${fmtZi(dosar.amintesteLa)}` : ''}
                          </span>
                        </span>
                        <span
                          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase"
                          style={{ color: culoare, borderColor: `${culoare}66`, background: `${culoare}1f` }}
                        >
                          {textCand(dosar.amintesteLa)}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Amână o zi"
                        aria-label="Amână o zi"
                        onClick={() => {
                          const baza = dosar.amintesteLa && dosar.amintesteLa > peste(0) ? dosar.amintesteLa : peste(0)
                          const d = new Date(baza + 'T00:00:00')
                          d.setDate(d.getDate() + 1)
                          const p = (x: number) => String(x).padStart(2, '0')
                          void salveazaRapid({ ...dosar, amintesteLa: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` })
                        }}
                        className="shrink-0 rounded-lg px-1.5 py-1 text-[10.5px] font-extrabold text-tx-3 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        +1 zi
                      </button>
                      <button
                        type="button"
                        title="Gata — scoate reminderul"
                        aria-label="Gata — scoate reminderul"
                        onClick={() => void salveazaRapid({ ...dosar, ...faraReminder })}
                        className="flex size-7 shrink-0 items-center justify-center rounded-lg text-st-green transition-colors hover:bg-st-green/15"
                      >
                        <Check className="size-4" strokeWidth={3} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-[9px] rounded-xl py-[5px] pl-[5px] pr-2 transition-colors hover:bg-white/5">
              <Avatar className="size-[34px] ring-1 ring-accent-tx/45">
                <AvatarFallback className="bg-primary text-xs font-extrabold text-white">
                  {INITIALE_UTILIZATOR}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-[1.2] sm:block">
                <span className="block text-[13px] font-bold">{NUME_UTILIZATOR}</span>
                <span className="block text-[11.5px] text-tx-3">{ROL_UTILIZATOR}</span>
              </span>
              <ChevronDown className="hidden size-[15px] text-tx-3 sm:block" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut />
              Ieși din cont
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
