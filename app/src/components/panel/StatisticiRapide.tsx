import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { urgentaDosar } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'

type PerioadaKey = '7' | '30' | 'toate'
type Categorie = 'Finalizate' | 'În derulare' | 'Așteptare' | 'Întârziate'

// Cele 4 categorii agregă statusurile reale intr-un grup mai mic, ca in mockup:
// "Finalizate"=finalizat, "Întârziate"=depasit (urgentaDosar), "Așteptare"=in_asteptare/astept_docum.
function categorie(d: Dosar): Categorie {
  if (d.status === 'finalizat') return 'Finalizate'
  if (urgentaDosar(d).depasit) return 'Întârziate'
  if (d.status === 'in_asteptare' || d.status === 'astept_docum') return 'Așteptare'
  return 'În derulare'
}

const CULOARE: Record<Categorie, string> = {
  Finalizate: '#00f5a0',
  'În derulare': '#3d8bff',
  Așteptare: '#b26bff',
  Întârziate: '#ff4d6d',
}
const ORDINE: Categorie[] = ['Finalizate', 'În derulare', 'Așteptare', 'Întârziate']

function inPerioada(d: Dosar, p: PerioadaKey): boolean {
  if (p === 'toate' || !d.updatedAt) return true
  const zile = p === '7' ? 7 : 30
  return new Date(d.updatedAt).getTime() >= Date.now() - zile * 86400000
}

export function StatisticiRapide({ dosare }: { dosare: Dosar[] }) {
  const [perioada, setPerioada] = useState<PerioadaKey>('7')

  const { counts, total } = useMemo(() => {
    const relevante = dosare.filter((d) => inPerioada(d, perioada))
    const c: Record<Categorie, number> = { Finalizate: 0, 'În derulare': 0, Așteptare: 0, Întârziate: 0 }
    relevante.forEach((d) => {
      c[categorie(d)]++
    })
    return { counts: c, total: relevante.length }
  }, [dosare, perioada])
  const afisat = useCountUp(total)

  return (
    <div className="w-full rounded-[20px] border border-[#253150] bg-[#10172a] p-4">
      <div className="mb-[13px] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#f1f5f9]">
          <BarChart3 className="size-4 text-[#94a3b8]" aria-hidden="true" />
          Statistici
        </div>
        <select
          value={perioada}
          onChange={(e) => setPerioada(e.target.value as PerioadaKey)}
          aria-label="Perioadă statistici"
          className="h-7 cursor-pointer rounded-[9px] border border-[#253150] bg-[#253150]/[.24] px-1.5 text-[11.5px] text-[#e2e8f5] outline-none"
        >
          <option value="7">7 zile</option>
          <option value="30">30 zile</option>
          <option value="toate">Toate</option>
        </select>
      </div>

      <div className="mb-2.5 flex items-baseline gap-1.5">
        <span className="text-[28px] font-extrabold leading-none tracking-[-.02em] tabular-nums text-[#f8fafc]">{afisat}</span>
        <span className="text-[11px] font-semibold text-[#8b9ab5]">dosare în perioadă</span>
      </div>

      <div className="mb-3.5 flex h-2.5 gap-[3px]" aria-hidden="true">
        {ORDINE.map((k) => (
          <span
            key={k}
            className="origin-left animate-[barGrow_.7s_cubic-bezier(.2,.8,.2,1)_both] rounded"
            style={{
              flex: `${counts[k]} 1 0px`,
              minWidth: counts[k] ? 6 : 0,
              background: CULOARE[k],
              boxShadow: `0 0 10px -2px ${CULOARE[k]}`,
            }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-[9px]">
        {ORDINE.map((k) => {
          const pct = total ? Math.round((counts[k] / total) * 100) : 0
          return (
            <div key={k} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="flex min-w-0 items-center gap-[7px] whitespace-nowrap text-[#aab8d0]">
                  <span className="size-2 shrink-0 rounded-[2px]" style={{ background: CULOARE[k] }} />
                  {k}
                </span>
                <span className="flex items-baseline gap-[5px] whitespace-nowrap">
                  <span className="font-extrabold tabular-nums text-[#f1f5f9]">{counts[k]}</span>
                  <span className="text-[10px] tabular-nums text-[#64748b]">{pct}%</span>
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[#253150]/55">
                <span
                  className="block h-full origin-left animate-[barGrow_.8s_cubic-bezier(.2,.8,.2,1)_both] rounded-full"
                  style={{ width: `${pct}%`, background: CULOARE[k] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
