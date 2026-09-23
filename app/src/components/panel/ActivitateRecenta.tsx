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
    <div className="w-full rounded-[20px] border border-[#253150] bg-[#10172a] p-4">
      <div className="mb-[13px] flex items-center gap-2 text-[13.5px] font-bold text-[#f1f5f9]">
        <Activity className="size-4 text-[#94a3b8]" aria-hidden="true" />
        Activitate recentă
      </div>
      {recente.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nicio modificare încă.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {recente.map((d) => {
            const c = STATUS_META[d.status]?.color ?? '#94a3b8'
            return (
              <li key={d.id} className="flex items-start gap-2.5 text-[11.5px]">
                <span
                  className="mt-[5px] size-2 shrink-0 rounded-full"
                  style={{ background: c, boxShadow: `0 0 9px 1px ${c}bb` }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="truncate font-bold text-[#e2e8f5]">Dosar {d.nrAutoPagubit || d.nrDosar || '—'} actualizat</div>
                  <div className="mt-px text-[#8b9ab5]">{timpRelativ(d.updatedAt as string)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
