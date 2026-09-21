import { Search, SlidersHorizontal } from 'lucide-react'
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

export function FilterBar({
  filtre,
  onChange,
  servicii,
}: {
  filtre: DosareFiltre
  onChange: (next: DosareFiltre) => void
  servicii: Serviciu[]
}) {
  const activeFiltreAvansate = !!(filtre.service || filtre.startFrom || filtre.startTo)

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 sm:min-w-[240px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={filtre.search}
          onChange={(e) => onChange({ ...filtre, search: e.target.value })}
          placeholder="Caută: nr. auto, RBH, service, dosar, marcă, telefon…"
          className="pl-9"
        />
      </div>

      <Select value={filtre.status} onValueChange={(v) => onChange({ ...filtre, status: v as DosareFiltre['status'] })}>
        <SelectTrigger className="sm:w-[190px]">
          <SelectValue placeholder="Status" />
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

      <Select value={filtre.perioada} onValueChange={(v) => onChange({ ...filtre, perioada: v as DosareFiltre['perioada'] })}>
        <SelectTrigger className="sm:w-[160px]">
          <SelectValue placeholder="Perioadă" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="toate">Toată perioada</SelectItem>
          <SelectItem value="7">Ultimele 7 zile</SelectItem>
          <SelectItem value="30">Ultimele 30 zile</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filtre.sortare} onValueChange={(v) => onChange({ ...filtre, sortare: v as DosareFiltre['sortare'] })}>
        <SelectTrigger className="sm:w-[190px]">
          <SelectValue placeholder="Sortare" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="actualizare">Ultima actualizare</SelectItem>
          <SelectItem value="urgenta">Zile rămase</SelectItem>
          <SelectItem value="nrDosar">Nr. dosar</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant={activeFiltreAvansate ? 'default' : 'outline'} className="gap-2">
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtre avansate
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-4">
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
              onClick={() => onChange({ ...filtre, service: '', startFrom: '', startTo: '' })}
            >
              Resetează filtrele avansate
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
