import { useState } from 'react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { reseteazaDemo } from '@/lib/demo'

// Apare doar in varianta de test (ESTE_DEMO): spune clar ca modificarile nu ajung in aplicatia reala
// si permite revenirea la copia originala a dosarelor.
export function DemoBanner() {
  const [confirm, setConfirm] = useState(false)
  const [lucreaza, setLucreaza] = useState(false)

  return (
    <div
      className="relative z-[31] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-center text-[11.5px] font-bold text-[#fde68a]"
      style={{ background: 'linear-gradient(90deg, rgba(245,158,11,.22), rgba(124,58,237,.22))', borderBottom: '1px solid rgba(245,158,11,.35)' }}
    >
      <span className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5" aria-hidden="true" />
        VARIANTĂ DE TEST — modificările rămân doar pe acest dispozitiv
      </span>
      {confirm ? (
        <span className="flex items-center gap-2 text-[#f8fafc]">
          Revii la dosarele inițiale?
          <button
            type="button"
            disabled={lucreaza}
            onClick={async () => {
              setLucreaza(true)
              await reseteazaDemo()
              window.location.reload()
            }}
            className="rounded-md bg-[#f59e0b] px-2 py-0.5 text-[11px] font-extrabold text-[#1b1220] disabled:opacity-60"
          >
            {lucreaza ? '…' : 'Da'}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded-md border border-white/20 px-2 py-0.5 text-[11px]">
            Nu
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="flex items-center gap-1 rounded-md border border-[#f59e0b]/45 px-2 py-0.5 text-[11px] text-[#fde68a] transition-colors hover:bg-[#f59e0b]/15"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          Resetează datele
        </button>
      )}
    </div>
  )
}
