import { LifeBuoy } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Continut placeholder — spune-mi ce telefon/email real vrei aici si il pun.
export function SuportWidget() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex size-9 items-center justify-center rounded-xl border border-info/30 bg-info/10 text-info">
        <LifeBuoy className="size-4.5" aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold text-foreground">Ai nevoie de ajutor?</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Contactează echipa pentru informații suplimentare.
      </p>
      <Button variant="secondary" className="mt-3 w-full" disabled title="Completează un contact real aici">
        Contactează suport
      </Button>
    </div>
  )
}
