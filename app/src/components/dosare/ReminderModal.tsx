import { useEffect, useState } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ACTIUNI_REMINDER, faraReminder, peste } from '@/lib/reminder'
import { todayStr } from '@/lib/rca-calc'
import type { Dosar } from '@/lib/types'
import { cn } from '@/lib/utils'

const ZILE = [
  { label: 'Azi', n: 0 },
  { label: 'Mâine', n: 1 },
  { label: 'Peste 2 zile', n: 2 },
  { label: 'Peste o săptămână', n: 7 },
]

const CHIP =
  'rounded-full border px-3 py-1 text-xs font-bold transition-colors border-border-strong bg-surface-2 text-tx-2 hover:border-border-strong hover:text-white'
const CHIP_ACTIV = 'border-st-orange bg-st-orange/15 text-st-orange hover:border-st-orange hover:text-st-orange'

// „Amintește-mi…" din meniul pastilei de pe card: ziua din care dosarul apare in clopotel + ce ai de facut.
export function ReminderModal({
  dosar,
  open,
  onClose,
  onPatch,
}: {
  dosar: Dosar
  open: boolean
  onClose: () => void
  onPatch: (patch: Partial<Dosar>) => void
}) {
  const [zi, setZi] = useState(peste(1))
  const [nota, setNota] = useState('')

  useEffect(() => {
    if (!open) return
    setZi(dosar.amintesteMi && dosar.amintesteLa ? dosar.amintesteLa : dosar.amintesteMi ? todayStr() : peste(1))
    setNota(dosar.amintesteNota ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function salveaza() {
    onPatch({ amintesteMi: true, amintesteLa: zi || todayStr(), amintesteNota: nota.trim() })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-4 text-st-orange" aria-hidden="true" />
            Amintește-mi
          </DialogTitle>
          <DialogDescription>
            {dosar.nrAutoPagubit || dosar.nrDosar} — din ziua aleasă apare primul în clopoțel. Îl găsești oricând la „Ale mele”.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            salveaza()
          }}
        >
          <div className="grid gap-2">
            <Label className="text-xs">Când</Label>
            <div className="flex flex-wrap gap-1.5">
              {ZILE.map((z) => (
                <button key={z.n} type="button" className={cn(CHIP, zi === peste(z.n) && CHIP_ACTIV)} onClick={() => setZi(peste(z.n))}>
                  {z.label}
                </button>
              ))}
            </div>
            <Input type="date" aria-label="Altă zi" value={zi} min={todayStr()} onChange={(e) => setZi(e.target.value)} className="w-[170px]" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="remNota" className="text-xs">Ce ai de făcut</Label>
            <div className="flex flex-wrap gap-1.5">
              {ACTIUNI_REMINDER.map((a) => (
                <button key={a} type="button" className={cn(CHIP, nota === a && CHIP_ACTIV)} onClick={() => setNota(a)}>
                  {a}
                </button>
              ))}
            </div>
            <Input id="remNota" value={nota} placeholder="sau scrie tu (opțional)" onChange={(e) => setNota(e.target.value)} />
          </div>
          <DialogFooter className="sm:items-center">
            {dosar.amintesteMi && (
              <button
                type="button"
                onClick={() => {
                  onPatch(faraReminder)
                  onClose()
                }}
                className="mr-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <BellOff className="size-3.5" aria-hidden="true" />
                Scoate reminderul
              </button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>Anulează</Button>
            <Button type="submit">
              <Bell className="size-4" aria-hidden="true" />
              Salvează
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
