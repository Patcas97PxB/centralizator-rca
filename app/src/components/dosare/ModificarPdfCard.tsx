import { Suspense, lazy, useState } from 'react'
import { FileEdit } from 'lucide-react'

// Editorul (MuPDF + pdf-lib) e mare, deci se incarca doar cand se deschide.
const ModificarPdfModal = lazy(() => import('./ModificarPdfModal').then((m) => ({ default: m.ModificarPdfModal })))

export function ModificarPdfCard() {
  const [deschis, setDeschis] = useState(false)
  const [incarcat, setIncarcat] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIncarcat(true)
          setDeschis(true)
        }}
        className="card-speech relative flex w-full flex-col gap-3 overflow-hidden p-3.5 text-left transition-colors hover:bg-[var(--surface-2)]"
        style={{
          border: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <div className="relative flex items-center justify-between gap-2">
          <span className="whitespace-nowrap text-[13px] font-extrabold text-foreground">Modificare PDF</span>
          <span className="shrink-0 rounded-full bg-primary px-[7px] py-0.5 text-[9.5px] font-extrabold text-white">
            NOU
          </span>
        </div>
        <div className="relative flex items-center gap-3">
          <span
            className="flex h-16 w-[54px] shrink-0 items-center justify-center rounded-xl border border-st-green/40 text-st-green"
            style={{ background: 'var(--background)' }}
          >
            <FileEdit className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-foreground">Încarcă PDF-ul</div>
            <div className="text-[10.5px] text-tx-3">date, ore, nr. auto, pagini</div>
          </div>
        </div>
      </button>

      {incarcat && (
        <Suspense fallback={null}>
          <ModificarPdfModal open={deschis} onClose={() => setDeschis(false)} />
        </Suspense>
      )}
    </>
  )
}
