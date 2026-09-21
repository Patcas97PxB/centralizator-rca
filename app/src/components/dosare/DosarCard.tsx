import { Car, ChevronDown, Phone, Wrench } from 'lucide-react'
import { docStatus, docLabelText } from '@/lib/documente'
import { urgentaDosar } from '@/lib/rca-calc'
import { STATUS_META, type Dosar, type StatusDosar } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EtapeBar } from './EtapeBar'

const URGENTA_TEXT_CLASSES: Record<string, string> = {
  'c-red': 'text-destructive',
  'c-yellow': 'text-warning',
  'c-green': 'text-success',
  'c-albastru': 'text-info',
}

export function DosarCard({
  dosar,
  onStatusChange,
  onDeschide,
}: {
  dosar: Dosar
  onStatusChange: (id: string, status: StatusDosar) => void
  onDeschide: (id: string) => void
}) {
  const meta = STATUS_META[dosar.status] ?? STATUS_META.in_asteptare
  const urgenta = urgentaDosar(dosar)
  const dst = docStatus(dosar)

  return (
    <div
      className="flex min-w-0 flex-col gap-3 rounded-2xl border border-l-4 border-border bg-card p-4"
      style={{ borderLeftColor: meta.color }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Car className="size-4.5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">
              {dosar.nrAutoPagubit || '–'}
              {dosar.marcaModel && <span className="text-muted-foreground"> · {dosar.marcaModel}</span>}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {[dosar.nrDosar, dosar.asigurator, dosar.nrRezervare].filter(Boolean).join(' · ') || '–'}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold"
              style={{ background: meta.color + '22', color: meta.color, borderColor: meta.color }}
            >
              {meta.label}
              <ChevronDown className="size-3" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(STATUS_META)
              .filter(([val]) => val !== 'finalizat' || dosar.status === 'finalizat')
              .map(([val, m]) => (
                <DropdownMenuItem key={val} onClick={() => onStatusChange(dosar.id, val as StatusDosar)}>
                  <span className="size-2 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="size-3.5" aria-hidden="true" /> Tel. client
          </div>
          <div className="truncate font-medium text-foreground">{dosar.telClient || '—'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wrench className="size-3.5" aria-hidden="true" /> Service
          </div>
          <div className="truncate font-medium text-foreground">{dosar.service || '—'}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="size-3.5" aria-hidden="true" /> Tel. service
          </div>
          <div className="truncate font-medium text-foreground">{dosar.telService || '—'}</div>
        </div>
        <div className="flex items-end justify-end">
          <span
            className={cn(
              'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold',
              dst.complete ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning',
            )}
            title={dst.complete ? 'Toate documentele prezente' : 'Lipsesc: ' + dst.missing.map(docLabelText).join(', ')}
          >
            {dst.have}/{dst.total} doc
          </span>
        </div>
      </div>

      <EtapeBar dosar={dosar} />

      <div className="flex items-center justify-between gap-2">
        <div className={cn('min-w-0 truncate text-xs font-semibold', URGENTA_TEXT_CLASSES[urgenta.cls])}>
          {urgenta.bigNum} {urgenta.bigLabel}
        </div>
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => onDeschide(dosar.id)}>
          Vezi detalii
        </Button>
      </div>
      {dosar.updatedAt && (
        <div className="text-[11px] text-muted-foreground">
          Ultima actualizare: {new Date(dosar.updatedAt).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}
