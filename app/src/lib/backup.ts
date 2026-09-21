import { todayStr } from './rca-calc'
import type { Dosar, Serviciu } from './types'

export interface BackupPayload {
  versiune: number
  exportat: string
  dosare: Dosar[]
  servicii: Serviciu[]
}

// Portat din exportData() (index.html), simplificat: site-ul vechi avea 3 cai diferite de
// salvare (File System Access API, `<a download>`, copiere manuala) pentru ca putea rula
// si intr-un iframe restrictionat (artefact Claude). Aplicatia noua ruleaza mereu ca pagina
// web normala (GitHub Pages), deci un `<a download>` simplu e suficient de fiecare data.
export function exportaBackup(dosare: Dosar[], servicii: Serviciu[]) {
  const payload: BackupPayload = { versiune: 1, exportat: new Date().toISOString(), dosare, servicii }
  const text = JSON.stringify(payload, null, 2)
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rca-backup-${todayStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function parseazaBackup(text: string): BackupPayload {
  const payload = JSON.parse(text)
  if (!Array.isArray(payload.dosare)) throw new Error('Fișier de backup invalid — lipsește lista de dosare.')
  return {
    versiune: payload.versiune ?? 1,
    exportat: payload.exportat ?? '',
    dosare: payload.dosare,
    servicii: Array.isArray(payload.servicii) ? payload.servicii : [],
  }
}
