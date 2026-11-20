import { useEffect, useRef } from 'react'
import { AlertTriangle, Calculator, Loader2 } from 'lucide-react'
import { useDevizScan } from '@/hooks/useDevizScan'
import { calculRCA } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'

// Panoul dosarului, rândul „Zile din deviz” fără deviz (20.11.2026, cerut: „în loc de necompletat să
// apară butonul pentru adăugare deviz și să facă calculul fără să trebuiască să dau Edit”). Alegi
// devizul (PDF sau poze, mai multe odată), se citește ca la „Calculează zile din deviz” din formular
// și se salvează pe loc: zilele, socoteala și data preluării recalculată (ca în formular, unde
// schimbarea zilelor repune data din calcul). Restul dosarului nu se atinge.
export function AdaugaDevizPanou({ dosar, onPatch }: { dosar: Dosar; onPatch: (id: string, patch: Partial<Dosar>) => void }) {
  const { stage, result, errorMsg, progres, run } = useDevizScan()
  const input = useRef<HTMLInputElement>(null)
  const salvat = useRef<unknown>(null)

  useEffect(() => {
    if (stage !== 'done' || !result || salvat.current === result) return
    salvat.current = result
    const zile = { zileDeviz: String(result.total), zileDevizExplicatie: result.explicatie, zileDevizFormula: result.formulaCalcul }
    const preluare = calculRCA({ ...dosar, ...zile, endManual: false }).dataPreluare
    onPatch(dosar.id, { ...zile, endManual: false, ...(preluare ? { end: preluare } : {}) })
  }, [stage, result, dosar, onPatch])

  const alege = () => input.current?.click()
  return (
    <div className="mt-1.5">
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          run(Array.from(e.target.files ?? []))
          e.target.value = ''
        }}
      />
      {stage === 'scanning' ? (
        <p role="status" className="flex items-center gap-2 text-[12.5px] font-semibold text-accent-tx">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {progres || 'Citesc devizul…'}
        </p>
      ) : (
        <>
          {stage === 'error' && (
            <p role="alert" className="mb-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-st-red-tx">
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>Nu am putut citi zilele: {errorMsg}</span>
            </p>
          )}
          <button
            type="button"
            onClick={alege}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-3 text-[13px] font-bold text-accent-tx transition-colors hover:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
          >
            <Calculator className="size-4" aria-hidden="true" />
            {stage === 'error' ? 'Încearcă alt deviz' : 'Adaugă deviz'}
          </button>
          <span className="ml-2 text-[11.5px] text-tx-3">PDF sau poze — se calculează zilele</span>
        </>
      )}
    </div>
  )
}
