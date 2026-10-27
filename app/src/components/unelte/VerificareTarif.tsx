import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FereastraAntet } from '@/components/ui/fereastra'
import { useDosareContext } from '@/contexts/DosareContext'
import { KNOWN_INSURERS } from '@/lib/asiguratori'
import { formatSuma, parseSuma, type Moneda } from '@/lib/financiar'
import { calculRCA } from '@/lib/rca-calc'
import { ALLIANZ_GROUPS, GROUPAMA_TARIFE, TARIFE_GRID, calcTarifGrila } from '@/lib/tarife-grid'
import { cn } from '@/lib/utils'

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
    if (!d) return
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
          <label>
            <span className={ETICHETA}>Din dosar (opțional)</span>
            <select value={dosarId} onChange={(e) => dinDosar(e.target.value)} className={CAMP}>
              <option value="">— alege un dosar —</option>
              {deschise.map((d) => (
                <option key={d.id} value={d.id}>
                  {[d.nrAutoPagubit, d.asigurator, d.clasaAuto && `clasa ${d.clasaAuto}`].filter(Boolean).join(' · ')}
                </option>
              ))}
            </select>
          </label>
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
