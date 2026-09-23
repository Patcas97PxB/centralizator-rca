import { AlertTriangle, Clock, FolderOpen, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCountUp } from '@/hooks/useCountUp'
import { staggerDelay } from '@/lib/motion'

interface StatCard {
  key: string
  label: string
  value: number
  caption: string
  icon: typeof FolderOpen
  tone: 'success' | 'info' | 'warning' | 'violet'
}

const TONE: Record<StatCard['tone'], { border: string; bg: string; color: string; glow: string }> = {
  success: { border: 'rgba(61,220,151,.4)', bg: 'rgba(61,220,151,.14)', color: '#3ddc97', glow: 'rgba(61,220,151,.5)' },
  info: { border: 'rgba(59,130,246,.42)', bg: 'rgba(59,130,246,.14)', color: '#60a5fa', glow: 'rgba(59,130,246,.55)' },
  warning: { border: 'rgba(245,158,11,.45)', bg: 'rgba(245,158,11,.14)', color: '#fbbf24', glow: 'rgba(245,158,11,.6)' },
  violet: { border: 'rgba(124,58,237,.5)', bg: 'rgba(124,58,237,.16)', color: '#c084fc', glow: 'rgba(124,58,237,.6)' },
}

function KpiTile({ card: c, index, warn }: { card: StatCard; index: number; warn: boolean }) {
  const value = useCountUp(c.value)
  const t = TONE[c.tone]
  return (
    <div
      className="animate-fade-up rounded-2xl border border-[#253150] bg-[#10172a] p-3 transition-[transform,border-color] sm:rounded-[20px] sm:p-4 duration-[180ms] hover:-translate-y-0.5 hover:border-[#3b4d78]"
      style={staggerDelay(index)}
    >
      <span
        className="mb-2 flex size-8 items-center justify-center rounded-[10px] border sm:mb-3 sm:size-[38px] sm:rounded-xl"
        style={{ borderColor: t.border, background: t.bg, color: t.color, boxShadow: `0 0 18px -4px ${t.glow}` }}
      >
        <c.icon className="size-4 sm:size-[18px]" aria-hidden="true" />
      </span>
      <div className="text-[22px] font-extrabold leading-none sm:text-[26px] tracking-[-.02em] tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-[#94a3b8] sm:text-[13px]">{c.label}</div>
      <div className={cn('mt-1 text-[10.5px] sm:mt-[5px] sm:text-[11.5px]', warn ? 'font-bold text-[#fbbf24]' : 'font-semibold text-[#64748b]')}>{c.caption}</div>
    </div>
  )
}

export function StatsRow({
  active,
  total,
  depasite,
  inAsteptare,
}: {
  active: number
  total: number
  depasite: number
  inAsteptare: number
}) {
  const cards: StatCard[] = [
    { key: 'active', label: 'Active', value: active, caption: 'dosare deschise', icon: FolderOpen, tone: 'success' },
    { key: 'total', label: 'Total', value: total, caption: 'dosare în total', icon: ShieldCheck, tone: 'info' },
    { key: 'depasite', label: 'Depășite', value: depasite, caption: depasite > 0 ? 'Necesită atenție' : 'Totul la zi', icon: Clock, tone: 'warning' },
    { key: 'asteptare', label: 'În așteptare', value: inAsteptare, caption: 'status curent', icon: AlertTriangle, tone: 'violet' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] sm:gap-3">
      {cards.map((c, i) => (
        <KpiTile key={c.key} card={c} index={i} warn={c.key === 'depasite' && depasite > 0} />
      ))}
    </div>
  )
}
