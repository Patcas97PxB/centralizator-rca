import { useState } from 'react'
import { AlertTriangle, Download, FlaskConical, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { exportaBackup, zileDeLaBackup } from '@/lib/backup'
import { MEDIU_DE_TEST } from '@/lib/supabase'

const ZILE_MEMENTO_BACKUP = 7

// Banda de sub header: mediu de test, avertizari de salvare si memento de backup.
export function StareSistem() {
  const { dosare, servicii, loading, avertizare, setAvertizare } = useDosareContext()
  const [mementoInchis, setMementoInchis] = useState(false)
  const [, setReimprospatare] = useState(0)

  const zile = zileDeLaBackup()
  const arataMemento = !loading && dosare.length > 0 && !mementoInchis && (zile === null || zile >= ZILE_MEMENTO_BACKUP)

  if (!MEDIU_DE_TEST && !avertizare && !arataMemento) return null

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
      {arataMemento && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-sky-500/10 px-4 py-2 text-sky-100">
          <span className="flex-1">
            {zile === null ? 'Nu ai exportat niciodată un backup din acest browser.' : `Ultimul backup exportat: acum ${zile} zile.`} Un export
            durează o secundă și te acoperă dacă se întâmplă ceva cu datele.
          </span>
          <button
            type="button"
            onClick={() => {
              exportaBackup(dosare, servicii)
              setReimprospatare((n) => n + 1)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/40 px-2.5 py-1 font-semibold hover:bg-sky-400/20"
          >
            <Download className="size-3.5" aria-hidden="true" /> Exportă acum
          </button>
          <button type="button" onClick={() => setMementoInchis(true)} aria-label="Amână memento-ul" className="opacity-80 hover:opacity-100">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
