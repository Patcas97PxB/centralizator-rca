import { AlertTriangle, FlaskConical, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { MEDIU_DE_TEST } from '@/lib/supabase'

// Banda de sub header: mediu de test si avertizari de salvare.
export function StareSistem() {
  const { avertizare, setAvertizare } = useDosareContext()

  if (!MEDIU_DE_TEST && !avertizare) return null

  return (
    <div className="flex flex-col text-[13px]">
      {MEDIU_DE_TEST && (
        <div className="flex items-center justify-center gap-2 bg-amber-500/15 px-4 py-1.5 font-semibold text-amber-300">
          <FlaskConical className="size-4" aria-hidden="true" />
          MEDIU DE TEST — datele de aici nu sunt cele reale
        </div>
      )}
      {avertizare && (
        <div className="flex items-start gap-2 bg-red-500/15 px-4 py-2 text-red-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{avertizare}</span>
          <button type="button" onClick={() => setAvertizare('')} aria-label="Închide avertizarea" className="shrink-0 opacity-80 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
