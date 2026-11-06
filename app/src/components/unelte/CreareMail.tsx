import { useEffect, useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { FereastraAntet } from '@/components/ui/fereastra'
import { AlegeDosar } from '@/components/unelte/VerificareTarif'
import { ServiceCombobox } from '@/components/dosare/ServiceCombobox'
import { useDosareContext } from '@/contexts/DosareContext'
import { cheiLocale, useFolderLocal } from '@/lib/folder-local'
import { RANDURI_MAIL, campuriDinDosar, htmlMail, stariDinDosar, textMail, type CampuriMail, type StareRand } from '@/lib/mail-dosar'
import { cn } from '@/lib/utils'

// Unealta „Creare mail” (meniul lateral → Unelte, Ctrl+K): alegi dosarul → subiectul și textul mailului către
// asigurator, după modelul utilizatorului. Documentele din dosar trec la „Am atașat”, cele lipsă la „Necesar”;
// click pe un document îl mută (atașat → necesar → scos). Destinatarii/CC le pune utilizatorul în Gmail.

const CAMP =
  'h-10 w-full rounded-lg border border-border-strong bg-background px-3 text-[14px] text-foreground focus:border-accent-tx focus:outline-none'
const ETICHETA = 'mb-1 block text-[12.5px] font-semibold text-tx-2'

const CHEIE_LEAD = 'rca-mail-lead'
const CHEIE_AGENTIE = 'rca-mail-agentie'
const citeste = (k: string, implicit: string) => {
  try {
    return localStorage.getItem(k) ?? implicit
  } catch {
    return implicit
  }
}
const scrie = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* fără localStorage: rămâne doar pe sesiune */
  }
}

// un click pe un document necesar îl trece la atașat (completarea de mână pornește cu toate la necesar)
const URMATOR: Record<StareRand, StareRand> = { necesar: 'atasat', atasat: 'scos', scos: 'necesar' }
const STIL: Record<StareRand, string> = {
  atasat: 'border-st-green/50 bg-st-green/12 text-st-green-tx',
  necesar: 'border-st-amber/50 bg-st-amber/12 text-st-amber-tx',
  scos: 'border-border bg-transparent text-tx-3 line-through',
}

async function copiaza(text: string, html?: string) {
  try {
    if (html && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) }),
      ])
    } else await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function ButonCopiere({ eticheta, text, html, primar }: { eticheta: string; text: string; html?: string; primar?: boolean }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      type="button"
      disabled={!text}
      onClick={async () => {
        if (await copiaza(text, html)) {
          setOk(true)
          setTimeout(() => setOk(false), 1600)
        }
      }}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13.5px] font-semibold transition-colors disabled:opacity-40',
        primar ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border-strong text-foreground hover:bg-surface-hover',
      )}
    >
      {ok ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      {ok ? 'Copiat' : eticheta}
    </button>
  )
}

export function CreareMail({ open, onClose, dosarInitial }: { open: boolean; onClose: () => void; dosarInitial?: string }) {
  const { dosare, servicii } = useDosareContext()
  const optiuniLead = useMemo(
    () => [{ id: 'walk-in', nume: 'WALK IN', telefon: '' }, ...servicii.filter((x) => x.nume.trim().toUpperCase() !== 'WALK IN')],
    [servicii],
  )
  const folder = useFolderLocal()
  const [dosarId, setDosarId] = useState('')
  const [leadObisnuit, setLeadObisnuit] = useState(() => citeste(CHEIE_LEAD, 'WALK IN'))
  const dosarAles = dosare.find((x) => x.id === dosarId) ?? null
  const [agentie, setAgentie] = useState(() => citeste(CHEIE_AGENTIE, 'ORADEA'))
  const [c, setC] = useState<CampuriMail>(() => campuriDinDosar(null, '', citeste(CHEIE_LEAD, 'WALK IN')))
  const [stari, setStari] = useState<StareRand[]>(() => stariDinDosar(null))

  // nefinalizatele primele
  const lista = useMemo(
    () =>
      [...dosare].sort(
        (a, b) => Number(a.status === 'finalizat') - Number(b.status === 'finalizat') || (a.nrAutoPagubit || '').localeCompare(b.nrAutoPagubit || ''),
      ),
    [dosare],
  )

  function alege(id: string) {
    setDosarId(id)
    const d = dosare.find((x) => x.id === id) ?? null
    // fără dosar: câmpuri goale de completat de mână (Lead și Stare rămân cu valorile obișnuite)
    setC(() => ({ ...campuriDinDosar(d, agentie, leadObisnuit), ...(d ? {} : { stare: 'DEPLASABILA' }) }))
    setStari(stariDinDosar(d, d ? cheiLocale(folder, d) : []))
  }

  useEffect(() => {
    if (open) alege(dosarInitial ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (k: keyof CampuriMail, v: string) => setC((x) => ({ ...x, [k]: v }))
  // se poate completa și de mână, fără dosar (cererea utilizatorului, 04.11.2026)
  const text = textMail(c, stari)
  const html = htmlMail(c, stari)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} faraInchidereAfara className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[620px]">
        <FereastraAntet titlu="Creare mail" subtitlu="Subiectul și textul pentru asigurator — destinatarii îi pui tu" onClose={onClose} />
        <div className="flex flex-col gap-3.5 px-5 py-4">
          <div>
            <span className={ETICHETA}>Din dosar (opțional — sau completezi de mână)</span>
            <AlegeDosar dosare={lista} ales={dosarId} onAlege={alege} />
          </div>

          <label>
                <span className={ETICHETA}>Subiect</span>
                <input value={c.subiect} onChange={(e) => set('subiect', e.target.value)} className={CAMP} />
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label>
                  <span className={ETICHETA}>Dosar daună nr.</span>
                  <input value={c.nrDosar} onChange={(e) => set('nrDosar', e.target.value)} className={CAMP} />
                </label>
                <label>
                  <span className={ETICHETA}>Model mașină</span>
                  <input value={c.model} onChange={(e) => set('model', e.target.value)} className={CAMP} />
                </label>
                <label>
                  <span className={ETICHETA}>Proprietar talon</span>
                  <input value={c.proprietar} onChange={(e) => set('proprietar', e.target.value)} className={CAMP} />
                </label>
                <label>
                  <span className={ETICHETA}>Stare mașină</span>
                  <input value={c.stare} onChange={(e) => set('stare', e.target.value)} className={CAMP} />
                </label>
                <div>
                  <span className={ETICHETA}>Lead</span>
                  {/* alegi din service-urile salvate (sau WALK IN), ori scrii altceva (06.11.2026) */}
                  <ServiceCombobox
                    value={c.lead}
                    servicii={optiuniLead}
                    onChange={(v) => {
                      const val = v.toLocaleUpperCase('ro-RO')
                      set('lead', val)
                      // se ține minte doar valoarea aleasă fără service în dosar (ex. WALK IN)
                      if (!dosarAles?.service?.trim()) {
                        setLeadObisnuit(val)
                        scrie(CHEIE_LEAD, val)
                      }
                    }}
                  />
                </div>
                <label>
                  <span className={ETICHETA}>Agenție (în subiect)</span>
                  <input
                    value={agentie}
                    onChange={(e) => {
                      const v = e.target.value.toLocaleUpperCase('ro-RO')
                      const vechi = agentie.trim()
                      setAgentie(v)
                      scrie(CHEIE_AGENTIE, v)
                      // schimbă și finalul subiectului, dacă era cel generat
                      setC((x) => ({ ...x, subiect: vechi && x.subiect.endsWith(' ' + vechi) ? x.subiect.slice(0, -vechi.length) + v.trim() : x.subiect }))
                    }}
                    className={CAMP}
                  />
                </label>
                <label className="col-span-2">
                  <span className={ETICHETA}>Obs.</span>
                  <input value={c.obs} onChange={(e) => set('obs', e.target.value)} className={CAMP} />
                </label>
              </div>

              <div>
                <span className={ETICHETA}>
                  Documente <span className="font-normal text-tx-3">— click mută: necesar → atașat → scos</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {RANDURI_MAIL.map((r, i) => (
                    <button
                      key={r.text}
                      type="button"
                      onClick={() => setStari((s) => s.map((x, k) => (k === i ? URMATOR[x] : x)))}
                      className={cn('rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors', STIL[stari[i]])}
                      title={stari[i] === 'atasat' ? 'Atașat' : stari[i] === 'necesar' ? 'Necesar' : 'Nu apare în mail'}
                    >
                      {r.text}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-3 text-[11.5px] text-tx-3">
                  <span className="text-st-green-tx">● atașat</span>
                  <span className="text-st-amber-tx">● necesar</span>
                  <span>● scos din mail</span>
                </div>
              </div>

              <div>
                <span className={ETICHETA}>Previzualizare</span>
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-[13px] leading-relaxed text-foreground [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-2.5" dangerouslySetInnerHTML={{ __html: html }} />
              </div>
        </div>
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-card px-5 py-3">
          <ButonCopiere eticheta="Copiază subiectul" text={c.subiect} />
          <ButonCopiere eticheta="Copiază textul" text={text} html={html} primar />
        </div>
      </DialogContent>
    </Dialog>
  )
}
