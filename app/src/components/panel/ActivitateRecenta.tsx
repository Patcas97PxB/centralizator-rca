import { Activity } from 'lucide-react'
import { etapaDosar } from '@/lib/rca-calc'
import { ETAPA_META, type Dosar } from '@/lib/types'

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

export function ActivitateRecenta({
  dosare,
  limit = 5,
  onAlege,
}: {
  dosare: Dosar[]
  limit?: number
  /** Click pe un rand: te duce la cardul dosarului. */
  onAlege?: (id: string) => void
}) {
  const recente = dosare
    .filter((d) => d.updatedAt)
    .slice()
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, limit)

  return (
    <div className="w-full rounded-[20px] border border-border bg-card p-4">
      <div className="mb-[13px] flex items-center gap-2 text-[13.5px] font-bold text-foreground">
        <Activity className="size-4 text-tx-3" aria-hidden="true" />
        Activitate recentă
      </div>
      {recente.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nicio modificare încă.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {recente.map((d) => {
            const c = ETAPA_META[etapaDosar(d)].color
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onAlege?.(d.id)}
                  title="Mergi la dosar"
                  className="-mx-2 flex w-[calc(100%+1rem)] items-start gap-2.5 rounded-[10px] px-2 py-1 text-left text-[11.5px] transition-colors hover:bg-foreground/[.05] focus-visible:bg-foreground/[.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <span
                    className="mt-[5px] size-2 shrink-0 rounded-full"
                    style={{ background: c }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-bold text-foreground">Dosar {d.nrAutoPagubit || d.nrDosar || '—'} actualizat</div>
                    <div className="mt-px text-tx-3">{timpRelativ(d.updatedAt as string)}</div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
