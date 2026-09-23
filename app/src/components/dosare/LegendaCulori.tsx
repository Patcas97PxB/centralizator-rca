import type { ReactNode } from 'react'
import { BellRing, FileWarning, Layers } from 'lucide-react'
import { hex } from '@/lib/color'
import { staggerDelay } from '@/lib/motion'

const CULOARE_CARD = [
  { color: '#ff4d6d', nume: 'Urgență', titlu: 'Urgență: termen expirat sau azi' },
  { color: '#fbbf24', nume: 'Atenție', titlu: 'Atenție: 1–2 zile rămase' },
  { color: '#00f5a0', nume: 'În termen', titlu: 'În termen: 3+ zile rămase' },
  { color: '#3d8bff', nume: 'Programare', titlu: 'Programare: înainte de predare' },
  { color: '#94a3b8', nume: 'Finalizat', titlu: 'Finalizat: arhivat / jos în listă' },
]
const ETICHETE = [
  { color: '#fb923c', nume: 'De sunat', titlu: 'De sunat: status marcat de utilizator (culoarea pastilei de status)', icon: <BellRing className="size-[11px]" strokeWidth={2.6} /> },
  { color: '#e879f9', nume: 'Blochaj documente', titlu: 'Blochaj documente: se așteaptă documente (culoarea pastilei de status)', icon: <FileWarning className="size-[11px]" strokeWidth={2.6} /> },
]

function Pastila({ color, nume, titlu, index, semn }: { color: string; nume: string; titlu: string; index: number; semn: ReactNode }) {
  return (
    <div
      title={titlu}
      className="animate-fade-up flex cursor-default items-center gap-2 whitespace-nowrap rounded-full border py-1 pl-1.5 pr-3 text-[11.5px] font-extrabold text-[#eef2fb] transition-[transform,filter] duration-200 hover:-translate-y-0.5 hover:brightness-125"
      style={{
        borderColor: hex(color, '66'),
        background: `linear-gradient(135deg, ${hex(color, '2b')}, ${hex(color, '0d')})`,
        boxShadow: `0 0 18px -9px ${color}, inset 0 1px 0 rgba(255,255,255,.05)`,
        ...staggerDelay(index, 60),
      }}
    >
      <span
        className="flex size-[19px] shrink-0 items-center justify-center rounded-full text-[10px] font-black text-[#0a0e17]"
        style={{ background: color, boxShadow: `0 0 10px 1px ${hex(color, 'aa')}` }}
      >
        {semn}
      </span>
      {nume}
    </div>
  )
}

const TITLU = 'flex items-center gap-2 text-[10px] font-extrabold tracking-[.1em] text-[#8ea0c4]'

export function LegendaCulori() {
  return (
    <div
      className="animate-fade-up relative overflow-hidden rounded-[20px] border border-[#2a3a63] px-4 pb-3.5 pt-4"
      style={{ background: 'var(--card-gradient)', boxShadow: '0 14px 30px -20px rgba(37,99,235,.7), inset 0 1px 0 rgba(255,255,255,.05)' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #ff4d6d, #fbbf24 28%, #00f5a0 55%, #3d8bff 80%, #94a3b8)', boxShadow: '0 0 14px 1px rgba(96,165,250,.35)' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-[150px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,.28), rgba(124,58,237,0) 70%)' }}
      />

      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-3.5">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className={TITLU}>
            <span
              className="flex size-6 items-center justify-center rounded-lg border border-[#2563eb]/50 bg-[#2563eb]/15 text-[#93c5fd]"
              style={{ boxShadow: '0 0 12px -3px rgba(37,99,235,.9)' }}
            >
              <Layers className="size-3.5" aria-hidden="true" />
            </span>
            CULOARE CARD
            <span className="font-semibold normal-case tracking-normal text-[#64748b]">· ordinea în listă</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {CULOARE_CARD.map((l, i) => (
              <Pastila key={l.nume} color={l.color} nume={l.nume} titlu={l.titlu} index={i} semn={i + 1} />
            ))}
          </div>
        </div>

        <div className="hidden h-14 w-px self-end bg-gradient-to-b from-transparent via-[#2a3a63] to-transparent md:block" aria-hidden="true" />

        <div className="flex min-w-0 flex-col gap-2.5">
          <div className={TITLU}>ETICHETE</div>
          <div className="flex flex-wrap gap-2">
            {ETICHETE.map((l, i) => (
              <Pastila key={l.nume} color={l.color} nume={l.nume} titlu={l.titlu} index={CULOARE_CARD.length + i} semn={l.icon} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
