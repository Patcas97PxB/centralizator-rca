import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, Clock3, LogOut, Sparkles } from 'lucide-react'
import { setMotionPref, useMotionPref } from '@/lib/motion-pref'
import { useAuth } from '@/hooks/useAuth'
import { useClock } from '@/hooks/useClock'
import { assetUrl } from '@/lib/asset-url'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DeSunat } from '@/lib/rca-calc'
import { BackupButtons } from './BackupButtons'

// Aplicatia are un singur cont partajat (nu login individual) — numele afisat e
// hardcodat, ca in mockup-ul primit de la utilizator.
const NUME_UTILIZATOR = 'Pătcaș Bogdan'
const ROL_UTILIZATOR = 'Autonom'

export function Header({
  title,
  subtitle,
  deSunat,
  onAlegeDosar,
}: {
  title: string
  subtitle?: string
  deSunat: DeSunat[]
  onAlegeDosar: (id: string) => void
}) {
  const [deschis, setDeschis] = useState(false)
  const { time, date } = useClock()
  const { logout } = useAuth()
  const motionPref = useMotionPref()
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
      style={{ background: 'linear-gradient(90deg, rgba(10,18,36,.94) 0%, rgba(10,14,23,.9) 100%)' }}>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, rgba(96,165,250,.85) 0%, rgba(124,58,237,.6) 55%, rgba(124,58,237,0) 100%)', boxShadow: '0 0 10px 0 rgba(96,165,250,.35)' }}
      />
      <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-8 w-auto md:hidden" />

      <div className="hidden min-w-0 md:block">
        <h1 className="truncate text-[19px] font-extrabold tracking-[-.015em] text-[#f8fafc]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[12.5px] text-[#9fb3d9]">{subtitle}</p>}
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2.5">
        <div className="hidden items-center gap-1.5 lg:flex">
          <BackupButtons />
        </div>
        <div className="hidden items-center gap-[9px] rounded-xl border border-[#253150] bg-[#10172a] px-3 py-1.5 lg:flex">
          <Clock3 className="size-4 text-[#94a3b8]" aria-hidden="true" />
          <div className="text-right leading-[1.15]">
            <div className="text-[13px] font-bold tabular-nums">{time}</div>
            <div className="text-[11px] text-[#94a3b8]">{date}</div>
          </div>
        </div>

        <Popover open={deschis} onOpenChange={setDeschis}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex size-[34px] items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white"
              aria-label={deSunat.length > 0 ? `${deSunat.length} ${deSunat.length === 1 ? "dosar" : "dosare"} de sunat` : 'Notificări'}
            >
              <Bell className="size-4" aria-hidden="true" />
              {deSunat.length > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-[5px] text-[10px] font-extrabold text-white"
                  style={{ boxShadow: '0 0 0 2px #0a0e17, 0 0 12px rgba(239,68,68,.75)' }}
                >
                  {deSunat.length > 9 ? '9+' : deSunat.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[330px] max-w-[calc(100vw-1.5rem)] gap-0 rounded-2xl border-[#253150] bg-[#0d1524] p-0">
            <div className="flex items-center justify-between border-b border-[#1e2a45] px-4 py-3">
              <span className="flex items-center gap-2 text-[13.5px] font-bold text-[#f1f5f9]">
                <Bell className="size-4 text-[#fb923c]" aria-hidden="true" />
                De sunat
              </span>
              <span className="text-[11px] font-semibold text-[#8b9ab5]">{deSunat.length}</span>
            </div>
            {deSunat.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-[#8b9ab5]">Niciun dosar de sunat acum.</p>
            ) : (
              <ul className="max-h-[340px] overflow-y-auto p-1.5">
                {deSunat.map(({ dosar, zile, marcat }) => {
                  const culoare = marcat ? '#fb923c' : zile !== null && zile <= 0 ? '#ff4d6d' : '#fbbf24'
                  const eticheta =
                    zile === null ? 'de sunat' : zile < 0 ? `expirat (+${Math.abs(zile)})` : zile === 0 ? 'azi' : zile === 1 ? '1 zi' : `${zile} zile`
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
                        <span className="size-2 shrink-0 rounded-full" style={{ background: culoare, boxShadow: `0 0 8px 1px ${culoare}aa` }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-[#e2e8f5]">
                            {dosar.nrAutoPagubit || dosar.nrDosar || '—'}
                            {dosar.marcaModel && <span className="font-medium text-[#8b9ab5]"> · {dosar.marcaModel}</span>}
                          </span>
                          <span className="block truncate text-[11px] text-[#8b9ab5]">
                            {dosar.telClient ? `Client: ${dosar.telClient}` : 'Fără telefon client'}
                          </span>
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
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-[9px] rounded-xl py-[5px] pl-[5px] pr-2 transition-colors hover:bg-white/5">
              <Avatar className="size-[34px] ring-1 ring-[#60a5fa]/45">
                <AvatarFallback className="bg-[#2563eb] text-xs font-extrabold text-white">
                  PB
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-[1.2] sm:block">
                <span className="block text-[13px] font-bold">{NUME_UTILIZATOR}</span>
                <span className="block text-[11.5px] text-[#94a3b8]">{ROL_UTILIZATOR}</span>
              </span>
              <ChevronDown className="hidden size-[15px] text-[#94a3b8] sm:block" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setMotionPref(motionPref === 'on' ? 'auto' : 'on')}>
              <Sparkles />
              {motionPref === 'on' ? 'Animații: pornite (forțat)' : 'Animații: automat (după sistem)'}
            </DropdownMenuItem>
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
