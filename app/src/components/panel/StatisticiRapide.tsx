import { useMemo } from 'react'
import { BarChart3, CarFront, ImageIcon } from 'lucide-react'
import { useCountUp } from '@/hooks/useCountUp'
import { imagineMasina } from '@/lib/cars'
import type { Dosar } from '@/lib/types'

interface Top {
  nume: string
  count: number
}

// Grupeaza dupa valoare normalizata (fara diferente de majuscule/spatii) si intoarce cel mai frecvent.
function topDupa(dosare: Dosar[], valoare: (d: Dosar) => string | undefined): Top | null {
  const grupuri = new Map<string, Top>()
  for (const d of dosare) {
    const brut = (valoare(d) ?? '').trim().replace(/\s+/g, ' ')
    if (!brut || brut === '—' || brut === '-') continue
    const cheie = brut.toLowerCase()
    const g = grupuri.get(cheie)
    if (g) g.count++
    else grupuri.set(cheie, { nume: brut, count: 1 })
  }
  let best: Top | null = null
  for (const g of grupuri.values()) if (!best || g.count > best.count) best = g
  return best
}

function Cifra({ label, value, color }: { label: string; value: number; color: string }) {
  const afisat = useCountUp(value)
  return (
    <div className="flex items-center justify-between gap-2 text-[12.5px]">
      <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[#aab8d0]">
        <span className="size-2 shrink-0 rounded-[2px]" style={{ background: color, boxShadow: `0 0 8px -1px ${color}` }} />
        {label}
      </span>
      <span className="text-[17px] font-extrabold tabular-nums text-[#f8fafc]">{afisat}</span>
    </div>
  )
}

function Sursa({ top }: { top: Top | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      {top ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[13px] font-bold text-[#e2e8f5]" title={top.nume}>
            {top.nume}
          </span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#8b9ab5]">
            {top.count} {top.count === 1 ? 'dosar' : 'dosare'}
          </span>
        </div>
      ) : (
        <span className="text-[12px] text-[#64748b]">—</span>
      )}
    </div>
  )
}

const TITLU = 'mb-2 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]'

export function StatisticiRapide({ dosare }: { dosare: Dosar[] }) {
  const { finalizate, inCurs, topService, topAsigurator, topVI } = useMemo(() => {
    const fin = dosare.filter((d) => d.status === 'finalizat').length
    return {
      finalizate: fin,
      inCurs: dosare.length - fin,
      topService: topDupa(dosare, (d) => d.service),
      topAsigurator: topDupa(dosare, (d) => d.asigurator),
      topVI: topDupa(dosare, (d) => d.marcaModelInlocuire),
    }
  }, [dosare])

  const pozaVI = topVI ? imagineMasina(topVI.nume) : null

  return (
    <div className="w-full rounded-[20px] border border-[#253150] bg-[#10172a] p-4">
      <div className="mb-[13px] flex items-center gap-2 text-[13.5px] font-bold text-[#f1f5f9]">
        <BarChart3 className="size-4 text-[#94a3b8]" aria-hidden="true" />
        Statistici
      </div>

      <div className="flex flex-col gap-2.5">
        <Cifra label="Total dosare" value={dosare.length} color="#60a5fa" />
        <Cifra label="Finalizate" value={finalizate} color="#94a3b8" />
        <Cifra label="În curs" value={inCurs} color="#00f5a0" />
      </div>

      <div className="my-3.5 h-px bg-[#1e2a45]" />

      <div className={TITLU}>CINE DĂ CELE MAI MULTE LEAD-URI</div>
      <Sursa top={topService} />

      <div className="my-3.5 h-px bg-[#1e2a45]" />

      <div className={TITLU}>ASIGURATORUL CEL MAI DES ÎNTÂLNIT</div>
      <Sursa top={topAsigurator} />

      <div className="my-3.5 h-px bg-[#1e2a45]" />

      <div className={TITLU}>VEHICUL ÎNLOCUIRE CEL MAI OFERIT</div>
      {topVI ? (
        <div className="flex items-center gap-3">
          <div className="flex h-[52px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#253150] bg-[#0b1220]">
            {pozaVI ? (
              <img src={pozaVI} alt={topVI.nume} loading="lazy" className="size-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.6)]" />
            ) : (
              <ImageIcon className="size-5 text-[#3d8bff]/60" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-[#e2e8f5]" title={topVI.nume}>
              {topVI.nume}
            </div>
            <div className="text-[11px] text-[#8b9ab5]">
              oferit de {topVI.count} {topVI.count === 1 ? 'dată' : 'ori'}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-[11.5px] leading-snug text-[#64748b]">
          <CarFront className="size-5 shrink-0" aria-hidden="true" />
          Încă nu există date. Completează „Marcă / model înlocuire” pe dosare.
        </div>
      )}
    </div>
  )
}
