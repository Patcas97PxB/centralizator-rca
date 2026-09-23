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
        className="card-speech relative flex w-full flex-col gap-3 overflow-hidden p-3.5 text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
        style={{
          border: '1px solid transparent',
          background:
            'var(--card-gradient) padding-box, linear-gradient(135deg, rgba(0,245,160,.75), rgba(14,165,233,.6) 50%, rgba(96,165,250,.7)) border-box',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 14px 30px -18px rgba(14,165,233,.8), 0 0 0 1px rgba(0,0,0,.4)',
        }}
      >
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-[130px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(14,165,233,.3), rgba(14,165,233,0) 70%)' }} />
        <div className="relative flex items-center justify-between gap-2">
          <span className="whitespace-nowrap text-[13px] font-extrabold text-[#f1f5f9]">Modificare PDF</span>
          <span className="shrink-0 rounded-full bg-[#2563eb] px-[7px] py-0.5 text-[9.5px] font-extrabold text-white" style={{ boxShadow: '0 0 12px -3px rgba(59,130,246,.9)' }}>
            NOU
          </span>
        </div>
        <div className="relative flex items-center gap-3">
          <span
            className="flex h-16 w-[54px] shrink-0 items-center justify-center rounded-xl border border-[#00f5a0]/40 text-[#00f5a0]"
            style={{ background: 'linear-gradient(#0b1633, #0a1230)' }}
          >
            <FileEdit className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-extrabold text-[#e2e8f5]">Încarcă PDF-ul</div>
            <div className="text-[10.5px] text-[#8ba3cf]">date, ore, nr. auto</div>
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
