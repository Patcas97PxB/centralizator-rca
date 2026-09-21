import { Activity } from 'lucide-react'
import { STATUS_META, type Dosar } from '@/lib/types'

function timpRelativ(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.round(diffMs / 60000)
  if (min < 1) return 'acum'
  if (min < 60) return `acum ${min} min`
  const ore = Math.round(min / 60)
  if (ore < 24) return `acum ${ore} h`
  const zile = Math.round(ore / 24)
  return `acum ${zile} ${zile === 1 ? 'zi' : 'zile'}`
}

export function ActivitateRecenta({ dosare, limit = 5 }: { dosare: Dosar[]; limit?: number }) {
  const recente = dosare
    .filter((d) => d.updatedAt)
    .slice()
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, limit)

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Activity className="size-4 text-muted-foreground" aria-hidden="true" />
        Activitate recentă
      </div>
      {recente.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nicio modificare încă.</p>
      ) : (
        <ul className="space-y-3">
          {recente.map((d) => (
            <li key={d.id} className="flex items-start gap-2.5 text-xs">
              <span
                className="mt-1 size-2 shrink-0 rounded-full"
                style={{ background: STATUS_META[d.status]?.color ?? '#94a3b8' }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">
                  Dosar {d.nrAutoPagubit || d.nrDosar || '—'} actualizat
                </div>
                <div className="text-muted-foreground">{timpRelativ(d.updatedAt as string)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
