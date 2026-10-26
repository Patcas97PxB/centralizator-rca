import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
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

// Fereastra butonului „Document intrare/ieșire" din Editează (sectiunea Contract final): campurile vin din dosar, se pot corecta,
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
  onPatch: (patch: Partial<Dosar>) => void
}) {
  const [date, setDate] = useState<DateIntrareIesire>(() => dateDinDosar(dosar))

  useEffect(() => {
    if (open) setDate(dateDinDosar(dosar))
    // doar la deschidere — altfel o salvare in fundal ar sterge ce scrie utilizatorul
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const [seFace, setSeFace] = useState(false)
  const [eroare, setEroare] = useState('')

  function tineMinteClient() {
    const client = date.client.trim().toLocaleUpperCase('ro-RO')
    if (client !== (dosar.numeClient ?? '')) onPatch({ numeClient: client })
  }

  async function descarcaPdf() {
    setSeFace(true)
    setEroare('')
    try {
      const { descarcaPdf: fa } = await import('@/lib/doc-intrare-iesire-pdf')
      await fa(date)
      tineMinteClient()
      onClose()
    } catch (e) {
      console.error(e)
      setEroare('Nu am putut face PDF-ul: ' + (e instanceof Error ? e.message : 'eroare'))
    } finally {
      setSeFace(false)
    }
  }

  function descarcaOdtEditabil() {
    descarcaOdt(date)
    tineMinteClient()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Document intrare/ieșire service</DialogTitle>
          <DialogDescription>Verifică datele luate din contract și din dosar, apoi descarcă documentul PDF.</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-x-3 gap-y-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            void descarcaPdf()
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
          {eroare && <p className="col-span-2 text-xs font-medium text-destructive">{eroare}</p>}
          <DialogFooter className="col-span-2 mt-2 sm:items-center">
            <button
              type="button"
              onClick={descarcaOdtEditabil}
              className="mr-auto inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              title="Varianta care se poate modifica în LibreOffice/Word"
            >
              <FileText className="size-3.5" aria-hidden="true" />
              sau .odt (editabil)
            </button>
            <Button type="button" variant="outline" onClick={onClose}>Anulează</Button>
            <Button type="submit" disabled={seFace}>
              <Download className="size-4" aria-hidden="true" />
              {seFace ? 'Se face PDF-ul…' : 'Descarcă PDF'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
