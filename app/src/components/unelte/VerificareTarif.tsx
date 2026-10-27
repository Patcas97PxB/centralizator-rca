import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Search, X } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FereastraAntet } from '@/components/ui/fereastra'
import { useDosareContext } from '@/contexts/DosareContext'
import { KNOWN_INSURERS } from '@/lib/asiguratori'
import { formatSuma, parseSuma, type Moneda } from '@/lib/financiar'
import { calculRCA } from '@/lib/rca-calc'
import { ALLIANZ_GROUPS, GROUPAMA_TARIFE, TARIFE_GRID, calcTarifGrila } from '@/lib/tarife-grid'
import { cn } from '@/lib/utils'
import { corespundeCautarii } from '@/lib/dosare-filter'
import type { Dosar } from '@/lib/types'

// Unealta „Verificare tarif” (meniul lateral → Unelte): asigurator + clasă + zile → suma din grilă,
// înainte să închizi contractul. Aceeași grilă ca în Rapoarte (`calcTarifGrila`). Opțional: alegi un
// dosar (se completează singure) și scrii valoarea de pe contract → ✓ / ⚠️.

const TVA = 0.21
const FARA_GRILA = ['Omniasig', 'Gothaer', 'Uniqa']

function claseAsigurator(asig: string): string[] {
  const a = asig.toLowerCase()
  if (a === 'groupama') return Object.keys(GROUPAMA_TARIFE)
  if (a === 'allianz') return ALLIANZ_GROUPS.flatMap((g) => g.clase)
  return Object.keys(TARIFE_GRID)
}

const CAMP =
  'h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] text-foreground focus:border-accent-tx focus:outline-none [color-scheme:dark]'
const ETICHETA = 'mb-1 block text-[12.5px] font-semibold text-tx-2'

/** Alegerea dosarului, în tema aplicației (în locul listei native a browserului): scrii o bucată din nr.
 * auto / RBH / nr. dosar, iar dedesubt apare o listă scurtă, derulabilă, cu ↑↓ + Enter. */
function AlegeDosar({ dosare, ales, onAlege }: { dosare: Dosar[]; ales: string; onAlege: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [deschis, setDeschis] = useState(false)
  const [activ, setActiv] = useState(0)
  const listaRef = useRef<HTMLDivElement>(null)
  const d = dosare.find((x) => x.id === ales)
  const lista = q.trim() ? dosare.filter((x) => corespundeCautarii(x, q.trim())) : dosare
  const eticheta = (x: Dosar) => [x.asigurator, x.clasaAuto && `clasa ${x.clasaAuto}`].filter(Boolean).join(' · ')

  function alege(x: Dosar) {
    onAlege(x.id)
    setQ('')
    setDeschis(false)
  }

  return (
    <div className="relative">
      <div className={cn(CAMP, 'flex items-center gap-2 px-2.5 focus-within:border-accent-tx')}>
        <Search className="size-4 shrink-0 text-tx-3" aria-hidden="true" />
        <input
          role="combobox"
          aria-expanded={deschis}
          value={deschis ? q : d ? `${d.nrAutoPagubit} · ${eticheta(d)}` : ''}
          placeholder="Caută nr. auto, RBH…"
          onFocus={() => {
            setDeschis(true)
            setActiv(0)
          }}
          onBlur={() => setTimeout(() => setDeschis(false), 120)}
          onChange={(e) => {
            setQ(e.target.value)
            setActiv(0)
            setDeschis(true)
          }}
          onKeyDown={(e) => {
            if (!lista.length) return
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const n = (activ + (e.key === 'ArrowDown' ? 1 : lista.length - 1)) % lista.length
              setActiv(n)
              listaRef.current?.children[n]?.scrollIntoView({ block: 'nearest' })
            } else if (e.key === 'Enter') {
              e.preventDefault()
              alege(lista[activ])
            } else if (e.key === 'Escape') setDeschis(false)
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-tx-3 focus:outline-none"
        />
        {d && !deschis ? (
          <button type="button" aria-label="Scoate dosarul" onClick={() => onAlege('')} className="flex size-6 items-center justify-center rounded-md text-tx-3 hover:bg-surface-hover hover:text-foreground">
            <X className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <ChevronDown className="size-4 shrink-0 text-tx-3" aria-hidden="true" />
        )}
      </div>
      {deschis && (
        <div
          ref={listaRef}
          role="listbox"
          className="scroll-fin absolute inset-x-0 top-[calc(100%+4px)] z-30 max-h-[232px] overflow-y-auto rounded-xl border border-border-strong bg-surface-2 p-1 shadow-lg shadow-black/40"
        >
          {lista.length === 0 && <p className="px-2.5 py-2 text-[13px] text-tx-3">Niciun dosar nu se potrivește.</p>}
          {lista.map((x, k) => (
            <button
              key={x.id}
              type="button"
              role="option"
              aria-selected={x.id === ales}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiv(k)}
              onClick={() => alege(x)}
              className={cn('flex w-full items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-left', k === activ && 'bg-surface-hover')}
            >
              <span className="shrink-0 text-[13.5px] font-bold text-foreground">{x.nrAutoPagubit || '–'}</span>
              <span className="min-w-0 truncate text-[12.5px] text-tx-3">{eticheta(x)}</span>
              {x.id === ales && <CheckCircle2 className="ml-auto size-3.5 shrink-0 self-center text-accent-tx" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function VerificareTarif({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { dosare } = useDosareContext()
  const [dosarId, setDosarId] = useState('')
  const [asig, setAsig] = useState('Hellas')
  const [clasa, setClasa] = useState('B')
  const [zile, setZile] = useState('5')
  const [valoare, setValoare] = useState('')

  const deschise = useMemo(
    () => dosare.filter((d) => d.status !== 'finalizat').sort((a, b) => (a.nrAutoPagubit || '').localeCompare(b.nrAutoPagubit || '')),
    [dosare],
  )
  const clase = claseAsigurator(asig)

  function dinDosar(id: string) {
    setDosarId(id)
    const d = dosare.find((x) => x.id === id)
    if (!d) return setValoare('')
    if (d.asigurator) setAsig(d.asigurator)
    if (d.clasaAuto) setClasa(d.clasaAuto)
    const z = d.zileContractFinal ? Number(d.zileContractFinal) : (calculRCA(d).zile ?? Number(d.zileDeviz))
    if (z) setZile(String(z))
    setValoare(d.valoareContract ? String(d.valoareContract) : '')
  }

  const nZile = Math.max(0, Math.floor(Number(zile) || 0))
  const tarif = calcTarifGrila({ asigurator: asig, clasaAuto: clasa, zileDeviz: String(nZile) }, nZile)
  const moneda = (tarif?.moneda ?? 'EUR') as Moneda
  const v = parseSuma(valoare)
  const sume = tarif ? [tarif.total, tarif.total * (1 + TVA), ...(tarif.totalExtern != null ? [tarif.totalExtern, tarif.totalExtern * (1 + TVA)] : [])] : []
  const potrivit = v > 0 && sume.some((s) => Math.abs(s - v) <= 1)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <FereastraAntet titlu="Verificare tarif" subtitlu="Suma din grila asiguratorului, înainte să închizi contractul" onClose={onClose} />
        <div className="flex flex-col gap-3.5 px-5 py-4">
          <div>
            <span className={ETICHETA}>Din dosar (opțional)</span>
            <AlegeDosar dosare={deschise} ales={dosarId} onAlege={dinDosar} />
          </div>
          <div className="grid grid-cols-[1.4fr_1fr_0.8fr] gap-2.5">
            <label>
              <span className={ETICHETA}>Asigurator</span>
              <select
                value={asig}
                onChange={(e) => {
                  setAsig(e.target.value)
                  const c = claseAsigurator(e.target.value)
                  if (!c.includes(clasa)) setClasa(c[0])
                }}
                className={CAMP}
              >
                {KNOWN_INSURERS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={ETICHETA}>Clasă</span>
              <select value={clasa} onChange={(e) => setClasa(e.target.value)} className={CAMP}>
                {!clase.includes(clasa) && <option value={clasa}>{clasa}</option>}
                {clase.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className={ETICHETA}>Zile</span>
              <input type="number" min={1} inputMode="numeric" value={zile} onChange={(e) => setZile(e.target.value)} className={CAMP} />
            </label>
          </div>

          {FARA_GRILA.includes(asig) ? (
            <p className="rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-tx-2">{asig} nu are grilă în aplicație — tariful se verifică de mână.</p>
          ) : !tarif ? (
            <p className="rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-tx-2">
              {nZile ? `Clasa ${clasa} nu e în grila ${asig}.` : 'Scrie numărul de zile.'}
            </p>
          ) : (
            <div className="rounded-[14px] border border-border bg-surface-2 px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] text-tx-2">
                  {formatSuma(tarif.pretZi, moneda)} / zi × {nZile} {nZile === 1 ? 'zi' : 'zile'}
                </span>
                <span className="text-[12px] text-tx-3">{tarif.palier}</span>
              </div>
              <div className="mt-1.5 text-[26px] font-extrabold leading-tight text-foreground tabular-nums">{formatSuma(tarif.total, moneda)}</div>
              <div className="text-[12.5px] text-tx-3">cu TVA 21%: {formatSuma(tarif.total * (1 + TVA), moneda)}</div>
              {tarif.totalExtern != null && (
                <div className="mt-2 border-t border-border pt-2 text-[13px] text-tx-2">
                  Allianz extern: <b className="text-foreground">{formatSuma(tarif.totalExtern, moneda)}</b>
                  <span className="text-tx-3"> · cu TVA {formatSuma(tarif.totalExtern * (1 + TVA), moneda)}</span>
                </div>
              )}
            </div>
          )}

          {tarif && (
            <label>
              <span className={ETICHETA}>Valoarea de pe contract (opțional)</span>
              <input
                value={valoare}
                inputMode="decimal"
                onChange={(e) => setValoare(e.target.value)}
                placeholder={`ex. ${formatSuma(tarif.total, moneda).replace(' ' + moneda, '')}`}
                className={CAMP}
              />
              {v > 0 && (
                <span className={cn('mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold', potrivit ? 'text-st-green-tx' : 'text-st-amber-tx')}>
                  {potrivit ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
                  {potrivit
                    ? 'Corespunde grilei'
                    : `Diferă de grilă cu ${formatSuma(Math.min(...sume.map((s) => Math.abs(s - v))), moneda)}`}
                </span>
              )}
            </label>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
