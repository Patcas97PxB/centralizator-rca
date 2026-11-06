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
import { numeScurtDoc } from '@/lib/documente'

/** „CC, CD și PV” — lista lipsurilor pentru întrebare. */
export function listaLipsuri(chei: string[]): string {
  const n = chei.map(numeScurtDoc)
  return n.length <= 1 ? n.join('') : n.slice(0, -1).join(', ') + ' și ' + n[n.length - 1]
}

// Finalizarea cu documente lipsă nu mai e blocată (cerut 06.11.2026): întreabă
// „Dorești să finalizezi fără X și Y?” și finalizează la „Da”.
export function ConfirmaFinalizare({
  lipsa,
  onDa,
  onNu,
}: {
  /** Cheile documentelor lipsă; null = fereastra închisă. */
  lipsa: string[] | null
  onDa: () => void
  onNu: () => void
}) {
  return (
    <AlertDialog open={!!lipsa} onOpenChange={(o) => !o && onNu()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dorești să finalizezi fără {listaLipsuri(lipsa ?? [])}?</AlertDialogTitle>
          <AlertDialogDescription>Dosarul trece la Finalizat. Documentele le poți adăuga și după.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Nu</AlertDialogCancel>
          <AlertDialogAction onClick={onDa}>Da, finalizează</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
