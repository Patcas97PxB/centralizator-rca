const CULOARE_CARD = [
  { color: '#3d8bff', nume: 'Programare', detaliu: 'de predat', titlu: 'Programare: De predat / în așteptare' },
  { color: '#00f5a0', nume: 'În termen', detaliu: '3+ zile', titlu: 'În termen: 3+ zile rămase' },
  { color: '#fbbf24', nume: 'Atenție', detaliu: '1–2 zile', titlu: 'Atenție: 1–2 zile rămase' },
  { color: '#ff4d6d', nume: 'Urgență', detaliu: 'expirat', titlu: 'Urgență: Zile expirate' },
  { color: '#94a3b8', nume: 'Finalizat', detaliu: 'arhivă', titlu: 'Finalizat: Arhivat / inactiv' },
]
const ETICHETE = [
  { color: '#e879f9', nume: 'Blochaj documente', detaliu: 'acte / deviz', titlu: 'Blocaj documente: Lipsesc acte / deviz' },
  { color: '#fb923c', nume: 'De sunat', detaliu: 'mașină gata', titlu: 'De sunat: Mașina e gata' },
]

const TITLU = 'text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]'

export function LegendaCulori() {
  return (
    <div className="animate-fade-up flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[20px] border border-[#253150] bg-[#10172a] px-4 py-3.5">
      <div className="flex min-w-0 flex-col gap-2">
        <div className={TITLU}>CULOARE CARD</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {CULOARE_CARD.map((l) => (
            <div key={l.nume} title={l.titlu} className="flex items-center gap-2 whitespace-nowrap">
              <span className="h-[11px] w-1 shrink-0 rounded-sm" style={{ background: l.color, boxShadow: `0 0 8px 1px ${l.color}99` }} />
              <span className="text-[11px] font-extrabold text-[#e2e8f5]">{l.nume}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="hidden h-9 w-px bg-[#1c273f] md:block" aria-hidden="true" />

      <div className="flex min-w-0 flex-col gap-2">
        <div className={TITLU}>ETICHETE</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {ETICHETE.map((l) => (
            <div key={l.nume} title={l.titlu} className="flex items-center gap-2 whitespace-nowrap">
              <span className="size-[9px] shrink-0 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px 1px ${l.color}99` }} />
              <span className="text-[11px] font-extrabold text-[#e2e8f5]">{l.nume}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
