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
  /** Calea din folderul ales (ex. „Allianz/B768SBG/Deviz.pdf”) — unica. */
  cale: string
  /** Tipurile de document recunoscute din nume (fara „altele"). */
  chei: string[]
}

interface FolderScanat {
  /** Toate grupurile de 1–3 bucati consecutive din nume, lipite (ex. „BH 52 LCA - Allianz” → BH52LCA, ALLIANZ…). */
  ferestre: Set<string>
  /** Fisierele din el si din subfolderele lui. */
  fisiere: FisierLocal[]
}

export interface StareFolder {
  suportat: boolean
  nume: string | null
  permis: PermissionState | null
  /** Fiecare subfolder (pe orice nivel, pana la 4), cu fisierele lui. */
  foldere: FolderScanat[]
  /** Fisierele care nu stau intr-un folder de dosar — se potrivesc dupa nr. auto din numele lor. */
  libere: (FisierLocal & { ferestre: Set<string> })[]
  /** Cate foldere au un nr. auto in nume (ce arata butonul). */
  nrDosare: number
  scanatLa: number | null
  seScaneaza: boolean
  eroare: string
}

const suportat = typeof window !== 'undefined' && typeof (window as FereastraFs).showDirectoryPicker === 'function'
let stare: StareFolder = { suportat, nume: null, permis: null, foldere: [], libere: [], nrDosare: 0, scanatLa: null, seScaneaza: false, eroare: '' }
let radacina: DirFs | null = null
const ascultatori = new Set<() => void>()

function seteaza(p: Partial<StareFolder>) {
  stare = { ...stare, ...p }
  ascultatori.forEach((f) => f())
}

const faraDiacritice = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const normAuto = (s: string) => faraDiacritice(s).toUpperCase().replace(/[^A-Z0-9]/g, '')

/** „Allianz - BH 52 LCA (poze)” → {ALLIANZ, BH, 52, LCA, BH52, 52LCA, BH52LCA, …}: nr. auto se gaseste
 *  oriunde in nume, si cu spatii/cratime intre bucati. */
export function ferestreNume(nume: string): Set<string> {
  const fara = nume.replace(/\.[a-z0-9]{1,5}$/i, '')
  const b = faraDiacritice(fara).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)
  const out = new Set<string>()
  for (let i = 0; i < b.length; i++) {
    let lipit = ''
    for (let j = i; j < Math.min(b.length, i + 3); j++) {
      lipit += b[j]
      out.add(lipit)
    }
  }
  return out
}
// nr. auto romanesc: B 123 ABC / BH 52 LCA
const NR_AUTO = /^(B\d{2,3}|[A-Z]{2}\d{2})[A-Z]{3}$/
const areNrAuto = (f: Set<string>) => [...f].some((x) => NR_AUTO.test(x))

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
const ADANCIME = 4

interface Colectare {
  foldere: FolderScanat[]
  libere: StareFolder['libere']
  nrDosare: number
  esecuri: number
}

/** `deasupra`: folderele in care se afla `dir` (fisierele se adauga la toate). `inDosar`: un folder de
 *  mai sus are nr. auto in nume, deci fisierele sunt ale lui (nu se mai potrivesc dupa nume). */
async function citesteDir(dir: DirFs, cale: string, adancime: number, deasupra: FolderScanat[], inDosar: boolean, c: Colectare) {
  try {
    for await (const e of dir.values()) {
      if (IGNORAT.test(e.name)) continue
      const caleE = cale ? cale + '/' + e.name : e.name
      if (e.kind === 'file') {
        const f: FisierLocal = { nume: e.name, cale: caleE, chei: detectAllDocLabels(e.name).filter((k) => k !== 'altele') }
        deasupra.forEach((d) => d.fisiere.push(f))
        if (!inDosar) c.libere.push({ ...f, ferestre: ferestreNume(e.name) })
      } else if (adancime > 0) {
        const nod: FolderScanat = { ferestre: ferestreNume(e.name), fisiere: [] }
        const eDosar = !inDosar && areNrAuto(nod.ferestre)
        if (eDosar) c.nrDosare++
        c.foldere.push(nod)
        await citesteDir(e as DirFs, caleE, adancime - 1, [...deasupra, nod], inDosar || eDosar, c)
      }
    }
  } catch (e) {
    // un subfolder care nu se poate citi nu opreste tot; doar radacina conteaza ca eroare
    if (!cale) throw e
    console.warn('Nu am putut citi', cale, e)
    c.esecuri++
  }
}

export async function rescaneaza() {
  if (!radacina || stare.seScaneaza) return
  seteaza({ seScaneaza: true, eroare: '' })
  try {
    const c: Colectare = { foldere: [], libere: [], nrDosare: 0, esecuri: 0 }
    await citesteDir(radacina, '', ADANCIME, [], false, c)
    seteaza({
      foldere: c.foldere,
      libere: c.libere,
      nrDosare: c.nrDosare,
      scanatLa: Date.now(),
      seScaneaza: false,
      eroare: c.esecuri ? `${c.esecuri} ${c.esecuri === 1 ? 'subfolder nu s-a putut citi' : 'subfoldere nu s-au putut citi'}.` : '',
    })
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
    seteaza({ seScaneaza: false })
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
  seteaza({ nume: null, permis: null, foldere: [], libere: [], nrDosare: 0, scanatLa: null, eroare: '' })
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

type DosarFolder = { nrAutoPagubit: string; categoriiFolder?: Record<string, string> }

// potrivirile se calculeaza o data pe scanare (multe carduri × multe foldere)
const cache = new WeakMap<StareFolder, Map<string, FisierLocal[]>>()

function gasesteFisiere(s: StareFolder, nrAuto: string): FisierLocal[] {
  const n = normAuto(nrAuto)
  if (n.length < 4 || (s.foldere.length === 0 && s.libere.length === 0)) return []
  let m = cache.get(s)
  if (!m) cache.set(s, (m = new Map()))
  const gasit = m.get(n)
  if (gasit) return gasit
  const dupaCale = new Map<string, FisierLocal>()
  for (const d of s.foldere) if (d.ferestre.has(n)) d.fisiere.forEach((f) => dupaCale.set(f.cale, f))
  for (const f of s.libere) if (f.ferestre.has(n)) dupaCale.set(f.cale, f)
  const rez = [...dupaCale.values()]
  m.set(n, rez)
  return rez
}

/** Fisierele dosarului: din folderele cu nr. auto pagubit oriunde in nume („B768SBG”, „Allianz - B 768 SBG”,
 *  si in subfoldere de grup, ex. „Allianz/B768SBG”) + fisierele din afara lor cu nr. auto in nume,
 *  cu categoriile alese de mana (`categoriiFolder`) in locul celor ghicite din nume. */
export function fisiereLocale(s: StareFolder, d: DosarFolder): FisierLocal[] {
  const alese = d.categoriiFolder ?? {}
  return gasesteFisiere(s, d.nrAutoPagubit).map((f) =>
    alese[f.nume] ? { ...f, chei: alese[f.nume] === 'altele' ? [] : [alese[f.nume]] } : f,
  )
}

export function cheiLocale(s: StareFolder, d: DosarFolder): string[] {
  return [...new Set(fisiereLocale(s, d).flatMap((f) => f.chei))]
}
