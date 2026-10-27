import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { ESTE_DEMO, demoNotite, demoSalveazaNotite } from './demo'
import { normAuto } from './folder-local'
import { todayStr } from './rca-calc'
import type { Dosar } from './types'

// „Notițe” (unealtă comună, vizibilă toată echipa): ce ai vorbit cu clientul la telefon, scris liber.
// Fiecare notiță e un rând în `app_storage` (cheia `notita:<id>`, valoarea = JSON) — fără migrare.
// app_storage nu are politică de ștergere, așa că „Șterge” golește textul și marchează `stearsa`.
// În demo stau în IndexedDB-ul testerului.

export interface Notita {
  id: string
  text: string
  /** Emailul celui care a scris-o („DEMO” în varianta de test). */
  autor: string
  creatLa: string
  actualizatLa: string
  /** Legată de mână (notiță scrisă din panoul dosarului); altfel legarea se face după text. */
  dosarId?: string
  /** Ziua (YYYY-MM-DD) din care notița apare la „De făcut”. */
  amintesteLa?: string
  /** Dosarele la ale căror Observații a fost adăugat textul. */
  adaugatLa?: string[]
  rezolvata?: boolean
  stearsa?: boolean
}

const PREFIX = 'notita:'

async function citesteToate(): Promise<Notita[]> {
  if (ESTE_DEMO) return demoNotite<Notita>()
  const { data, error } = await supabase.from('app_storage').select('key, value').like('key', PREFIX + '%')
  if (error) throw error
  const out: Notita[] = []
  for (const r of (data ?? []) as { key: string; value: string | null }[]) {
    try {
      const n = JSON.parse(r.value ?? '') as Notita
      if (n && n.id) out.push(n)
    } catch {
      // rând stricat — îl sărim
    }
  }
  return out
}

async function scrieUna(n: Notita) {
  if (ESTE_DEMO) {
    const lista = await demoNotite<Notita>()
    const i = lista.findIndex((x) => x.id === n.id)
    if (i === -1) lista.push(n)
    else lista[i] = n
    await demoSalveazaNotite(lista)
    return
  }
  const { error } = await supabase
    .from('app_storage')
    .upsert({ key: PREFIX + n.id, value: JSON.stringify(n), updated_at: new Date().toISOString() })
  if (error) throw error
}

async function autorCurent(): Promise<string> {
  if (ESTE_DEMO) return 'DEMO'
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email ?? ''
}

// ---- Store comun (o singură încărcare, toate componentele văd aceeași listă) ------------------
interface Stare {
  notite: Notita[]
  incarcat: boolean
  eroare: string
}
let stare: Stare = { notite: [], incarcat: false, eroare: '' }
const ascultatori = new Set<() => void>()
const seteaza = (s: Partial<Stare>) => {
  stare = { ...stare, ...s }
  ascultatori.forEach((f) => f())
}

let inCurs: Promise<void> | null = null
export function reincarcaNotite(): Promise<void> {
  if (!inCurs)
    inCurs = citesteToate()
      .then((n) => seteaza({ notite: n.filter((x) => !x.stearsa), incarcat: true, eroare: '' }))
      .catch((e) => seteaza({ incarcat: true, eroare: e instanceof Error ? e.message : String(e) }))
      .finally(() => (inCurs = null))
  return inCurs
}

// notițele colegilor apar când revii în filă
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && stare.incarcat) void reincarcaNotite()
})

export function useNotite(): Stare {
  const s = useSyncExternalStore(
    (f) => {
      ascultatori.add(f)
      return () => ascultatori.delete(f)
    },
    () => stare,
  )
  useEffect(() => {
    if (!stare.incarcat) void reincarcaNotite()
  }, [])
  return s
}

async function pune(n: Notita) {
  await scrieUna(n)
  const rest = stare.notite.filter((x) => x.id !== n.id)
  seteaza({ notite: n.stearsa ? rest : [n, ...rest] })
}

export async function adaugaNotita(date: Pick<Notita, 'text'> & Partial<Pick<Notita, 'dosarId' | 'amintesteLa' | 'adaugatLa'>>): Promise<Notita> {
  const acum = new Date().toISOString()
  const n: Notita = {
    id: crypto.randomUUID(),
    text: date.text.trim(),
    autor: await autorCurent(),
    creatLa: acum,
    actualizatLa: acum,
    ...(date.dosarId ? { dosarId: date.dosarId } : {}),
    ...(date.amintesteLa ? { amintesteLa: date.amintesteLa } : {}),
    ...(date.adaugatLa?.length ? { adaugatLa: date.adaugatLa } : {}),
  }
  await pune(n)
  return n
}

export async function modificaNotita(n: Notita, patch: Partial<Notita>) {
  await pune({ ...n, ...patch, actualizatLa: new Date().toISOString() })
}

export async function stergeNotita(n: Notita) {
  // textul nu rămâne în baza de date, doar marcajul
  await pune({ ...n, text: '', stearsa: true, actualizatLa: new Date().toISOString() })
}

// ---- Legarea de dosar ------------------------------------------------------------------------
/**
 * Dosarele pomenite în text: nr. auto păgubit (oricum scris: „BH 52 LCA”, „bh-52-lca”), nr. dosar,
 * nr. rezervare (cifrele, „RBH 29851” sau „29851”). Nr. auto de înlocuire contează doar la dosarele
 * nefinalizate — aceeași mașină de înlocuire a fost la mulți clienți.
 */
export function dosareDinText(text: string, dosare: Dosar[]): Dosar[] {
  const compact = normAuto(text)
  if (compact.length < 4) return []
  const numere = new Set(text.match(/(?<!\d)\d{4,7}(?!\d)/g) ?? [])
  return dosare.filter((d) => {
    const p = normAuto(d.nrAutoPagubit || '')
    if (p.length >= 5 && compact.includes(p)) return true
    const i = normAuto(d.nrAutoInlocuire || '')
    if (d.status !== 'finalizat' && i.length >= 5 && compact.includes(i)) return true
    const n = normAuto(d.nrDosar || '')
    if (n.length >= 6 && compact.includes(n)) return true
    const r = (d.nrRezervare || '').replace(/\D/g, '')
    return r.length >= 4 && numere.has(r)
  })
}

/**
 * Potriviri parțiale pentru pop-up-ul de sub câmp (cererea utilizatorului: „LCA” sau „212 NOM” → îți
 * arată dosarul): doar dosarele **nefinalizate**, după nr. auto păgubit sau de înlocuire. Bucăți din text
 * (un cuvânt sau două lipite): doar litere → finalul numărului („LCA”); cu cifre → oriunde în număr
 * („212”, „212NOM”, „52LCA”). Minimum 3 caractere. Rămân doar potrivirile cele mai lungi.
 */
export function dosarePartiale(text: string, dosare: Dosar[], max = 6): Dosar[] {
  const cuv = (text.match(/[\p{L}\p{N}]+/gu) ?? []).map(normAuto).filter(Boolean)
  const bucati = new Set<string>()
  cuv.forEach((c, i) => {
    bucati.add(c)
    if (i + 1 < cuv.length) bucati.add(c + cuv[i + 1])
  })
  const scor = new Map<Dosar, number>()
  for (const d of dosare) {
    if (d.status === 'finalizat') continue
    const nr = [normAuto(d.nrAutoPagubit || ''), normAuto(d.nrAutoInlocuire || '')].filter((x) => x.length >= 5)
    let best = 0
    for (const b of bucati) {
      if (b.length < 3) continue
      const cuCifre = /\d/.test(b)
      if (nr.some((x) => (cuCifre ? x.includes(b) : x.endsWith(b)))) best = Math.max(best, b.length)
    }
    if (best) scor.set(d, best)
  }
  // doar cele mai bune: „212 NOM” → doar B212NOM, nu toate mașinile de înlocuire terminate în NOM
  const top = Math.max(0, ...scor.values())
  return [...scor.entries()].filter(([, v]) => v === top).slice(0, max).map(([d]) => d)
}

/** Legate de mână + pomenite în text, fără dubluri. */
export function dosareNotita(n: Notita, dosare: Dosar[]): Dosar[] {
  const dinText = dosareDinText(n.text, dosare)
  const manual = n.dosarId ? dosare.find((d) => d.id === n.dosarId) : undefined
  return manual ? [manual, ...dinText.filter((d) => d.id !== manual.id)] : dinText
}

// dosar → notițele lui (cele mai noi primele), calculat o dată pe pereche (notițe, dosare): cardurile îl
// citesc fiecare, iar căutarea în text e scumpă.
const cacheHarta = new WeakMap<Notita[], WeakMap<Dosar[], Map<string, Notita[]>>>()
export function hartaNotite(notite: Notita[], dosare: Dosar[]): Map<string, Notita[]> {
  let m = cacheHarta.get(notite)
  if (!m) cacheHarta.set(notite, (m = new WeakMap()))
  let h = m.get(dosare)
  if (h) return h
  h = new Map()
  const noi = [...notite].sort((a, b) => b.creatLa.localeCompare(a.creatLa))
  for (const n of noi)
    for (const d of dosareNotita(n, dosare)) {
      const l = h.get(d.id)
      if (l) l.push(n)
      else h.set(d.id, [n])
    }
  m.set(dosare, h)
  return h
}

export function notiteDosar(dosar: Dosar, notite: Notita[], dosare: Dosar[]): Notita[] {
  return hartaNotite(notite, dosare).get(dosar.id) ?? []
}

// ---- Amintiri --------------------------------------------------------------------------------
export const notitaScadenta = (n: Notita) => !!n.amintesteLa && !n.rezolvata && n.amintesteLa <= todayStr()
export const notitaCuAmintire = (n: Notita) => !!n.amintesteLa && !n.rezolvata

/** Observațiile dosarului cu notița adăugată la sfârșit, pe rând nou, cu ziua în față („27.10: …”). */
export function observatiiCuNotita(notes: string | undefined, text: string): string {
  const d = new Date()
  const zi = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
  const rand = `${zi}: ${text.trim()}`
  return notes?.trim() ? `${notes.trimEnd()}
${rand}` : rand
}

/** Textul scurt pus ca reminder pe dosar (în clopoțel): primul rând, max. 80 de caractere. */
export function rezumat(text: string, max = 80): string {
  const r = text.trim().split(/\r?\n/)[0].trim()
  return r.length > max ? r.slice(0, max - 1).trimEnd() + '…' : r
}

/** „acum 5 min”, „azi 14:32”, „ieri 09:10”, „12.10 · 16:05”. */
export function cand(iso: string): string {
  const d = new Date(iso)
  const min = Math.round((Date.now() - d.getTime()) / 60000)
  if (min < 1) return 'acum'
  if (min < 60) return `acum ${min} min`
  const ora = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const zi = (x: Date) => x.toDateString()
  const ieri = new Date()
  ieri.setDate(ieri.getDate() - 1)
  if (zi(d) === zi(new Date())) return `azi ${ora}`
  if (zi(d) === zi(ieri)) return `ieri ${ora}`
  return `${d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit' })} · ${ora}`
}
