import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, BellOff, Check, FolderOpen, ImageIcon, Pencil, Undo2, X } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { imagineMasina } from '@/lib/cars'
import { cheiLocale, useFolderLocal } from '@/lib/folder-local'
import { DOCUMENT_LABELS_NUMARATE, docLabelText, docStatus, lipsuriFinalizare } from '@/lib/documente'
import { calculRCA, etapaDosar, fmtDate, prioritateDosar } from '@/lib/rca-calc'
import { anulareUltimulPas, dateDosar, pasUrmator, textTermen } from '@/lib/pas-urmator'
import { faraReminder, fmtZi, textCand } from '@/lib/reminder'
import { ETAPA_META, type Dosar, type Etapa, type StatusDosar } from '@/lib/types'
import { STARE } from '@/lib/culori'
import { cn } from '@/lib/utils'
import { ReminderModal } from './ReminderModal'
import { majuscule } from '@/lib/majuscule'

const RANK_COLOR = [STARE.rosu, STARE.galben, STARE.verde, STARE.albastru, STARE.gri]
const ETAPE: Etapa[] = ['rezervat', 'la_client', 'de_trimis', 'finalizat']

function Sectiune({ titlu, children }: { titlu: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-4 last:border-b-0">
      <h3 className="mb-2.5 text-[12.5px] font-bold text-tx-3">{titlu}</h3>
      {children}
    </section>
  )
}

function Rand({ eticheta, valoare }: { eticheta: string; valoare?: string }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-1 text-[13.5px]">
      <dt className="text-tx-3">{eticheta}</dt>
      <dd className="min-w-0 break-words font-semibold text-foreground">{valoare || '—'}</dd>
    </div>
  )
}

// Panoul lateral (redesign F3): tot dosarul, de citit, fără să deschizi formularul.
// Jos: Editează (formularul pe pași) și pasul următor. Documentele se adaugă din „Documente”.
export function DosarPanou({
  dosar,
  onClose,
  onPatch,
  onStatusChange,
  onEditeaza,
  onDocumente,
}: {
  dosar: Dosar | null
  onClose: () => void
  onPatch: (id: string, patch: Partial<Dosar>) => void
  onStatusChange: (id: string, status: StatusDosar) => void
  onEditeaza: (id: string) => void
  onDocumente: (id: string) => void
}) {
  const folder = useFolderLocal()
  const [reminderDeschis, setReminderDeschis] = useState(false)
  const [blocat, setBlocat] = useState<string | null>(null)
  useEffect(() => setBlocat(null), [dosar?.id])
  // Observațiile (câmpul Note) se scriu direct aici; se salvează la ieșirea din câmp, cu MAJUSCULE ca în formular.
  const [nota, setNota] = useState(dosar?.notes ?? '')
  const [notaSalvata, setNotaSalvata] = useState(false)
  useEffect(() => setNota(dosar?.notes ?? ''), [dosar?.id, dosar?.notes])
  useEffect(() => setNotaSalvata(false), [dosar?.id])
  function salveazaNota() {
    if (!dosar) return
    const noua = majuscule({ notes: nota.trim() }).notes ?? ''
    if (noua === (dosar.notes ?? '')) return
    onPatch(dosar.id, { notes: noua })
    setNotaSalvata(true)
  }

  if (!dosar) return <Sheet open={false} onOpenChange={(o) => !o && onClose()} />

  const etapa = etapaDosar(dosar)
  const pasIndex = ETAPE.indexOf(etapa)
  const docLocale = cheiLocale(folder, dosar)
  const dst = docStatus(dosar, docLocale)
  const termen = textTermen(dosar)
  const date = dateDosar(dosar)
  const culoare = RANK_COLOR[prioritateDosar(dosar)]
  const pas = pasUrmator(dosar)
  const anulare = anulareUltimulPas(dosar)
  const rca = calculRCA(dosar)
  const poza = imagineMasina(dosar.marcaModelInlocuire ?? '')
  const necesare = DOCUMENT_LABELS_NUMARATE.filter((k) => k === 'contract' || !(dosar.etichetaOptionale ?? []).includes(k))
  const docsOrdonate = [...necesare].sort((a, b) => Number(!dst.missing.includes(a)) - Number(!dst.missing.includes(b)))
  const dataEtapa: Record<Etapa, string> = {
    rezervat: '',
    la_client: dosar.start ? (etapa === 'rezervat' ? 'predare ' : 'predat ') + fmtDate(dosar.start) : '',
    de_trimis: dosar.preluatLa ? 'preluat ' + fmtDate(dosar.preluatLa) : '',
    finalizat: '',
  }

  function faPasul() {
    if (!dosar || !pas) return
    if ('patch' in pas) {
      onPatch(dosar.id, pas.patch)
      return
    }
    const lipsuri = lipsuriFinalizare(dosar, docLocale)
    if (lipsuri.length > 0) {
      setBlocat('Nu se poate finaliza — lipsește: ' + lipsuri.join(', '))
      return
    }
    setBlocat(null)
    onStatusChange(dosar.id, 'finalizat')
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" showCloseButton={false} className="gap-0 border-border bg-card p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[440px]">
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="flex h-[72px] w-[124px] shrink-0 items-center justify-center">
            {poza ? <img src={poza} alt="" className="poza-masina size-full object-contain" /> : <ImageIcon className="size-5 text-tx-3" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="flex min-w-0 items-baseline gap-1.5 text-[16px] font-extrabold text-foreground">
              <span className="truncate">{dosar.nrAutoPagubit || '–'}</span>
              {dosar.nrAutoInlocuire && (
                <>
                  <span className="font-medium text-tx-3">→</span>
                  <span className="truncate text-tx-2">{dosar.nrAutoInlocuire}</span>
                </>
              )}
            </SheetTitle>
            <SheetDescription className="truncate text-[12.5px] text-tx-3">
              {[dosar.marcaModel, dosar.marcaModelInlocuire].filter(Boolean).join(' → ') || '—'}
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border text-tx-2 md:size-9 transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <Sectiune titlu="Termen">
            <span className="block text-[20px] font-extrabold leading-tight" style={{ color: culoare }}>{termen.mare}</span>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full" style={{ width: `${termen.procent}%`, background: culoare }} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <span className="flex flex-col">
                <span className="text-[11.5px] text-tx-3">{date.predare.eticheta}</span>
                <span className="text-[14px] font-bold tabular-nums text-foreground">{date.predare.data}</span>
              </span>
              {termen.sub && <span className="min-w-0 truncate pb-px text-[12px] text-tx-3">{termen.sub}</span>}
              <span className="flex flex-col items-end">
                <span className="text-[11.5px] text-tx-3">{date.preluare.eticheta}</span>
                <span className="text-[14px] font-bold tabular-nums text-foreground">{date.preluare.data}</span>
              </span>
            </div>
            {rca.formula && rca.zile !== null && <p className="mt-0.5 text-[12px] text-tx-3">{rca.formula}</p>}
            <ol className="mt-3.5 grid grid-cols-4 gap-1.5">
              {ETAPE.map((e, k) => (
                <li key={e} className="min-w-0">
                  <span className={cn('mb-1.5 block h-1.5 rounded-full', k < pasIndex ? 'bg-tx-3' : k === pasIndex ? 'bg-primary' : 'bg-surface-2')} />
                  <span className={cn('block truncate text-[11.5px] font-bold', k === pasIndex ? 'text-foreground' : 'text-tx-3')}>
                    {ETAPA_META[e].label.charAt(0) + ETAPA_META[e].label.slice(1).toLowerCase()}
                  </span>
                  <span className="block truncate text-[11px] text-tx-3">{dataEtapa[e] || ' '}</span>
                </li>
              ))}
            </ol>
            {anulare && (
              <button
                type="button"
                onClick={() => onPatch(dosar.id, anulare.patch)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-tx-3 transition-colors hover:text-foreground"
              >
                <Undo2 className="size-3.5" aria-hidden="true" />
                {anulare.eticheta}
              </button>
            )}
          </Sectiune>

          <Sectiune titlu={dst.complete ? 'Documente · toate' : `Documente · lipsesc ${dst.missing.length}`}>
            <ul className="flex flex-col">
              {docsOrdonate.map((k) => {
                const lipseste = dst.missing.includes(k)
                return (
                  <li key={k} className="flex items-center gap-2.5 py-1.5 text-[13.5px]">
                    <span
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-full',
                        lipseste ? 'border-[1.5px] border-dashed border-border-strong' : 'bg-st-green/15 text-st-green',
                      )}
                    >
                      {!lipseste && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
                    </span>
                    <span className={cn('min-w-0 truncate', lipseste ? 'font-semibold text-foreground' : 'text-tx-2')}>{docLabelText(k)}</span>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => onDocumente(dosar.id)}
              className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[12.5px] font-bold text-foreground transition-colors hover:bg-surface-hover"
            >
              <FolderOpen className="size-4" aria-hidden="true" />
              Documente
            </button>
          </Sectiune>

          <Sectiune titlu="Client și service">
            <dl>
              <Rand eticheta="Telefon client" valoare={dosar.telClient} />
              <Rand eticheta="Service" valoare={dosar.service} />
              <Rand eticheta="Telefon service" valoare={dosar.telService} />
            </dl>
          </Sectiune>

          <Sectiune titlu="Dosar">
            <dl>
              <Rand eticheta="Asigurator" valoare={dosar.asigurator} />
              <Rand eticheta="Nr. dosar" valoare={dosar.nrDosar} />
              <Rand eticheta="Rezervare" valoare={dosar.nrRezervare} />
              <Rand eticheta="Clasă auto" valoare={dosar.clasaAuto} />
              <Rand eticheta="Zile din deviz" valoare={dosar.zileDeviz ? `${dosar.zileDeviz}${rca.dataPreluare ? ' · preluare ' + fmtDate(rca.dataPreluare) : ''}` : ''} />
            </dl>
          </Sectiune>

          <Sectiune titlu="Observații">
            <textarea
              value={nota}
              onChange={(e) => {
                setNota(e.target.value)
                setNotaSalvata(false)
              }}
              onBlur={salveazaNota}
              rows={3}
              placeholder="Scrie aici notițele tale despre dosar…"
              className="w-full resize-y rounded-lg border border-border-strong bg-background px-3 py-2 text-[13.5px] uppercase leading-snug text-foreground placeholder:normal-case placeholder:text-tx-3 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-tx-3">
              <span>{notaSalvata ? 'Salvat' : 'Se salvează când ieși din câmp'}</span>
              {nota !== (dosar.notes ?? '') && (
                <button type="button" onClick={salveazaNota} className="font-bold text-accent-tx hover:underline">
                  Salvează acum
                </button>
              )}
            </div>
          </Sectiune>

          <Sectiune titlu="Amintește-mi">
            {dosar.amintesteMi ? (
              <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-st-orange">
                <Bell className="size-4" aria-hidden="true" />
                {textCand(dosar.amintesteLa)}
                {dosar.amintesteLa ? ` (${fmtZi(dosar.amintesteLa)})` : ''}
                {dosar.amintesteNota ? ` — ${dosar.amintesteNota}` : ''}
              </p>
            ) : (
              <p className="text-[13px] text-tx-3">Niciun reminder.</p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setReminderDeschis(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-[12.5px] font-bold text-foreground transition-colors hover:bg-surface-hover"
              >
                <Bell className="size-4" aria-hidden="true" />
                {dosar.amintesteMi ? 'Schimbă' : 'Amintește-mi…'}
              </button>
              {dosar.amintesteMi && (
                <button
                  type="button"
                  onClick={() => onPatch(dosar.id, faraReminder)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-semibold text-tx-3 transition-colors hover:text-foreground"
                >
                  <BellOff className="size-4" aria-hidden="true" />
                  Gata
                </button>
              )}
            </div>
          </Sectiune>
        </div>

        <div className="border-t border-border px-5 py-3.5">
          {blocat && (
            <p className="mb-2.5 flex items-start gap-1.5 text-[12.5px] font-bold text-st-red" role="alert">
              <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
              {blocat}
            </p>
          )}
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => onEditeaza(dosar.id)}
              className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-border-strong px-4 text-[13.5px] md:h-10 font-bold text-foreground transition-colors hover:bg-surface-hover"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Editează
            </button>
            {pas && (
              <button
                type="button"
                onClick={faPasul}
                className="inline-flex h-11 items-center rounded-lg bg-primary px-4 md:h-10 text-[13.5px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {pas.eticheta}
              </button>
            )}
          </div>
        </div>
        <ReminderModal dosar={dosar} open={reminderDeschis} onClose={() => setReminderDeschis(false)} onPatch={(p) => onPatch(dosar.id, p)} />
      </SheetContent>
    </Sheet>
  )
}
