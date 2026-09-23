import { useEffect, useState } from 'react'
import { FolderPlus, Pencil, Trash2, X } from 'lucide-react'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { imagineMasina } from '@/lib/cars'
import { suggestClasaFromModel, vehicleClasses } from '@/lib/clase-auto'
import { lipsuriFinalizare } from '@/lib/documente'
import { calculRCA, todayStr } from '@/lib/rca-calc'
import { STATUS_META, dosarGol, type Dosar, type StatusDosar, type Vehicul } from '@/lib/types'
import { PreluareDateSection } from './PreluareDateSection'
import { DevizRecalculeazaButton } from './DevizRecalculeazaButton'
import { ContractFinalSection } from './ContractFinalSection'
import { DocumenteSection } from './DocumenteSection'

export function DosarFormModal({
  open,
  dosar,
  initialDraft,
  servicii,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean
  dosar: Dosar | null
  initialDraft?: Partial<Dosar> | null
  servicii: { id: string; nume: string; telefon: string }[]
  onClose: () => void
  onSave: (d: Dosar) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [draft, setDraft] = useState<Dosar>(() => dosar ?? dosarGol())
  const [saving, setSaving] = useState(false)
  const [eroare, setEroare] = useState('')
  const [confirmStergere, setConfirmStergere] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  useEffect(() => {
    if (open) {
      setDraft(dosar ?? { ...dosarGol(), ...initialDraft, id: 'd' + Date.now(), start: todayStr() })
      setEroare('')
    }
  }, [open, dosar, initialDraft])

  function set<K extends keyof Dosar>(key: K, value: Dosar[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }
  function patch(p: Partial<Dosar>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function blocheazaFinalizare(d: Dosar): boolean {
    if (d.status !== 'finalizat' || dosar?.status === 'finalizat') return false
    const lipsuri = lipsuriFinalizare(d)
    if (lipsuri.length === 0) return false
    setEroare('Nu poți finaliza dosarul — lipsește: ' + lipsuri.join(', ') + '.')
    setShakeKey((k) => k + 1)
    return true
  }

  function onStatusChange(v: StatusDosar) {
    const next = { ...draft, status: v }
    if (blocheazaFinalizare(next)) return
    setEroare('')
    set('status', v)
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
    if (blocheazaFinalizare(draft)) return
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
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] grid-cols-[minmax(0,1fr)] gap-0 overflow-x-hidden overflow-y-auto rounded-[22px] border border-[#2c3a5c] bg-[#0d1524] bg-none p-0 shadow-[0_40px_90px_-30px_#000] sm:max-w-[760px]"
      >
        <DialogHeader className="sticky top-0 z-[5] flex-row items-center gap-3 rounded-t-[22px] border-b border-[#1e2a45] bg-[#0d1524] px-[22px] py-[18px]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-[#2563eb]/45 bg-[#2563eb]/[.16] text-[#60a5fa]">
            {dosar ? <Pencil className="size-[18px]" aria-hidden="true" /> : <FolderPlus className="size-[18px]" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[17px] font-extrabold leading-tight text-[#f8fafc]">{dosar ? 'Editează dosar' : 'Dosar nou'}</DialogTitle>
            {dosar && (draft.nrAutoPagubit || draft.marcaModel) && (
              <p className="mt-0.5 truncate text-[12.5px] text-[#94a3b8]">{[draft.nrAutoPagubit, draft.marcaModel].filter(Boolean).join(' · ')}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Închide"
            onClick={onClose}
            className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/[.28] text-[#cbd5e1] transition-colors hover:bg-[#253150]/60 hover:text-white"
          >
            <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-[22px] pb-[22px] pt-[18px]">
        <PreluareDateSection draft={draft} onPatch={patch} />

        <div className="grid gap-4 sm:grid-cols-2">
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
            <Select value={draft.status} onValueChange={(v) => onStatusChange(v as StatusDosar)}>
              <SelectTrigger
                key={shakeKey}
                id="fStatus"
                className={shakeKey ? 'w-full animate-[devizShake_.45s_ease-in-out_both] border-[var(--danger-strong)]' : 'w-full'}
              >
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
            <Label htmlFor="fMarcaModelInlocuire">Marcă / model înlocuire</Label>
            <div className="relative">
              <Input
                id="fMarcaModelInlocuire"
                value={draft.marcaModelInlocuire ?? ''}
                onChange={(e) => set('marcaModelInlocuire', e.target.value)}
                className={imagineMasina(draft.marcaModelInlocuire ?? '') ? 'pr-[74px]' : undefined}
              />
              {imagineMasina(draft.marcaModelInlocuire ?? '') && (
                <img
                  src={imagineMasina(draft.marcaModelInlocuire ?? '') ?? undefined}
                  alt={draft.marcaModelInlocuire}
                  className="pointer-events-none absolute right-2 top-1/2 h-[30px] w-[60px] -translate-y-1/2 object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,.6)]"
                />
              )}
            </div>
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
          <span className="hidden sm:block" />
          <DevizRecalculeazaButton onPatch={patch} />
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

        </div>

        <div className="sticky bottom-0 z-[5] flex items-center justify-between gap-2 rounded-b-[22px] border-t border-[#1e2a45] bg-[#0d1524] px-[22px] py-3.5">
          {dosar ? (
            <button
              type="button"
              onClick={() => setConfirmStergere(true)}
              className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-2.5 text-[12.5px] font-bold text-[#f87171] transition-colors hover:bg-[#f87171]/10"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Șterge dosar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-[10px] border border-[#2c3a5c] bg-[#1a2335] px-4 text-[12.5px] font-bold text-[#e2e8f5] transition-colors hover:bg-[#222d46]"
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="h-9 rounded-[10px] border border-[#3b82f6] bg-[#2563eb] px-[18px] text-[12.5px] font-extrabold text-white shadow-[0_10px_24px_-14px_#2563eb] transition-colors hover:bg-[#2563eb]/90 disabled:opacity-60"
            >
              {saving ? 'Se salvează…' : 'Salvează'}
            </button>
          </div>
        </div>
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
