import { useEffect, useMemo, useState } from 'react'
import { Bell, Check, Link2, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { initiale, numeDinEmail } from '@/lib/autentificare'
import { majuscule } from '@/lib/majuscule'
import {
  adaugaNotita,
  cand,
  dosareDinText,
  dosarePartiale,
  dosareNotita,
  modificaNotita,
  notitaCuAmintire,
  notitaScadenta,
  observatiiCuNotita,
  rezumat,
  stergeNotita,
  useNotite,
  type Notita,
} from '@/lib/notite'
import { faraReminder, fmtZi, peste, textCand } from '@/lib/reminder'
import { normAuto } from '@/lib/folder-local'
import type { Dosar } from '@/lib/types'
import { BTN_PRIMAR, BTN_SECUNDAR } from '@/components/ui/fereastra'
import { cn } from '@/lib/utils'

const ZILE = [
  { label: 'Fără', n: -1 },
  { label: 'Azi', n: 0 },
  { label: 'Mâine', n: 1 },
  { label: 'Peste 2 zile', n: 2 },
  { label: 'Peste o săptămână', n: 7 },
]
const CHIP = 'h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors'
const CHIP_OFF = 'border-border-strong text-tx-2 hover:bg-surface-hover hover:text-foreground'
const CHIP_ON = 'border-st-orange/60 bg-st-orange/15 text-st-orange-tx'

/** Alegerea zilei pentru „Amintește-mi” (gol = fără amintire). */
export function AlegeZi({ zi, onZi }: { zi: string; onZi: (z: string) => void }) {
  const zile = ZILE.map((z) => ({ ...z, val: z.n < 0 ? '' : peste(z.n) }))
  const altaZi = !!zi && !zile.some((z) => z.val === zi)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 flex items-center gap-1 text-[12.5px] font-semibold text-tx-3">
        <Bell className="size-3.5" aria-hidden="true" />
        Amintește-mi
      </span>
      {zile.map((z) => (
        <button key={z.label} type="button" onClick={() => onZi(z.val)} className={cn(CHIP, zi === z.val ? CHIP_ON : CHIP_OFF)}>
          {z.label}
        </button>
      ))}
      <input
        type="date"
        aria-label="Altă zi"
        value={altaZi ? zi : ''}
        onChange={(e) => onZi(e.target.value)}
        className={cn(CHIP, 'bg-transparent [color-scheme:dark]', altaZi ? CHIP_ON : CHIP_OFF)}
      />
    </div>
  )
}

/** Plăcuțele dosarelor legate; click → cardul dosarului. */
export function DosareLegate({ dosare, onAlege, adaugate }: { dosare: Dosar[]; onAlege?: (id: string) => void; adaugate?: string[] }) {
  if (!dosare.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {dosare.map((d) => (
        <button
          key={d.id}
          type="button"
          disabled={!onAlege}
          onClick={() => onAlege?.(d.id)}
          title={(adaugate?.includes(d.id) ? 'Adăugată la observații · ' : '') + (onAlege ? 'Mergi la dosar' : '')}
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 text-[12px] font-bold text-foreground transition-colors enabled:hover:border-border-strong enabled:hover:bg-surface-hover"
        >
          {adaugate?.includes(d.id) ? (
            <Check className="size-3.5 text-st-green" aria-hidden="true" />
          ) : (
            <Link2 className="size-3.5 text-accent-tx" aria-hidden="true" />
          )}
          {d.nrAutoPagubit || d.nrDosar || '–'}
          {d.asigurator && <span className="font-medium text-tx-3">· {d.asigurator}</span>}
        </button>
      ))}
    </div>
  )
}

/** Câmpul de scris o notiță nouă. Dacă textul pomenește un dosar (nr. auto, nr. dosar, RBH), notița se
 * adaugă și la Observațiile lui (cererea utilizatorului: „BH52LCA - posibil gata joi” → la dosar). */
export function NotitaNoua() {
  const { dosare, salveazaRapid } = useDosareContext()
  const [text, setText] = useState('')
  const [zi, setZi] = useState('')
  const [comutate, setComutate] = useState<Set<string>>(new Set())
  const [salvez, setSalvez] = useState(false)
  const [eroare, setEroare] = useState('')
  const [mesaj, setMesaj] = useState('')
  // Din pop-up: dosarele alese de mână (potriviri parțiale) și cele închise cu ×.
  const [alesePartial, setAlesePartial] = useState<Set<string>>(new Set())
  // × ascunde lista doar pentru ce se găsește acum; dacă scrii altceva și se găsesc alte dosare, reapare.
  const [inchisPentru, setInchisPentru] = useState('')
  const legate = useMemo(() => dosareDinText(text, dosare), [text, dosare])
  const partiale = useMemo(() => dosarePartiale(text, dosare).filter((d) => !legate.includes(d)), [text, dosare, legate])
  const dinPopup = dosare.filter((d) => alesePartial.has(d.id) && !legate.includes(d))
  const deAles = partiale.filter((d) => !alesePartial.has(d.id))
  const cheiePopup = deAles.map((d) => d.id).join(',')
  const popup = cheiePopup === inchisPentru ? [] : deAles
  // când nu se mai găsește nimic (ai șters textul), × se uită — la următoarea potrivire lista reapare
  useEffect(() => {
    if (!cheiePopup) setInchisPentru('')
  }, [cheiePopup])
  const candidati = [...legate, ...dinPopup]
  // Un singur dosar găsit exact → bifat singur; mai multe → alegi tu pe care. Cele din pop-up sunt alese.
  const alese = [
    ...legate.filter((d) => (legate.length === 1 ? !comutate.has(d.id) : comutate.has(d.id))),
    ...dinPopup,
  ]
  const comutaPartial = (id: string) =>
    setAlesePartial((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const comuta = (id: string) =>
    setComutate((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  async function salveaza() {
    if (!text.trim() || salvez) return
    setSalvez(true)
    setEroare('')
    try {
      await adaugaNotita({ text, amintesteLa: zi || undefined, adaugatLa: alese.map((d) => d.id) })
      for (const d of alese) {
        const patch: Partial<Dosar> = { notes: observatiiCuNotita(d.notes, text) }
        // Amintirea ajunge și în clopoțel, când notița e a unui singur dosar.
        if (zi && alese.length === 1) Object.assign(patch, { amintesteMi: true, amintesteLa: zi, amintesteNota: rezumat(text) })
        await salveazaRapid(majuscule({ ...d, ...patch }))
      }
      setMesaj(alese.length ? `Adăugată la observațiile: ${alese.map((d) => d.nrAutoPagubit || d.nrDosar).join(', ')}` : 'Notiță salvată.')
      setText('')
      setZi('')
      setComutate(new Set())
      setAlesePartial(new Set())
      setInchisPentru('')
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Nu s-a putut salva.')
    } finally {
      setSalvez(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setMesaj('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void salveaza()
          }}
          rows={4}
          placeholder="Ce ai vorbit cu clientul? Ex.: BH52LCA - posibil gata joi, se așteaptă bara spate. Cu nr. auto sau RBH, se adaugă singură la observațiile dosarului."
          className="w-full resize-y rounded-lg border border-border-strong bg-background px-3 py-2.5 text-[14px] leading-relaxed text-foreground placeholder:text-tx-3 focus:border-accent-tx focus:outline-none"
        />
        {popup.length > 0 && (
          <div
            role="listbox"
            aria-label="Dosare găsite"
            className="absolute left-2 right-2 top-[calc(100%-6px)] z-20 max-w-[460px] rounded-xl border border-border-strong bg-surface-2 p-1.5 shadow-lg shadow-black/40"
          >
            <div className="flex items-center justify-between px-2 pb-1 pt-0.5 text-[12px] font-semibold text-tx-3">
              <span>{popup.length === 1 ? 'Am găsit un dosar — adaug notița la el?' : `Am găsit ${popup.length} dosare — alege unde se salvează`}</span>
              <button
                type="button"
                aria-label="Închide"
                onClick={() => setInchisPentru(cheiePopup)}
                className="flex size-6 items-center justify-center rounded-md hover:bg-surface-hover hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {popup.map((d) => (
              <button
                key={d.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => comutaPartial(d.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-hover"
              >
                <Plus className="size-4 shrink-0 text-accent-tx" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-foreground">
                    {d.nrAutoPagubit || '–'}
                    {d.nrAutoInlocuire && <span className="font-medium text-tx-3"> → </span>}
                    {d.nrAutoInlocuire && <span className="text-tx-2">{d.nrAutoInlocuire}</span>}
                  </span>
                  <span className="block truncate text-[12px] text-tx-3">
                    {[d.asigurator, d.marcaModel, d.numeClient].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {candidati.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-tx-3">
          <span className="mr-1">{candidati.length === 1 || legate.length <= 1 ? 'Se adaugă la observațiile dosarului:' : 'Am găsit mai multe dosare — alege la care se adaugă:'}</span>
          {candidati.map((d) => {
            const on = alese.includes(d)
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => (legate.includes(d) ? comuta(d.id) : comutaPartial(d.id))}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-[12.5px] font-bold transition-colors',
                  on ? 'border-accent-tx/60 bg-primary/15 text-foreground' : 'border-border-strong text-tx-2 hover:bg-surface-hover',
                )}
              >
                {on ? <Check className="size-3.5 text-accent-tx" aria-hidden="true" /> : <Link2 className="size-3.5 text-tx-3" aria-hidden="true" />}
                {d.nrAutoPagubit || d.nrDosar || '–'}
                {d.asigurator && <span className="font-medium text-tx-3">· {d.asigurator}</span>}
              </button>
            )
          })}
        </div>
      )}
      <AlegeZi zi={zi} onZi={setZi} />
      {zi && alese.length === 1 && (
        <p className="-mt-1 text-[12px] text-tx-3">Apare și în clopoțel la {alese[0].nrAutoPagubit || 'dosar'}, {textCand(zi)}.</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className={cn('text-[12.5px]', eroare ? 'text-st-red-tx' : 'text-st-green-tx')}>{eroare || mesaj}</span>
        <button type="button" className={BTN_PRIMAR} disabled={!text.trim() || salvez} onClick={() => void salveaza()}>
          {salvez && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          Salvează notița
        </button>
      </div>
    </div>
  )
}

/** O notiță din listă: autor, când, text, dosarele legate, amintirea; editare pe loc. */
export function NotitaRand({ n, onAlegeDosar }: { n: Notita; onAlegeDosar?: (id: string) => void }) {
  const { dosare, salveazaRapid } = useDosareContext()
  const [editez, setEditez] = useState(false)
  const [text, setText] = useState(n.text)
  const [zi, setZi] = useState(n.amintesteLa && !n.rezolvata ? n.amintesteLa : '')
  const [confirmSterge, setConfirmSterge] = useState(false)
  const [lucrez, setLucrez] = useState(false)
  const legate = dosareNotita(n, dosare)
  const nume = numeDinEmail(n.autor) || n.autor || '—'
  const scadenta = notitaScadenta(n)

  async function ruleaza(f: () => Promise<void>) {
    setLucrez(true)
    try {
      await f()
    } finally {
      setLucrez(false)
    }
  }

  // „Gata”: notița iese din „De făcut”; dacă reminderul de pe dosar e tot al ei, se stinge și acela.
  const gata = () =>
    ruleaza(async () => {
      await modificaNotita(n, { rezolvata: true })
      for (const d of legate)
        if (d.amintesteMi && d.amintesteNota === rezumat(n.text)) await salveazaRapid({ ...d, ...faraReminder })
    })

  const salveaza = () =>
    ruleaza(async () => {
      const nou = { ...n, text: text.trim() }
      await modificaNotita(n, { text: nou.text, amintesteLa: zi || undefined, rezolvata: zi ? false : n.rezolvata })
      const leg = dosareNotita(nou, dosare)
      if (zi && zi !== n.amintesteLa && leg.length === 1)
        await salveazaRapid(majuscule({ ...leg[0], amintesteMi: true, amintesteLa: zi, amintesteNota: rezumat(nou.text) }))
      setEditez(false)
    })

  return (
    <article className={cn('rounded-[14px] border bg-card p-4', scadenta ? 'border-st-orange/45' : 'border-border')}>
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11.5px] font-bold text-tx-2">
          {initiale(nume) || '?'}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13.5px] font-bold text-foreground">{nume}</div>
          <div className="text-[12px] text-tx-3">
            {cand(n.creatLa)}
            {n.actualizatLa.slice(0, 16) !== n.creatLa.slice(0, 16) && ' · modificată'}
          </div>
        </div>
        {notitaCuAmintire(n) && !editez && (
          <span
            className={cn(
              'inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold',
              scadenta ? 'bg-st-orange/15 text-st-orange-tx' : 'bg-surface-2 text-tx-2',
            )}
            title={fmtZi(n.amintesteLa)}
          >
            <Bell className="size-3.5" aria-hidden="true" />
            {textCand(n.amintesteLa)}
          </span>
        )}
      </div>

      {editez ? (
        <div className="mt-3 flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            autoFocus
            className="w-full resize-y rounded-lg border border-border-strong bg-background px-3 py-2.5 text-[14px] leading-relaxed text-foreground focus:border-accent-tx focus:outline-none"
          />
          <AlegeZi zi={zi} onZi={setZi} />
          <div className="flex justify-end gap-2">
            <button type="button" className={BTN_SECUNDAR} onClick={() => setEditez(false)}>
              Anulează
            </button>
            <button type="button" className={BTN_PRIMAR} disabled={!text.trim() || lucrez} onClick={() => void salveaza()}>
              Salvează
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-foreground">{n.text}</p>
      )}

      {!editez && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DosareLegate dosare={legate} onAlege={onAlegeDosar} adaugate={n.adaugatLa} />
          <div className="ml-auto flex items-center gap-1">
            {confirmSterge ? (
              <>
                <span className="mr-1 text-[12.5px] text-tx-2">Ștergi notița?</span>
                <button type="button" className="h-8 rounded-lg px-2.5 text-[12.5px] font-bold text-tx-2 hover:bg-surface-hover" onClick={() => setConfirmSterge(false)}>
                  Nu
                </button>
                <button
                  type="button"
                  disabled={lucrez}
                  className="h-8 rounded-lg px-2.5 text-[12.5px] font-bold text-st-red hover:bg-st-red/10"
                  onClick={() => void ruleaza(() => stergeNotita(n))}
                >
                  Da, șterge
                </button>
              </>
            ) : (
              <>
                {notitaCuAmintire(n) && (
                  <button
                    type="button"
                    disabled={lucrez}
                    onClick={() => void gata()}
                    className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12.5px] font-bold text-st-green-tx hover:bg-st-green/10"
                  >
                    <Check className="size-4" aria-hidden="true" />
                    Gata
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Editează notița"
                  onClick={() => {
                    setText(n.text)
                    setZi(n.amintesteLa && !n.rezolvata ? n.amintesteLa : '')
                    setEditez(true)
                  }}
                  className="flex size-8 items-center justify-center rounded-lg text-tx-3 hover:bg-surface-hover hover:text-foreground"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Șterge notița"
                  onClick={() => setConfirmSterge(true)}
                  className="flex size-8 items-center justify-center rounded-lg text-tx-3 hover:bg-st-red/10 hover:text-st-red"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

// Pagina „Notițe” (meniul lateral → Unelte): sus scrii, dedesubt „De făcut” (amintirile de azi) și toate notițele
// echipei, cele mai noi primele. Căutarea merge și după nr. auto scris oricum.
export function NotitePage({ onAlegeDosar }: { onAlegeDosar: (id: string) => void }) {
  const { notite, incarcat, eroare } = useNotite()
  const { dosare } = useDosareContext()
  const [cauta, setCauta] = useState('')

  const filtrate = useMemo(() => {
    const q = cauta.trim().toLocaleLowerCase('ro-RO')
    const qAuto = normAuto(cauta)
    const lista = [...notite].sort((a, b) => b.creatLa.localeCompare(a.creatLa))
    if (!q) return lista
    return lista.filter((n) => {
      if (n.text.toLocaleLowerCase('ro-RO').includes(q)) return true
      if (numeDinEmail(n.autor).toLocaleLowerCase('ro-RO').includes(q)) return true
      return qAuto.length >= 3 && dosareNotita(n, dosare).some((d) => normAuto(d.nrAutoPagubit || '').includes(qAuto))
    })
  }, [notite, cauta, dosare])
  const deFacut = filtrate.filter(notitaScadenta)
  const restul = filtrate.filter((n) => !notitaScadenta(n))

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 pb-24 md:pb-8">
      <NotitaNoua />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tx-3" aria-hidden="true" />
        <input
          type="search"
          value={cauta}
          onChange={(e) => setCauta(e.target.value)}
          placeholder="Caută în notițe (text, nr. auto, coleg)"
          className="h-10 w-full rounded-lg border border-border-strong bg-card pl-9 pr-3 text-[14px] text-foreground placeholder:text-tx-3 focus:border-accent-tx focus:outline-none"
        />
      </div>

      {eroare && <p className="rounded-lg border border-st-red/40 bg-st-red/10 px-3 py-2 text-[13px] text-st-red-tx">Notițele nu s-au putut încărca: {eroare}</p>}

      {!incarcat ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[13.5px] text-tx-3">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Se încarcă notițele…
        </div>
      ) : (
        <>
          {deFacut.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h2 className="flex items-center gap-2 text-[14px] font-bold text-foreground">
                <Bell className="size-4 text-st-orange" aria-hidden="true" />
                De făcut azi <span className="font-semibold text-tx-3">{deFacut.length}</span>
              </h2>
              {deFacut.map((n) => (
                <NotitaRand key={n.id} n={n} onAlegeDosar={onAlegeDosar} />
              ))}
            </section>
          )}
          <section className="flex flex-col gap-2.5">
            {deFacut.length > 0 && <h2 className="text-[14px] font-bold text-foreground">Toate notițele</h2>}
            {restul.map((n) => (
              <NotitaRand key={n.id} n={n} onAlegeDosar={onAlegeDosar} />
            ))}
            {filtrate.length === 0 && (
              <p className="py-10 text-center text-[13.5px] text-tx-3">
                {cauta ? 'Nicio notiță nu se potrivește.' : 'Încă nu există notițe. Scrie prima mai sus.'}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
