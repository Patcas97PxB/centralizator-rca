import { FileEdit } from 'lucide-react'

export function ModificarPdfCard() {
  return (
    <div
      aria-disabled="true"
      className="card-speech relative flex cursor-not-allowed flex-col gap-3 overflow-hidden p-3.5 opacity-70"
      style={{
        border: '1px solid rgba(148,163,184,.25)',
        background: 'var(--card-gradient)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06), 0 0 0 1px rgba(0,0,0,.4)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-[13px] font-extrabold text-[#f1f5f9]">Modificare PDF</span>
        <span className="shrink-0 rounded-full border border-border bg-muted px-[7px] py-0.5 text-[9.5px] font-extrabold text-muted-foreground">ÎN CURÂND</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex h-16 w-[54px] shrink-0 items-center justify-center rounded-xl border border-white/10 text-[#94a3b8]" style={{ background: 'linear-gradient(#0b1633, #0a1230)' }}>
          <FileEdit className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-extrabold text-[#e2e8f5]">Încarcă PDF-ul</div>
          <div className="text-[10.5px] text-[#8ba3cf]">date, ore, nr. auto</div>
        </div>
      </div>
    </div>
  )
}
