import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, Bell, BellOff, Check, ChevronDown, FolderPlus, ImageIcon, Pencil } from 'lucide-react'
import { imagineMasina } from '@/lib/cars'
import { cheiLocale, useFolderLocal } from '@/lib/folder-local'
import { accentStyle, hex } from '@/lib/color'
import { docStatus, docLabelText, lipsuriFinalizare } from '@/lib/documente'
import { calculRCA, etapaDosar, fmtDate, prioritateDosar, todayStr, urgentaDosar, zileScurseDeLaPredare } from '@/lib/rca-calc'
import { ETAPA_META, type Dosar, type StatusDosar } from '@/lib/types'
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

function Plate({ nr, model }: { nr: string; model?: string }) {
  return (
    <div className="flex w-full min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 whitespace-nowrap rounded-md border border-border-strong bg-surface-2 px-1.5 py-px text-[12.5px] font-extrabold leading-[1.3] tracking-[.02em] text-foreground">
        {nr || '–'}
      </span>
      {model && <span className="min-w-0 truncate text-[10.5px] font-semibold text-tx-2">{model}</span>}
    </div>
  )
}

export function DosarCard({
  dosar,
  onStatusChange,
  onDeschide,
  onPatch,
  onDocumente,
}: {
  dosar: Dosar
  onStatusChange: (id: string, status: StatusDosar) => void
  onDeschide: (id: string) => void
  onPatch: (id: string, patch: Partial<Dosar>) => void
  onDocumente: (id: string) => void
}) {
  const meta = ETAPA_META[etapaDosar(dosar)]
  const urgenta = urgentaDosar(dosar)
  const folder = useFolderLocal()
  const docLocale = cheiLocale(folder, dosar)
  const dst = docStatus(dosar, docLocale)
  const rca = calculRCA(dosar)
  const accent = accentStyle(meta.color)
  const cardColor = RANK_COLOR[prioritateDosar(dosar)]
  const finalizat = dosar.status === 'finalizat'
  const poza = imagineMasina(dosar.marcaModelInlocuire ?? '')

  const predatFacut = !!dosar.predatBifat
  const preluatFacut = !!dosar.preluatBifat
  const viitor = !!urgenta.inaintePredare
  const scurse = zileScurseDeLaPredare(dosar.start)
  const total = rca.zile
  const pct = finalizat ? 100 : scurse !== null && total ? Math.max(0, Math.min(100, (scurse / total) * 100)) : 0
  const urgColor = cardColor
  const subStanga = finalizat ? 'închis' : viitor ? 'nepredată' : scurse !== null && total ? `ziua ${scurse} / ${total}` : ''
  const subDreapta = finalizat || preluatFacut ? 'preluată' : viitor ? 'așteaptă predarea' : urgenta.depasit ? 'termen depășit' : 'termen'

  const prevStatusRef = useRef(dosar.status)
  const [celebrating, setCelebrating] = useState(false)
  useEffect(() => {
    const wasFinal = prevStatusRef.current === 'finalizat'
    prevStatusRef.current = dosar.status
    if (!wasFinal && dosar.status === 'finalizat') {
      setCelebrating(true)
      const t = setTimeout(() => setCelebrating(false), 2300)
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

  function toggleFinal() {
    if (finalizat) {
      onStatusChange(dosar.id, 'in_asteptare') // etapa revine din bife
      return
    }
    const lipsuri = lipsuriFinalizare(dosar, docLocale)
    if (lipsuri.length > 0) {
      setBlocat(null)
      setTimeout(() => setBlocat('Lipsește: ' + lipsuri.join(', ')), 0)
      return
    }
    onStatusChange(dosar.id, 'finalizat')
  }

  return (
    <div
      className={cn(
        'relative grid min-w-0 grid-cols-[92px_minmax(0,1fr)] content-between gap-x-3 gap-y-[7px] rounded-[18px] py-3 pl-[18px] pr-3 sm:grid-cols-[104px_minmax(0,1.15fr)_minmax(0,.85fr)]',
        'transition-colors duration-200',
        shaking && 'animate-[devizShake_.45s_ease-in-out_both]',
      )}
      style={{
        border: '1px solid var(--border)',
        background: 'var(--card)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1"
        style={{
          background: cardColor,
          borderRadius: '18px 0 0 18px',
        }}
      />

      {celebrating && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-0 z-[6] animate-[finalRing_2.2s_cubic-bezier(.2,.8,.2,1)_both] rounded-[inherit]" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[6] animate-[finalWash_2.2s_ease-out_both] rounded-[inherit]"
            style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--st-green) 25%, transparent), transparent 65%)' }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-[7] flex size-16 -translate-x-1/2 -translate-y-1/2 animate-[finalCheck_2.2s_cubic-bezier(.2,.9,.2,1)_both] items-center justify-center rounded-full"
            style={{ background: 'var(--st-green)', boxShadow: '0 0 30px 4px color-mix(in srgb, var(--st-green) 70%, transparent)' }}
          >
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="var(--background)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" style={{ strokeDasharray: 24, strokeDashoffset: 24, animation: 'finalDraw .5s .25s ease-out forwards' }} />
            </svg>
          </span>
        </>
      )}

      <div className="relative flex min-w-0 flex-col gap-1.5">
        <div className="relative h-[72px] w-full overflow-hidden rounded-lg" style={{ color: cardColor }}>
          {poza ? (
            <img src={poza} alt={dosar.marcaModelInlocuire} loading="lazy" className="size-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,.6)]" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed opacity-60" style={{ borderColor: hex(cardColor, '80') }}>
              <ImageIcon className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>
        <span
          title={dst.complete ? 'Toate documentele prezente' : 'Lipsesc: ' + dst.missing.map(docLabelText).join(', ')}
          className={cn(
            'flex items-center gap-1 self-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-extrabold',
            dst.complete
              ? 'border-st-green/45 bg-st-green/12 text-st-green'
              : 'border-st-amber/45 bg-st-amber/12 text-st-amber',
          )}
        >
          {!dst.complete && <AlertTriangle className="size-3" aria-hidden="true" />}
          {dst.complete ? `${dst.have}/${dst.total} doc` : `Lipsesc ${dst.total - dst.have} doc.`}
        </span>
      </div>

      <div className="relative flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 flex-col items-start gap-px">
          <Plate nr={dosar.nrAutoPagubit} model={dosar.marcaModel} />
          {dosar.nrAutoInlocuire && (
            <>
              <ArrowDown className="ml-1 size-3" style={{ color: cardColor }} strokeWidth={2.5} aria-hidden="true" />
              <Plate nr={dosar.nrAutoInlocuire} model={dosar.marcaModelInlocuire} />
            </>
          )}
        </div>
        <div
          className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px]"
          title={dosar.updatedAt ? 'Actualizat ' + new Date(dosar.updatedAt).toLocaleString('ro-RO') : undefined}
        >
          {dosar.nrDosar && <span className="whitespace-nowrap font-extrabold tabular-nums text-foreground">{dosar.nrDosar}</span>}
          {dosar.nrRezervare && (
            <span title="Nr. rezervare intern" className="whitespace-nowrap font-extrabold tabular-nums text-accent-tx">
              {dosar.nrRezervare}
            </span>
          )}
          {dosar.asigurator && <span className="max-w-full truncate whitespace-nowrap font-semibold text-tx-2">{dosar.asigurator}</span>}
        </div>
      </div>

      <div className="relative col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={meta.label + (dosar.amintesteMi ? ` · Amintește-mi ${textCand(dosar.amintesteLa)}${dosar.amintesteNota ? ': ' + dosar.amintesteNota : ''}` : '')}
              className="flex w-full items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-[9px] py-[5px] text-[10px] font-extrabold tracking-[.02em] transition-[filter] hover:brightness-125"
              style={{ borderColor: hex(meta.color, '8c'), background: accent.badgeBg, color: meta.color }}
            >
              <span className="size-[7px] rounded-full" style={{ background: meta.color }} />
              <span className="min-w-0 flex-1 truncate text-left">{meta.label}</span>
              {dosar.amintesteMi && (
                <Bell
                  className="size-[11px] shrink-0 text-st-orange"
                  strokeWidth={2.5}
                  aria-label={'Amintește-mi ' + textCand(dosar.amintesteLa)}
                />
              )}
              <ChevronDown className="size-[11px]" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">
              Etapa se schimbă singură din bifele Predat, Preluat și Finalizat.
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
        <div className="flex min-w-0 flex-col gap-0.5 text-[11px]">
          <div className="flex min-w-0 items-center gap-[5px]" title="Telefon client">
            <span className="w-11 shrink-0 text-[9px] font-extrabold tracking-[.06em] text-foreground">CLIENT</span>
            <span className="truncate font-bold tabular-nums text-foreground">{dosar.telClient || '—'}</span>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-[5px]" title="Service">
            <span className="w-11 shrink-0 text-[9px] font-extrabold tracking-[.06em] text-foreground">SERVICE</span>
            <span className="truncate font-bold text-foreground">{dosar.service || '—'}</span>
          </div>
          <div className="flex min-w-0 items-center gap-[5px]" title="Telefon service">
            <span className="w-11 shrink-0 pr-0.5 text-right text-[9px] font-bold text-tx-3">tel.</span>
            <span className="truncate font-semibold tabular-nums text-tx-2">{dosar.telService || '—'}</span>
          </div>
        </div>
      </div>

      <div className="relative col-span-full grid grid-cols-2 items-center gap-x-3 gap-y-2 border-t border-border pt-[7px] sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <button
          type="button"
          onClick={() => onPatch(dosar.id, predatFacut ? { predatBifat: false, preluatBifat: false, preluatLa: '' } : { predatBifat: true })}
          aria-pressed={predatFacut}
          title={predatFacut ? 'Contract început — click pentru a anula' : 'Marchează începutul contractului (mașina predată)'}
          className="order-1 flex items-center gap-2 justify-self-start text-left text-tx-3 transition-colors hover:text-foreground"
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors"
            style={{
              borderColor: predatFacut ? 'var(--st-green)' : 'var(--border-strong)',
              background: predatFacut ? 'color-mix(in srgb, var(--st-green) 22%, transparent)' : 'transparent',
              color: 'var(--st-green)',
            }}
          >
            {predatFacut && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
          </span>
          <span className="flex flex-col items-start gap-px">
            <span className="whitespace-nowrap text-[10.5px] font-bold">Predat</span>
            <span className="whitespace-nowrap text-xs font-extrabold tabular-nums text-foreground">{fmtDate(dosar.start) || '—'}</span>
          </span>
        </button>

        <button
          type="button"
          disabled={!predatFacut}
          onClick={() => onPatch(dosar.id, { preluatBifat: !preluatFacut, preluatLa: preluatFacut ? '' : todayStr() })}
          aria-pressed={preluatFacut}
          title={
            !predatFacut
              ? 'Se poate bifa după „Predat"'
              : preluatFacut
                ? 'Mașina s-a întors — click pentru a anula'
                : 'Marchează că mașina s-a întors la client'
          }
          className="order-2 flex flex-row-reverse items-center gap-2 justify-self-end text-right transition-colors enabled:hover:text-foreground disabled:cursor-not-allowed sm:order-3"
          style={{ opacity: predatFacut ? 1 : 0.55, color: predatFacut ? 'var(--tx-2)' : 'var(--tx-3)' }}
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors"
            style={{
              borderColor: preluatFacut ? 'var(--st-green)' : 'var(--border-strong)',
              background: preluatFacut ? 'color-mix(in srgb, var(--st-green) 22%, transparent)' : 'color-mix(in srgb, var(--st-gray) 8%, transparent)',
              color: 'var(--st-green)',
            }}
          >
            {preluatFacut && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
          </span>
          <span className="flex flex-col items-end gap-px">
            <span className="whitespace-nowrap text-[10.5px] font-bold">Preluat</span>
            <span className="whitespace-nowrap text-xs font-extrabold tabular-nums" style={{ color: predatFacut ? 'var(--foreground)' : 'var(--tx-3)' }}>
              {fmtDate(rca.dataPreluare) || '—'}
            </span>
          </span>
        </button>

        <div className="order-3 col-span-2 flex min-w-0 flex-col gap-1 sm:order-2 sm:col-span-1" title={`${urgenta.bigNum} ${urgenta.bigLabel}`}>
          <div className="flex flex-col items-center gap-1 text-center">
            <span
              className="text-[32px] font-extrabold leading-none tracking-[-.02em] tabular-nums"
              style={{ color: urgColor }}
            >
              {urgenta.bigNum}
            </span>
            <span className="text-[12.5px] font-extrabold uppercase leading-tight tracking-[.04em]" style={{ color: urgColor }}>
              {urgenta.bigLabel}
            </span>
          </div>
          <div className="relative h-2 rounded-full border" style={{ background: 'color-mix(in srgb, var(--border) 55%, transparent)', borderColor: hex(urgColor, '73') }}>
            <span
              className="absolute inset-y-0 left-0 origin-left rounded-full animate-[barGrow_.8s_cubic-bezier(.2,.8,.2,1)_both]"
              style={{
                width: `${pct}%`,
                background: urgColor,
              }}
            />
          </div>
          <div className="flex justify-center gap-1.5 whitespace-nowrap text-center text-[9.5px] font-semibold text-tx-3">
            {subStanga && <span>{subStanga}</span>}
            {subStanga && subDreapta && <span aria-hidden="true">·</span>}
            <span>{subDreapta}</span>
          </div>
        </div>
      </div>

      <div className="relative col-span-full flex min-h-[22px] min-w-0 items-center gap-2 border-t border-border pt-1.5">
        {blocat ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[var(--danger-strong)]" role="alert">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate" title={blocat}>{blocat}</span>
          </span>
        ) : (
          <span className="min-w-0 truncate text-[11px] leading-[1.35] text-tx-2" title={dosar.notes || undefined}>
            {dosar.notes || '—'}
          </span>
        )}
      </div>

      <div className="relative col-span-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={() => onDeschide(dosar.id)}
          className="flex h-7 w-full max-w-[170px] min-w-0 items-center justify-center gap-1.5 justify-self-start overflow-hidden whitespace-nowrap rounded-[9px] border border-border-strong bg-surface-2 px-2.5 text-xs font-bold text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
        >
          <Pencil className="size-[13px]" aria-hidden="true" />
          Editează
        </button>
        <button
          type="button"
          onClick={toggleFinal}
          title={finalizat ? 'Contract finalizat — click pentru a anula' : 'Marchează dosarul ca finalizat'}
          aria-label="Finalizare contract"
          aria-pressed={finalizat}
          className="flex size-8 items-center justify-center rounded-full border-[1.5px] transition-all hover:scale-110"
          style={
            finalizat
              ? {
                  borderColor: 'var(--st-green)',
                  background: 'color-mix(in srgb, var(--st-green) 22%, transparent)',
                  color: 'var(--st-green)',
                }
              : { borderColor: 'var(--border-strong)', background: 'transparent', color: 'var(--tx-3)' }
          }
        >
          <Check className="size-[17px]" strokeWidth={3} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDocumente(dosar.id)}
          className="flex h-7 w-full max-w-[170px] min-w-0 items-center justify-center gap-1.5 justify-self-end overflow-hidden whitespace-nowrap rounded-[9px] border border-border-strong bg-surface-2 px-2.5 text-xs font-bold text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover"
        >
          <FolderPlus className="size-[13px] shrink-0" aria-hidden="true" />
          <span className="truncate">Documente</span>
        </button>
      </div>
      <ReminderModal dosar={dosar} open={reminderDeschis} onClose={() => setReminderDeschis(false)} onPatch={(p) => onPatch(dosar.id, p)} />
    </div>
  )
}
