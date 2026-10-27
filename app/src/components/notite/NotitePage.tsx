import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, Link2, Loader2, Pencil, Search, Trash2, X } from 'lucide-react'
import { useDosareContext } from '@/contexts/DosareContext'
import { initiale, numeDinEmail } from '@/lib/autentificare'
import { majuscule } from '@/lib/majuscule'
import {
  adaugaNotita,
  cand,
  dosareDinText,
  alteVariante,
  completareLaCursor,
  numereInText,
  type NrInText,
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
import { CampData } from '@/components/ui/camp-data'

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
      <CampData
        aria-label="Altă zi"
        value={altaZi ? zi : ''}
        onChange={onZi}
        placeholder="altă zi"
        className={cn(CHIP, 'w-[136px] gap-1.5 bg-transparent', altaZi ? CHIP_ON : CHIP_OFF)}
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

/** Fundalul de sub câmp: același text, transparent, cu numerele de dosar încadrate și un reper la poziția
 * meniului (ca să știm unde să-l arătăm). Trebuie să aibă exact aceleași dimensiuni ca textarea. */
function Fundal({ text, numere, reper, reperRef }: { text: string; numere: NrInText[]; reper: number | null; reperRef: React.RefObject<HTMLSpanElement | null> }) {
  const parti: { a: number; b: number; nr: boolean }[] = []
  let i = 0
  for (const r of numere) {
    if (r.start > i) parti.push({ a: i, b: r.start, nr: false })
    parti.push({ a: r.start, b: r.end, nr: true })
    i = r.end
  }
  if (i < text.length) parti.push({ a: i, b: text.length, nr: false })
  const semn = <span key="reper" ref={reperRef} />
  const bucati: React.ReactNode[] = []
  for (const p of parti) {
    if (p.nr) {
      if (reper === p.a) bucati.push(semn)
      bucati.push(
        <mark key={p.a} className="rounded-[4px] bg-primary/25 text-transparent shadow-[0_0_0_1px_var(--accent-tx)]">
          {text.slice(p.a, p.b)}
        </mark>,
      )
    } else if (reper !== null && reper >= p.a && reper < p.b) bucati.push(text.slice(p.a, reper), semn, text.slice(reper, p.b))
    else bucati.push(text.slice(p.a, p.b))
  }
  if (reper === text.length) bucati.push(semn)
  return <>{bucati}{'\n'}</>
}

const CAMP = 'px-3 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words'

/** Câmpul de scris o notiță nouă, cu auto-completarea nr. auto: scrii „DCM” → lista cu variantele (dosare
 * nefinalizate) → Enter/click pune numărul întreg („BH44DCM”), încadrat; click pe un număr încadrat = îl
 * schimbi sau îl scoți. Dosarele legate vin doar din ce e scris (ștergi numărul → se dezleagă). La salvare,
 * notița se adaugă și la Observațiile dosarelor legate. */
export function NotitaNoua() {
  const { dosare, salveazaRapid } = useDosareContext()
  const [text, setText] = useState('')
  const [zi, setZi] = useState('')
  const [comutate, setComutate] = useState<Set<string>>(new Set())
  const [salvez, setSalvez] = useState(false)
  const [eroare, setEroare] = useState('')
  const [mesaj, setMesaj] = useState('')
  const [cursor, setCursor] = useState(0)
  const [prinClick, setPrinClick] = useState(false)
  const [ascunsPentru, setAscunsPentru] = useState('')
  const [activ, setActiv] = useState(0)
  const [poz, setPoz] = useState<{ top: number; left: number } | null>(null)
  const campRef = useRef<HTMLTextAreaElement>(null)
  const fundalRef = useRef<HTMLDivElement>(null)
  const reperRef = useRef<HTMLSpanElement>(null)
  const cursorNou = useRef<number | null>(null)

  const numere = useMemo(() => numereInText(text, dosare), [text, dosare])
  const legate = useMemo(() => dosareDinText(text, dosare), [text, dosare])
  // Un singur dosar → bifat singur; mai multe → alegi tu pe care.
  const alese = legate.filter((d) => (legate.length === 1 ? !comutate.has(d.id) : comutate.has(d.id)))
  const comuta = (id: string) =>
    setComutate((c) => {
      const n = new Set(c)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // Meniul: „schimbă” când ai dat click pe un număr încadrat, altfel auto-completarea bucății de la cursor.
  const meniu = useMemo(() => {
    const nr = numere.find((r) => cursor > r.start && cursor <= r.end)
    if (nr) {
      if (!prinClick) return null
      return { tip: 'schimba' as const, start: nr.start, end: nr.end, variante: alteVariante(nr, dosare), nr, cheie: `s${nr.start}${nr.nr}` }
    }
    const c = completareLaCursor(text, cursor, dosare, numere)
    return c ? { tip: 'completare' as const, ...c, nr: null, cheie: `c${c.start}${c.bucata}` } : null
  }, [numere, cursor, prinClick, text, dosare])
  const deschis = !!meniu && meniu.cheie !== ascunsPentru
  const optiuni = meniu ? meniu.variante.length + (meniu.tip === 'schimba' ? 1 : 0) : 0

  useEffect(() => setActiv(0), [meniu?.cheie])

  // poziția meniului: sub bucata scrisă (reperul din fundal), fără să iasă din câmp
  useLayoutEffect(() => {
    const r = reperRef.current
    const f = fundalRef.current
    if (!deschis || !r || !f) return setPoz(null)
    const lat = f.clientWidth
    setPoz({ top: r.offsetTop - f.scrollTop + 24, left: Math.max(4, Math.min(r.offsetLeft - 8, lat - 324)) })
  }, [deschis, text, cursor, meniu?.cheie])

  // după o alegere, cursorul trece după numărul pus
  useLayoutEffect(() => {
    const c = cursorNou.current
    if (c === null || !campRef.current) return
    cursorNou.current = null
    campRef.current.focus()
    campRef.current.setSelectionRange(c, c)
    setCursor(c)
  }, [text])

  function inlocuieste(start: number, end: number, cu: string) {
    const dupa = text.slice(end)
    const spatiu = cu && !/^[\s.,;:!?)]/.test(dupa) ? ' ' : ''
    const nou = text.slice(0, start) + cu + spatiu + dupa
    cursorNou.current = start + cu.length + spatiu.length
    setPrinClick(false)
    setText(nou)
    setMesaj('')
  }
  function alege(k: number) {
    if (!meniu) return
    if (k < meniu.variante.length) inlocuieste(meniu.start, meniu.end, meniu.variante[k].nr)
    else inlocuieste(meniu.start, meniu.end, '') // „Scoate numărul”
  }

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
      setAscunsPentru('')
    } catch (e) {
      setEroare(e instanceof Error ? e.message : 'Nu s-a putut salva.')
    } finally {
      setSalvez(false)
    }
  }

  const reper = deschis && meniu ? meniu.start : null

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-card p-4">
      <div className="relative">
        <div
          ref={fundalRef}
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-lg border border-transparent bg-background text-transparent', CAMP)}
        >
          <Fundal text={text} numere={numere} reper={reper} reperRef={reperRef} />
        </div>
        <textarea
          ref={campRef}
          value={text}
          role="combobox"
          aria-expanded={deschis}
          aria-autocomplete="list"
          onChange={(e) => {
            setText(e.target.value)
            setCursor(e.target.selectionStart)
            setPrinClick(false)
            setMesaj('')
          }}
          onSelect={(e) => setCursor(e.currentTarget.selectionStart)}
          onMouseUp={(e) => {
            setCursor(e.currentTarget.selectionStart)
            setPrinClick(true)
            setAscunsPentru('')
          }}
          onScroll={(e) => {
            if (fundalRef.current) fundalRef.current.scrollTop = e.currentTarget.scrollTop
          }}
          onBlur={() => setTimeout(() => setPrinClick(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return void salveaza()
            if (!deschis || !meniu || !optiuni) return
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              setActiv((a) => (a + (e.key === 'ArrowDown' ? 1 : optiuni - 1)) % optiuni)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault()
              alege(activ)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setAscunsPentru(meniu.cheie)
            } else if (meniu.tip === 'schimba') setPrinClick(false)
          }}
          rows={4}
          aria-label="Notiță nouă"
          className={cn(
            'relative block w-full resize-y rounded-lg border border-border-strong bg-transparent text-foreground placeholder:text-tx-3 focus:border-accent-tx focus:outline-none',
            CAMP,
          )}
        />
        {deschis && meniu && poz && (
          <div
            role="listbox"
            aria-label={meniu.tip === 'schimba' ? 'Schimbă dosarul' : 'Dosare găsite'}
            style={{ top: poz.top, left: poz.left }}
            className="absolute z-20 w-[320px] max-w-[calc(100%-8px)] rounded-xl border border-border-strong bg-surface-2 p-1.5 shadow-lg shadow-black/40"
          >
            <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-0.5 text-[12px] font-semibold text-tx-3">
              <span className="truncate">
                {meniu.tip === 'schimba'
                  ? meniu.variante.length
                    ? `Schimbă ${meniu.nr?.nr} cu:`
                    : 'Niciun alt dosar cu aceleași litere'
                  : 'Alege dosarul (Enter sau click)'}
              </span>
              <button
                type="button"
                aria-label="Închide"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setAscunsPentru(meniu.cheie)}
                className="flex size-6 shrink-0 items-center justify-center rounded-md hover:bg-surface-hover hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
            {meniu.variante.map((v, k) => (
              <button
                key={v.dosar.id}
                type="button"
                role="option"
                aria-selected={k === activ}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiv(k)}
                onClick={() => alege(k)}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left', k === activ && 'bg-surface-hover')}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-foreground">
                    {v.dosar.nrAutoPagubit || '–'}
                    {v.dosar.nrAutoInlocuire && <span className="font-medium text-tx-3"> → </span>}
                    {v.dosar.nrAutoInlocuire && <span className="text-tx-2">{v.dosar.nrAutoInlocuire}</span>}
                  </span>
                  <span className="block truncate text-[12px] text-tx-3">
                    {[v.dosar.asigurator, v.dosar.marcaModel, v.dosar.numeClient].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
            {meniu.tip === 'schimba' && (
              <button
                type="button"
                role="option"
                aria-selected={activ === meniu.variante.length}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiv(meniu.variante.length)}
                onClick={() => alege(meniu.variante.length)}
                className={cn(
                  'mt-0.5 flex w-full items-center gap-2 rounded-lg border-t border-border px-2 py-1.5 text-left text-[12.5px] font-semibold text-tx-2',
                  activ === meniu.variante.length && 'bg-surface-hover',
                )}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Scoate numărul din text
              </button>
            )}
          </div>
        )}
      </div>
      {legate.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-tx-3">
          <span className="mr-1">{legate.length === 1 ? 'Se adaugă la observațiile dosarului:' : 'Am găsit mai multe dosare — alege la care se adaugă:'}</span>
          {legate.map((d) => {
            const on = alese.includes(d)
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={on}
                onClick={() => comuta(d.id)}
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
