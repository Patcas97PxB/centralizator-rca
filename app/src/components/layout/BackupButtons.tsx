import { useRef, useState } from 'react'
import { Download, History, Upload } from 'lucide-react'
import { RecuperareModal } from './RecuperareModal'
import { useDosareContext } from '@/contexts/DosareContext'
import { exportaBackup, parseazaBackup } from '@/lib/backup'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function BackupButtons() {
  const { dosare, servicii, importaBackup } = useDosareContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ dosare: number; servicii: number; deSters: number; noi: number; run: () => void } | null>(null)
  const [eroare, setEroare] = useState('')
  const [recuperare, setRecuperare] = useState(false)

  async function onFile(file: File) {
    setEroare('')
    try {
      const text = await file.text()
      const payload = parseazaBackup(text)
      const idCurente = new Set(dosare.map((d) => d.id))
      const idNoi = new Set(payload.dosare.map((d) => d.id))
      setPending({
        deSters: dosare.filter((d) => !idNoi.has(d.id)).length,
        noi: payload.dosare.filter((d) => !idCurente.has(d.id)).length,
        dosare: payload.dosare.length,
        servicii: payload.servicii.length,
        run: () => importaBackup(payload),
      })
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Fișier de backup invalid.')
    }
  }

  return (
    <>
      <button type="button" className="flex size-[34px] items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white" onClick={() => exportaBackup(dosare, servicii)} title="Exportă backup" aria-label="Exportă backup">
        <Download className="size-4" aria-hidden="true" />
      </button>
      <button type="button" className="flex size-[34px] items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white" onClick={() => inputRef.current?.click()} title="Importă backup" aria-label="Importă backup">
        <Upload className="size-4" aria-hidden="true" />
      </button>
      <button type="button" className="flex size-[34px] items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white" onClick={() => setRecuperare(true)} title="Recuperare dosare (șterse / versiuni vechi)" aria-label="Recuperare dosare">
        <History className="size-4" aria-hidden="true" />
      </button>
      <RecuperareModal open={recuperare} onClose={() => setRecuperare(false)} />
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
      {eroare && <span className="text-xs text-destructive">{eroare}</span>}

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {pending?.dosare} dosare și {pending?.servicii} service-uri?</AlertDialogTitle>
            <AlertDialogDescription>
              Datele actuale vor fi înlocuite complet: {pending?.deSters} dosare existente care nu sunt în fișier se șterg, {pending?.noi} dosare
              noi se adaugă, iar restul se suprascriu cu versiunea din fișier. Ce se șterge sau se suprascrie rămâne recuperabil din
              „Recuperare" (180 de zile).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pending?.run()
                setPending(null)
              }}
            >
              Importă
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
