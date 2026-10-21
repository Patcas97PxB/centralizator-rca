import { useSyncExternalStore } from 'react'
import { detectAllDocLabels } from './documente'

// Folderul „RCA" de pe laptop (File System Access API, doar Chrome/Edge pe calculator): aplicatia
// DOAR CITESTE numele fisierelor — nu incarca, nu modifica, nu sterge nimic. Fiecare subfolder e un
// dosar, numit dupa nr. auto pagubit (ex. „B768SBG"); fisierele din el („Deviz - B768SBG.pdf",
// „NC b768sbg.jpg") se recunosc dupa nume (detectAllDocLabels) si conteaza ca documente prezente.
// Folderul ales se tine minte in IndexedDB (doar in acest browser); la fiecare pornire a browserului,
// Chrome cere din nou voie (un click).

interface IntrareFs {
  kind: 'file' | 'directory'
  name: string
}
interface DirFs extends IntrareFs {
  kind: 'directory'
  values(): AsyncIterable<IntrareFs>
  queryPermission(o: { mode: 'read' }): Promise<PermissionState>
  requestPermission(o: { mode: 'read' }): Promise<PermissionState>
}
type FereastraFs = Window & { showDirectoryPicker?: (o?: { id?: string; mode?: 'read' }) => Promise<DirFs> }

export interface FisierLocal {
  nume: string
  /** Tipurile de document recunoscute din nume (fara „altele"). */
  chei: string[]
}

export interface StareFolder {
  suportat: boolean
  nume: string | null
  permis: PermissionState | null
  /** nr. auto normalizat (fara spatii/cratime, litere mari) → fisierele din subfolder */
  dosare: Map<string, FisierLocal[]>
  scanatLa: number | null
  seScaneaza: boolean
  eroare: string
}

const suportat = typeof window !== 'undefined' && typeof (window as FereastraFs).showDirectoryPicker === 'function'
let stare: StareFolder = { suportat, nume: null, permis: null, dosare: new Map(), scanatLa: null, seScaneaza: false, eroare: '' }
let radacina: DirFs | null = null
const ascultatori = new Set<() => void>()

function seteaza(p: Partial<StareFolder>) {
  stare = { ...stare, ...p }
  ascultatori.forEach((f) => f())
}

export const normAuto = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

// ---------- IndexedDB (handle-ul folderului) ----------
const DB = 'rca-folder-local'
const CHEIE = 'radacina'
function deschideDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore('kv')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idb<T>(fn: (s: IDBObjectStore) => IDBRequest, scriere = false): Promise<T> {
  const db = await deschideDb()
  return new Promise((res, rej) => {
    const r = fn(db.transaction('kv', scriere ? 'readwrite' : 'readonly').objectStore('kv'))
    r.onsuccess = () => res(r.result as T)
    r.onerror = () => rej(r.error)
  })
}

// ---------- citirea folderului ----------
const IGNORAT = /^(~\$|\.|desktop\.ini$|thumbs\.db$)|\.(tmp|lnk|crdownload)$/i

async function fisiereDin(dir: DirFs, adancime: number, out: FisierLocal[]) {
  for await (const e of dir.values()) {
    if (e.kind === 'file') {
      if (!IGNORAT.test(e.name)) out.push({ nume: e.name, chei: detectAllDocLabels(e.name).filter((k) => k !== 'altele') })
    } else if (adancime > 0) {
      await fisiereDin(e as DirFs, adancime - 1, out)
    }
  }
}

export async function rescaneaza() {
  if (!radacina || stare.seScaneaza) return
  seteaza({ seScaneaza: true, eroare: '' })
  try {
    const dosare = new Map<string, FisierLocal[]>()
    for await (const e of radacina.values()) {
      if (e.kind !== 'directory') continue
      const fisiere: FisierLocal[] = []
      await fisiereDin(e as DirFs, 2, fisiere)
      const cheie = normAuto(e.name)
      if (cheie) dosare.set(cheie, [...(dosare.get(cheie) ?? []), ...fisiere])
    }
    seteaza({ dosare, scanatLa: Date.now(), seScaneaza: false })
  } catch (e) {
    console.error(e)
    seteaza({ seScaneaza: false, permis: 'prompt', eroare: 'Nu am putut citi folderul — dă din nou voie.' })
  }
}

export async function alegeFolder() {
  const w = window as FereastraFs
  if (!w.showDirectoryPicker) return
  try {
    const dir = await w.showDirectoryPicker({ id: 'rca-dosare', mode: 'read' })
    radacina = dir
    await idb((s) => s.put(dir, CHEIE), true)
    seteaza({ nume: dir.name, permis: 'granted' })
    await rescaneaza()
  } catch (e) {
    if ((e as DOMException)?.name !== 'AbortError') seteaza({ eroare: 'Browserul nu a permis alegerea folderului.' })
  }
}

/** Trebuie apelata dintr-un click (Chrome cere gestul utilizatorului). */
export async function permiteCitirea() {
  if (!radacina) return alegeFolder()
  const p = await radacina.requestPermission({ mode: 'read' })
  seteaza({ permis: p })
  if (p === 'granted') await rescaneaza()
}

export async function deconecteaza() {
  radacina = null
  await idb((s) => s.delete(CHEIE), true).catch(() => {})
  seteaza({ nume: null, permis: null, dosare: new Map(), scanatLa: null, eroare: '' })
}

// La pornire: folderul ales data trecuta (daca permisiunea mai e valabila, se citeste direct).
async function init() {
  if (!suportat) return
  try {
    const dir = await idb<DirFs | undefined>((s) => s.get(CHEIE))
    if (!dir) return
    radacina = dir
    const p = await dir.queryPermission({ mode: 'read' })
    seteaza({ nume: dir.name, permis: p })
    if (p === 'granted') await rescaneaza()
  } catch (e) {
    console.error(e)
  }
}
if (suportat) {
  void init()
  // fisierele adaugate intre timp pe laptop apar cand revii in fila
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && stare.permis === 'granted') void rescaneaza()
  })
}

export function useFolderLocal(): StareFolder {
  return useSyncExternalStore(
    (f) => {
      ascultatori.add(f)
      return () => ascultatori.delete(f)
    },
    () => stare,
  )
}

/** Fisierele din subfolderul dosarului (dupa nr. auto pagubit). Accepta si „B768SBG - Allianz". */
export function fisiereLocale(s: StareFolder, nrAuto: string): FisierLocal[] {
  const n = normAuto(nrAuto)
  if (n.length < 4 || s.dosare.size === 0) return []
  const exact = s.dosare.get(n)
  if (exact) return exact
  for (const [cheie, f] of s.dosare) if (cheie.startsWith(n)) return f
  return []
}

export function cheiLocale(s: StareFolder, nrAuto: string): string[] {
  return [...new Set(fisiereLocale(s, nrAuto).flatMap((f) => f.chei))]
}
