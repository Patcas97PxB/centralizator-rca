import { useEffect, useState } from 'react'
import { useDosareContext } from '@/contexts/DosareContext'
import { EVENIMENT_BACKUP, ZILE_BACKUP, zileDeLaBackup } from './backup'
import { useFolderLocal } from './folder-local'

// Ce din Setări cere atenție (punct galben pe „Setări” în meniu): folderul de pe laptop așteaptă
// permisiunea (Chrome o cere la fiecare pornire) sau au trecut ZILE_BACKUP+ zile de la ultimul backup.
export function useAtentieSetari(): { folder: boolean; backup: boolean; zileBackup: number | null } {
  const f = useFolderLocal()
  const { dosare } = useDosareContext()
  const [zileBackup, setZileBackup] = useState(zileDeLaBackup)
  useEffect(() => {
    const reciteste = () => setZileBackup(zileDeLaBackup())
    window.addEventListener(EVENIMENT_BACKUP, reciteste)
    window.addEventListener('focus', reciteste)
    return () => {
      window.removeEventListener(EVENIMENT_BACKUP, reciteste)
      window.removeEventListener('focus', reciteste)
    }
  }, [])
  return {
    folder: f.suportat && !!f.nume && f.permis !== 'granted',
    backup: dosare.length > 0 && (zileBackup === null || zileBackup >= ZILE_BACKUP),
    zileBackup,
  }
}
