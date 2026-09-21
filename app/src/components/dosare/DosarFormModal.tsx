import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KNOWN_INSURERS } from '@/lib/asiguratori'
import { suggestClasaFromModel, vehicleClasses } from '@/lib/clase-auto'
import { calculRCA, todayStr } from '@/lib/rca-calc'
import { STATUS_META, dosarGol, type Dosar, type StatusDosar, type Vehicul } from '@/lib/types'
import { PreluareDateSection } from './PreluareDateSection'
import { ContractFinalSection } from './ContractFinalSection'
import { DocumenteSection } from './DocumenteSection'

export function DosarFormModal({
  open,
  dosar,
  servicii,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  dosar: Dosar | null
  servicii: { id: string; nume: string; telefon: string }[]
  onClose: () => void
  onSave: (d: Dosar) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<Dosar>(() => dosar ?? dosarGol())
  const [saving, setSaving] = useState(false)
  const [eroare, setEroare] = useState('')
  const [confirmStergere, setConfirmStergere] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(dosar ?? { ...dosarGol(), id: 'd' + Date.now(), start: todayStr() })
      setEroare('')
    }
  }, [open, dosar])

  function set<K extends keyof Dosar>(key: K, value: Dosar[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }
  function patch(p: Partial<Dosar>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function onMarcaModelBlur() {
    if (draft.marcaModel && !draft.clasaAuto) {
      const guess = suggestClasaFromModel(draft.marcaModel)
      if (guess) set('clasaAuto', guess)
    }
  }

  function onServiceChange(nume: string) {
    set('service', nume)
    const gasit = servicii.find((s) => s.nume === nume)
    if (gasit) set('telService', gasit.telefon)
  }

  async function handleSubmit() {
    if (!draft.nrDosar.trim()) {
      setEroare('Introdu numărul dosarului.')
      return
    }
    if (!draft.asigurator) {
      setEroare('Alege asiguratorul.')
      return
    }
    setSaving(true)
    setEroare('')
    try {
      await onSave(draft)
      onClose()
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Eroare la salvare.')
    } finally {
      setSaving(false)
    }
  }

  const rcaPreview = calculRCA(draft)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dosar ? 'Editează dosar' : 'Dosar nou'}</DialogTitle>
        </DialogHeader>

        <PreluareDateSection draft={draft} onPatch={patch} />

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fNrDosar">Nr. dosar *</Label>
            <Input id="fNrDosar" value={draft.nrDosar} onChange={(e) => set('nrDosar', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fNrRezervare">Nr. rezervare (RBH)</Label>
            <Input id="fNrRezervare" value={draft.nrRezervare} onChange={(e) => set('nrRezervare', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fAsigurator">Asigurator *</Label>
            <Select value={draft.asigurator} onValueChange={(v) => set('asigurator', v)}>
              <SelectTrigger id="fAsigurator" className="w-full">
                <SelectValue placeholder="Alege asiguratorul" />
              </SelectTrigger>
              <SelectContent>
                {KNOWN_INSURERS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fStatus">Status</Label>
            <Select value={draft.status} onValueChange={(v) => set('status', v as StatusDosar)}>
              <SelectTrigger id="fStatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_META).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fNrAutoPagubit">Nr. auto păgubit</Label>
            <Input id="fNrAutoPagubit" value={draft.nrAutoPagubit} onChange={(e) => set('nrAutoPagubit', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fNrAutoInlocuire">Nr. mașină înlocuire</Label>
            <Input id="fNrAutoInlocuire" value={draft.nrAutoInlocuire} onChange={(e) => set('nrAutoInlocuire', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fMarcaModel">Marcă / model</Label>
            <Input
              id="fMarcaModel"
              value={draft.marcaModel}
              onChange={(e) => set('marcaModel', e.target.value)}
              onBlur={onMarcaModelBlur}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fClasaAuto">Clasă auto</Label>
            <Select value={draft.clasaAuto || '__none__'} onValueChange={(v) => set('clasaAuto', v === '__none__' ? '' : v)}>
              <SelectTrigger id="fClasaAuto" className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                {vehicleClasses().map((vc) => (
                  <SelectItem key={vc.clasa} value={vc.clasa}>
                    {vc.clasa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fTelClient">Telefon client</Label>
            <Input id="fTelClient" value={draft.telClient} onChange={(e) => set('telClient', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fService">Service</Label>
            <Input
              id="fService"
              value={draft.service}
              onChange={(e) => onServiceChange(e.target.value)}
              list="servicii-list"
            />
            <datalist id="servicii-list">
              {servicii.map((s) => (
                <option key={s.id} value={s.nume} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fTelService">Telefon service</Label>
            <Input id="fTelService" value={draft.telService} onChange={(e) => set('telService', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fVehicul">Vehicul</Label>
            <Select value={draft.vehicul} onValueChange={(v) => set('vehicul', v as Vehicul)}>
              <SelectTrigger id="fVehicul" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deplasabil">Deplasabil</SelectItem>
                <SelectItem value="nedeplasabil">Nedeplasabil</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fZileDeviz">Zile lucrătoare din deviz</Label>
            <Input id="fZileDeviz" type="number" min={0} value={draft.zileDeviz} onChange={(e) => set('zileDeviz', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fStart">Data predare</Label>
            <Input id="fStart" type="date" value={draft.start} onChange={(e) => set('start', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fEnd">Data preluare</Label>
            <Input id="fEnd" type="date" value={draft.end} onChange={(e) => set('end', e.target.value)} disabled={draft.dte} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fDataPolita">Data poliței</Label>
            <Input id="fDataPolita" type="date" value={draft.dataPolita} onChange={(e) => set('dataPolita', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fDataNcAr">Data NC/AR</Label>
            <Input id="fDataNcAr" type="date" value={draft.dataNcAr} onChange={(e) => set('dataNcAr', e.target.value)} />
          </div>

          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox id="fDte" checked={draft.dte} onCheckedChange={(v) => set('dte', v === true)} />
            <Label htmlFor="fDte" className="font-normal">
              DTE — se calculează de la predare/NC până la oferta de despăgubire
            </Label>
          </div>
          {draft.dte && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="fDataOferta">Data ofertei de despăgubire</Label>
              <Input id="fDataOferta" type="date" value={draft.dataOferta} onChange={(e) => set('dataOferta', e.target.value)} />
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fNotes">Note</Label>
            <Textarea id="fNotes" rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">
            {rcaPreview.zile != null ? `${rcaPreview.zile} zile decontabile` : 'Termen necunoscut încă'}
            {rcaPreview.dataPreluare && ` — preluare estimată ${rcaPreview.dataPreluare.split('-').reverse().join('.')}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{rcaPreview.formula}</p>
          {rcaPreview.alerta && <p className="mt-1 text-xs text-warning">{rcaPreview.alerta}</p>}
        </div>

        <ContractFinalSection draft={draft} onPatch={patch} />
        <DocumenteSection draft={draft} onPatch={patch} />

        {eroare && <p className="text-sm text-destructive">{eroare}</p>}

        <DialogFooter className="sm:justify-between">
          {dosar ? (
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmStergere(true)}>
              <Trash2 />
              Șterge dosar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Anulează
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Se salvează…' : 'Salvează'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmStergere} onOpenChange={setConfirmStergere}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi acest dosar?</AlertDialogTitle>
            <AlertDialogDescription>Acțiunea nu poate fi anulată.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (dosar) await onDelete(dosar.id)
                setConfirmStergere(false)
                onClose()
              }}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
