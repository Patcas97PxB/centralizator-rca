import type { LucideIcon } from 'lucide-react'

export function ComingSoonPage({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center gap-3.5 px-6 py-[110px] text-center">
      <span
        className="flex size-[68px] items-center justify-center rounded-[22px] border border-border bg-card text-accent-tx"
      >
        <Icon className="size-[30px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2 className="m-0 text-xl font-extrabold text-foreground">{label}</h2>
      <p className="m-0 text-[13.5px] text-tx-3">În curând.</p>
    </div>
  )
}
