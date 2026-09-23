import { useState } from 'react'
import { Trash2, Wrench } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { Button } from '@/components/ui/button'
import { staggerDelay } from '@/lib/motion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Portat din openServiceModal()/addService()/deleteService() (index.html), mutat dintr-un
// modal accesat din formularul de dosar intr-o pagina dedicata (inlocuieste intrarea
// "Clienți" din sidebar, care nu exista in aplicatia veche).
const LABEL = 'mb-1.5 block text-[12.5px] font-semibold text-[#cbd5e1]'
const INPUT = 'h-[38px] w-full rounded-[11px] border-[#253150] bg-[#253150]/[.24] px-3 text-[13.5px] text-[#f1f5f9]'

export function ServiciiPage() {
  const { servicii, salveazaServiciu, stergeServiciu } = useDosareContext()
  const [nume, setNume] = useState('')
  const [telefon, setTelefon] = useState('')
  const [eroare, setEroare] = useState('')
  const [seAdauga, setSeAdauga] = useState(false)
  const [deStersId, setDeStersId] = useState<string | null>(null)

  async function adauga() {
    if (!nume.trim()) {
      setEroare('Introdu numele service-ului.')
      return
    }
    setSeAdauga(true)
    setEroare('')
    try {
      await salveazaServiciu({ id: 's' + Date.now(), nume: nume.trim(), telefon: telefon.trim() })
      setNume('')
      setTelefon('')
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Eroare la salvare.')
    } finally {
      setSeAdauga(false)
    }
  }

  async function sterge(id: string) {
    await stergeServiciu(id)
    setDeStersId(null)
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-4 px-4 pb-10 pt-[22px] md:px-6">
      <div className="md:hidden">
        <h2 className="text-xl font-bold text-foreground">Service-uri</h2>
        <p className="text-sm text-muted-foreground">Lista de service-uri folosită la completarea dosarelor.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2.5 rounded-[20px] border border-[#253150] bg-[#10172a] p-3.5">
        <div className="min-w-[170px] flex-1">
          <Label htmlFor="serviceNume" className={LABEL}>Nume service</Label>
          <Input id="serviceNume" className={INPUT} value={nume} onChange={(e) => setNume(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adauga()} />
        </div>
        <div className="min-w-[150px]">
          <Label htmlFor="serviceTel" className={LABEL}>Telefon</Label>
          <Input id="serviceTel" className={INPUT} value={telefon} onChange={(e) => setTelefon(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adauga()} />
        </div>
        <Button onClick={adauga} disabled={seAdauga} className="h-[38px] rounded-[11px] border border-[#3b82f6] bg-[#2563eb] px-[18px] text-[13.5px] font-bold text-white hover:bg-[#2563eb]/90">
          {seAdauga ? 'Se adaugă…' : 'Adaugă'}
        </Button>
      </div>
      {eroare && <p className="text-sm text-destructive">{eroare}</p>}

      {servicii.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun service adăugat încă.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {servicii.map((s, i) => (
            <div
              key={s.id}
              className="animate-fade-up group flex items-center gap-3 rounded-[14px] border border-[#253150] bg-[#10172a] px-3.5 py-[11px] transition-all hover:-translate-y-0.5 hover:border-[#3b4d78]"
              style={staggerDelay(i)}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/30 text-[#94a3b8]">
                <Wrench className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-[#f1f5f9]">{s.nume}</p>
                <p className="mt-px truncate text-[11.5px] tabular-nums text-[#8b9ab5]">{s.telefon || '—'}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Șterge service" className="size-8 rounded-[10px] text-[#f87171] hover:bg-[#f87171]/10 hover:text-[#f87171]" onClick={() => setDeStersId(s.id)}>
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deStersId} onOpenChange={(o) => !o && setDeStersId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi acest service din listă?</AlertDialogTitle>
            <AlertDialogDescription>Dosarele care îl folosesc deja nu se modifică.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deStersId && sterge(deStersId)}>
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
