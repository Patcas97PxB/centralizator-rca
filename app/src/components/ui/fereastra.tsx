import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// Ferestrele mari ale aplicației (Editează, Documente, Modificare PDF) în stilul „Liniștit” (redesign):
// același antet (titlu + rând secundar + închide), același subsol lipit jos și aceleași butoane.
// Ferestrele mici folosesc direct DialogContent (stilul de bază e același: card, contur, colțuri 16 px).

/** Clasele pentru DialogContent la o fereastră mare (corp care derulează, antet și subsol lipite). */
export const FEREASTRA_MARE =
  'max-h-[90vh] grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto p-0'

export const BTN_SECUNDAR =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-border-strong px-4 text-[13.5px] font-bold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60'
export const BTN_PRIMAR =
  'inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60'
export const BTN_PERICOL =
  'inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13.5px] font-bold text-st-red transition-colors hover:bg-st-red/10'

export function FereastraAntet({ titlu, subtitlu, onClose }: { titlu: ReactNode; subtitlu?: ReactNode; onClose: () => void }) {
  return (
    <DialogHeader className="sticky top-0 z-[5] flex-row items-start gap-3 border-b border-border bg-card px-5 py-4 text-left">
      <div className="min-w-0 flex-1">
        <DialogTitle className="text-[17px] font-bold leading-tight text-foreground">{titlu}</DialogTitle>
        {subtitlu ? (
          <DialogDescription className="mt-0.5 truncate text-[12.5px] text-tx-3">{subtitlu}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{titlu}</DialogDescription>
        )}
      </div>
      <button
        type="button"
        aria-label="Închide"
        onClick={onClose}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-tx-2 transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </DialogHeader>
  )
}

export function FereastraSubsol({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('sticky bottom-0 z-[5] flex items-center justify-between gap-2 border-t border-border bg-card px-5 py-3.5', className)}>
      {children}
    </div>
  )
}
