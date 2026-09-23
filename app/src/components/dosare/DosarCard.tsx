import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowDown, Check, ChevronDown, FolderPlus, ImageIcon, Pencil } from 'lucide-react'
import { imagineMasina } from '@/lib/cars'
import { ALPHA, accentStyle, hex } from '@/lib/color'
import { docStatus, docLabelText, lipsuriFinalizare } from '@/lib/documente'
import { calculRCA, fmtDate, prioritateDosar, urgentaDosar, zileScurseDeLaPredare } from '@/lib/rca-calc'
import { STATUS_META, type Dosar, type StatusDosar } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Culoarea cardului urmeaza termenul (0 rosu, 1 galben, 2 verde, 3 albastru, 4 finalizat), nu statusul.
const RANK_COLOR = ['#ff4d6d', '#fbbf24', '#00f5a0', '#3d8bff', '#94a3b8']

function Plate({ nr, model }: { nr: string; model?: string }) {
  return (
    <div className="flex w-full min-w-0 items-baseline gap-1.5">
      <span className="shrink-0 whitespace-nowrap rounded-md border border-[#3a4a6e] bg-[#161f33] px-1.5 py-px text-[12.5px] font-extrabold leading-[1.3] tracking-[.02em] text-[#f8fafc]">
        {nr || '–'}
      </span>
      {model && <span className="min-w-0 truncate text-[10.5px] font-semibold text-[#aab8d0]">{model}</span>}
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
  const meta = STATUS_META[dosar.status] ?? STATUS_META.in_asteptare
  const urgenta = urgentaDosar(dosar)
  const dst = docStatus(dosar)
  const rca = calculRCA(dosar)
  const accent = accentStyle(meta.color)
  const cardColor = RANK_COLOR[prioritateDosar(dosar)]
  const cardAccent = accentStyle(cardColor)
  const finalizat = dosar.status === 'finalizat'
  const poza = imagineMasina(dosar.marcaModelInlocuire ?? '')

  const predatFacut = !!dosar.predatBifat
  const preluatFacut = !!dosar.preluatBifat
  const viitor = urgenta.cls === 'c-albastru' && /până la predare/.test(urgenta.bigLabel)
  const scurse = zileScurseDeLaPredare(dosar.start)
  const total = rca.zile
  const pct = finalizat ? 100 : scurse !== null && total ? Math.max(0, Math.min(100, (scurse / total) * 100)) : 0
  const urgColor = cardColor
  const subStanga = finalizat ? 'închis' : viitor ? 'nepredată' : scurse !== null && total ? `ziua ${scurse} / ${total}` : ''
  const subDreapta = finalizat ? 'preluată' : viitor ? 'așteaptă predarea' : urgenta.depasit ? 'termen depășit' : 'termen'

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
      onStatusChange(dosar.id, 'de_preluat')
      return
    }
    const lipsuri = lipsuriFinalizare(dosar)
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
        'transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5',
        shaking && 'animate-[devizShake_.45s_ease-in-out_both]',
      )}
      style={{
        border: `1.5px solid ${hex(cardColor, '66')}`,
        background: 'linear-gradient(#141d33 0%, #0f1628 100%)',
        boxShadow: `var(--shadow-card-base), 0 0 22px -12px ${cardColor}`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1.5 animate-[railBreathe_2.4s_ease-in-out_infinite]"
        style={{
          background: cardColor,
          boxShadow: `${cardAccent.railGlow.replace('14px 2px', '16px 2px')}, 0 0 44px 6px ${hex(cardColor, '39')}`,
          borderRadius: '18px 0 0 18px',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: `linear-gradient(103deg, ${hex(cardColor, ALPHA.wash)} 0%, ${hex(cardColor, '00')} 46%)` }}
      />

      {celebrating && (
        <>
          <span aria-hidden className="pointer-events-none absolute inset-0 z-[6] animate-[finalRing_2.2s_cubic-bezier(.2,.8,.2,1)_both] rounded-[inherit]" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[6] animate-[finalWash_2.2s_ease-out_both] rounded-[inherit]"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,245,160,.25), transparent 65%)' }}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-[7] flex size-16 -translate-x-1/2 -translate-y-1/2 animate-[finalCheck_2.2s_cubic-bezier(.2,.9,.2,1)_both] items-center justify-center rounded-full"
            style={{ background: '#00f5a0', boxShadow: '0 0 30px 4px rgba(0,245,160,.7)' }}
          >
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="#052e16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
              ? 'border-[#3ddc97]/45 bg-[#3ddc97]/12 text-[#3ddc97]'
              : 'border-[#fbbf24]/45 bg-[#fbbf24]/12 text-[#fbbf24]',
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
          {dosar.nrDosar && <span className="whitespace-nowrap font-extrabold tabular-nums text-[#e2e8f5]">{dosar.nrDosar}</span>}
          {dosar.nrRezervare && (
            <span title="Nr. rezervare intern" className="whitespace-nowrap font-extrabold tabular-nums text-[#93c5fd]">
              {dosar.nrRezervare}
            </span>
          )}
          {dosar.asigurator && <span className="max-w-full truncate whitespace-nowrap font-semibold text-[#aab8d0]">{dosar.asigurator}</span>}
        </div>
      </div>

      <div className="relative col-span-2 flex min-w-0 flex-col gap-1.5 sm:col-span-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={meta.label}
              className="flex w-full items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border px-[9px] py-[5px] text-[10px] font-extrabold tracking-[.02em] transition-[filter] hover:brightness-125"
              style={{ borderColor: hex(meta.color, '8c'), background: accent.badgeBg, color: meta.color }}
            >
              <span className="size-[7px] rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px 1px ${hex(meta.color, 'cc')}` }} />
              <span className="min-w-0 flex-1 truncate text-left">{meta.label}</span>
              <ChevronDown className="size-[11px]" strokeWidth={2.5} aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.entries(STATUS_META)
              .filter(([val]) => val !== 'finalizat' || dosar.status === 'finalizat')
              .map(([val, m]) => (
                <DropdownMenuItem key={val} onClick={() => onStatusChange(dosar.id, val as StatusDosar)}>
                  <span className="size-2 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex min-w-0 flex-col gap-0.5 text-[11px]">
          <div className="flex min-w-0 items-center gap-[5px]" title="Telefon client">
            <span className="w-11 shrink-0 text-[9px] font-extrabold tracking-[.06em] text-[#e2e8f5]">CLIENT</span>
            <span className="truncate font-bold tabular-nums text-[#e2e8f5]">{dosar.telClient || '—'}</span>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-[5px]" title="Service">
            <span className="w-11 shrink-0 text-[9px] font-extrabold tracking-[.06em] text-[#e2e8f5]">SERVICE</span>
            <span className="truncate font-bold text-[#e2e8f5]">{dosar.service || '—'}</span>
          </div>
          <div className="flex min-w-0 items-center gap-[5px]" title="Telefon service">
            <span className="w-11 shrink-0 pr-0.5 text-right text-[9px] font-bold text-[#6b7a96]">tel.</span>
            <span className="truncate font-semibold tabular-nums text-[#cbd5e1]">{dosar.telService || '—'}</span>
          </div>
        </div>
      </div>

      <div className="relative col-span-full grid grid-cols-2 items-center gap-x-3 gap-y-2 border-t border-[#1e2a45] pt-[7px] sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <button
          type="button"
          onClick={() => onPatch(dosar.id, predatFacut ? { predatBifat: false, preluatBifat: false } : { predatBifat: true })}
          aria-pressed={predatFacut}
          title={predatFacut ? 'Contract început — click pentru a anula' : 'Marchează începutul contractului (mașina predată)'}
          className="order-1 flex items-center gap-2 justify-self-start text-left text-[#9aa8c1] transition-colors hover:text-[#e2e8f5]"
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors"
            style={{
              borderColor: predatFacut ? '#00f5a0' : '#3a4a6e',
              background: predatFacut ? 'rgba(0,245,160,.22)' : 'transparent',
              color: '#00f5a0',
              boxShadow: predatFacut ? '0 0 12px -2px rgba(0,245,160,.7)' : 'none',
            }}
          >
            {predatFacut && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
          </span>
          <span className="flex flex-col items-start gap-px">
            <span className="whitespace-nowrap text-[10.5px] font-bold">Predat</span>
            <span className="whitespace-nowrap text-xs font-extrabold tabular-nums text-[#e2e8f5]">{fmtDate(dosar.start) || '—'}</span>
          </span>
        </button>

        <button
          type="button"
          disabled={!predatFacut}
          onClick={() => onPatch(dosar.id, { preluatBifat: !preluatFacut })}
          aria-pressed={preluatFacut}
          title={
            !predatFacut
              ? 'Se poate bifa după „Predat"'
              : preluatFacut
                ? 'Mașina s-a întors — click pentru a anula'
                : 'Marchează că mașina s-a întors la client'
          }
          className="order-2 flex flex-row-reverse items-center gap-2 justify-self-end text-right transition-colors enabled:hover:text-[#e2e8f5] disabled:cursor-not-allowed sm:order-3"
          style={{ opacity: predatFacut ? 1 : 0.55, color: predatFacut ? '#9aa8c1' : '#5b6884' }}
        >
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors"
            style={{
              borderColor: preluatFacut ? '#00f5a0' : '#2c3a5c',
              background: preluatFacut ? 'rgba(0,245,160,.22)' : 'rgba(148,163,184,.08)',
              color: '#00f5a0',
              boxShadow: preluatFacut ? '0 0 12px -2px rgba(0,245,160,.7)' : 'none',
            }}
          >
            {preluatFacut && <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
          </span>
          <span className="flex flex-col items-end gap-px">
            <span className="whitespace-nowrap text-[10.5px] font-bold">Preluat</span>
            <span className="whitespace-nowrap text-xs font-extrabold tabular-nums" style={{ color: predatFacut ? '#e2e8f5' : '#5b6884' }}>
              {fmtDate(rca.dataPreluare) || '—'}
            </span>
          </span>
        </button>

        <div className="order-3 col-span-2 flex min-w-0 flex-col gap-1 sm:order-2 sm:col-span-1" title={`${urgenta.bigNum} ${urgenta.bigLabel}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-[5px] whitespace-nowrap">
              <span
                className="text-[22px] font-extrabold leading-none tracking-[-.02em] tabular-nums"
                style={{ color: urgColor, textShadow: `0 0 18px ${hex(urgColor, '80')}` }}
              >
                {urgenta.bigNum}
              </span>
              <span className="truncate text-[10px] font-extrabold uppercase tracking-[.04em]" style={{ color: urgColor }}>
                {urgenta.bigLabel}
              </span>
            </span>
          </div>
          <div className="relative h-2 rounded-full border" style={{ background: 'rgba(37,49,80,.55)', borderColor: hex(urgColor, '73') }}>
            <span
              className="absolute inset-y-0 left-0 origin-left rounded-full animate-[barGrow_.8s_cubic-bezier(.2,.8,.2,1)_both]"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${hex(urgColor, '55')}, ${urgColor})`,
                boxShadow: `0 0 10px -1px ${urgColor}`,
              }}
            />
          </div>
          <div className="flex justify-between gap-2 whitespace-nowrap text-[9.5px] font-semibold text-[#6b7a96]">
            <span>{subStanga}</span>
            <span>{subDreapta}</span>
          </div>
        </div>
      </div>

      <div className="relative col-span-full flex min-h-[22px] min-w-0 items-center gap-2 border-t border-[#1e2a45] pt-1.5">
        {blocat ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-[var(--danger-strong)]" role="alert">
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate" title={blocat}>{blocat}</span>
          </span>
        ) : (
          <span className="min-w-0 truncate text-[11px] leading-[1.35] text-[#aab8d0]" title={dosar.notes || undefined}>
            {dosar.notes || '—'}
          </span>
        )}
      </div>

      <div className="relative col-span-full grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <button
          type="button"
          onClick={() => onDeschide(dosar.id)}
          className="flex h-7 w-full max-w-[170px] min-w-0 items-center justify-center gap-1.5 justify-self-start overflow-hidden whitespace-nowrap rounded-[9px] border border-[#2c3a5c] bg-[#1a2335] px-2.5 text-xs font-bold text-[#e2e8f5] transition-colors hover:border-[#3b4d78] hover:bg-[#222d46]"
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
                  borderColor: '#00f5a0',
                  background: 'rgba(0,245,160,.22)',
                  color: '#00f5a0',
                  boxShadow: '0 0 0 1px rgba(0,245,160,.4), 0 0 22px -2px rgba(0,245,160,.95), inset 0 0 10px -2px rgba(0,245,160,.7)',
                }
              : { borderColor: '#3a4a6e', background: 'transparent', color: '#5b6884' }
          }
        >
          <Check className="size-[17px]" strokeWidth={3} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDocumente(dosar.id)}
          className="flex h-7 w-full max-w-[170px] min-w-0 items-center justify-center gap-1.5 justify-self-end overflow-hidden whitespace-nowrap rounded-[9px] border border-[#2c3a5c] bg-[#1a2335] px-2.5 text-xs font-bold text-[#e2e8f5] transition-colors hover:border-[#3b4d78] hover:bg-[#222d46]"
        >
          <FolderPlus className="size-[13px] shrink-0" aria-hidden="true" />
          <span className="truncate sm:hidden">Documente</span>
          <span className="hidden truncate sm:inline">Adaugă documente</span>
        </button>
      </div>
    </div>
  )
}
