import { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { exportaBackup, parseazaBackup } from '@/lib/backup'
import { Button } from '@/components/ui/button'
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
  const [pending, setPending] = useState<{ dosare: number; servicii: number; run: () => void } | null>(null)
  const [eroare, setEroare] = useState('')

  async function onFile(file: File) {
    setEroare('')
    try {
      const text = await file.text()
      const payload = parseazaBackup(text)
      setPending({
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
      <Button variant="outline" size="icon" onClick={() => exportaBackup(dosare, servicii)} title="Exportă backup" aria-label="Exportă backup">
        <Download className="size-4" aria-hidden="true" />
      </Button>
      <Button variant="outline" size="icon" onClick={() => inputRef.current?.click()} title="Importă backup" aria-label="Importă backup">
        <Upload className="size-4" aria-hidden="true" />
      </Button>
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
            <AlertDialogDescription>Datele actuale vor fi înlocuite complet.</AlertDialogDescription>
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
