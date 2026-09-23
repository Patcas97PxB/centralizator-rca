import { useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, Check, FileSearch, X } from 'lucide-react'
import { useDevizScan } from '@/hooks/useDevizScan'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { cn } from '@/lib/utils'

const TILE_BY_STAGE = {
  idle: { border: 'rgba(96,165,250,.28)', color: '#93c5fd' },
  scanning: { border: 'rgba(125,211,252,.7)', color: '#7dd3fc' },
  done: { border: 'rgba(0,245,160,.55)', color: '#00f5a0' },
  error: { border: 'rgba(255,77,109,.7)', color: '#ff4d6d' },
} as const

export function ScanDevizCard({ onApply }: { onApply: (an: AnalizaDeviz) => void }) {
  const { stage, result, errorMsg, fileName, run, reset } = useDevizScan()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const tile = TILE_BY_STAGE[stage]

  function pick() {
    if (stage === 'scanning') return
    inputRef.current?.click()
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (stage === 'scanning') return
    const f = e.dataTransfer.files?.[0]
    if (f) run(f)
  }

  return (
    <div
      className={cn(
        'card-speech relative flex flex-col gap-3 overflow-hidden p-3.5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5',
        stage === 'error' && 'animate-[devizShake_.45s_ease-in-out_both]',
      )}
      style={{
        border: '1px solid transparent',
        background:
          'var(--card-gradient) padding-box, linear-gradient(135deg, rgba(96,165,250,.9), rgba(124,58,237,.7) 50%, rgba(14,165,233,.8)) border-box',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,.08), 0 14px 30px -18px rgba(37,99,235,.9), 0 0 0 1px rgba(0,0,0,.4)',
        animation: stage === 'scanning' ? 'devizGlow 2.2s ease-in-out infinite' : undefined,
        outline: dragOver ? '2px dashed rgba(125,211,252,.8)' : undefined,
        outlineOffset: -6,
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-[130px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.35), rgba(124,58,237,0) 70%)' }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-[50px] -left-10 size-[140px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(14,165,233,.25), rgba(14,165,233,0) 70%)' }} />

      <div className="relative flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-[13px] font-extrabold text-[#f1f5f9]">Zile din deviz</span>
        <span
          className="shrink-0 rounded-full bg-[#2563eb] px-[7px] py-0.5 text-[9.5px] font-extrabold text-white"
          style={{ boxShadow: '0 0 12px -3px rgba(59,130,246,.9)' }}
        >
          NOU
        </span>
      </div>

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={pick}
          disabled={stage === 'scanning'}
          aria-label="Alege un deviz de scanat"
          className="relative flex h-16 w-[54px] shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-[border-color,box-shadow] duration-300"
          style={{ borderColor: tile.border, color: tile.color, background: 'linear-gradient(#0b1633, #0a1230)' }}
        >
          {stage === 'done' ? (
            <Check className="size-6 animate-[devizPopIn_.4s_cubic-bezier(.2,.9,.2,1)_both]" aria-hidden="true" />
          ) : stage === 'error' ? (
            <X className="size-6 animate-[devizPopIn_.4s_cubic-bezier(.2,.9,.2,1)_both]" aria-hidden="true" />
          ) : (
            <FileSearch className="size-6" aria-hidden="true" />
          )}
          {stage === 'scanning' && (
            <span
              aria-hidden
              className="absolute inset-x-0 h-[18px] animate-[devizBeam_1s_ease-in-out_infinite_alternate]"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(125,211,252,.85), transparent)' }}
            />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {stage === 'idle' && (
            <>
              <div className="text-[12.5px] font-extrabold text-[#e2e8f5]">Încarcă devizul</div>
              <div className="text-[10.5px] text-[#8ba3cf]">PDF sau poză</div>
            </>
          )}
          {stage === 'scanning' && (
            <>
              <div className="truncate text-sm font-bold" style={{ color: '#7dd3fc' }}>Scanez devizul…</div>
              <div className="truncate text-xs text-muted-foreground">{fileName}</div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full origin-left rounded-full animate-[devizProgress_2.6s_cubic-bezier(.4,0,.2,1)_both]"
                  style={{ background: 'linear-gradient(90deg,#2563eb,#0ea5e9)' }}
                />
              </div>
            </>
          )}
          {stage === 'done' && result && (
            <div className="animate-[devizPopIn_.4s_cubic-bezier(.2,.9,.2,1)_both]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold" style={{ color: '#00f5a0', textShadow: '0 0 14px rgba(0,245,160,.6)' }}>
                  {result.total}
                </span>
                <span className="text-xs font-bold" style={{ color: '#00f5a0' }}>ZILE</span>
              </div>
              <div className="text-xs text-muted-foreground">reies din deviz</div>
            </div>
          )}
          {stage === 'error' && (
            <>
              <div className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--danger-strong)' }}>
                <AlertTriangle className="size-3.5" aria-hidden="true" /> Nu am putut citi devizul
              </div>
              <div className="text-[11px] leading-snug text-muted-foreground">{errorMsg}</div>
            </>
          )}
        </div>
      </div>

      {(stage === 'done' || stage === 'error') && (
        <div className="relative mt-3 flex gap-2">
          {stage === 'done' && result && (
            <button
              type="button"
              className="btn-brand-gradient flex-1 rounded-lg px-3 py-1.5 text-xs font-bold"
              onClick={() => {
                onApply(result)
                reset()
              }}
            >
              Aplică pe dosar nou
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
            onClick={() => {
              reset()
              inputRef.current?.click()
            }}
          >
            {stage === 'error' ? 'Alt document' : 'Rescanează'}
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) run(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
