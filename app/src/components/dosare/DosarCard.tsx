import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { AlertTriangle, Bell, BellOff, Check, ChevronDown, ImageIcon, StickyNote } from 'lucide-react'
import { imagineMasina } from '@/lib/cars'
import { cheiLocale, useFolderLocal } from '@/lib/folder-local'
import { docStatus, lipsuriFinalizare, numeScurtDoc } from '@/lib/documente'
import { etapaDosar, prioritateDosar } from '@/lib/rca-calc'
import { dateDosar, pasUrmator, textTermen } from '@/lib/pas-urmator'
import { ETAPA_META, type Dosar, type Etapa, type StatusDosar } from '@/lib/types'
import { cn } from '@/lib/utils'
import { faraReminder, fmtZi, textCand } from '@/lib/reminder'
import { ReminderModal } from './ReminderModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { STARE } from '@/lib/culori'

// Culoarea cardului urmeaza termenul (0 rosu, 1 galben, 2 verde, 3 albastru, 4 finalizat), nu statusul.
const RANK_COLOR = [STARE.rosu, STARE.galben, STARE.verde, STARE.albastru, STARE.gri]
const ETAPE: Etapa[] = ['rezervat', 'la_client', 'de_trimis', 'finalizat']

// Clicurile pe butoanele din card nu deschid panoul.
const stop = (e: MouseEvent) => e.stopPropagation()

// Cardul în 5 zone (redesign F3): cine · dosar · termen · lipsuri · pasul următor.
// Click pe card → panoul lateral cu tot dosarul (telefoane, service, note, documente, Editează).
export function DosarCard({
  dosar,
  selectat = false,
  onStatusChange,
  onDeschide,
  onPatch,
}: {
  dosar: Dosar
  selectat?: boolean
  onStatusChange: (id: string, status: StatusDosar) => void
  onDeschide: (id: string) => void
  onPatch: (id: string, patch: Partial<Dosar>) => void
}) {
  const etapa = etapaDosar(dosar)
  const meta = ETAPA_META[etapa]
  const folder = useFolderLocal()
  const docLocale = cheiLocale(folder, dosar)
  const dst = docStatus(dosar, docLocale)
  const cardColor = RANK_COLOR[prioritateDosar(dosar)]
  const poza = imagineMasina(dosar.marcaModelInlocuire ?? '')
  const termen = textTermen(dosar)
  const date = dateDosar(dosar)
  const pas = pasUrmator(dosar)
  const pasIndex = ETAPE.indexOf(etapa)

  const prevStatusRef = useRef(dosar.status)
  const [celebrating, setCelebrating] = useState(false)
  useEffect(() => {
    const wasFinal = prevStatusRef.current === 'finalizat'
    prevStatusRef.current = dosar.status
    if (!wasFinal && dosar.status === 'finalizat') {
      setCelebrating(true)
      const t = setTimeout(() => setCelebrating(false), 1400)
      return () => clearTimeout(t)
    }
  }, [dosar.status])

  const [reminderDeschis, setReminderDeschis] = useState(false)
  const [blocat, setBlocat] = useState<string | null>(null)
  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    if (!blocat) return
    setShaking(true)
    const t1 = setTimeout(() => setShaking(false), 450)
    const t2 = setTimeout(() => setBlocat(null), 3500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [blocat])

  function faPasul(e: MouseEvent) {
    e.stopPropagation()
    if (!pas) return
    if ('patch' in pas) {
      onPatch(dosar.id, pas.patch)
      return
    }
    const lipsuri = lipsuriFinalizare(dosar, docLocale)
    if (lipsuri.length > 0) {
      setBlocat(null)
      setTimeout(() => setBlocat('Nu se poate finaliza — lipsește: ' + lipsuri.join(', ')), 0)
      return
    }
    onStatusChange(dosar.id, 'finalizat')
  }

  function laTasta(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onDeschide(dosar.id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Deschide dosarul ${dosar.nrAutoPagubit || dosar.nrDosar}`}
      onClick={() => onDeschide(dosar.id)}
      onKeyDown={laTasta}
      className={cn(
        'relative flex min-w-0 cursor-pointer flex-col gap-2.5 rounded-[14px] border bg-card py-3 pl-[18px] pr-3.5 text-left outline-none transition-colors duration-150 hover:bg-surface-hover/40 focus-visible:ring-2 focus-visible:ring-ring',
        selectat ? 'border-primary' : 'border-border',
        shaking && 'animate-[devizShake_.45s_ease-in-out_both]',
      )}
    >
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-[14px]" style={{ background: cardColor }} />

      {celebrating && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-[7] flex size-16 -translate-x-1/2 -translate-y-1/2 animate-[finalCheck_1.4s_cubic-bezier(.2,.8,.2,1)_both] items-center justify-center rounded-full"
            style={{ background: 'var(--st-green)' }}
          >
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'finalDraw .5s .25s ease-out forwards' }} />
            </svg>
          </span>
        </>
      )}

      {/* 1 · Cine: poza mașinii de înlocuire, păgubit → înlocuire, modelele */}
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-16 shrink-0 items-center justify-center">
          {poza ? (
            <img src={poza} alt={dosar.marcaModelInlocuire} loading="lazy" className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-5 text-tx-3" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap text-[15px] font-extrabold tracking-[.01em] text-foreground">
            <span className="truncate">{dosar.nrAutoPagubit || '–'}</span>
            {dosar.nrAutoInlocuire && (
              <>
                <span className="shrink-0 font-medium text-tx-3" aria-label="înlocuită cu">→</span>
                <span className="truncate text-tx-2">{dosar.nrAutoInlocuire}</span>
              </>
            )}
          </div>
          <div className="truncate text-[12.5px] text-tx-3">
            {[dosar.marcaModel, dosar.marcaModelInlocuire].filter(Boolean).join(' → ') || '—'}
          </div>
        </div>
      </div>

      {/* 2 · Dosar: asigurator · nr. dosar · RBH, și etapa (meniul „Amintește-mi…”) */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1 truncate text-[12.5px] text-tx-2" title={dosar.updatedAt ? 'Actualizat ' + new Date(dosar.updatedAt).toLocaleString('ro-RO') : undefined}>
          {[dosar.asigurator, dosar.nrDosar, dosar.nrRezervare].filter(Boolean).join(' · ') || '—'}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={stop}
              title={meta.label + (dosar.amintesteMi ? ` · Amintește-mi ${textCand(dosar.amintesteLa)}${dosar.amintesteNota ? ': ' + dosar.amintesteNota : ''}` : '')}
              className="flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-bold text-tx-2 transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <span className="size-[7px] rounded-full" style={{ background: meta.color }} />
              {meta.label.charAt(0) + meta.label.slice(1).toLowerCase()}
              {dosar.amintesteMi && <Bell className="size-3 text-st-orange" strokeWidth={2.5} aria-label={'Amintește-mi ' + textCand(dosar.amintesteLa)} />}
              <ChevronDown className="size-3 text-tx-3" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60" onClick={stop}>
            <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
              Etapa se schimbă singură din pașii dosarului (predat → preluat → finalizat).
            </p>
            <DropdownMenuItem onClick={() => setReminderDeschis(true)}>
              <Bell className="size-4" aria-hidden="true" />
              {dosar.amintesteMi
                ? `Amintește-mi ${textCand(dosar.amintesteLa)}${dosar.amintesteLa ? ' (' + fmtZi(dosar.amintesteLa) + ')' : ''} — schimbă`
                : 'Amintește-mi…'}
            </DropdownMenuItem>
            {dosar.amintesteMi && (
              <DropdownMenuItem onClick={() => onPatch(dosar.id, faraReminder)}>
                <BellOff className="size-4" aria-hidden="true" />
                Gata, scoate reminderul
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 3 · Termen: textul mare colorat, bara, data predării și data preluării */}
      <div className="flex flex-col gap-1.5 border-t border-border pt-2.5">
        <span className="min-w-0 truncate text-[19px] font-extrabold leading-tight tracking-[-.01em]" style={{ color: cardColor }}>
          {termen.mare}
        </span>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <span
            className="block h-full rounded-full"
            style={{ width: `${termen.procent}%`, background: cardColor }}
          />
        </div>
        <div className="flex items-end justify-between gap-2">
          <span className="flex flex-col">
            <span className="text-[11px] text-tx-3">{date.predare.eticheta}</span>
            <span className="text-[13px] font-bold tabular-nums text-foreground">{date.predare.data}</span>
          </span>
          {termen.sub && <span className="min-w-0 truncate pb-px text-[11.5px] text-tx-3">{termen.sub}</span>}
          <span className="flex flex-col items-end">
            <span className="text-[11px] text-tx-3">{date.preluare.eticheta}</span>
            <span className="text-[13px] font-bold tabular-nums text-foreground">{date.preluare.data}</span>
          </span>
        </div>
      </div>

      {/* 4 · Lipsuri (sau de ce nu se poate finaliza) */}
      {blocat ? (
        <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-bold text-st-red" role="alert">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate" title={blocat}>{blocat}</span>
        </div>
      ) : dst.complete ? (
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-st-green">
          <Check className="size-4 shrink-0" strokeWidth={2.6} aria-hidden="true" />
          Toate documentele
        </div>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5 text-[12.5px] font-semibold text-st-amber-tx" title={'Lipsesc: ' + dst.missing.map(numeScurtDoc).join(', ')}>
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">Lipsesc: {dst.missing.map(numeScurtDoc).join(', ')}</span>
        </div>
      )}

      {/* Observațiile scrise de mână (câmpul Note) — mereu vizibile pe card (cererea utilizatorului) */}
      {dosar.notes && (
        <div className="flex min-w-0 items-start gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[12.5px] leading-snug text-tx-2" title={dosar.notes}>
          <StickyNote className="mt-px size-3.5 shrink-0 text-tx-3" aria-hidden="true" />
          <span className="line-clamp-2 min-w-0">{dosar.notes}</span>
        </div>
      )}

      {/* 5 · Pasul următor: etapele + un singur buton */}
      <div className="flex items-center gap-2.5 border-t border-border pt-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1" aria-label={`Etapa ${pasIndex + 1} din 4: ${meta.label}`}>
          {ETAPE.map((e, k) => (
            <span
              key={e}
              className={cn('h-1.5 flex-1 rounded-full', k < pasIndex ? 'bg-tx-3' : k === pasIndex ? 'bg-primary' : 'bg-surface-2')}
            />
          ))}
        </div>
        {pas && (
          <button
            type="button"
            onClick={faPasul}
            className="hidden h-8 shrink-0 items-center whitespace-nowrap rounded-lg bg-primary/15 px-3 text-[12.5px] font-bold text-accent-tx transition-colors hover:bg-primary/25 md:inline-flex"
          >
            {pas.eticheta}
          </button>
        )}
      </div>

      <div onClick={stop}>
        <ReminderModal dosar={dosar} open={reminderDeschis} onClose={() => setReminderDeschis(false)} onPatch={(p) => onPatch(dosar.id, p)} />
      </div>
    </div>
  )
}
