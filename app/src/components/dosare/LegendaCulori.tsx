import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const CULOARE_CARD = [
  { color: '#ff4d6d', nume: 'Urgență', detaliu: 'termen expirat sau azi' },
  { color: '#fbbf24', nume: 'Atenție', detaliu: '1–2 zile rămase' },
  { color: '#00f5a0', nume: 'În termen', detaliu: '3+ zile rămase' },
  { color: '#3d8bff', nume: 'Programare', detaliu: 'înainte de predare' },
  { color: '#94a3b8', nume: 'Finalizat', detaliu: 'jos, în arhivă' },
]
const STATUS = [
  { color: '#fb923c', nume: 'De sunat', detaliu: 'marcat de tine' },
  { color: '#e879f9', nume: 'Blochaj documente', detaliu: 'se așteaptă acte' },
]

const TITLU = 'mb-2 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]'

function Rand({ color, nume, detaliu, rotund }: { color: string; nume: string; detaliu: string; rotund?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span className={rotund ? 'size-2 shrink-0 rounded-full' : 'h-3 w-1 shrink-0 rounded-full'} style={{ background: color }} />
      <span className="font-semibold text-[#e2e8f5]">{nume}</span>
      <span className="ml-auto text-[11px] text-[#7b8aa6]">{detaliu}</span>
    </div>
  )
}

// Legenda apare doar la cerere (buton "i" in randul de filtre), ca sa nu incarce pagina.
export function LegendaButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Legendă culori"
          title="Legendă culori"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] border border-[#253150] bg-[#253150]/[.24] text-[#94a3b8] transition-colors hover:bg-[#253150]/50 hover:text-white"
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl border-[#253150] bg-[#0d1524] p-4">
        <div className={TITLU}>CULOARE CARD</div>
        <div className="flex flex-col gap-2">
          {CULOARE_CARD.map((l) => (
            <Rand key={l.nume} {...l} />
          ))}
        </div>
        <div className="my-3 h-px bg-[#1e2a45]" />
        <div className={TITLU}>STATUS</div>
        <div className="flex flex-col gap-2">
          {STATUS.map((l) => (
            <Rand key={l.nume} {...l} rotund />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
