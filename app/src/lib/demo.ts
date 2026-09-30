import type { Dosar, Serviciu } from './types'

// VARIANTA DE TEST (build separat, VITE_DEMO=1, publicat la /centralizator-rca/demo/).
// Nu vorbeste deloc cu Supabase: dosarele vin dintr-o copie criptata (date-demo.enc, AES-GCM cu cheie
// derivata din parola), iar tot ce modifica testerul ramane doar in browserul lui (IndexedDB).
// Aplicatia reala nu e atinsa niciodata.
export const ESTE_DEMO = import.meta.env.VITE_DEMO === '1'

interface CopieDemo {
  dosare: Dosar[]
  servicii: Serviciu[]
}

// ---- Criptare (acelasi format ca scripts/cripteaza-demo.mjs) ----------------------------------
const ITERATII = 600_000
function b64(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
}
function dinBase64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}
async function cheie(parola: string, sare: Uint8Array): Promise<CryptoKey> {
  const baza = await crypto.subtle.importKey('raw', new TextEncoder().encode(parola), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sare as BufferSource, iterations: ITERATII, hash: 'SHA-256' },
    baza,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
}
async function decripteaza(parola: string): Promise<CopieDemo> {
  const r = await fetch(import.meta.env.BASE_URL + 'date-demo.enc', { cache: 'no-store' })
  if (!r.ok) throw new Error('Copia de test nu e disponibilă.')
  const { sare, iv, date } = (await r.json()) as { sare: string; iv: string; date: string }
  const k = await cheie(parola, dinBase64(sare))
  const text = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: dinBase64(iv) as BufferSource }, k, dinBase64(date) as BufferSource)
  return JSON.parse(new TextDecoder().decode(b64(text))) as CopieDemo
}

// ---- IndexedDB minimal ------------------------------------------------------------------------
const DB = 'rca-demo'
function deschide(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('kv')
      req.result.createObjectStore('docs')
    }
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}
async function op<T>(store: 'kv' | 'docs', mod: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await deschide()
  return new Promise((res, rej) => {
    const req = f(db.transaction(store, mod).objectStore(store))
    req.onsuccess = () => res(req.result as T)
    req.onerror = () => rej(req.error)
  })
}
const citeste = <T>(k: string) => op<T | undefined>('kv', 'readonly', (s) => s.get(k))
const scrie = (k: string, v: unknown) => op('kv', 'readwrite', (s) => s.put(v, k))

// Parola nu tine cont de litere mari/mici („demo” = „DEMO”); la fel in scripts/cripteaza-demo.mjs.
const normParola = (p: string) => p.trim().toUpperCase()

// ---- Sesiune ----------------------------------------------------------------------------------
export async function esteDeblocat(): Promise<boolean> {
  return !!(await citeste<boolean>('deblocat'))
}
export async function deblocheazaDemo(parola: string): Promise<string | null> {
  let copie: CopieDemo
  try {
    copie = await decripteaza(normParola(parola))
  } catch {
    return 'Parolă greșită.'
  }
  // Prima intrare (sau dupa „Resetează”): pornim de la copia originala.
  if (!(await citeste('dosare'))) {
    await scrie('dosare', copie.dosare)
    await scrie('servicii', copie.servicii ?? [])
  }
  await scrie('parola', normParola(parola))
  await scrie('deblocat', true)
  return null
}
export async function iesiDemo() {
  await scrie('deblocat', false)
}
/** Sterge modificarile testerului si reia copia originala. */
export async function reseteazaDemo() {
  const parola = await citeste<string>('parola')
  let copie: CopieDemo
  try {
    copie = await decripteaza(parola ?? '')
  } catch {
    // Parola salvata nu mai e valida (ex. parola demo s-a schimbat): stergem tot si se cere din nou.
    await op('kv', 'readwrite', (s) => s.clear())
    await op('docs', 'readwrite', (s) => s.clear())
    return
  }
  await scrie('dosare', copie.dosare)
  await scrie('servicii', copie.servicii ?? [])
  await op('docs', 'readwrite', (s) => s.clear())
}

// ---- Dosare / service-uri ---------------------------------------------------------------------
export async function demoDosare(): Promise<Dosar[]> {
  return (await citeste<Dosar[]>('dosare')) ?? []
}
export async function demoSalveazaDosar(d: Dosar): Promise<string> {
  const updatedAt = new Date().toISOString()
  const lista = await demoDosare()
  const nou = { ...d, updatedAt }
  const i = lista.findIndex((x) => x.id === d.id)
  if (i === -1) lista.unshift(nou)
  else lista[i] = nou
  await scrie('dosare', lista)
  return updatedAt
}
export async function demoStergeDosar(id: string) {
  await scrie('dosare', (await demoDosare()).filter((d) => d.id !== id))
}
export async function demoInlocuiesteDosare(lista: Dosar[]) {
  await scrie('dosare', lista)
}
export async function demoServicii(): Promise<Serviciu[]> {
  return (await citeste<Serviciu[]>('servicii')) ?? []
}
export async function demoSalveazaServiciu(s: Serviciu) {
  const lista = await demoServicii()
  const i = lista.findIndex((x) => x.id === s.id)
  if (i === -1) lista.push(s)
  else lista[i] = s
  await scrie('servicii', lista)
}
export async function demoStergeServiciu(id: string) {
  await scrie('servicii', (await demoServicii()).filter((s) => s.id !== id))
}
export async function demoInlocuiesteServicii(lista: Serviciu[]) {
  await scrie('servicii', lista)
}

// ---- Documente: doar cele incarcate de tester, tinute local ------------------------------------
export const PREFIX_DOC_DEMO = 'demo:'
export async function demoIncarcaDocument(file: File): Promise<{ id: string }> {
  const id = PREFIX_DOC_DEMO + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
  await op('docs', 'readwrite', (s) => s.put(file, id))
  return { id }
}
export async function demoStergeDocument(id: string) {
  if (id.startsWith(PREFIX_DOC_DEMO)) await op('docs', 'readwrite', (s) => s.delete(id))
}
export async function demoDeschideDocument(id: string) {
  if (!id.startsWith(PREFIX_DOC_DEMO)) {
    throw new Error('Documentele originale ale dosarelor nu sunt incluse în varianta de test.')
  }
  const blob = await op<Blob | undefined>('docs', 'readonly', (s) => s.get(id))
  if (!blob) throw new Error('Fișierul nu mai există.')
  window.open(URL.createObjectURL(blob), '_blank', 'noopener')
}
