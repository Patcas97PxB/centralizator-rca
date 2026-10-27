import { useEffect, useRef, type ReactNode } from 'react'
import { AlertTriangle, Calculator, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDevizScan } from '@/hooks/useDevizScan'
import type { RezultatCalculRCA } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'
import { cn } from '@/lib/utils'

const TILE = {
  scanning: { border: 'color-mix(in srgb, var(--accent-tx) 70%, transparent)', color: 'var(--accent-tx)' },
  done: { border: 'color-mix(in srgb, var(--st-green) 55%, transparent)', color: 'var(--st-green)' },
  error: { border: 'color-mix(in srgb, var(--st-red) 70%, transparent)', color: 'var(--st-red)' },
} as const

// Calculeaza DOAR zilele de reparatie dintr-un deviz, suprascriind explicit valoarea existenta
// (spre deosebire de "PRELUARE DATE", care nu atinge campul daca e deja completat). Rezultatul apare
// cu aceeasi animatie ca la cardul "Zile din deviz" de pe ecranul principal.
export function DevizRecalculeazaButton({
  onPatch,
  calcul,
  children,
}: {
  onPatch: (patch: Partial<Dosar>) => void
  /** Calculul pe asigurator (deviz + weekend + 1 zi), afisat sub zilele de reparatie. */
  calcul?: RezultatCalculRCA
  /** Pus imediat langa buton (in formular: caseta cu zilele din deviz). */
  children?: ReactNode
}) {
  const { stage, result, errorMsg, fileName, progres, run } = useDevizScan()
  const inputRef = useRef<HTMLInputElement>(null)
  const onPatchRef = useRef(onPatch)
  onPatchRef.current = onPatch

  useEffect(() => {
    if (stage === 'done' && result) {
      onPatchRef.current({ zileDeviz: String(result.total), zileDevizExplicatie: result.explicatie, zileDevizFormula: result.formulaCalcul })
    }
  }, [stage, result])

  const seCalculeaza = stage === 'scanning'
  const tile = stage === 'idle' ? null : TILE[stage]

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={seCalculeaza} onClick={() => inputRef.current?.click()}>
          <Calculator className="size-3.5" aria-hidden="true" />
          {seCalculeaza ? 'Se calculează…' : 'Calculează zile din deviz'}
        </Button>
        {children}
        <span className="text-xs text-muted-foreground">Suprascrie doar zilele — restul câmpurilor rămân neatinse.</span>
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

      {tile && (
        <div
          key={stage}
          role="status"
          className={cn(
            'relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3',
            stage === 'error' && 'animate-[devizShake_.45s_ease-in-out_both]',
          )}
          style={{
            borderColor: stage === 'scanning' ? 'color-mix(in srgb, var(--accent-tx) 50%, transparent)' : stage === 'done' ? 'color-mix(in srgb, var(--st-green) 35%, transparent)' : 'color-mix(in srgb, var(--st-red) 45%, transparent)',
            background:
              stage === 'done' ? 'color-mix(in srgb, var(--st-green) 6%, transparent)' : stage === 'error' ? 'color-mix(in srgb, var(--st-red) 6%, transparent)' : 'color-mix(in srgb, var(--primary) 8%, transparent)',
          }}
        >
          <span
            className="relative flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
            style={{ borderColor: tile.border, color: tile.color, background: 'var(--background)' }}
          >
            {stage === 'done' ? (
              <Check className="size-5 animate-[devizPopIn_.4s_cubic-bezier(.2,.9,.2,1)_both]" aria-hidden="true" />
            ) : stage === 'error' ? (
              <X className="size-5 animate-[devizPopIn_.4s_cubic-bezier(.2,.9,.2,1)_both]" aria-hidden="true" />
            ) : (
              <Calculator className="size-5" aria-hidden="true" />
            )}
            {stage === 'scanning' && (
              <span
                aria-hidden
                className="absolute inset-x-0 h-[14px] animate-[devizBeam_1s_ease-in-out_infinite_alternate]"
                style={{ background: 'linear-gradient(180deg, transparent, color-mix(in srgb, var(--accent-tx) 85%, transparent), transparent)' }}
              />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {stage === 'scanning' && (
              <>
                <div className="truncate text-sm font-bold" style={{ color: 'var(--accent-tx)' }}>Calculez zilele din deviz…</div>
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
                  <span className="text-2xl font-extrabold leading-none" style={{ color: 'var(--st-green)' }}>
                    {result.total}
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--st-green)' }}>ZILE DE REPARAȚIE</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{result.formulaCalcul}</p>
                {calcul && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {calcul.zile != null ? `${calcul.formula} = ${calcul.zile} zile` : calcul.formula}
                    {calcul.dataPreluare && ` — preluare ${calcul.dataPreluare.split('-').reverse().join('.')}`}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-st-green">
                  Zilele{calcul?.dataPreluare ? ' și data preluării au' : ' au'} fost completate. Restul câmpurilor nu au fost modificate.
                </p>
              </div>
            )}
            {stage === 'error' && (
              <>
                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--danger-strong)' }}>
                  <AlertTriangle className="size-3.5" aria-hidden="true" /> Nu am putut calcula zilele
                </div>
                <p className="text-xs leading-snug text-muted-foreground">{errorMsg}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
