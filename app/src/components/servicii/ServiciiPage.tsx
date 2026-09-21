import { useState } from 'react'
import { Trash2, Wrench } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { Button } from '@/components/ui/button'
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
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-5 md:px-6 md:py-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Service-uri</h2>
        <p className="text-sm text-muted-foreground">Lista de service-uri folosită la completarea dosarelor.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-3">
        <div className="min-w-[160px] flex-1 space-y-1.5">
          <Label htmlFor="serviceNume">Nume service</Label>
          <Input id="serviceNume" value={nume} onChange={(e) => setNume(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adauga()} />
        </div>
        <div className="min-w-[140px] space-y-1.5">
          <Label htmlFor="serviceTel">Telefon</Label>
          <Input id="serviceTel" value={telefon} onChange={(e) => setTelefon(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adauga()} />
        </div>
        <Button onClick={adauga} disabled={seAdauga}>
          {seAdauga ? 'Se adaugă…' : 'Adaugă'}
        </Button>
      </div>
      {eroare && <p className="text-sm text-destructive">{eroare}</p>}

      {servicii.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun service adăugat încă.</p>
      ) : (
        <div className="space-y-1.5">
          {servicii.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
              <Wrench className="size-4 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{s.nume}</p>
                <p className="truncate text-xs text-muted-foreground">{s.telefon || '—'}</p>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeStersId(s.id)}>
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
