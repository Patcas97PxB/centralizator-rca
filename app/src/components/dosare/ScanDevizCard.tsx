import { useEffect, useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, Check, FileSearch, X } from 'lucide-react'
import { useDevizScan } from '@/hooks/useDevizScan'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { cn } from '@/lib/utils'

const TILE_BY_STAGE = {
  idle: { border: 'color-mix(in srgb, var(--accent-tx) 28%, transparent)', color: 'var(--accent-tx)' },
  scanning: { border: 'color-mix(in srgb, var(--accent-tx) 70%, transparent)', color: 'var(--accent-tx)' },
  done: { border: 'color-mix(in srgb, var(--st-green) 55%, transparent)', color: 'var(--st-green)' },
  error: { border: 'color-mix(in srgb, var(--st-red) 70%, transparent)', color: 'var(--st-red)' },
} as const

export function ScanDevizCard({ onApply }: { onApply: (an: AnalizaDeviz) => void }) {
  const { stage, result, errorMsg, fileName, progres, run, reset } = useDevizScan()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const tile = TILE_BY_STAGE[stage]

  // Dupa un rezultat (sau o eroare), cardul revine singur la starea initiala in 10 secunde.
  useEffect(() => {
    if (stage !== 'done' && stage !== 'error') return
    const t = setTimeout(reset, 10_000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  function pick() {
    if (stage === 'scanning') return
    inputRef.current?.click()
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (stage === 'scanning') return
    run(Array.from(e.dataTransfer.files ?? []))
  }

  return (
    <div
      className={cn(
        'card-speech relative flex flex-col gap-3 overflow-hidden p-3.5',
        stage === 'error' && 'animate-[devizShake_.45s_ease-in-out_both]',
      )}
      style={{
        border: '1px solid var(--border)',
        background: 'var(--card)',
        outline: dragOver ? '2px dashed color-mix(in srgb, var(--accent-tx) 80%, transparent)' : undefined,
        outlineOffset: -6,
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >

      <div className="relative flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-[13px] font-extrabold text-foreground">Zile din deviz</span>
        <span
          className="shrink-0 rounded-full bg-primary px-[7px] py-0.5 text-[9.5px] font-extrabold text-white"
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
          style={{ borderColor: tile.border, color: tile.color, background: 'var(--background)' }}
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
              style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent-tx) 85%, transparent), transparent)' }}
            />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {stage === 'idle' && (
            <>
              <div className="text-[12.5px] font-extrabold text-foreground">Încarcă devizul</div>
              <div className="text-[10.5px] text-tx-3">PDF sau poze (toate paginile)</div>
            </>
          )}
          {stage === 'scanning' && (
            <>
              <div className="truncate text-sm font-bold" style={{ color: 'var(--accent-tx)' }}>Scanez devizul…</div>
              <div className="truncate text-xs text-muted-foreground">{progres || fileName}</div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full origin-left rounded-full animate-[devizProgress_2.6s_cubic-bezier(.4,0,.2,1)_both]"
                  style={{ background: 'var(--primary)' }}
                />
              </div>
            </>
          )}
          {stage === 'done' && result && (
            <div className="animate-[devizPopIn_.4s_cubic-bezier(.2,.9,.2,1)_both]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-extrabold" style={{ color: 'var(--st-green)' }}>
                  {result.total}
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--st-green)' }}>ZILE</span>
              </div>
              {result.incomplet ? (
                <div className="text-[11px] font-bold leading-snug" style={{ color: 'var(--warning)' }}>
                  Vopsitoria nu s-a putut citi — verifică
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">reies din deviz</div>
              )}
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
        multiple
        className="hidden"
        onChange={(e) => {
          run(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
    </div>
  )
}
