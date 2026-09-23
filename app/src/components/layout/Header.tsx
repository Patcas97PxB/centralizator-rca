import { useEffect, useRef } from 'react'
import { Bell, ChevronDown, Clock3, LogOut, Sparkles } from 'lucide-react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { setMotionPref, useMotionPref } from '@/lib/motion-pref'
import { useAuth } from '@/hooks/useAuth'
import { useClock } from '@/hooks/useClock'
import { assetUrl } from '@/lib/asset-url'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BackupButtons } from './BackupButtons'

// Aplicatia are un singur cont partajat (nu login individual) — numele afisat e
// hardcodat, ca in mockup-ul primit de la utilizator.
const NUME_UTILIZATOR = 'Pătcaș Bogdan'
const ROL_UTILIZATOR = 'Autonom'

export function Header({
  title,
  subtitle,
  notificari,
  onNotificariClick,
}: {
  title: string
  subtitle?: string
  notificari: number
  onNotificariClick: () => void
}) {
  const { time, date } = useClock()
  const { logout } = useAuth()
  const reduced = usePrefersReducedMotion()
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
      {!reduced && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 h-px w-[120px] animate-[rayLoopH_8s_linear_infinite]"
          style={{ background: 'linear-gradient(90deg, transparent, #fff, transparent)', boxShadow: '0 0 10px 2px rgba(191,219,254,.9)' }}
        />
      )}
      <SidebarTrigger className="md:hidden" />
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

        <button
          type="button"
          className="relative flex size-[34px] items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white"
          onClick={onNotificariClick}
          aria-label={notificari > 0 ? `${notificari} dosare necesită atenție` : 'Notificări'}
        >
          <Bell className="size-4" aria-hidden="true" />
          {notificari > 0 && (
            <span
              className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-[5px] text-[10px] font-extrabold text-white"
              style={{ boxShadow: '0 0 0 2px #0a0e17, 0 0 12px rgba(239,68,68,.75)' }}
            >
              {notificari > 9 ? '9+' : notificari}
            </span>
          )}
        </button>

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
