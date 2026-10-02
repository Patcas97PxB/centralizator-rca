import { useCallback, useEffect, useMemo, useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDosareContext } from '@/contexts/DosareContext'
import { fetchIstoric, type IntrareIstoric } from '@/lib/dosare-storage'
import { cn } from '@/lib/utils'

const ro = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// „Recuperare": dosarele sterse si versiunile anterioare ale dosarelor (pastrate automat de
// baza de date). Restaurarea scrie versiunea aleasa peste dosarul curent — iar versiunea
// inlocuita ajunge si ea in istoric, deci orice restaurare se poate anula.
export function RecuperareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { salveazaDosar } = useDosareContext()
  const [intrari, setIntrari] = useState<IntrareIstoric[]>([])
  const [existente, setExistente] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [eroare, setEroare] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [doarSterse, setDoarSterse] = useState(true)
  const [cauta, setCauta] = useState('')
  const [seRestaureaza, setSeRestaureaza] = useState<number | null>(null)

  const incarca = useCallback(async () => {
    setLoading(true)
    setEroare('')
    try {
      const r = await fetchIstoric()
      setIntrari(r.intrari)
      setExistente(r.idExistente)
    } catch (e) {
      setEroare(
        e instanceof Error && /dosare_istoric/.test(e.message)
          ? 'Istoricul nu e activat în baza de date (lipsește migrarea dosare_istoric).'
          : 'Nu am putut citi istoricul: ' + (e instanceof Error ? e.message : 'eroare'),
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setMesaj('')
      void incarca()
    }
  }, [open, incarca])

  const afisate = useMemo(() => {
    const q = cauta.trim().toLowerCase().replace(/[\s-]/g, '')
    const vazut = new Set<string>()
    return intrari.filter((i) => {
      const sters = i.op === 'delete' && !existente.has(i.dosarId)
      if (doarSterse && !sters) return false
      // la „sterse" arata un singur rand per dosar (cel mai recent)
      if (doarSterse) {
        if (vazut.has(i.dosarId)) return false
        vazut.add(i.dosarId)
      }
      if (!q) return true
      const d = i.dosar
      return [d.nrDosar, d.nrAutoPagubit, d.nrRezervare, d.marcaModel, d.asigurator].some((v) => (v ?? '').toLowerCase().replace(/[\s-]/g, '').includes(q))
    })
  }, [intrari, existente, doarSterse, cauta])

  async function restaureaza(i: IntrareIstoric) {
    setSeRestaureaza(i.id)
    setEroare('')
    setMesaj('')
    try {
      await salveazaDosar(i.dosar, true)
      setMesaj(`Dosarul ${i.dosar.nrDosar || i.dosarId} a fost restaurat.`)
      await incarca()
    } catch (e) {
      setEroare('Nu s-a putut restaura: ' + (e instanceof Error ? e.message : 'eroare'))
    } finally {
      setSeRestaureaza(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5" aria-hidden="true" /> Recuperare dosare
          </DialogTitle>
          <DialogDescription>
            Dosarele șterse se păstrează 180 de zile, iar fiecare dosar are ultimele 20 de versiuni. Restaurarea nu pierde nimic: versiunea înlocuită
            rămâne și ea aici.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Input value={cauta} onChange={(e) => setCauta(e.target.value)} placeholder="Caută: nr. dosar, nr. auto, asigurator…" className="min-w-[200px] flex-1" />
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setDoarSterse(v)}
              className={cn('rounded-lg border px-3 py-1.5 text-sm', doarSterse === v ? 'border-primary bg-primary/15 font-semibold' : 'border-border text-muted-foreground')}
            >
              {v ? 'Dosare șterse' : 'Toate versiunile'}
            </button>
          ))}
        </div>

        {eroare && <p className="text-sm text-destructive">{eroare}</p>}
        {mesaj && <p className="text-sm text-emerald-400">{mesaj}</p>}
        {loading && <p className="text-sm text-muted-foreground">Se încarcă…</p>}
        {!loading && !eroare && afisate.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{doarSterse ? 'Niciun dosar șters.' : 'Nicio versiune găsită.'}</p>
        )}

        <ul className="space-y-2">
          {afisate.map((i) => {
            const sters = i.op === 'delete' && !existente.has(i.dosarId)
            return (
              <li key={i.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {i.dosar.nrDosar || '(fără nr. dosar)'} · {i.dosar.nrAutoPagubit || '—'}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[i.dosar.asigurator, i.dosar.marcaModel].filter(Boolean).join(' · ') || '—'} · {ro.format(new Date(i.creat))}
                  </div>
                </div>
                <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-bold', sters ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-slate-300')}>
                  {sters ? 'ȘTERS' : i.op === 'delete' ? 'ȘTERS (REFĂCUT)' : 'VERSIUNE VECHE'}
                </span>
                <button
                  type="button"
                  disabled={seRestaureaza !== null}
                  onClick={() => restaureaza(i)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-semibold hover:bg-accent disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {seRestaureaza === i.id ? 'Se restaurează…' : 'Restaurează'}
                </button>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
