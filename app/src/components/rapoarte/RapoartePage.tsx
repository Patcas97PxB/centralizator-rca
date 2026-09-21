import { Fragment, useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { dosareFinanciarFiltrate, filtruFinanciarImplicit, grupeazaPeService, type FiltruFinanciar } from '@/lib/financiar'
import { exportFinanciarCSV, exportFinanciarXLSX } from '@/lib/financiar-export'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

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
    <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 md:px-6 md:py-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Rapoarte</h2>
        <p className="text-sm text-muted-foreground">Comision, verificare tarif din grilă și export financiar.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="space-y-1.5">
          <Label htmlFor="finFrom">Predare de la</Label>
          <Input id="finFrom" type="date" value={filtru.dataFrom} onChange={(e) => setFiltru({ ...filtru, dataFrom: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="finTo">până la</Label>
          <Input id="finTo" type="date" value={filtru.dataTo} onChange={(e) => setFiltru({ ...filtru, dataTo: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="finService">Service</Label>
          <Select value={filtru.service || '__toate__'} onValueChange={(v) => setFiltru({ ...filtru, service: v === '__toate__' ? '' : v })}>
            <SelectTrigger id="finService" className="w-[200px]">
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
          <Button variant="outline" onClick={() => exportFinanciarCSV(filtrate)}>
            <Download className="size-4" aria-hidden="true" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => exportFinanciarXLSX(filtrate)}>
            <FileSpreadsheet className="size-4" aria-hidden="true" />
            Excel
          </Button>
        </div>
      </div>

      {filtrate.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Niciun dosar în acest interval / service.
        </div>
      ) : (
        <div className="space-y-4">
          {grupuri.map((g) => (
            <div key={g.service} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <span className="font-semibold text-foreground">{g.service}</span>
                <span className="text-xs text-muted-foreground">
                  {g.nrFinalizate}/{g.randuri.length} finalizate · {g.subtotal.toFixed(2)} EUR · comision: {g.subtotalComision.toFixed(2)} EUR
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nr. RBH</TableHead>
                      <TableHead>Nr. auto păgubit</TableHead>
                      <TableHead>Asigurator</TableHead>
                      <TableHead>Clasă</TableHead>
                      <TableHead>Valoare</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead>Comision</TableHead>
                      <TableHead>Nr. dosar</TableHead>
                      <TableHead>Contract final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.randuri.map((r) => (
                      <Fragment key={r.dosar.id}>
                        <TableRow className={r.finalizat ? '' : 'opacity-60'}>
                          <TableCell>{r.finalizat ? <span className="font-semibold text-success">finalizat</span> : <span className="text-muted-foreground">în curs</span>}</TableCell>
                          <TableCell>{r.dosar.nrRezervare || '—'}</TableCell>
                          <TableCell>{r.dosar.nrAutoPagubit || '—'}</TableCell>
                          <TableCell>{r.dosar.asigurator || '—'}</TableCell>
                          <TableCell>{r.dosar.clasaAuto || '—'}</TableCell>
                          <TableCell>{r.valoare.toFixed(2)} EUR</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              defaultValue={r.procent}
                              className="h-7 w-16 px-1.5 text-xs"
                              onBlur={(e) => onComisionChange(r.dosar.id, e.target.value)}
                            />
                          </TableCell>
                          <TableCell>{r.comision.toFixed(2)} EUR</TableCell>
                          <TableCell>{r.dosar.nrDosar}</TableCell>
                          <TableCell>
                            {r.areContract ? <span className="font-semibold text-success">✅ Încărcat</span> : <span className="font-semibold text-destructive">⚠️ Lipsă</span>}
                          </TableCell>
                        </TableRow>
                        {!r.finalizat && (
                          <TableRow>
                            <TableCell colSpan={10} className="text-[11px] italic text-muted-foreground">
                              nefinalizat — nu intră în total până nu marchezi dosarul „Finalizat”
                            </TableCell>
                          </TableRow>
                        )}
                        {r.alerte.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={10} className="text-[11px] text-warning">
                              {r.alerte.join(' · ')}
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-right font-semibold text-foreground">
            TOTAL GENERAL: {totalFinalizate}/{filtrate.length} finalizate · {totalGeneral.toFixed(2)} EUR · comision: {totalGeneralComision.toFixed(2)} EUR
          </div>
        </div>
      )}
    </div>
  )
}
