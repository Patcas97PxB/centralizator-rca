import { FileEdit, FileSearch, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Bara de jos de pe mobil (<md): actiunile rapide. In centru „Dosar nou” (butonul mare, ca cel de pe
// site), in stanga „Zile din deviz”, in dreapta „Modificare PDF”. Navigarea intre sectiuni e sus
// (MobileTopNav).
function Actiune({
  label,
  icon: Icon,
  onClick,
  accent,
}: {
  label: string
  icon: typeof FileSearch
  onClick: () => void
  accent: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-[13px] py-1.5 text-[11px] font-bold text-[#9aa8c1] transition-colors active:bg-white/5"
    >
      <span
        className="flex size-8 items-center justify-center rounded-[10px] border transition-transform duration-150 group-active:scale-90 motion-reduce:transition-none"
        style={{ borderColor: accent + '66', background: accent + '1f', color: accent }}
      >
        <Icon className="size-[18px]" aria-hidden="true" />
      </span>
      <span className="max-w-full truncate leading-none">{label}</span>
    </button>
  )
}

export function MobileBottomNav({
  onNou,
  onDeviz,
  onPdf,
}: {
  onNou: () => void
  onDeviz: () => void
  onPdf: () => void
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-end gap-1 border-t border-[#1c273f] px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] md:hidden"
      style={{ background: 'linear-gradient(#0a1224f2, #070b14f2)' }}
      aria-label="Acțiuni rapide"
    >
      <Actiune label="Zile din deviz" icon={FileSearch} onClick={onDeviz} accent="#7dd3fc" />

      <div className="flex w-[92px] shrink-0 justify-center">
        <button
          type="button"
          onClick={onNou}
          aria-label="Dosar nou"
          className={cn(
            'btn-brand-gradient relative -mt-7 mb-2 flex size-[62px] items-center justify-center rounded-full border border-[#bfdbfe]/45',
            'transition-transform duration-150 active:scale-90 motion-reduce:transition-none',
          )}
          style={{ boxShadow: '0 0 0 5px #070b14, 0 12px 28px -8px rgba(37,99,235,.9), 0 0 22px -4px rgba(124,58,237,.7)' }}
        >
          <Plus className="size-7 text-white [filter:drop-shadow(0_1px_4px_rgba(0,0,0,.35))]" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>

      <Actiune label="Modificare PDF" icon={FileEdit} onClick={onPdf} accent="#00f5a0" />
    </nav>
  )
}
