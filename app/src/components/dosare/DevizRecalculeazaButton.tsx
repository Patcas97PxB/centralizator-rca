import { useEffect, useRef } from 'react'
import { AlertTriangle, Calculator, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDevizScan } from '@/hooks/useDevizScan'
import type { RezultatCalculRCA } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'
import { cn } from '@/lib/utils'

const TILE = {
  scanning: { border: 'rgba(125,211,252,.7)', color: '#7dd3fc' },
  done: { border: 'rgba(0,245,160,.55)', color: '#00f5a0' },
  error: { border: 'rgba(255,77,109,.7)', color: '#ff4d6d' },
} as const

// Calculeaza DOAR zilele de reparatie dintr-un deviz, suprascriind explicit valoarea existenta
// (spre deosebire de "PRELUARE DATE", care nu atinge campul daca e deja completat). Rezultatul apare
// cu aceeasi animatie ca la cardul "Zile din deviz" de pe ecranul principal.
export function DevizRecalculeazaButton({
  onPatch,
  calcul,
}: {
  onPatch: (patch: Partial<Dosar>) => void
  /** Calculul pe asigurator (deviz + weekend + 1 zi), afisat sub zilele de reparatie. */
  calcul?: RezultatCalculRCA
}) {
  const { stage, result, errorMsg, fileName, run } = useDevizScan()
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
        <span className="text-xs text-muted-foreground">Suprascrie doar zilele — restul câmpurilor rămân neatinse.</span>
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

      {tile && (
        <div
          key={stage}
          role="status"
          className={cn(
            'relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3',
            stage === 'error' && 'animate-[devizShake_.45s_ease-in-out_both]',
          )}
          style={{
            borderColor: stage === 'scanning' ? 'rgba(96,165,250,.5)' : stage === 'done' ? 'rgba(0,245,160,.35)' : 'rgba(255,77,109,.45)',
            background:
              stage === 'done' ? 'rgba(0,245,160,.06)' : stage === 'error' ? 'rgba(255,77,109,.06)' : 'rgba(37,99,235,.08)',
            animation: stage === 'scanning' ? 'devizGlow 2.2s ease-in-out infinite' : undefined,
          }}
        >
          <span
            className="relative flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border"
            style={{ borderColor: tile.border, color: tile.color, background: 'linear-gradient(#0b1633, #0a1230)' }}
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
                style={{ background: 'linear-gradient(180deg, transparent, rgba(125,211,252,.85), transparent)' }}
              />
            )}
          </span>

          <div className="min-w-0 flex-1">
            {stage === 'scanning' && (
              <>
                <div className="truncate text-sm font-bold" style={{ color: '#7dd3fc' }}>Calculez zilele din deviz…</div>
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
                  <span className="text-2xl font-extrabold leading-none" style={{ color: '#00f5a0', textShadow: '0 0 14px rgba(0,245,160,.6)' }}>
                    {result.total}
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#00f5a0' }}>ZILE DE REPARAȚIE</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{result.formulaCalcul}</p>
                {calcul && (
                  <p className="mt-1 text-xs font-semibold text-foreground">
                    {calcul.zile != null ? `${calcul.formula} = ${calcul.zile} zile` : calcul.formula}
                    {calcul.dataPreluare && ` — preluare ${calcul.dataPreluare.split('-').reverse().join('.')}`}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-[#3ddc97]">
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
