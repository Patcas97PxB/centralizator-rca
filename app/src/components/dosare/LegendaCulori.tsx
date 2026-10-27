import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ETAPA_META } from '@/lib/types'
import { STARE } from '@/lib/culori'

const CULOARE_CARD = [
  { color: STARE.rosu, nume: 'Urgență', detaliu: 'termen expirat sau azi' },
  { color: STARE.galben, nume: 'Atenție', detaliu: '1–2 zile rămase' },
  { color: STARE.verde, nume: 'În termen', detaliu: '3+ zile rămase' },
  { color: STARE.albastru, nume: 'Programare', detaliu: 'înainte de predare' },
  { color: STARE.gri, nume: 'Finalizat', detaliu: 'jos, în arhivă' },
]
const STATUS = Object.values(ETAPA_META).map((m) => ({
  color: m.color,
  nume: m.label.charAt(0) + m.label.slice(1).toLowerCase(),
  detaliu: m.detaliu,
}))

const TITLU = 'mb-2 text-[10px] font-extrabold tracking-[.1em] text-tx-3'

function Rand({ color, nume, detaliu, rotund }: { color: string; nume: string; detaliu: string; rotund?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-[12px]">
      <span className={rotund ? 'size-2 shrink-0 rounded-full' : 'h-3 w-1 shrink-0 rounded-full'} style={{ background: color }} />
      <span className="font-semibold text-foreground">{nume}</span>
      <span className="ml-auto text-[11px] text-tx-3">{detaliu}</span>
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
          className="flex size-10 shrink-0 md:size-[34px] items-center justify-center rounded-[11px] border border-border bg-border/[.24] text-tx-3 transition-colors hover:bg-border/50 hover:text-foreground"
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl border-border bg-card p-4">
        <div className={TITLU}>CULOARE CARD</div>
        <div className="flex flex-col gap-2">
          {CULOARE_CARD.map((l) => (
            <Rand key={l.nume} {...l} />
          ))}
        </div>
        <div className="my-3 h-px bg-border" />
        <div className={TITLU}>ETAPE (din bife)</div>
        <div className="flex flex-col gap-2">
          {STATUS.map((l) => (
            <Rand key={l.nume} {...l} rotund />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
