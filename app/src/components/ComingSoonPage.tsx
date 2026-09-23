import type { LucideIcon } from 'lucide-react'

export function ComingSoonPage({ label, icon: Icon }: { label: string; icon: LucideIcon }) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center gap-3.5 px-6 py-[110px] text-center">
      <span
        className="flex size-[68px] items-center justify-center rounded-[22px] border border-[#253150] bg-[#10172a] text-[#60a5fa]"
        style={{ boxShadow: '0 0 40px -14px rgba(37,99,235,.8)' }}
      >
        <Icon className="size-[30px]" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <h2 className="m-0 text-xl font-extrabold text-[#f1f5f9]">{label}</h2>
      <p className="m-0 text-[13.5px] text-[#94a3b8]">În curând.</p>
    </div>
  )
}
