import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { urgentaDosar } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'

type PerioadaKey = '7' | '30' | 'toate'

// Cele 4 categorii agregă statusurile reale (STATUS_META are 6 stări) intr-un grup mai
// mic, ca in mockup — nimic inventat, doar grupare: "Finalizate"=finalizat,
// "Întârziate"=depasit (calcul real, urgentaDosar), "Așteptare"=in_asteptare/astept_docum,
// restul="În derulare".
function categorie(d: Dosar): 'Finalizate' | 'Întârziate' | 'Așteptare' | 'În derulare' {
  if (d.status === 'finalizat') return 'Finalizate'
  if (urgentaDosar(d).depasit) return 'Întârziate'
  if (d.status === 'in_asteptare' || d.status === 'astept_docum') return 'Așteptare'
  return 'În derulare'
}

const CULOARE: Record<ReturnType<typeof categorie>, string> = {
  Finalizate: 'var(--success)',
  'În derulare': 'var(--info)',
  Așteptare: 'var(--violet)',
  Întârziate: 'var(--destructive)',
}

function inPerioada(d: Dosar, p: PerioadaKey): boolean {
  if (p === 'toate' || !d.updatedAt) return true
  const zile = p === '7' ? 7 : 30
  const limita = Date.now() - zile * 86400000
  return new Date(d.updatedAt).getTime() >= limita
}

export function StatisticiRapide({ dosare }: { dosare: Dosar[] }) {
  const [perioada, setPerioada] = useState<PerioadaKey>('7')

  const { segmente, total } = useMemo(() => {
    const relevante = dosare.filter((d) => inPerioada(d, perioada))
    const counts: Record<string, number> = { Finalizate: 0, 'În derulare': 0, Așteptare: 0, Întârziate: 0 }
    relevante.forEach((d) => {
      counts[categorie(d)]++
    })
    return { segmente: counts, total: relevante.length }
  }, [dosare, perioada])

  const r = 42
  const C = 2 * Math.PI * r
  let acc = 0
  const arcuri = (Object.entries(segmente) as [keyof typeof CULOARE, number][]).map(([label, count]) => {
    const frac = total ? count / total : 0
    const dash = frac * C
    const el = (
      <circle
        key={label}
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={CULOARE[label]}
        strokeWidth="12"
        strokeDasharray={`${dash} ${C - dash}`}
        strokeDashoffset={-acc}
        transform="rotate(-90 50 50)"
      />
    )
    acc += dash
    return el
  })

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
          Statistici rapide
        </div>
        <Select value={perioada} onValueChange={(v) => setPerioada(v as PerioadaKey)}>
          <SelectTrigger size="sm" className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 zile</SelectItem>
            <SelectItem value="30">30 zile</SelectItem>
            <SelectItem value="toate">Toate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="size-24 shrink-0" role="img" aria-label={`Total ${total} dosare în perioada selectată`}>
          {total > 0 ? (
            arcuri
          ) : (
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="12" />
          )}
          <text x="50" y="47" textAnchor="middle" className="fill-foreground text-[20px] font-bold">
            {total}
          </text>
          <text x="50" y="63" textAnchor="middle" className="fill-muted-foreground text-[9px]">
            Total
          </text>
        </svg>

        <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
          {(Object.keys(segmente) as (keyof typeof CULOARE)[]).map((label) => (
            <li key={label} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 shrink-0 rounded-full" style={{ background: CULOARE[label] }} aria-hidden="true" />
                {label}
              </span>
              <span className="font-semibold text-foreground">{segmente[label]}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
