import { Bell, Download, Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DosareFiltre } from '@/lib/dosare-filter'
import type { Serviciu } from '@/lib/types'
import { cn } from '@/lib/utils'
import { LegendaButton } from './LegendaCulori'
import { CampData } from '@/components/ui/camp-data'

const CONTROL =
  'h-10 md:h-[34px] rounded-[11px] border-border bg-border/[.24] text-[13.5px] font-semibold text-foreground transition-colors hover:bg-border/50'

export function FilterBar({
  filtre,
  onChange,
  servicii,
  onExport,
  nrAleMele,
}: {
  filtre: DosareFiltre
  onChange: (next: DosareFiltre) => void
  servicii: Serviciu[]
  onExport: () => void
  /** Cate dosare au „Amintește-mi" (butonul „Ale mele"). */
  nrAleMele: number
}) {
  const activeFiltreAvansate = !!(
    filtre.service ||
    filtre.startFrom ||
    filtre.startTo ||
    filtre.perioada !== 'toate' ||
    filtre.sortare !== 'actualizare'
  )

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-0 flex-1 sm:min-w-[140px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tx-3" aria-hidden="true" />
        <Input
          value={filtre.search}
          onChange={(e) => onChange({ ...filtre, search: e.target.value })}
          placeholder="Caută: nr. auto, RBH, service, dosar, marcă, telefon…"
          className={cn(CONTROL, 'w-full pl-9 pr-3 font-normal')}
        />
      </div>


      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Filtre avansate"
            className={cn(
              CONTROL,
              // pe telefon doar iconitele (Filtre, Ale mele), ca filtrul de etape sa ramana lizibil
              'flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border px-2.5 text-tx-2 hover:text-foreground sm:w-[142px] sm:px-3',
              activeFiltreAvansate && 'border-primary bg-primary/20 text-foreground',
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Filtre avansate</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filtruPerioada">Perioadă</Label>
              <Select value={filtre.perioada} onValueChange={(v) => onChange({ ...filtre, perioada: v as DosareFiltre['perioada'] })}>
                <SelectTrigger id="filtruPerioada" className="w-full">
                  <SelectValue placeholder="Perioadă" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="toate">Toată perioada</SelectItem>
                  <SelectItem value="7">Ultimele 7 zile</SelectItem>
                  <SelectItem value="30">Ultimele 30 zile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtruSortare">Sortare</Label>
              <Select value={filtre.sortare} onValueChange={(v) => onChange({ ...filtre, sortare: v as DosareFiltre['sortare'] })}>
                <SelectTrigger id="filtruSortare" className="w-full">
                  <SelectValue placeholder="Sortare" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="actualizare">Prioritate (implicit)</SelectItem>
                  <SelectItem value="urgenta">Zile rămase</SelectItem>
                  <SelectItem value="nrDosar">Nr. dosar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtruService">Service</Label>
            <Select
              value={filtre.service || '__toate__'}
              onValueChange={(v) => onChange({ ...filtre, service: v === '__toate__' ? '' : v })}
            >
              <SelectTrigger id="filtruService" className="w-full">
                <SelectValue placeholder="Toate service-urile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__toate__">Toate service-urile</SelectItem>
                {servicii.map((s) => (
                  <SelectItem key={s.id} value={s.nume}>
                    {s.nume}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filtruStartFrom">Predare de la</Label>
              <CampData id="filtruStartFrom" value={filtre.startFrom} onChange={(v) => onChange({ ...filtre, startFrom: v })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtruStartTo">până la</Label>
              <CampData id="filtruStartTo" value={filtre.startTo} onChange={(v) => onChange({ ...filtre, startTo: v })} />
            </div>
          </div>
          {activeFiltreAvansate && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange({ ...filtre, service: '', startFrom: '', startTo: '', perioada: 'toate', sortare: 'actualizare' })}
            >
              Resetează filtrele avansate
            </Button>
          )}
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={onExport}>
            <Download className="size-4" aria-hidden="true" />
            Exportă lista filtrată în Excel
          </Button>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        aria-pressed={filtre.doarAmintite}
        onClick={() => onChange({ ...filtre, doarAmintite: !filtre.doarAmintite })}
        title="Arată doar dosarele marcate de tine cu „Amintește-mi”"
        aria-label="Ale mele"
        className={cn(
          CONTROL,
          'flex shrink-0 items-center gap-1.5 whitespace-nowrap border px-2.5 text-tx-2 hover:text-foreground sm:px-3',
          filtre.doarAmintite && 'border-st-orange bg-st-orange/15 text-st-orange hover:bg-st-orange/25 hover:text-st-orange',
        )}
      >
        <Bell className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Ale mele</span>
        <span className={cn('rounded-full px-1.5 text-[11px] font-extrabold tabular-nums', filtre.doarAmintite ? 'bg-st-orange/25' : 'bg-border')}>
          {nrAleMele}
        </span>
      </button>

      <LegendaButton />
    </div>
  )
}
