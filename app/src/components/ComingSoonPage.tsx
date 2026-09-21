import type { LucideIcon } from 'lucide-react'

export function ComingSoonPage({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card">
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{label}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Această secțiune vine într-o rundă următoare. Deocamdată e disponibilă pagina Dosare RCA.
      </p>
    </div>
  )
}
