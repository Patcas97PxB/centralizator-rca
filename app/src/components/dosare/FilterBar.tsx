import { Download, Search, SlidersHorizontal } from 'lucide-react'
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
import { STATUS_META } from '@/lib/types'
import type { Serviciu } from '@/lib/types'
import { cn } from '@/lib/utils'

const CONTROL =
  'h-[34px] rounded-[11px] border-[#253150] bg-[#253150]/[.24] text-[13.5px] font-semibold text-[#f1f5f9] transition-colors hover:bg-[#253150]/50'

export function FilterBar({
  filtre,
  onChange,
  servicii,
  onExport,
}: {
  filtre: DosareFiltre
  onChange: (next: DosareFiltre) => void
  servicii: Serviciu[]
  onExport: () => void
}) {
  const activeFiltreAvansate = !!(
    filtre.service ||
    filtre.startFrom ||
    filtre.startTo ||
    filtre.perioada !== 'toate' ||
    filtre.sortare !== 'actualizare'
  )
  const statusColor = filtre.status === 'toate' ? '#8b9ab5' : (STATUS_META[filtre.status]?.color ?? '#8b9ab5')

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
        <Input
          value={filtre.search}
          onChange={(e) => onChange({ ...filtre, search: e.target.value })}
          placeholder="Caută: nr. auto, RBH, service, dosar, marcă, telefon…"
          className={cn(CONTROL, 'w-full pl-9 pr-3 font-normal')}
        />
      </div>

      <Select value={filtre.status} onValueChange={(v) => onChange({ ...filtre, status: v as DosareFiltre['status'] })}>
        <SelectTrigger className={cn(CONTROL, 'w-[calc(50%-5px)] shrink-0 gap-2 px-2.5 sm:w-[168px]')}>
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: statusColor, boxShadow: filtre.status === 'toate' ? 'none' : `0 0 8px 1px ${statusColor}` }}
          />
          <span className="min-w-0 flex-1 truncate text-left">
            <SelectValue placeholder="Status" />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="toate">Toate stările</SelectItem>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <SelectItem key={key} value={key}>
              {meta.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              CONTROL,
              'flex w-[calc(50%-5px)] shrink-0 items-center justify-center gap-2 whitespace-nowrap border px-3 text-[#cbd5e1] hover:text-white sm:w-[142px]',
              activeFiltreAvansate && 'border-[#2563eb] bg-[#2563eb]/20 text-white',
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtre avansate
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
                  <SelectItem value="actualizare">Ultima actualizare</SelectItem>
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
              <Input
                id="filtruStartFrom"
                type="date"
                value={filtre.startFrom}
                onChange={(e) => onChange({ ...filtre, startFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filtruStartTo">până la</Label>
              <Input
                id="filtruStartTo"
                type="date"
                value={filtre.startTo}
                onChange={(e) => onChange({ ...filtre, startTo: e.target.value })}
              />
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
    </div>
  )
}
