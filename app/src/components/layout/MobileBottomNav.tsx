import { Calculator, FilePen, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Bara de jos de pe mobil (<md): actiunile rapide. In centru „Dosar nou”, in stanga „Zile din deviz”,
// in dreapta „Modificare PDF” — iconite neutre, fara tigle colorate (redesign F5). Navigarea intre
// sectiuni e sus (MobileTopNav).
function Actiune({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Calculator
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[12px] py-1.5 text-[11.5px] font-semibold text-tx-2 transition-colors active:bg-surface-hover"
    >
      <Icon className="size-5 text-tx-2" aria-hidden="true" />
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
      className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 border-t border-border bg-sidebar px-3 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Acțiuni rapide"
    >
      <Actiune label="Zile din deviz" icon={Calculator} onClick={onDeviz} />

      <div className="flex w-[92px] shrink-0 justify-center">
        <button
          type="button"
          onClick={onNou}
          aria-label="Dosar nou"
          className={cn(
            'btn-brand-gradient relative -mt-6 mb-1 flex size-14 items-center justify-center rounded-full',
            'transition-transform duration-150 active:scale-90 motion-reduce:transition-none',
          )}
          style={{ boxShadow: '0 0 0 5px var(--sidebar)' }}
        >
          <Plus className="size-7 text-white" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>

      <Actiune label="Modificare PDF" icon={FilePen} onClick={onPdf} />
    </nav>
  )
}
