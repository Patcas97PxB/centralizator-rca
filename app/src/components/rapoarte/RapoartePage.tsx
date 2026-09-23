import { Fragment, useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { dosareFinanciarFiltrate, filtruFinanciarImplicit, grupeazaPeService, type FiltruFinanciar } from '@/lib/financiar'
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

const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-[#cbd5e1]'
const FIELD = 'h-[38px] rounded-[11px] border-[#253150] bg-[#253150]/[.24] text-[13.5px] text-[#f1f5f9]'
const EXPORT_BTN =
  'flex h-[38px] items-center gap-[7px] rounded-[11px] border border-[#253150] bg-[#253150]/[.24] px-3.5 text-[13.5px] font-semibold text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white'
const TD = 'whitespace-nowrap px-3 py-[9px] text-[#cbd5e1]'
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

export function RapoartePage() {
  const { dosare, servicii, salveazaDosar } = useDosareContext()
  const [filtru, setFiltru] = useState<FiltruFinanciar>(filtruFinanciarImplicit)

  const filtrate = useMemo(() => dosareFinanciarFiltrate(dosare, filtru), [dosare, filtru])
  const grupuri = useMemo(() => grupeazaPeService(filtrate), [filtrate])

  const totalFinalizate = filtrate.filter((d) => d.status === 'finalizat').length
  const totalGeneral = grupuri.reduce((s, g) => s + g.subtotal, 0)
  const totalGeneralComision = grupuri.reduce((s, g) => s + g.subtotalComision, 0)

  async function onComisionChange(dosarId: string, val: string) {
    const d = dosare.find((x) => x.id === dosarId)
    if (!d) return
    const n = Math.max(0, Math.min(100, Number(val) || 0))
    await salveazaDosar({ ...d, comisionProcent: n })
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 pb-10 pt-[22px] md:px-6">
      <div className="md:hidden">
        <h2 className="text-xl font-bold text-foreground">Rapoarte</h2>
        <p className="text-sm text-muted-foreground">Comision, verificare tarif din grilă și export financiar.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[20px] border border-[#253150] bg-[#10172a] p-3.5">
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
        <div className="rounded-[20px] border border-dashed border-[#253150] p-10 text-center text-sm text-muted-foreground">
          Niciun dosar în acest interval / service.
        </div>
      ) : (
        <>
          {grupuri.map((g, gi) => (
            <div key={g.service} className="animate-fade-up overflow-hidden rounded-[20px] border border-[#253150] bg-[#10172a]" style={staggerDelay(gi)}>
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#1e2a45] px-4 py-[11px]">
                <span className="text-[13.5px] font-extrabold text-[#f1f5f9]">{g.service}</span>
                <span className="text-[11.5px] text-[#8b9ab5]">
                  {g.nrFinalizate}/{g.randuri.length} finalizate · {g.subtotal.toFixed(2)} EUR · comision: {g.subtotalComision.toFixed(2)} EUR
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#253150]/[.22]">
                      {HEADERS.map(([h, right]) => (
                        <th key={h} className={cn('whitespace-nowrap px-3 py-[9px] font-bold text-[#8b9ab5]', right ? 'text-right' : 'text-left')}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.randuri.map((r) => (
                      <Fragment key={r.dosar.id}>
                        <tr className={cn('border-t border-[#18233b] transition-colors hover:bg-white/[.03]', !r.finalizat && 'opacity-[.82]')}>
                          <td className={cn('whitespace-nowrap px-3 py-[9px] font-extrabold', r.finalizat ? 'text-[#3ddc97]' : 'text-[#aab8d0]')}>
                            {r.finalizat ? 'finalizat' : 'în curs'}
                          </td>
                          <td className={TD}>{r.dosar.nrRezervare || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-[9px] font-bold text-[#f1f5f9]">{r.dosar.nrAutoPagubit || '—'}</td>
                          <td className={TD}>{r.dosar.asigurator || '—'}</td>
                          <td className={TD}>{r.dosar.clasaAuto || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-[9px] text-right tabular-nums text-[#f1f5f9]">{r.valoare.toFixed(2)} EUR</td>
                          <td className="px-3 py-[9px] text-right tabular-nums text-[#cbd5e1]">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={r.procent}
                              className="ml-auto h-7 w-14 rounded-lg border-[#253150] bg-[#253150]/[.24] px-1.5 text-right text-xs"
                              onBlur={(e) => onComisionChange(r.dosar.id, e.target.value)}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-[9px] text-right font-bold tabular-nums text-[#3ddc97]">{r.comision.toFixed(2)} EUR</td>
                          <td className={TD}>{r.dosar.nrDosar}</td>
                          <td className={cn('whitespace-nowrap px-3 py-[9px] font-bold', r.areContract ? 'text-[#3ddc97]' : 'text-[#ff4d6d]')}>
                            {r.areContract ? 'Încărcat' : 'Lipsă'}
                          </td>
                        </tr>
                        {!r.finalizat && (
                          <tr>
                            <td colSpan={10} className="px-3 pb-2 text-[11px] italic text-[#8b9ab5]">
                              nefinalizat — nu intră în total până nu marchezi dosarul „Finalizat”
                            </td>
                          </tr>
                        )}
                        {r.alerte.length > 0 && (
                          <tr>
                            <td colSpan={10} className="px-3 pb-2 text-[11px] text-[#fbbf24]">
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
            className="rounded-[20px] border border-[#2563eb]/45 p-4 text-right text-sm font-extrabold text-[#f1f5f9]"
            style={{ background: 'linear-gradient(120deg, rgba(37,99,235,.18), rgba(37,99,235,.06))' }}
          >
            TOTAL GENERAL: {totalFinalizate}/{filtrate.length} finalizate · {totalGeneral.toFixed(2)} EUR · comision: {totalGeneralComision.toFixed(2)} EUR
          </div>
        </>
      )}
    </div>
  )
}
