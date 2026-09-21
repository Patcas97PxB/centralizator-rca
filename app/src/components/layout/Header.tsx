import { Bell, ChevronDown, Clock3, LogOut } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
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

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6 md:py-4">
      <SidebarTrigger className="md:hidden" />
      <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-8 w-auto md:hidden" />

      <div className="hidden min-w-0 md:block">
        <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-2 lg:flex">
          <BackupButtons />
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 lg:flex">
          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <div className="text-right leading-tight">
            <div className="text-sm font-semibold tabular-nums">{time}</div>
            <div className="text-[11px] text-muted-foreground">{date}</div>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="relative"
          onClick={onNotificariClick}
          aria-label={notificari > 0 ? `${notificari} dosare necesită atenție` : 'Notificări'}
        >
          <Bell className="size-4" aria-hidden="true" />
          {notificari > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {notificari > 9 ? '9+' : notificari}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  PB
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold">{NUME_UTILIZATOR}</span>
                <span className="block text-xs text-muted-foreground">{ROL_UTILIZATOR}</span>
              </span>
              <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
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
