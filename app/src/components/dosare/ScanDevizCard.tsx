import { useRef, useState, type DragEvent } from 'react'
import { AlertTriangle, FileSearch, Loader2 } from 'lucide-react'
import { useDevizScan } from '@/hooks/useDevizScan'
import type { AnalizaDeviz } from '@/lib/deviz-analiza'
import { BTN_PRIMAR, BTN_SECUNDAR, FereastraAntet } from '@/components/ui/fereastra'
import { cn } from '@/lib/utils'

// „Zile din deviz” ca fereastră (redesign): zona de încărcare, apoi rezultatul mare și butoanele jos.
// Se deschide din meniul lateral (Unelte) sau din bara de jos de pe telefon.
export function ScanDevizCard({ onApply, onClose }: { onApply: (an: AnalizaDeviz) => void; onClose: () => void }) {
  const { stage, result, errorMsg, fileName, progres, run, reset } = useDevizScan()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

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
    <>
      <FereastraAntet titlu="Zile din deviz" subtitlu="(ore manoperă + ore vopsitorie) ÷ 4, rotunjit" onClose={onClose} />

      <div className="px-5 py-4">
        {stage === 'done' && result ? (
          <div className="rounded-[14px] border border-st-green/35 bg-st-green/[.07] px-4 py-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[34px] font-extrabold leading-none text-st-green">{result.total}</span>
              <span className="text-[15px] font-bold text-st-green">{result.total === 1 ? 'zi de reparație' : 'zile de reparație'}</span>
            </div>
            <p className="mt-2 text-[12.5px] text-tx-2">{result.formulaCalcul}</p>
            {result.incomplet && (
              <p className="mt-2 flex items-start gap-1.5 text-[12.5px] font-bold text-st-amber-tx">
                <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
                Vopsitoria nu s-a putut citi — verifică
              </p>
            )}
            {fileName && <p className="mt-1.5 truncate text-[11.5px] text-tx-3">{fileName}</p>}
          </div>
        ) : stage === 'error' ? (
          <div className={cn('rounded-[14px] border border-st-red/40 bg-st-red/[.07] px-4 py-4', 'animate-[devizShake_.45s_ease-in-out_both]')} role="alert">
            <p className="flex items-center gap-1.5 text-[14px] font-bold text-st-red">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              Nu am putut citi devizul
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-tx-2">{errorMsg}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={pick}
            disabled={stage === 'scanning'}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed px-4 py-8 text-center transition-colors',
              dragOver ? 'border-accent-tx bg-primary/10' : 'border-border-strong bg-background hover:bg-surface-hover/50',
              stage === 'scanning' && 'cursor-wait',
            )}
          >
            {stage === 'scanning' ? (
              <>
                <Loader2 className="size-7 animate-spin text-accent-tx" aria-hidden="true" />
                <span className="text-[14px] font-bold text-foreground">Citesc devizul…</span>
                <span className="max-w-full truncate text-[12px] text-tx-3">{progres || fileName}</span>
              </>
            ) : (
              <>
                <FileSearch className="size-7 text-accent-tx" aria-hidden="true" />
                <span className="text-[14px] font-bold text-foreground">Trage devizul aici sau click pentru a alege</span>
                <span className="text-[12px] text-tx-3">PDF sau poze — poți alege toate paginile odată</span>
              </>
            )}
          </button>
        )}
      </div>

      {(stage === 'done' || stage === 'error') && (
        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <button
            type="button"
            className={BTN_SECUNDAR}
            onClick={() => {
              reset()
              inputRef.current?.click()
            }}
          >
            {stage === 'error' ? 'Alt document' : 'Alt deviz'}
          </button>
          {stage === 'done' && result && (
            <button
              type="button"
              className={BTN_PRIMAR}
              onClick={() => {
                onApply(result)
                reset()
              }}
            >
              Aplică pe dosar nou
            </button>
          )}
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
    </>
  )
}
