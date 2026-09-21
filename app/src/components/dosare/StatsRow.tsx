import { AlertTriangle, Clock, Download, FolderOpen, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCard {
  key: string
  label: string
  value: number
  caption: string
  icon: typeof FolderOpen
  tone: 'success' | 'info' | 'warning' | 'violet'
}

const TONE_CLASSES: Record<StatCard['tone'], string> = {
  success: 'border-success/30 bg-success/10 text-success',
  info: 'border-info/30 bg-info/10 text-info',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  violet: 'border-violet/30 bg-violet/10 text-violet',
}

export function StatsRow({
  active,
  total,
  depasite,
  inAsteptare,
  onExport,
}: {
  active: number
  total: number
  depasite: number
  inAsteptare: number
  onExport: () => void
}) {
  const cards: StatCard[] = [
    { key: 'active', label: 'Active', value: active, caption: 'dosare deschise', icon: FolderOpen, tone: 'success' },
    { key: 'total', label: 'Total', value: total, caption: 'dosare în total', icon: ShieldCheck, tone: 'info' },
    {
      key: 'depasite',
      label: 'Depășite',
      value: depasite,
      caption: depasite > 0 ? 'Necesită atenție' : 'Totul la zi',
      icon: Clock,
      tone: 'warning',
    },
    {
      key: 'asteptare',
      label: 'În așteptare',
      value: inAsteptare,
      caption: 'status curent',
      icon: AlertTriangle,
      tone: 'violet',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.key} className="rounded-2xl border border-border bg-card p-4">
          <div className={cn('mb-3 flex size-9 items-center justify-center rounded-xl border', TONE_CLASSES[c.tone])}>
            <c.icon className="size-4.5" aria-hidden="true" />
          </div>
          <div className="text-2xl font-bold text-foreground">{c.value}</div>
          <div className="text-sm text-muted-foreground">{c.label}</div>
          <div
            className={cn(
              'mt-1.5 text-xs font-medium',
              c.key === 'depasite' && depasite > 0 ? 'text-warning' : 'text-muted-foreground',
            )}
          >
            {c.caption}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onExport}
        className="col-span-2 flex flex-col justify-between rounded-2xl border border-primary/40 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15 lg:col-span-1"
      >
        <div className="flex items-center justify-between">
          <div className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
            <Download className="size-4.5" aria-hidden="true" />
          </div>
          <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
            <Sparkles className="size-3" aria-hidden="true" />
            NOU
          </span>
        </div>
        <div className="mt-3 text-sm font-semibold text-foreground">Exportă dosarele în Excel</div>
        <div className="mt-1 text-xs text-muted-foreground">Lista filtrată curentă, gata de descărcat.</div>
      </button>
    </div>
  )
}
