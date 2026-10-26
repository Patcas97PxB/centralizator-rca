import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dateDinDosar, descarcaOdt, type DateIntrareIesire } from '@/lib/doc-intrare-iesire'
import type { Dosar } from '@/lib/types'

const CAMPURI: { k: keyof DateIntrareIesire; label: string; placeholder?: string; lat?: boolean }[] = [
  { k: 'nrComanda', label: 'Comanda nr.' },
  { k: 'dataComanda', label: 'Din data de', placeholder: 'zz.ll.aaaa (opțional)' },
  { k: 'client', label: 'Client', placeholder: 'ex. proprietarul mașinii', lat: true },
  { k: 'tipAuto', label: 'Tip auto' },
  { k: 'nrAuto', label: 'Nr. înmatriculare' },
  { k: 'dataIntrare', label: 'Data intrare reparație', placeholder: 'zz.ll.aaaa' },
  { k: 'dataIesire', label: 'Data ieșire reparație', placeholder: 'zz.ll.aaaa' },
]

// Fereastra butonului „Intrare/ieșire" de pe card: campurile vin din dosar, se pot corecta,
// apoi se descarca documentul .odt (sablonul service-ului). Numele clientului se tine in dosar.
export function DocIntrareIesireModal({
  dosar,
  open,
  onClose,
  onPatch,
}: {
  dosar: Dosar
  open: boolean
  onClose: () => void
  onPatch: (id: string, patch: Partial<Dosar>) => void
}) {
  const [date, setDate] = useState<DateIntrareIesire>(() => dateDinDosar(dosar))

  useEffect(() => {
    if (open) setDate(dateDinDosar(dosar))
    // doar la deschidere — altfel o salvare in fundal ar sterge ce scrie utilizatorul
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function descarca() {
    descarcaOdt(date)
    const client = date.client.trim().toLocaleUpperCase('ro-RO')
    if (client !== (dosar.numeClient ?? '')) onPatch(dosar.id, { numeClient: client })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Document intrare/ieșire service</DialogTitle>
          <DialogDescription>Verifică datele luate din dosar, apoi descarcă documentul (.odt, se deschide cu LibreOffice sau Word).</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-x-3 gap-y-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            descarca()
          }}
        >
          {CAMPURI.map((c) => (
            <div key={c.k} className={c.lat ? 'col-span-2 grid gap-1' : 'grid gap-1'}>
              <Label htmlFor={`ii-${c.k}`} className="text-xs">{c.label}</Label>
              <Input
                id={`ii-${c.k}`}
                value={date[c.k]}
                placeholder={c.placeholder}
                autoFocus={c.k === 'client' && !date.client}
                onChange={(e) => setDate((s) => ({ ...s, [c.k]: e.target.value }))}
              />
            </div>
          ))}
          <DialogFooter className="col-span-2 mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Anulează</Button>
            <Button type="submit">
              <Download className="size-4" aria-hidden="true" />
              Descarcă documentul
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
