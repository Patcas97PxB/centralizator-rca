import { Fragment, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, Search } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { ActivitateRecenta } from '@/components/panel/ActivitateRecenta'
import { StatisticiRapide } from '@/components/panel/StatisticiRapide'
import { cheiLocale, useFolderLocal } from '@/lib/folder-local'
import { useStariContracteLaptop } from '@/lib/contracte-laptop'
import { dosareFinanciarFiltrate, filtruFinanciarImplicit, formatSuma, formatSumePeMoneda, grupeazaPeService, sumeGoale, type FiltruFinanciar } from '@/lib/financiar'
import { exportFinanciarCSV, exportFinanciarXLSX } from '@/lib/financiar-export'
import { staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-tx-2'
const FIELD = 'h-[38px] rounded-[11px] border-border bg-border/[.24] text-[13.5px] text-foreground'
const EXPORT_BTN =
  'flex h-[38px] items-center gap-[7px] rounded-[11px] border border-border bg-border/[.24] px-3.5 text-[13.5px] font-semibold text-tx-2 transition-colors hover:bg-border/60 hover:text-white'
const TD = 'whitespace-nowrap px-3 py-[9px] text-tx-2'
const HEADERS: [string, boolean][] = [
  ['Status', false],
  ['Nr. RBH', false],
  ['Nr. auto păgubit', false],
  ['Asigurator', false],
  ['Clasă', false],
  ['Valoare', true],
  ['%', true],
  ['Comision', true],
  ['Nr. dosar', false],
  ['Contract final', false],
]

export function RapoartePage({ onAlegeDosar }: { onAlegeDosar?: (id: string) => void }) {
  const folder = useFolderLocal()
  const stariLaptop = useStariContracteLaptop()
  const { dosare, servicii, salveazaRapid } = useDosareContext()
  const [filtru, setFiltru] = useState<FiltruFinanciar>(filtruFinanciarImplicit)

  const filtrate = useMemo(() => dosareFinanciarFiltrate(dosare, filtru), [dosare, filtru])
  const grupuri = useMemo(() => grupeazaPeService(filtrate), [filtrate])

  const totalFinalizate = filtrate.filter((d) => d.status === 'finalizat').length
  const totalGeneral = sumeGoale()
  const totalGeneralComision = sumeGoale()
  for (const g of grupuri) {
    totalGeneral.EUR += g.subtotal.EUR
    totalGeneral.lei += g.subtotal.lei
    totalGeneralComision.EUR += g.subtotalComision.EUR
    totalGeneralComision.lei += g.subtotalComision.lei
  }

  async function onComisionChange(dosarId: string, val: string) {
    const d = dosare.find((x) => x.id === dosarId)
    if (!d) return
    const n = Math.max(0, Math.min(100, Number(val) || 0))
    await salveazaRapid({ ...d, comisionProcent: n })
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 pb-10 pt-[22px] md:px-6">
      <div className="md:hidden">
        <h2 className="text-xl font-bold text-foreground">Rapoarte</h2>
        <p className="text-sm text-muted-foreground">Comision, verificare tarif din grilă și export financiar.</p>
      </div>

      {/* Mutate din coloana din dreapta a paginii Dosare (redesign F4) */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatisticiRapide dosare={dosare} />
        <ActivitateRecenta dosare={dosare} onAlege={onAlegeDosar} />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[20px] border border-border bg-card p-3.5">
        <div className="min-w-[220px] flex-1 basis-full sm:basis-auto">
          <Label htmlFor="finSearch" className={LABEL}>Caută</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tx-3" aria-hidden="true" />
            <Input
              id="finSearch"
              value={filtru.search}
              onChange={(e) => setFiltru({ ...filtru, search: e.target.value })}
              placeholder="Nr. auto, RBH, dosar, asigurator, sumă…"
              className={cn(FIELD, 'w-full pl-9 pr-3')}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="finFrom" className={LABEL}>Predare de la</Label>
          <Input id="finFrom" type="date" className={cn(FIELD, 'px-2.5 [color-scheme:dark]')} value={filtru.dataFrom} onChange={(e) => setFiltru({ ...filtru, dataFrom: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="finTo" className={LABEL}>până la</Label>
          <Input id="finTo" type="date" className={cn(FIELD, 'px-2.5 [color-scheme:dark]')} value={filtru.dataTo} onChange={(e) => setFiltru({ ...filtru, dataTo: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="finService" className={LABEL}>Service</Label>
          <Select value={filtru.service || '__toate__'} onValueChange={(v) => setFiltru({ ...filtru, service: v === '__toate__' ? '' : v })}>
            <SelectTrigger id="finService" className={cn(FIELD, 'min-w-[200px] px-2.5')}>
              <SelectValue placeholder="Toate service-urile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__toate__">Toate service-urile</SelectItem>
              {servicii.map((s) => (
                <SelectItem key={s.id} value={s.nume}>
                  {s.nume}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" className={EXPORT_BTN} onClick={() => exportFinanciarCSV(filtrate)}>
            <Download className="size-4" aria-hidden="true" />
            CSV
          </button>
          <button type="button" className={EXPORT_BTN} onClick={() => exportFinanciarXLSX(filtrate)}>
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            Excel
          </button>
        </div>
      </div>

      {filtrate.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Niciun dosar pentru această căutare / interval / service.
        </div>
      ) : (
        <>
          {grupuri.map((g, gi) => (
            <div key={g.service} className="animate-fade-up overflow-hidden rounded-[20px] border border-border bg-card" style={staggerDelay(gi)}>
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border px-4 py-[11px]">
                <span className="text-[13.5px] font-extrabold text-foreground">{g.service}</span>
                <span className="text-[11.5px] text-tx-3">
                  {g.nrFinalizate}/{g.randuri.length} finalizate · {formatSumePeMoneda(g.subtotal)} · comision: {formatSumePeMoneda(g.subtotalComision)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-border/[.22]">
                      {HEADERS.map(([h, right]) => (
                        <th key={h} className={cn('whitespace-nowrap px-3 py-[9px] font-bold text-tx-3', right ? 'text-right' : 'text-left')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.randuri.map((r) => (
                      <Fragment key={r.dosar.id}>
                        <tr className={cn('border-t border-border transition-colors hover:bg-white/[.03]', !r.finalizat && 'opacity-[.82]')}>
                          <td className={cn('whitespace-nowrap px-3 py-[9px] font-extrabold', r.finalizat ? 'text-st-green' : 'text-tx-2')}>
                            {r.finalizat ? 'finalizat' : 'în curs'}
                          </td>
                          <td className={TD}>{r.dosar.nrRezervare || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-[9px] font-bold text-foreground">{r.dosar.nrAutoPagubit || '—'}</td>
                          <td className={TD}>{r.dosar.asigurator || '—'}</td>
                          <td className={TD}>{r.dosar.clasaAuto || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-[9px] text-right tabular-nums text-foreground">{formatSuma(r.valoare, r.moneda)}</td>
                          <td className="px-3 py-[9px] text-right tabular-nums text-tx-2">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={r.procent}
                              className="ml-auto h-7 w-14 rounded-lg border-border bg-border/[.24] px-1.5 text-right text-xs"
                              onBlur={(e) => onComisionChange(r.dosar.id, e.target.value)}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-[9px] text-right font-bold tabular-nums text-st-green">{formatSuma(r.comision, r.moneda)}</td>
                          <td className={TD}>{r.dosar.nrDosar}</td>
                          {(() => {
                            const st = stariLaptop.get(r.dosar.id)
                            const peLaptop = !r.areContract && cheiLocale(folder, r.dosar).includes('contract')
                            const [text, culoare, titlu] = r.areContract
                              ? ['Încărcat', 'text-st-green', '']
                              : !peLaptop
                                ? ['Lipsă', 'text-st-red', '']
                                : st?.stare === 'eroare'
                                  ? ['Pe laptop — necitit', 'text-st-amber', st.mesaj]
                                  : ['Pe laptop — se citește…', 'text-accent-tx', '']
                            return (
                              <td className={cn('whitespace-nowrap px-3 py-[9px] font-bold', culoare)} title={titlu || undefined}>
                                {text}
                              </td>
                            )
                          })()}
                        </tr>
                        {!r.finalizat && (
                          <tr>
                            <td colSpan={10} className="px-3 pb-2 text-[11px] italic text-tx-3">
                              nefinalizat — nu intră în total până nu marchezi dosarul „Finalizat”
                            </td>
                          </tr>
                        )}
                        {r.alerte.length > 0 && (
                          <tr>
                            <td colSpan={10} className="px-3 pb-2 text-[11px] text-st-amber">
                              {r.alerte.join(' · ')}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div
            className="rounded-[20px] border border-primary/45 p-4 text-right text-sm font-extrabold text-foreground"
            style={{ background: 'linear-gradient(120deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--primary) 6%, transparent))' }}
          >
            TOTAL GENERAL: {totalFinalizate}/{filtrate.length} finalizate · {formatSumePeMoneda(totalGeneral)} · comision: {formatSumePeMoneda(totalGeneralComision)}
          </div>
        </>
      )}
    </div>
  )
}
