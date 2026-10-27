import { useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Download, FolderOpen, History, Laptop, Moon, RefreshCw, Sparkles, Sun, Unlink, Upload } from 'lucide-react'
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
import { RecuperareModal } from '@/components/layout/RecuperareModal'
import { useDosareContext } from '@/contexts/DosareContext'
import { useAtentieSetari } from '@/lib/atentie-setari'
import { exportaBackup, parseazaBackup } from '@/lib/backup'
import { alegeFolder, deconecteaza, permiteCitirea, rescaneaza, useFolderLocal } from '@/lib/folder-local'
import { setMotionPref, useMotionPref } from '@/lib/motion-pref'
import { setTema, useTema } from '@/lib/tema'
import { cn } from '@/lib/utils'

const BTN =
  'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3.5 text-[13px] font-bold text-foreground transition-colors hover:bg-surface-hover disabled:opacity-60'
const BTN_PRIMAR = 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-bold text-primary-foreground transition-colors hover:bg-primary/90'

function Card({ icon, titlu, atentie, children }: { icon: ReactNode; titlu: string; atentie?: string; children: ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-accent-tx">{icon}</span>
        <h2 className="text-[15px] font-bold text-foreground">{titlu}</h2>
      </div>
      {atentie && (
        <p className="mb-3 flex items-start gap-1.5 text-[13px] font-semibold text-st-amber-tx">
          <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
          {atentie}
        </p>
      )}
      {children}
    </section>
  )
}

// Setări (redesign F4): aici s-au mutat butoanele din antet — folderul de pe laptop, backup, recuperare —
// și comutatorul de animații. Când ceva cere atenție, „Setări” din meniu are un punct galben.
export function SetariPage() {
  const f = useFolderLocal()
  const atentie = useAtentieSetari()
  const motion = useMotionPref()
  const tema = useTema()
  const { dosare, servicii, importaBackup } = useDosareContext()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<{ dosare: number; servicii: number; deSters: number; noi: number; run: () => void } | null>(null)
  const [eroare, setEroare] = useState('')
  const [recuperare, setRecuperare] = useState(false)

  async function onFile(file: File) {
    setEroare('')
    try {
      const payload = parseazaBackup(await file.text())
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

  const ora = f.scanatLa ? new Date(f.scanatLa).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <div className="mx-auto grid max-w-[1000px] gap-4 px-4 py-5 md:grid-cols-2 md:px-6 md:py-6">
      <Card
        icon={<Laptop className="size-4" aria-hidden="true" />}
        titlu="Folderul de dosare de pe laptop"
        atentie={atentie.folder ? `Folderul „${f.nume}” așteaptă permisiunea (Chrome o cere la fiecare pornire).` : undefined}
      >
        {!f.suportat ? (
          <p className="text-[13px] text-tx-2">Merge doar în Chrome sau Edge, pe calculator.</p>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-tx-2">
              {!f.nume
                ? 'Leagă folderul „RCA” de pe laptop: aplicația citește doar numele fișierelor și bifează documentele găsite.'
                : f.permis === 'granted'
                  ? `„${f.nume}” · ${f.seScaneaza ? 'se citește…' : `${f.nrDosare} foldere de dosar · citit la ${ora}`}`
                  : `Folder legat: „${f.nume}”.`}
            </p>
            <p className="mt-1 text-[12px] text-tx-3">Doar citire: nu încarcă și nu modifică nimic.</p>
            {f.eroare && <p className="mt-1 text-[12px] text-st-red">{f.eroare}</p>}
            <div className="mt-3.5 flex flex-wrap gap-2">
              {!f.nume && (
                <button type="button" className={BTN_PRIMAR} onClick={() => void alegeFolder()}>
                  <FolderOpen className="size-4" aria-hidden="true" /> Leagă folderul
                </button>
              )}
              {f.nume && f.permis !== 'granted' && (
                <button type="button" className={BTN_PRIMAR} onClick={() => void permiteCitirea()}>
                  <Laptop className="size-4" aria-hidden="true" /> Permite citirea
                </button>
              )}
              {f.nume && f.permis === 'granted' && (
                <button type="button" className={BTN} onClick={() => void rescaneaza()}>
                  <RefreshCw className="size-4" aria-hidden="true" /> Recitește acum
                </button>
              )}
              {f.nume && (
                <>
                  <button type="button" className={BTN} onClick={() => void alegeFolder()}>
                    <FolderOpen className="size-4" aria-hidden="true" /> Alege alt folder
                  </button>
                  <button type="button" className={cn(BTN, 'border-transparent text-tx-3 hover:text-foreground')} onClick={() => void deconecteaza()}>
                    <Unlink className="size-4" aria-hidden="true" /> Deconectează
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </Card>

      <Card
        icon={<Download className="size-4" aria-hidden="true" />}
        titlu="Backup"
        atentie={
          atentie.backup
            ? atentie.zileBackup === null
              ? 'Nu ai făcut încă niciun backup din acest browser.'
              : `Ultimul backup acum ${atentie.zileBackup} zile.`
            : undefined
        }
      >
        <p className="text-[13px] leading-relaxed text-tx-2">
          Un fișier JSON cu toate dosarele și service-urile (fără documente).{' '}
          {!atentie.backup && atentie.zileBackup !== null && (atentie.zileBackup === 0 ? 'Ultimul: azi.' : `Ultimul: acum ${atentie.zileBackup} zile.`)}
        </p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <button type="button" className={atentie.backup ? BTN_PRIMAR : BTN} onClick={() => exportaBackup(dosare, servicii)}>
            <Download className="size-4" aria-hidden="true" /> Exportă backup
          </button>
          <button type="button" className={BTN} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" /> Importă backup
          </button>
        </div>
        {eroare && <p className="mt-2 text-[12px] text-st-red">{eroare}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onFile(file)
            e.target.value = ''
          }}
        />
      </Card>

      <Card icon={<History className="size-4" aria-hidden="true" />} titlu="Recuperare">
        <p className="text-[13px] leading-relaxed text-tx-2">
          Dosare șterse (180 de zile) și versiunile vechi ale fiecărui dosar (ultimele 20).
        </p>
        <div className="mt-3.5">
          <button type="button" className={BTN} onClick={() => setRecuperare(true)}>
            <History className="size-4" aria-hidden="true" /> Deschide recuperarea
          </button>
        </div>
      </Card>

      <Card icon={tema === 'light' ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />} titlu="Aspect">
        <p className="text-[13px] leading-relaxed text-tx-2">Tema se ține minte în acest browser.</p>
        <div className="mt-3.5 inline-flex rounded-lg border border-border-strong p-1" role="radiogroup" aria-label="Tema">
          {(
            [
              ['dark', 'Dark', Moon],
              ['light', 'Light', Sun],
            ] as const
          ).map(([k, t, Icon]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={tema === k}
              onClick={() => setTema(k)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-bold transition-colors',
                tema === k ? 'bg-primary text-primary-foreground' : 'text-tx-2 hover:bg-surface-hover hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Card icon={<Sparkles className="size-4" aria-hidden="true" />} titlu="Animații">
        <p className="text-[13px] leading-relaxed text-tx-2">
          {motion === 'on'
            ? 'Pornite mereu, chiar dacă Windows are „Efecte de animație” oprite.'
            : 'Automat: urmează setarea din Windows („Efecte de animație”).'}
        </p>
        <div className="mt-3.5">
          <button type="button" className={BTN} onClick={() => setMotionPref(motion === 'on' ? 'auto' : 'on')}>
            {motion === 'on' ? 'Treci pe automat' : 'Pornește mereu'}
          </button>
        </div>
      </Card>

      <RecuperareModal open={recuperare} onClose={() => setRecuperare(false)} />

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
    </div>
  )
}
