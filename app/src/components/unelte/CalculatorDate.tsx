import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FereastraAntet } from '@/components/ui/fereastra'
import { KNOWN_INSURERS } from '@/lib/asiguratori'
import { calculRCA, todayStr, zileDecontabileReale, zileRamase } from '@/lib/rca-calc'
import { dosarGol, type Vehicul } from '@/lib/types'
import { cn } from '@/lib/utils'

// Unealta „Calculator de date” (meniul lateral → Unelte): pentru clientul care întreabă la telefon,
// fără să deschizi dosarul. 1) predare + zile din deviz → până când poate ține mașina (aceeași regulă
// ca pe card: `calculRCA` — weekend/sărbători sărite, +1 zi intrare-ieșire, Allianz nedeplasabil 13 + deviz);
// 2) câte zile decontabile sunt între predare și preluare (de a doua zi după predare, inclusiv).

const CAMP =
  'h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] text-foreground focus:border-accent-tx focus:outline-none [color-scheme:dark]'
const ETICHETA = 'mb-1 block text-[12.5px] font-semibold text-tx-2'

const ziLunga = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

function cateZile(n: number): string {
  if (n === 0) return 'termenul e azi'
  if (n > 0) return n === 1 ? 'mai are 1 zi' : `mai are ${n} zile`
  return n === -1 ? 'depășit cu 1 zi' : `depășit cu ${-n} zile`
}

export function CalculatorDate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'preluare' | 'interval'>('preluare')
  const [predare, setPredare] = useState(todayStr())
  const [zile, setZile] = useState('5')
  const [asig, setAsig] = useState('Hellas')
  const [vehicul, setVehicul] = useState<Vehicul>('deplasabil')
  const [dela, setDela] = useState(todayStr())
  const [panala, setPanala] = useState(todayStr())

  const rez = calculRCA({ ...dosarGol(), start: predare, zileDeviz: zile, asigurator: asig, vehicul })
  const ramase = rez.dataPreluare ? zileRamase(rez.dataPreluare) : null
  const interval = zileDecontabileReale(dela, panala)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <FereastraAntet titlu="Calculator de date" subtitlu="Pentru clientul care întreabă la telefon" onClose={onClose} />
        <div role="tablist" className="flex gap-1 border-b border-border px-5">
          {(
            [
              ['preluare', 'Până când ține mașina'],
              ['interval', 'Zile între două date'],
            ] as const
          ).map(([k, t]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={cn(
                '-mb-px min-h-10 border-b-2 px-2.5 text-[13px] font-semibold transition-colors',
                tab === k ? 'border-primary text-foreground' : 'border-transparent text-tx-3 hover:text-foreground',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'preluare' ? (
          <div className="flex flex-col gap-3.5 px-5 py-4">
            <div className="grid grid-cols-2 gap-2.5">
              <label>
                <span className={ETICHETA}>Data predării</span>
                <input type="date" value={predare} onChange={(e) => setPredare(e.target.value)} className={CAMP} />
              </label>
              <label>
                <span className={ETICHETA}>Zile din deviz</span>
                <input type="number" min={1} inputMode="numeric" value={zile} onChange={(e) => setZile(e.target.value)} className={CAMP} />
              </label>
              <label>
                <span className={ETICHETA}>Asigurator</span>
                <select value={asig} onChange={(e) => setAsig(e.target.value)} className={CAMP}>
                  {KNOWN_INSURERS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={ETICHETA}>Mașina păgubită</span>
                <select value={vehicul} onChange={(e) => setVehicul(e.target.value as Vehicul)} className={CAMP}>
                  <option value="deplasabil">deplasabilă</option>
                  <option value="nedeplasabil">nedeplasabilă</option>
                </select>
              </label>
            </div>
            {rez.dataPreluare ? (
              <div className="rounded-[14px] border border-border bg-surface-2 px-4 py-3.5">
                <div className="text-[12.5px] text-tx-3">Preluare cel târziu</div>
                <div className="mt-0.5 text-[22px] font-extrabold capitalize leading-tight text-foreground">{ziLunga(rez.dataPreluare)}</div>
                <div className="mt-1 text-[13px] text-tx-2">
                  {rez.zile} {rez.zile === 1 ? 'zi decontabilă' : 'zile decontabile'}
                  {ramase !== null && <span className="text-tx-3"> · {cateZile(ramase)}</span>}
                </div>
                <div className="mt-2 border-t border-border pt-2 text-[12.5px] text-tx-3">{rez.formula}</div>
              </div>
            ) : (
              <p className="rounded-[14px] border border-border bg-surface-2 px-4 py-3 text-[13.5px] text-tx-2">{rez.formula}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 px-5 py-4">
            <div className="grid grid-cols-2 gap-2.5">
              <label>
                <span className={ETICHETA}>Predare</span>
                <input type="date" value={dela} onChange={(e) => setDela(e.target.value)} className={CAMP} />
              </label>
              <label>
                <span className={ETICHETA}>Preluare</span>
                <input type="date" value={panala} onChange={(e) => setPanala(e.target.value)} className={CAMP} />
              </label>
            </div>
            <div className="rounded-[14px] border border-border bg-surface-2 px-4 py-3.5">
              <div className="text-[26px] font-extrabold leading-tight text-foreground tabular-nums">
                {interval ?? 0} {interval === 1 ? 'zi' : 'zile'}
              </div>
              <div className="mt-1 text-[12.5px] text-tx-3">decontabile — de a doua zi după predare până la preluare, inclusiv</div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
