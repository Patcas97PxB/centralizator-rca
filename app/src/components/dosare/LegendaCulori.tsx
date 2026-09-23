const CULOARE_CARD = [
  { color: '#ff4d6d', nume: 'Urgență', titlu: 'Urgență: termen expirat sau azi' },
  { color: '#fbbf24', nume: 'Atenție', titlu: 'Atenție: 1–2 zile rămase' },
  { color: '#00f5a0', nume: 'În termen', titlu: 'În termen: 3+ zile rămase' },
  { color: '#3d8bff', nume: 'Programare', titlu: 'Programare: înainte de predare' },
  { color: '#94a3b8', nume: 'Finalizat', titlu: 'Finalizat: arhivat / jos în listă' },
]
const STATUS = [
  { color: '#fb923c', nume: 'De sunat', titlu: 'De sunat: status marcat de utilizator (culoarea pastilei de status)' },
  { color: '#e879f9', nume: 'Blochaj documente', titlu: 'Blochaj documente: se așteaptă documente (culoarea pastilei de status)' },
]

const TITLU = 'shrink-0 text-[10px] font-extrabold tracking-[.1em] text-[#5d6b86]'
const ITEM = 'flex cursor-default items-center gap-2 whitespace-nowrap text-[12px] font-semibold text-[#cbd5e1]'

export function LegendaCulori() {
  return (
    <div className="animate-fade-up flex flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-2xl border border-[#253150] bg-[#10172a] px-4 py-3">
      <span className={TITLU}>CARD</span>
      {CULOARE_CARD.map((l) => (
        <span key={l.nume} title={l.titlu} className={ITEM}>
          <span className="h-3 w-1 rounded-full" style={{ background: l.color }} />
          {l.nume}
        </span>
      ))}

      <span className="hidden h-4 w-px bg-[#1e2a45] lg:block" aria-hidden="true" />

      <span className={TITLU}>STATUS</span>
      {STATUS.map((l) => (
        <span key={l.nume} title={l.titlu} className={ITEM}>
          <span className="size-2 rounded-full" style={{ background: l.color }} />
          {l.nume}
        </span>
      ))}
    </div>
  )
}
