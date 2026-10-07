import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Fundalul paginii de login: parcarea sediului Autonom vazuta de sus (ca din drona), dupa locul real
// (schita + poza de sus a utilizatorului): sediul in stanga, cu trotuar in fata si Bulevardul Decebal jos
// (circulatie de la dreapta spre stanga); parcarea (asfalt, locuri marcate) in dreapta sediului, cu copaci
// in capat; masinile stau ca in poza: in capat, langa sediu, in mijloc, pe dreapta, una piezis in colt si
// langa trotuar. Platforma de beton unde se fumeaza e langa sediu. In dreapta, un drum cu doua sensuri
// coboara intr-un pasaj pe sub bulevard.
// Scenarii alese la intamplare (fara repetare imediata): clientul vine din stanga / din dreapta / cu taxiul,
// intra in birou si iese cu un coleg care ii preda masina; clientul se opreste la cei de la tigara si ei ii
// dau masina; doi colegi pleaca cu o masina sa o predea si se intorc cu alta; o zi obisnuita. Masina
// clientului iese pe bulevard din prima sau se chinuie cand e aglomerat; apoi se intoarce o masina predata
// mai demult (cu o urma de tamponare) si clientul ei pleaca multumit. Clientii vin tristi (bula albastra). La tigara stau 1–2 sau 3–4 colegi.
// Interactiuni: click pe o masina = deblocare (avarii de 2 ori, faruri, doua claxoane scurte); masina de langa
// cursor isi aprinde usor farurile; fiecare tasta din parola = o masina clipeste o data (incuiere).
// Cu animatiile oprite: parcarea statica; click-ul tot deblocheaza (lumini, fara miscare).

type Vec = { x: number; y: number }
type CulId = 'H1' | 'H2' | 'V1' | 'V2' // culoarele parcarii

interface Loc {
  x: number
  y: number
  h: number // directia botului masinii parcate (radiani; 0 = spre dreapta, PI/2 = in jos)
  cul?: CulId // culoarul pe care se iese / se intra (fara = nu se misca, ex. masina piezisa)
  rezervat?: boolean // o masina e pe drum spre locul acesta
  invers?: boolean // parcata cu spatele (botul spre culoar)
}

interface Masina {
  x: number
  y: number
  h: number
  culoare: string
  vizibila: boolean
  avariiPana: number // momentul pana la care clipesc avariile
  avariiStart: number
  farPana: number
  farMouse: number // 0..1, farurile aprinse de apropierea cursorului
  taxi?: boolean
  pasaj?: boolean // pe drumul din dreapta (coboara / urca din pasajul de sub bulevard)
  laIntrare?: boolean // asteapta pe bulevard sa intre in parcare (nu incurca masina care iese)
  cedeaza?: boolean // sta pe loc ca sa treaca un om (omul nu o mai asteapta)
  semnal?: boolean // semnalizare dreapta (intra in parcare / iese in bulevard)
  loc?: Loc | null // locul in care e parcata (null = in miscare)
  ocupata?: boolean // folosita intr-un scenariu
}

interface Om {
  x: number
  y: number
  h: number
  tricou: string
  angajat: boolean
  vizibil: boolean
  dispozitie: 0 | 1 | 2 // 0 = fara bula, 1 = suparat, 2 = fericit
  merge: boolean
  alpha: number
  tigara?: boolean
  pufStart?: number
  ocupat?: boolean // condus de un scenariu (nu sta la tigara)
  spot?: number // locul de pe platforma de fumat
  fata?: boolean // colegele care ies uneori la tigara
  panaLa?: number // cand intra inapoi de la tigara
  rezervat?: boolean // asteptat de un scenariu (nu intra inca)
  par?: string
}

interface Trafic {
  m: Masina
  banda: 0 | 1
  v: number
  vmax: number
}

// Pasii din coada unui actor (om sau masina)
type Pas =
  | { k: 'mergi'; pts: Vec[]; d?: Drum }
  | { k: 'stai'; s: number; h?: number }
  | { k: 'apare'; a: 0 | 1 }
  | { k: 'cand'; f: () => boolean }
  | { k: 'fa'; f: () => void }
  | { k: 'conduce'; pts: Vec[] | ((p: Vec) => Vec[]); v: number; spate?: boolean | (() => boolean); mod?: 'lin' | 'acc' | 'fran' | 'ease'; d?: Drum }

interface Actor {
  om?: Om
  m?: Masina
  coada: Pas[]
  t: number
  asteapta?: number // cat a stat masina dupa un om din cale
}

const CULORI = ['#e5e7eb', '#94a3b8', '#3b82f6', '#7c3aed', '#0ea5e9', '#334155', '#10b981', '#cbd5e1', '#1d4ed8', '#a855f7', '#dc2626', '#f8fafc']
const TRICOURI_CLIENT = ['#334155', '#1e3a5f', '#7f1d1d', '#365314', '#4c1d95', '#78350f', '#0f766e']

// ---- drum: lista de puncte, cu lungimi cumulate ----
interface Drum {
  pts: Vec[]
  cum: number[]
  total: number
}
function drum(pts: Vec[]): Drum {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return { pts, cum, total: cum[cum.length - 1] }
}
function arc(c: Vec, r: number, a0: number, a1: number, n = 14): Vec[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }
  })
}
function peDrum(d: Drum, s: number): { p: Vec; dir: number } {
  if (d.pts.length < 2) return { p: d.pts[0], dir: 0 }
  const t = Math.max(0, Math.min(d.total, s))
  let i = 1
  while (i < d.cum.length - 1 && d.cum[i] < t) i++
  // segmentele de lungime 0 nu dau directie: cautam urmatorul segment real
  let j = i
  while (j < d.pts.length - 1 && d.cum[j] - d.cum[j - 1] < 0.01) j++
  const a = d.pts[i - 1]
  const b = d.pts[i]
  const seg = d.cum[i] - d.cum[i - 1] || 1
  const k = (t - d.cum[i - 1]) / seg
  const da = d.pts[j - 1]
  const db = d.pts[j]
  return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: Math.atan2(db.y - da.y, db.x - da.x) }
}
// drum cu colturile rotunjite (pentru turele prin parcare)
function colturi(pts: Vec[], r: number): Vec[] {
  const out: Vec[] = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const c = pts[i + 1]
    const l1 = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const l2 = Math.hypot(c.x - b.x, c.y - b.y) || 1
    const rr = Math.min(r, l1 / 2, l2 / 2)
    const p1 = { x: b.x + ((a.x - b.x) / l1) * rr, y: b.y + ((a.y - b.y) / l1) * rr }
    const p2 = { x: b.x + ((c.x - b.x) / l2) * rr, y: b.y + ((c.y - b.y) / l2) * rr }
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      out.push({
        x: (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * b.x + t * t * p2.x,
        y: (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * b.y + t * t * p2.y,
      })
    }
  }
  out.push(pts[pts.length - 1])
  return out
}
// culoare mai deschisa (k > 0) sau mai inchisa (k < 0)
function nuanta(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}
// imparte un drum in doua la distanta s (de la inceput)
function taie(pts: Vec[], s: number): [Vec[], Vec[]] {
  const d = drum(pts)
  if (s <= 0) return [[pts[0]], pts]
  if (s >= d.total) return [pts, [pts[pts.length - 1]]]
  let i = 1
  while (i < d.cum.length - 1 && d.cum[i] < s) i++
  const a = pts[i - 1]
  const b = pts[i]
  const k = (s - d.cum[i - 1]) / (d.cum[i] - d.cum[i - 1] || 1)
  const m = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
  return [[...pts.slice(0, i), m], [m, ...pts.slice(i)]]
}
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const intre = (a: number, b: number) => a + Math.random() * (b - a)
const unul = <T,>(v: readonly T[]): T => v[Math.floor(Math.random() * v.length)]

// doua claxoane scurte la deblocare (generate, fara fisiere audio): doua tonuri ca la un claxon de masina
let audio: AudioContext | null = null
function claxon() {
  try {
    audio ??= new AudioContext()
    const t0 = audio.currentTime + 0.01
    for (const off of [0, 0.24]) {
      const f = audio.createBiquadFilter()
      f.type = 'lowpass'
      f.frequency.value = 1900
      const g = audio.createGain()
      g.gain.setValueAtTime(0, t0 + off)
      g.gain.linearRampToValueAtTime(0.07, t0 + off + 0.012)
      g.gain.setValueAtTime(0.07, t0 + off + 0.12)
      g.gain.linearRampToValueAtTime(0, t0 + off + 0.15)
      f.connect(g).connect(audio.destination)
      for (const hz of [415, 523]) {
        const o = audio.createOscillator()
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(hz, t0 + off)
        o.connect(f)
        o.start(t0 + off)
        o.stop(t0 + off + 0.16)
      }
    }
  } catch {
    /* fara sunet daca browserul nu permite */
  }
}

export function ParcareLogin({ taste }: { taste: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fara = usePrefersReducedMotion()
  const tasteRef = useRef(taste)
  const clipesteRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (taste > tasteRef.current) clipesteRef.current?.()
    tasteRef.current = taste
  }, [taste])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const fundal = document.createElement('canvas')
    const fctx = fundal.getContext('2d')!

    let W = 0
    let H = 0
    let dpr = 1
    let U = 44 // lungimea unei masini
    // geometria locului (vezi construieste)
    let yTrot = 0 // marginea de sus a trotuarului
    let trotH = 0
    let yBul0 = 0 // marginea de sus a bulevardului
    let bulH = 0
    let benzi: [number, number] = [0, 0] // y-ul celor doua benzi (0 = langa trotuar)
    let drum0 = 0 // drumul din dreapta (coboara in pasajul de sub bulevard): marginea din stanga
    let drumW = 0
    let lot = { x: 0, y: 0, w: 0, h: 0 } // parcarea de pamant
    let copaciH = 0 // fasia cu copaci din capatul parcarii
    let yUp = 0 // culoarul de sus (sub masinile din capat)
    let xRA = 0 // culoarul din dreapta (langa masinile de pe dreapta)
    let xA = 0 // iesirea din parcare spre bulevard (stanga jos, intre platforma de fumat si randul de jos)
    let yL2 = 0 // culoarul de jos (intre masinile din mijloc si cele de langa trotuar)
    let sediu = { x: 0, y: 0, w: 0, h: 0, usaX: 0 }
    let plat = { x: 0, y: 0, w: 0, h: 0 } // platforma de beton (locul de fumat)
    let locuri: Loc[] = []
    let masini: Masina[] = []
    let trafic: Trafic[] = []
    let actori: Actor[] = [] // actorii activitatii in constructie
    let activitati: { actori: Actor[] }[] = [] // ce se intampla acum (mai multe deodata)
    let lacat: Actor | null = null // masina care manevreaza acum prin parcare
    let iesiri = 0 // masini cu oameni in ele care vor sa iasa (au prioritate fata de cele care intra)
    let poarta: Actor | null = null // masina de pe aleea de iesire / de la marginea bulevardului
    let faza: 'normal' | 'golire' | 'umplere' = 'normal' // uneori pleaca aproape toate masinile
    let tFaza = 180
    let fundalActori: Actor[] = [] // masini de pe strada cu sens unic (independente de scenariu)
    let fumatori: Om[] = []
    let oameni: Om[] = [] // toti oamenii de desenat
    let fum: { x: number; y: number; vx: number; vy: number; r: number; a: number; v: number }[] = []
    let chei: { de: Om; la: Om; t0: number }[] = []
    let S = new Set<string>() // semnalele activitatii in constructie
    let aglomeratPana = 0
    let tSpawn = 1
    let tStrada = 4
    let tFumat = 6 // cand mai iese cineva la tigara
    let tActiv = 0.6
    const mouse = { x: -999, y: -999 }
    let raf = 0
    let acumCurent = performance.now()

    const vOm = () => U * 1.05 // viteza de mers a oamenilor (px/s)
    const ySw = () => yTrot + trotH * 0.5 // mijlocul trotuarului
    // formularul de login (dreapta pe desktop, centru pe telefon) nu trebuie sa ascunda povestea
    const ascunsDeFormular = (x: number, y: number) => {
      const r = document.querySelector('form')?.getBoundingClientRect()
      if (!r) return false
      return x > r.left - U * 0.6 && x < r.right + U * 0.6 && y > r.top - U * 0.6 && y < r.bottom + U * 0.6
    }

    const masinaNoua = (x: number, y: number, h: number, culoare = unul(CULORI)): Masina => ({
      x,
      y,
      h,
      culoare,
      vizibila: true,
      avariiPana: 0,
      avariiStart: 0,
      farPana: 0,
      farMouse: 0,
      loc: null,
    })
    const omNou = (tricou: string, angajat: boolean): Om => ({
      x: -50,
      y: 0,
      h: 0,
      tricou,
      angajat,
      vizibil: false,
      dispozitie: 0,
      merge: false,
      alpha: 0,
    })

    function construieste() {
      dpr = Math.min(2.5, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      for (const c of [canvas!, fundal]) {
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      bulH = Math.max(H * 0.15, 70)
      trotH = Math.max(H * 0.065, 26)
      yBul0 = H - bulH
      yTrot = yBul0 - trotH
      benzi = [yBul0 + bulH * 0.29, yBul0 + bulH * 0.71]
      drumW = Math.max(W * 0.12, 70)
      drum0 = W - drumW
      const sw = Math.max(W * 0.2, 110)
      copaciH = H * 0.1
      lot = { x: sw + 14, y: copaciH + 6, w: 0, h: 0 }
      lot.w = drum0 - W * 0.02 - lot.x
      lot.h = yTrot - 4 - lot.y
      // scara: o masina ~ 1/7 din latimea parcarii (ca in poza de sus a locului)
      U = Math.max(26, Math.min(lot.w * 0.14, lot.h * 0.17))
      const oy = Math.max(copaciH * 0.4, yTrot - U * 6.5)
      sediu = { x: 0, y: oy, w: sw, h: yTrot - oy, usaX: sw * 0.8 }
      plat = { x: lot.x + lot.w * 0.005, y: lot.y + lot.h * 0.75, w: lot.w * 0.12, h: lot.h * 0.23 }
      xA = lot.x + lot.w * 0.225
      yL2 = lot.y + lot.h * 0.66
      yUp = lot.y + lot.h * 0.25
      xRA = lot.x + lot.w * 0.72

      // cum se parcheaza de obicei, cand parcarea e aproape plina (dupa poza utilizatorului)
      locuri = []
      const loc = (fx: number, fy: number, h: number, cul: CulId) => locuri.push({ x: lot.x + fx * lot.w, y: lot.y + fy * lot.h, h, cul })
      for (const fx of [0.24, 0.34, 0.56, 0.66, 0.94]) loc(fx, 0.1, -Math.PI / 2, 'H2') // in capat, spre copaci
      for (const fy of [0.31, 0.42, 0.53]) loc(0.08, fy, Math.PI, 'V1') // langa sediu, deasupra platformei
      for (const fx of [0.41, 0.5, 0.6]) loc(fx, 0.42, -Math.PI / 2, 'H1') // in mijloc
      for (const fy of [0.34, 0.46, 0.58]) loc(0.86, fy, 0, 'V2') // pe dreapta
      locuri.push({ x: lot.x + 0.85 * lot.w, y: lot.y + 0.8 * lot.h, h: 0.65 }) // pieziș, in coltul din dreapta jos
      for (const fx of [0.33, 0.45, 0.56, 0.68]) loc(fx, 0.88, Math.PI / 2, 'H1') // langa trotuar

      // parcata cu botul sau cu spatele (la intamplare), dar asa incat sa iasa direct spre iesire, fara roata
      const directe: Record<CulId, number> = { H1: 2, H2: 3, V1: 2, V2: 3 }
      for (const l of locuri) {
        if (!l.cul) continue
        const hNas = l.h
        const optiuni = Math.random() < 0.4 ? [true, false] : [false, true]
        let ales: boolean | null = null
        for (const inv of optiuni) {
          l.invers = inv
          const d = alegeD(l, true)
          if (d && noduri(l.cul, d).length <= directe[l.cul] && drumIntrare(l)) {
            ales = inv
            break
          }
        }
        // altfel: macar sa poata iesi (locul poate ramane doar pentru plecari)
        if (ales === null)
          for (const cere of [true, false])
            for (const inv of optiuni) {
              l.invers = inv
              if (ales === null && drumIesire(l) && (!cere || drumIntrare(l))) ales = inv
            }
        l.invers = ales ?? false
        l.h = l.invers ? hNas + Math.PI : hNas
      }
      masini = []
      for (const l of locuri) {
        if (Math.random() < 0.18) continue
        const m = masinaNoua(l.x, l.y, l.h)
        m.loc = l
        masini.push(m)
      }
      trafic = []
      actori = []
      activitati = []
      lacat = null
      poarta = null
      iesiri = 0
      faza = 'normal'
      tFaza = intre(120, 240)
      fundalActori = []
      fum = []
      chei = []
      S = new Set()
      fumatori = []
      const nf = Math.random() < 0.25 ? 0 : Math.random() < 0.3 ? 3 : 1 + Math.floor(Math.random() * 2)
      for (let i = 0; i < nf; i++) {
        const o = omNou('#f8fafc', true)
        const p = locFumat(i)
        o.x = p.x
        o.y = p.y
        o.vizibil = true
        o.alpha = 1
        o.tigara = true
        o.pufStart = performance.now() + Math.random() * 3000
        o.spot = i
        o.panaLa = performance.now() + intre(15000, 70000)
        fumatori.push(o)
      }
      oameni = [...fumatori]
      tActiv = 0.6
      deseneazaFundal()
    }

    // cele 4 locuri de pe platforma de fumat
    function locFumat(i: number): Vec {
      const f = [
        [0.3, 0.22],
        [0.72, 0.4],
        [0.3, 0.6],
        [0.7, 0.8],
      ][i % 4]
      return { x: plat.x + plat.w * f[0], y: plat.y + plat.h * f[1] }
    }

    // ---- strat static: copaci, parcarea de pamant, drumul cu pasaj, bulevardul, trotuarul, sediul ----
    function deseneazaFundal() {
      const c = fctx
      c.clearRect(0, 0, W, H)
      c.fillStyle = 'rgba(12,18,34,0.55)'
      c.fillRect(0, 0, W, H)
      // blocul de deasupra sediului
      if (sediu.y > U * 0.6) cladireVecina(c, -U * 0.3, -U * 0.3, sediu.w + U * 0.3, sediu.y - U * 0.15 + U * 0.3)
      // parcarea: asfalt, fara marcaje (se vad doar masinile parcate)
      c.fillStyle = 'rgba(15,22,40,.6)'
      c.beginPath()
      c.roundRect(lot.x, lot.y, lot.w, yTrot - lot.y, 6)
      c.fill()
      // iarba: fasie jos, spre trotuar, si intre parcare si drum
      c.fillStyle = 'rgba(34,74,44,.75)'
      c.fillRect(lot.x + lot.w * 0.27, yTrot - U * 0.12, lot.w * 0.62, U * 0.12)
      c.fillStyle = '#1d3a26'
      c.fillRect(lot.x + lot.w, lot.y, drum0 - lot.x - lot.w, yTrot - lot.y)
      // trotuarul alb de-a lungul peretelui sediului
      c.fillStyle = 'rgba(203,213,225,.28)'
      c.fillRect(sediu.w, sediu.y, lot.x - sediu.w, yTrot - sediu.y)
      // copacii din capat (coroane vazute de sus) + gardul jos
      c.fillStyle = '#4b5563'
      c.fillRect(lot.x, lot.y - 5, drum0 - lot.x, 4)
      for (let x = lot.x - U * 0.2; x < drum0 + U * 0.2; x += U * intre(0.7, 1.1)) {
        const y = copaciH * intre(0.2, 0.55)
        const r = U * intre(0.55, 0.9)
        const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
        g.addColorStop(0, '#2f5a3a')
        g.addColorStop(1, '#13291b')
        c.fillStyle = g
        c.beginPath()
        c.arc(x, y, r, 0, Math.PI * 2)
        c.fill()
      }
      // drumul din dreapta: doua sensuri, coboara in pasajul de pe sub bulevard; intrarea in pasaj e putin
      // deasupra trotuarului, iar trotuarul trece peste el cu o trecere de pietoni
      const yP = yPasaj()
      c.fillStyle = 'rgba(30,38,58,.92)'
      c.fillRect(drum0, 0, drumW, yP)
      c.strokeStyle = 'rgba(226,232,240,.45)'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(drum0 + drumW / 2, 0)
      c.lineTo(drum0 + drumW / 2, yP)
      c.stroke()
      rampa(c)
      c.strokeStyle = '#64748b'
      c.lineWidth = 3
      c.beginPath()
      c.moveTo(drum0, yP - U * 2.5)
      c.lineTo(drum0, yP)
      c.moveTo(W - 1.5, yP - U * 2.5)
      c.lineTo(W - 1.5, yP)
      c.stroke()
      // placa de deasupra pasajului, cu parapet
      c.fillStyle = '#334155'
      c.fillRect(drum0, yP, drumW, yTrot - yP)
      c.fillStyle = '#64748b'
      c.fillRect(drum0, yP - 2, drumW, 4)
      // bulevardul (doua benzi, spre stanga) — trece peste pasaj
      c.fillStyle = 'rgba(26,33,52,.97)'
      c.fillRect(0, yBul0, W, bulH)
      c.strokeStyle = 'rgba(226,232,240,.35)'
      c.lineWidth = 2
      c.setLineDash([U * 0.7, U * 0.55])
      c.beginPath()
      c.moveTo(0, yBul0 + bulH / 2)
      c.lineTo(W, yBul0 + bulH / 2)
      c.stroke()
      c.setLineDash([])
      // trotuarul, cu dale
      c.fillStyle = 'rgba(71,85,105,.5)'
      c.fillRect(0, yTrot, drum0, trotH)
      c.strokeStyle = 'rgba(148,163,184,.12)'
      c.lineWidth = 1
      for (let x = 0; x < drum0; x += U * 0.62) {
        c.beginPath()
        c.moveTo(x, yTrot)
        c.lineTo(x, yBul0)
        c.stroke()
      }
      // trecerea de pietoni peste drumul din dreapta (in continuarea trotuarului)
      c.fillStyle = 'rgba(30,38,58,.95)'
      c.fillRect(drum0, yTrot, drumW, trotH)
      c.fillStyle = 'rgba(226,232,240,.55)'
      for (let x = drum0 + U * 0.12; x < W - U * 0.1; x += U * 0.42) c.fillRect(x, yTrot + trotH * 0.1, U * 0.22, trotH * 0.8)
      // bordura (coborata la iesirea din parcare)
      c.strokeStyle = 'rgba(203,213,225,.55)'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, yBul0)
      c.lineTo(xA - U * 0.9, yBul0)
      c.moveTo(xA + U * 0.9, yBul0)
      c.lineTo(W, yBul0)
      c.stroke()
      c.fillStyle = 'rgba(30,38,58,.7)'
      c.fillRect(xA - U * 0.9, yTrot, U * 1.8, trotH)
      deseneazaPlatforma(c)
      deseneazaSediu(c)
    }

    // rampa pasajului: drumul se intuneca spre intrarea pe sub bulevard (si peste masinile care intra)
    const yPasaj = () => yTrot - U * 0.35 // gura pasajului (deasupra trotuarului)
    function rampa(c: CanvasRenderingContext2D) {
      const yP = yPasaj()
      const y0 = yP - U * 2.5
      const g = c.createLinearGradient(0, y0, 0, yP)
      g.addColorStop(0, 'rgba(2,4,10,0)')
      g.addColorStop(1, 'rgba(2,4,10,.92)')
      c.fillStyle = g
      c.fillRect(drum0, y0, drumW, yP - y0)
    }

    // acoperis de bloc vecin (doar sugerat): parapet, cateva aparate de aer conditionat
    function cladireVecina(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
      if (w <= 0 || h <= 0) return
      c.fillStyle = '#121a2b'
      c.fillRect(x, y, w, h)
      c.strokeStyle = '#2a3654'
      c.lineWidth = 3
      c.strokeRect(x + 2, y + 2, w - 4, h - 4)
      c.fillStyle = '#334155'
      for (let ax = x + U * 0.8; ax < x + w - U; ax += U * 3.1) {
        if (h > U * 0.9) c.fillRect(ax, y + h - U * 0.75, U * 0.5, U * 0.32)
      }
    }

    // platforma de beton unde se fumeaza: dale, scrumiera, o banca
    function deseneazaPlatforma(c: CanvasRenderingContext2D) {
      const { x, y, w, h } = plat
      c.fillStyle = 'rgba(0,0,0,.35)'
      c.fillRect(x + 3, y + 4, w, h)
      c.fillStyle = '#3b4658'
      c.fillRect(x, y, w, h)
      c.strokeStyle = 'rgba(203,213,225,.45)'
      c.lineWidth = 1.5
      c.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5)
      c.strokeStyle = 'rgba(15,23,42,.35)'
      c.lineWidth = 1
      for (let yy = y + U * 0.5; yy < y + h; yy += U * 0.5) {
        c.beginPath()
        c.moveTo(x, yy)
        c.lineTo(x + w, yy)
        c.stroke()
      }
      // scrumiera (cos cu capac)
      c.fillStyle = '#1f2937'
      c.beginPath()
      c.arc(x + w - U * 0.2, y + U * 0.2, U * 0.13, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = '#94a3b8'
      c.stroke()
      // banca lipita de peretele sediului
      c.fillStyle = '#5b4636'
      c.fillRect(x + U * 0.06, y + h * 0.3, U * 0.16, h * 0.45)
    }

    // Sediul Autonom vazut de sus: acoperis cu parapet, luminator, aparate de aer conditionat, numele
    // pe acoperis cu dunga in culorile logo-ului, intrare cu copertina spre trotuar, ferestre luminate.
    function deseneazaSediu(c: CanvasRenderingContext2D) {
      const { x, y, w, h, usaX } = sediu
      c.fillStyle = 'rgba(0,0,0,.45)'
      c.beginPath()
      c.roundRect(x + 7, y + 9, w, h, 10)
      c.fill()
      c.fillStyle = '#1b2438'
      c.beginPath()
      c.roundRect(x, y, w, h, 10)
      c.fill()
      c.strokeStyle = '#3a4a6e'
      c.lineWidth = 3
      c.beginPath()
      c.roundRect(x + 2.5, y + 2.5, w - 5, h - 5, 8)
      c.stroke()
      c.fillStyle = '#141c2e'
      c.fillRect(x + 7, y + 7, w - 14, h - 14)
      // luminator (sticla)
      const lx = x + 12
      const ly = y + 12
      const lw = w - 24 - U * 0.9
      const lh = Math.min(h * 0.32, U * 1.6)
      const g = c.createLinearGradient(lx, ly, lx + lw, ly + lh)
      g.addColorStop(0, 'rgba(96,165,250,.45)')
      g.addColorStop(1, 'rgba(124,58,237,.3)')
      c.fillStyle = g
      c.fillRect(lx, ly, lw, lh)
      c.strokeStyle = 'rgba(191,219,254,.35)'
      c.lineWidth = 1
      for (let i = 1; i < 4; i++) {
        c.beginPath()
        c.moveTo(lx + (lw * i) / 4, ly)
        c.lineTo(lx + (lw * i) / 4, ly + lh)
        c.stroke()
      }
      c.beginPath()
      c.moveTo(lx, ly + lh / 2)
      c.lineTo(lx + lw, ly + lh / 2)
      c.stroke()
      // aparate de aer conditionat
      for (const [ax, ay] of [
        [x + w - U * 0.8, y + 12],
        [x + w - U * 0.8, y + 12 + U * 0.5],
      ]) {
        c.fillStyle = '#475569'
        c.fillRect(ax, ay, U * 0.62, U * 0.38)
        c.fillStyle = '#1f2937'
        c.beginPath()
        c.arc(ax + U * 0.2, ay + U * 0.19, U * 0.13, 0, Math.PI * 2)
        c.arc(ax + U * 0.44, ay + U * 0.19, U * 0.13, 0, Math.PI * 2)
        c.fill()
      }
      // numele pe acoperis + dunga logo
      const tx = x + w / 2
      const ty = Math.max(ly + lh + U * 0.6, y + h * 0.62)
      c.fillStyle = '#f8fafc'
      c.font = `800 ${Math.round(U * 0.32)}px 'Plus Jakarta Sans Variable', system-ui, sans-serif`
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('AUTONOM', tx, ty)
      const sl = U * 1.4
      const dg = c.createLinearGradient(tx - sl / 2, 0, tx + sl / 2, 0)
      dg.addColorStop(0, '#00A848')
      dg.addColorStop(0.5, '#0060F0')
      dg.addColorStop(1, '#6000C0')
      c.fillStyle = dg
      c.fillRect(tx - sl / 2, ty + U * 0.26, sl, 3)
      // ferestre (vitrina) luminate pe fata dinspre trotuar
      c.fillStyle = 'rgba(253,230,138,.55)'
      for (let wx = x + 14; wx < x + w - 14; wx += U * 0.42) {
        if (Math.abs(wx - usaX) < U * 0.6) continue
        c.fillRect(wx, y + h - 4, U * 0.24, 3)
      }
      // intrare cu copertina, pe trotuar
      c.fillStyle = 'rgba(96,165,250,.35)'
      c.strokeStyle = 'rgba(147,197,253,.7)'
      c.lineWidth = 1.5
      c.beginPath()
      c.roundRect(usaX - U * 0.5, y + h - 2, U, U * 0.3, 4)
      c.fill()
      c.stroke()
      c.fillStyle = '#0b1222'
      c.fillRect(usaX - U * 0.16, y + h - 3, U * 0.32, 4)
    }

    // ---- desen masina, vazuta de sus: caroserie cu bot rotunjit, bari, roti, geamuri cu reflexii, faruri, semnalizare ----
    function deseneazaMasina(m: Masina, acum: number) {
      if (!m.vizibila) return
      const L = U
      const w = U * 0.48
      const far = Math.max(acum < m.farPana ? 1 : 0, m.farMouse, m.loc ? 0 : 0.55)
      if (far > 0.02) {
        // lumina se opreste in peretele sediului si in copacii din capat: doar pe parcare, drum, trotuar, bulevard
        ctx!.save()
        ctx!.beginPath()
        ctx!.rect(sediu.w, lot.y, W - sediu.w, H - lot.y)
        ctx!.rect(0, yTrot, sediu.w, H - yTrot)
        ctx!.rect(drum0, 0, drumW, lot.y)
        ctx!.clip()
        ctx!.translate(m.x, m.y)
        ctx!.rotate(m.h)
        const g = ctx!.createRadialGradient(L * 0.5, 0, 2, L * 0.5, 0, L * 1.5)
        g.addColorStop(0, `rgba(255,248,220,${0.32 * far})`)
        g.addColorStop(1, 'rgba(255,248,220,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.moveTo(L * 0.46, -w * 0.38)
        ctx!.lineTo(L * 1.9, -w * 1.3)
        ctx!.lineTo(L * 1.9, w * 1.3)
        ctx!.lineTo(L * 0.46, w * 0.38)
        ctx!.closePath()
        ctx!.fill()
        ctx!.restore()
      }
      const c = ctx!
      c.save()
      c.translate(m.x, m.y)
      c.rotate(m.h)
      const raze: [number, number, number, number] = [w * 0.3, w * 0.44, w * 0.44, w * 0.3] // spate stanga, fata stanga, fata dreapta, spate dreapta
      // umbra moale
      c.fillStyle = 'rgba(0,0,0,.22)'
      c.beginPath()
      c.roundRect(-L / 2 + 1, -w / 2 + 1, L + 3, w + 4, raze)
      c.fill()
      c.fillStyle = 'rgba(0,0,0,.3)'
      c.beginPath()
      c.roundRect(-L / 2 + 2, -w / 2 + 2.5, L, w, raze)
      c.fill()
      // roti
      c.fillStyle = '#05070d'
      for (const rx of [L * 0.3, -L * 0.29])
        for (const sy of [-1, 1]) {
          c.beginPath()
          c.roundRect(rx - L * 0.09, sy > 0 ? w * 0.39 : -w * 0.55, L * 0.18, w * 0.16, 2.5)
          c.fill()
        }
      // caroserie cu volum
      const gc = c.createLinearGradient(0, -w / 2, 0, w / 2)
      gc.addColorStop(0, nuanta(m.culoare, -0.42))
      gc.addColorStop(0.16, nuanta(m.culoare, -0.05))
      gc.addColorStop(0.42, nuanta(m.culoare, 0.18))
      gc.addColorStop(0.58, nuanta(m.culoare, 0.18))
      gc.addColorStop(0.84, nuanta(m.culoare, -0.05))
      gc.addColorStop(1, nuanta(m.culoare, -0.42))
      c.fillStyle = gc
      c.beginPath()
      c.roundRect(-L / 2, -w / 2, L, w, raze)
      c.fill()
      c.strokeStyle = 'rgba(0,0,0,.45)'
      c.lineWidth = 0.8
      c.stroke()
      // bari fata/spate
      c.fillStyle = 'rgba(15,23,42,.55)'
      c.beginPath()
      c.roundRect(L * 0.47, -w * 0.36, L * 0.035, w * 0.72, 2)
      c.roundRect(-L * 0.505, -w * 0.34, L * 0.035, w * 0.68, 2)
      c.fill()
      // capota (nervuri), portbagaj, usi, manere
      c.strokeStyle = 'rgba(0,0,0,.22)'
      c.lineWidth = 0.7
      c.beginPath()
      c.moveTo(L * 0.34, -w * 0.38)
      c.quadraticCurveTo(L * 0.39, 0, L * 0.34, w * 0.38)
      c.moveTo(L * 0.44, -w * 0.18)
      c.lineTo(L * 0.34, -w * 0.12)
      c.moveTo(L * 0.44, w * 0.18)
      c.lineTo(L * 0.34, w * 0.12)
      c.moveTo(-L * 0.41, -w * 0.36)
      c.quadraticCurveTo(-L * 0.45, 0, -L * 0.41, w * 0.36)
      for (const ux of [L * 0.04, -L * 0.17]) {
        c.moveTo(ux, -w * 0.5)
        c.lineTo(ux, -w * 0.39)
        c.moveTo(ux, w * 0.5)
        c.lineTo(ux, w * 0.39)
      }
      c.stroke()
      c.strokeStyle = 'rgba(255,255,255,.35)'
      c.beginPath()
      for (const ux of [L * 0.0, -L * 0.21]) {
        c.moveTo(ux, -w * 0.48)
        c.lineTo(ux - L * 0.03, -w * 0.48)
        c.moveTo(ux, w * 0.48)
        c.lineTo(ux - L * 0.03, w * 0.48)
      }
      c.stroke()
      // geamuri cu reflexii
      const gg = c.createLinearGradient(L * 0.3, -w * 0.4, L * 0.15, w * 0.4)
      gg.addColorStop(0, '#1e3a5f')
      gg.addColorStop(0.5, '#0b1222')
      gg.addColorStop(1, '#16253f')
      c.fillStyle = gg
      c.beginPath()
      c.moveTo(L * 0.16, -w * 0.39)
      c.quadraticCurveTo(L * 0.25, -w * 0.4, L * 0.31, -w * 0.31)
      c.lineTo(L * 0.31, w * 0.31)
      c.quadraticCurveTo(L * 0.25, w * 0.4, L * 0.16, w * 0.39)
      c.closePath()
      c.fill()
      c.beginPath()
      c.moveTo(-L * 0.29, -w * 0.36)
      c.quadraticCurveTo(-L * 0.36, -w * 0.34, -L * 0.385, -w * 0.27)
      c.lineTo(-L * 0.385, w * 0.27)
      c.quadraticCurveTo(-L * 0.36, w * 0.34, -L * 0.29, w * 0.36)
      c.closePath()
      c.fill()
      c.fillStyle = 'rgba(15,23,42,.75)'
      c.beginPath()
      c.roundRect(-L * 0.27, -w * 0.43, L * 0.42, w * 0.075, 1.5)
      c.roundRect(-L * 0.27, w * 0.355, L * 0.42, w * 0.075, 1.5)
      c.fill()
      // plafon
      const gp = c.createLinearGradient(0, -w * 0.34, 0, w * 0.34)
      gp.addColorStop(0, nuanta(m.culoare, -0.08))
      gp.addColorStop(0.5, nuanta(m.culoare, 0.12))
      gp.addColorStop(1, nuanta(m.culoare, -0.08))
      c.fillStyle = gp
      c.beginPath()
      c.roundRect(-L * 0.28, -w * 0.34, L * 0.44, w * 0.68, 3)
      c.fill()
      c.fillStyle = 'rgba(255,255,255,.13)'
      c.beginPath()
      c.roundRect(-L * 0.24, -w * 0.29, L * 0.34, w * 0.13, 2)
      c.fill()
      // reflexii pe parbriz si luneta
      c.strokeStyle = 'rgba(255,255,255,.3)'
      c.lineWidth = 1
      c.beginPath()
      c.moveTo(L * 0.2, -w * 0.3)
      c.lineTo(L * 0.28, -w * 0.08)
      c.moveTo(-L * 0.33, w * 0.05)
      c.lineTo(-L * 0.36, w * 0.2)
      c.stroke()
      if (m.taxi) {
        // lampa TAXI pe plafon + dunga in carouri
        c.fillStyle = '#111827'
        c.fillRect(-L * 0.1, -w * 0.22, L * 0.14, w * 0.44)
        c.fillStyle = '#fde047'
        c.fillRect(-L * 0.08, -w * 0.18, L * 0.1, w * 0.36)
        c.fillStyle = '#111827'
        for (let i = 0; i < 6; i++) c.fillRect(-L * 0.26 + i * L * 0.07, (i % 2 ? 1 : -1) * w * 0.46 - w * 0.02, L * 0.035, w * 0.04)
      }
      // oglinzi
      c.fillStyle = nuanta(m.culoare, -0.25)
      c.beginPath()
      c.roundRect(L * 0.1, -w * 0.66, L * 0.08, w * 0.17, 2)
      c.roundRect(L * 0.1, w * 0.49, L * 0.08, w * 0.17, 2)
      c.fill()
      c.fillStyle = 'rgba(148,163,184,.6)'
      c.fillRect(L * 0.115, -w * 0.64, L * 0.02, w * 0.12)
      c.fillRect(L * 0.115, w * 0.52, L * 0.02, w * 0.12)
      // faruri cu lumina de zi, numere, stopuri
      c.fillStyle = far > 0.02 ? '#fffbe6' : 'rgba(226,232,240,.75)'
      c.beginPath()
      c.roundRect(L * 0.43, -w * 0.42, L * 0.07, w * 0.17, [1, 4, 4, 1])
      c.roundRect(L * 0.43, w * 0.25, L * 0.07, w * 0.17, [1, 4, 4, 1])
      c.fill()
      c.strokeStyle = 'rgba(191,219,254,.8)'
      c.lineWidth = 0.9
      c.beginPath()
      c.moveTo(L * 0.44, -w * 0.25)
      c.lineTo(L * 0.47, -w * 0.18)
      c.moveTo(L * 0.44, w * 0.25)
      c.lineTo(L * 0.47, w * 0.18)
      c.stroke()
      c.fillStyle = '#e5e7eb'
      c.fillRect(L * 0.49, -w * 0.11, L * 0.018, w * 0.22)
      c.fillRect(-L * 0.508, -w * 0.11, L * 0.018, w * 0.22)
      c.fillStyle = m.loc ? 'rgba(220,38,38,.8)' : 'rgba(248,80,80,1)'
      c.beginPath()
      c.roundRect(-L * 0.5, -w * 0.42, L * 0.05, w * 0.16, [3, 1, 1, 3])
      c.roundRect(-L * 0.5, w * 0.26, L * 0.05, w * 0.16, [3, 1, 1, 3])
      c.fill()
      const lumina = (px: number, py: number, r: number) => {
        const g = c.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, 'rgba(255,190,80,.95)')
        g.addColorStop(0.35, 'rgba(251,146,60,.55)')
        g.addColorStop(1, 'rgba(251,146,60,0)')
        c.fillStyle = g
        c.beginPath()
        c.arc(px, py, r, 0, Math.PI * 2)
        c.fill()
      }
      // avarii (toate colturile)
      if (acum < m.avariiPana && Math.floor((acum - m.avariiStart) / 160) % 2 === 0)
        for (const [px, py] of [
          [L * 0.47, -w * 0.47],
          [L * 0.47, w * 0.47],
          [-L * 0.47, -w * 0.47],
          [-L * 0.47, w * 0.47],
        ])
          lumina(px, py, U * 0.28)
      // semnalizare dreapta (partea dreapta a masinii = +y in sistemul ei)
      if (m.semnal && Math.floor(acum / 380) % 2 === 0) {
        lumina(L * 0.47, w * 0.47, U * 0.22)
        lumina(-L * 0.47, w * 0.47, U * 0.22)
      }
      c.restore()
    }

    // ---- desen om, vazut de sus: umeri, brate cu maneci, picioare cu pantofi, cap cu par ----
    function deseneazaOm(o: Om, acum: number) {
      if (!o.vizibil || o.alpha <= 0.01) return
      const s = (U / 46) * 1.35
      const c = ctx!
      c.save()
      c.globalAlpha = o.alpha
      c.translate(o.x, o.y)
      c.rotate(o.h)
      const leg = o.merge ? Math.sin(acum / 150) : 0
      const piele = '#e8c4a0'
      // umbra
      c.fillStyle = 'rgba(0,0,0,.28)'
      c.beginPath()
      c.ellipse(1.2 * s, 1.6 * s, 6.4 * s, 9.6 * s, 0, 0, Math.PI * 2)
      c.fill()
      // picioare (pantaloni) si pantofi
      for (const sy of [-1, 1]) {
        const px = 3.4 * s * leg * -sy
        c.fillStyle = o.angajat ? '#1f2a44' : '#27272a'
        c.beginPath()
        c.ellipse(px * 0.55, sy * 3 * s, 3.1 * s, 2.2 * s, 0, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = '#0b0f19'
        c.beginPath()
        c.ellipse(px + 2.6 * s, sy * 3 * s, 1.9 * s, 1.5 * s, 0, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = 'rgba(255,255,255,.18)'
        c.beginPath()
        c.ellipse(px + 3.2 * s, sy * 3 * s - 0.4 * s, 0.7 * s, 0.4 * s, 0, 0, Math.PI * 2)
        c.fill()
      }
      // bratele (balans opus picioarelor); fumatorul isi duce mana la gura
      const puf = !!o.tigara && !o.merge && o.pufStart !== undefined && acum > o.pufStart && acum < o.pufStart + 1400
      for (const sy of [-1, 1]) {
        const ax = 2.8 * s * leg * sy
        const ridicat = sy > 0 && o.tigara && !o.merge
        const mx = ridicat ? (puf ? 5.6 * s : 3.8 * s) : ax + 1.6 * s
        const my = ridicat ? (puf ? 2.8 * s : 7.2 * s) : sy * 7.8 * s
        // antebrat (piele) de la maneca la mana
        c.strokeStyle = piele
        c.lineWidth = 2.2 * s
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(ax * 0.4, sy * 7.2 * s)
        c.lineTo(mx, my)
        c.stroke()
        c.fillStyle = nuanta(o.tricou, -0.06)
        c.beginPath()
        c.ellipse(ax * 0.4, sy * 7.1 * s, 2.4 * s, 2 * s, 0, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = piele
        c.beginPath()
        c.arc(mx, my, 1.35 * s, 0, Math.PI * 2)
        c.fill()
      }
      // trunchi: umeri cu volum
      const gt = c.createLinearGradient(0, -8 * s, 0, 8 * s)
      gt.addColorStop(0, nuanta(o.tricou, -0.22))
      gt.addColorStop(0.5, nuanta(o.tricou, 0.06))
      gt.addColorStop(1, nuanta(o.tricou, -0.22))
      c.fillStyle = gt
      c.beginPath()
      c.roundRect(-3.6 * s, -7.8 * s, 7.2 * s, 15.6 * s, [3 * s, 3.8 * s, 3.8 * s, 3 * s])
      c.fill()
      c.strokeStyle = 'rgba(0,0,0,.25)'
      c.lineWidth = 0.6
      c.stroke()
      if (o.angajat) {
        // dungile cu culorile logo-ului pe umeri (verde, albastru, mov)
        ;['#00A848', '#0060F0', '#6000C0'].forEach((cl, i) => {
          c.fillStyle = cl
          c.fillRect(-2.7 * s + i * 1.6 * s, -6.8 * s, 1.15 * s, 13.6 * s)
        })
      }
      // guler
      c.fillStyle = nuanta(o.tricou, -0.3)
      c.beginPath()
      c.ellipse(1.6 * s, 0, 1.3 * s, 3 * s, 0, 0, Math.PI * 2)
      c.fill()
      if (o.tigara && !o.merge) {
        // tigara in mana dreapta, cu jarul aprins
        const tx = puf ? 6.6 * s : 4.8 * s
        const ty = puf ? 2.8 * s : 7.2 * s
        c.strokeStyle = '#f1f5f9'
        c.lineWidth = 1.1 * s
        c.lineCap = 'butt'
        c.beginPath()
        c.moveTo(tx, ty)
        c.lineTo(tx + 3 * s, ty)
        c.stroke()
        c.fillStyle = puf ? '#fb923c' : '#f97316'
        c.shadowColor = 'rgba(251,146,60,.9)'
        c.shadowBlur = puf ? 8 : 4
        c.beginPath()
        c.arc(tx + 3.4 * s, ty, 1 * s, 0, Math.PI * 2)
        c.fill()
        c.shadowBlur = 0
      }
      // cap: urechi, fata (spre fata), par cu luciu
      c.fillStyle = piele
      c.beginPath()
      c.ellipse(0.4 * s, -3.9 * s, 0.9 * s, 1.2 * s, 0, 0, Math.PI * 2)
      c.ellipse(0.4 * s, 3.9 * s, 0.9 * s, 1.2 * s, 0, 0, Math.PI * 2)
      c.fill()
      c.beginPath()
      c.arc(0.7 * s, 0, 3.9 * s, 0, Math.PI * 2)
      c.fill()
      const par = o.par ?? (o.angajat ? '#3f2a1d' : '#1f2937')
      const gh = c.createRadialGradient(-1.2 * s, -1.2 * s, 0.3 * s, -0.5 * s, 0, 5 * s)
      gh.addColorStop(0, nuanta(par, 0.3))
      gh.addColorStop(1, par)
      c.fillStyle = gh
      if (o.fata) {
        // par lung, prins in coada la spate
        c.beginPath()
        c.ellipse(-0.6 * s, 0, 4.3 * s, 4.7 * s, 0, Math.PI * 0.36, Math.PI * 1.64)
        c.fill()
        c.beginPath()
        c.ellipse(-5.9 * s, 0, 3.3 * s, 2.1 * s, 0, 0, Math.PI * 2)
        c.fill()
        c.strokeStyle = nuanta(par, -0.3)
        c.lineWidth = 0.6
        c.beginPath()
        c.moveTo(-3.6 * s, 0)
        c.lineTo(-8.6 * s, 0)
        c.stroke()
      } else {
        c.beginPath()
        c.ellipse(-0.4 * s, 0, 3.6 * s, 3.9 * s, 0, 0, Math.PI * 2)
        c.fill()
      }
      c.restore()
      if (o.dispozitie) {
        const bx = o.x + 10 * s
        const by = o.y - 18 * s
        const r = 9 * s
        ctx!.save()
        ctx!.globalAlpha = o.alpha
        ctx!.fillStyle = o.dispozitie === 1 ? '#60a5fa' : '#22c55e'
        ctx!.shadowColor = o.dispozitie === 1 ? 'rgba(96,165,250,.7)' : 'rgba(34,197,94,.7)'
        ctx!.shadowBlur = 8
        ctx!.beginPath()
        ctx!.arc(bx, by, r, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.shadowBlur = 0
        ctx!.strokeStyle = '#0b1222'
        ctx!.fillStyle = '#0b1222'
        ctx!.lineWidth = 1.4 * s
        ctx!.lineCap = 'round'
        ctx!.beginPath()
        ctx!.arc(bx - 3 * s, by - 1.5 * s, 1.1 * s, 0, Math.PI * 2)
        ctx!.arc(bx + 3 * s, by - 1.5 * s, 1.1 * s, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.beginPath()
        if (o.dispozitie === 1) {
          // sprancene ridicate la mijloc (trist), gura in jos
          ctx!.moveTo(bx - 5 * s, by - 3.5 * s)
          ctx!.lineTo(bx - 1.5 * s, by - 5 * s)
          ctx!.moveTo(bx + 5 * s, by - 3.5 * s)
          ctx!.lineTo(bx + 1.5 * s, by - 5 * s)
          ctx!.moveTo(bx - 3.5 * s, by + 4.5 * s)
          ctx!.quadraticCurveTo(bx, by + 1.5 * s, bx + 3.5 * s, by + 4.5 * s)
        } else {
          ctx!.moveTo(bx - 4 * s, by + 1.5 * s)
          ctx!.quadraticCurveTo(bx, by + 6 * s, bx + 4 * s, by + 1.5 * s)
        }
        ctx!.stroke()
        if (o.dispozitie === 1) {
          // o lacrima
          ctx!.fillStyle = '#e0f2fe'
          ctx!.beginPath()
          ctx!.ellipse(bx - 3 * s, by + 1.5 * s, 0.9 * s, 1.5 * s, 0, 0, Math.PI * 2)
          ctx!.fill()
        }
        ctx!.restore()
      }
    }

    // cheia zboara de la angajat la client
    function deseneazaCheie(acum: number) {
      chei = chei.filter((c) => acum - c.t0 < 1100)
      for (const c of chei) deseneazaOCheie(c, acum)
    }
    function deseneazaOCheie(cheie: { de: Om; la: Om; t0: number }, acum: number) {
      const k = (acum - cheie.t0) / 1100
      const e = easeInOut(Math.max(0, k))
      const x = lerp(cheie.de.x, cheie.la.x, e)
      const y = lerp(cheie.de.y, cheie.la.y, e) - Math.sin(e * Math.PI) * U * 0.6
      const s = U / 46
      ctx!.save()
      ctx!.translate(x, y)
      ctx!.shadowColor = 'rgba(96,165,250,.9)'
      ctx!.shadowBlur = 10
      ctx!.fillStyle = '#e2e8f0'
      ctx!.beginPath()
      ctx!.roundRect(-4 * s, -6 * s, 8 * s, 9 * s, 3 * s)
      ctx!.fill()
      ctx!.fillRect(-1 * s, 3 * s, 2 * s, 7 * s)
      ctx!.fillStyle = '#0060F0'
      ctx!.beginPath()
      ctx!.arc(0, -2 * s, 1.6 * s, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.restore()
    }

    // fumul de tigara: pufuri care urca, se umfla si se sting
    function actualizeazaFum(dt: number, acum: number) {
      for (const o of fumatori) {
        if (!o.vizibil || o.merge || o.ocupat) continue
        if (o.pufStart === undefined || acum > o.pufStart + 1400 + 2500) o.pufStart = acum + intre(500, 3000)
        const dupa = acum - (o.pufStart + 1400)
        if (dupa > 0 && dupa < 900 && Math.random() < dt * 22)
          fum.push({ x: o.x + intre(-3, 3), y: o.y - U * 0.1, vx: intre(-6, 10), vy: -intre(8, 16), r: U * 0.07, a: 0.32, v: 0 })
        else if (Math.random() < dt * 1.5) fum.push({ x: o.x + U * 0.15, y: o.y + U * 0.05, vx: intre(-3, 5), vy: -intre(5, 9), r: U * 0.04, a: 0.18, v: 0 })
      }
      for (const p of fum) {
        p.v += dt
        p.x += (p.vx + Math.sin(p.v * 2.3 + p.y) * 4) * dt
        p.y += p.vy * dt
        p.r += U * 0.1 * dt
        p.a -= dt * 0.13
      }
      fum = fum.filter((p) => p.a > 0)
    }
    function deseneazaFum() {
      for (const p of fum) {
        ctx!.fillStyle = `rgba(226,232,240,${p.a})`
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    // ---- motorul scenariilor: fiecare actor isi executa coada de pasi ----
    // un om in calea masinii (in parcare / pe trotuar): masina asteapta
    // ce e in calea masinii: alta masina (oriunde) sau un om (in parcare / pe trotuar) -> masina asteapta
    function blocat(m: Masina, spate: boolean): Om | Masina | null {
      if (m.pasaj) return null
      const h = spate ? m.h + Math.PI : m.h
      const cx = Math.cos(h)
      const cy = Math.sin(h)
      for (const o of [...trafic.map((t) => t.m), ...masini]) {
        if (o === m || !o.vizibila || o.pasaj || o.loc) continue
        const dx = o.x - m.x
        const dy = o.y - m.y
        const f = dx * cx + dy * cy
        if (f > U * 0.3 && f < U * 1.5 && Math.abs(dy * cx - dx * cy) < U * 0.5) return o
      }
      if (m.y > yBul0 + U * 0.1) return null
      for (const o of oameni) {
        if (!o.vizibil || o.alpha < 0.6) continue
        const dx = o.x - m.x
        const dy = o.y - m.y
        const f = dx * cx + dy * cy
        if (f > U * 0.25 && f < U * 1.2 && Math.abs(dy * cx - dx * cy) < U * 0.38) return o
      }
      return null
    }
    // omul nu intra in masini: asteapta masina care trece / iese de pe trotuar (nu si pe cea care il asteapta pe el)
    function omBlocat(q: Vec): Masina | null {
      for (const m of masini) {
        if (!m.vizibila || m.loc || m.pasaj || m.cedeaza || m.y > yBul0 + U * 0.3) continue
        const c = Math.cos(-m.h)
        const sn = Math.sin(-m.h)
        const lx = (q.x - m.x) * c - (q.y - m.y) * sn
        const ly = (q.x - m.x) * sn + (q.y - m.y) * c
        if (Math.abs(lx) < U * 0.68 && Math.abs(ly) < U * 0.42) return m
      }
      return null
    }
    // ocolirea unei masini oprite in drum: prin spatele ei, pe partea dinspre parcare (niciodata prin bulevard),
    // apoi omul isi continua drumul de dupa masina
    function ocolire(m: Masina, cur: Vec, d: Drum, s: number): Vec[] {
      const rest = taie(d.pts, s)[1]
      const c = Math.cos(m.h)
      const sn = Math.sin(m.h)
      const hl = U * 0.8
      const hw = U * 0.55
      const colt = (lx: number, ly: number): Vec => ({ x: m.x + lx * c - ly * sn, y: m.y + lx * sn + ly * c })
      const cs = [colt(hl, hw), colt(hl, -hw), colt(-hl, hw), colt(-hl, -hw)].sort((a, b) => a.y - b.y).slice(0, 2)
      cs.sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y))
      // se reia drumul din punctul care il duce cel mai repede la destinatie (fara intoarceri)
      const dr = drum(rest)
      let best = rest.length - 1
      let bd = Infinity
      for (let i = 1; i < rest.length; i++) {
        const dd = Math.hypot(rest[i].x - cs[1].x, rest[i].y - cs[1].y) + (dr.total - dr.cum[i])
        if (dd < bd) {
          bd = dd
          best = i
        }
      }
      return [cur, cs[0], cs[1], ...rest.slice(best)]
    }
    function ruleaza(a: Actor, dt: number) {
      for (let n = 0; n < 10 && a.coada.length; n++) {
        const p = a.coada[0]
        a.t += dt
        let gata = false
        switch (p.k) {
          case 'mergi': {
            const o = a.om!
            p.d ??= drum(colturi([{ x: o.x, y: o.y }, ...p.pts], U * 0.45))
            const s = a.t * vOm()
            const { p: q, dir } = peDrum(p.d, s)
            const bl = a.t > dt && s < p.d.total ? omBlocat(q) : null
            if (bl) {
              a.t -= dt
              o.merge = false
              a.asteapta = (a.asteapta ?? 0) + dt
              if (a.asteapta > 0.6) {
                // masina sta pe loc (ex. asteapta sa intre in trafic): omul o ocoleste prin parcare
                p.d = drum(ocolire(bl, { x: o.x, y: o.y }, p.d, a.t * vOm()))
                a.t = 0
                a.asteapta = 0
              }
              return
            }
            a.asteapta = 0
            o.x = q.x
            o.y = q.y
            if (p.d.total > 0.5) o.h = dir
            o.merge = s < p.d.total
            gata = s >= p.d.total
            break
          }
          case 'stai':
            if (a.om) {
              a.om.merge = false
              if (p.h !== undefined) a.om.h = p.h
            }
            gata = a.t >= p.s
            break
          case 'apare': {
            const o = a.om
            if (o) {
              o.vizibil = true
              o.merge = false
              o.alpha = p.a ? Math.min(1, a.t / 0.3) : Math.max(0, 1 - a.t / 0.3)
              gata = a.t >= 0.3
              if (gata && !p.a) o.vizibil = false
            } else gata = true
            break
          }
          case 'cand':
            if (a.om) a.om.merge = false
            gata = p.f()
            break
          case 'fa':
            p.f()
            gata = true
            break
          case 'conduce': {
            const m = a.m!
            p.d ??= drum(typeof p.pts === 'function' ? p.pts({ x: m.x, y: m.y }) : p.pts)
            const spate = typeof p.spate === 'function' ? p.spate() : !!p.spate
            const ob = a.t > dt ? blocat(m, spate) : null
            m.cedeaza = !!ob && !('culoare' in ob)
            if (ob) {
              a.t -= dt
              a.asteapta = (a.asteapta ?? 0) + dt
              const om = 'culoare' in ob ? null : ob
              if (om && a.asteapta > 1.2 && !om.merge) {
                // omul care sta pe loc in calea masinii se da putin la o parte
                const h = spate ? m.h + Math.PI : m.h
                const lat = (om.y - m.y) * Math.cos(h) - (om.x - m.x) * Math.sin(h)
                const sgn = lat >= 0 ? 1 : -1
                om.x += -Math.sin(h) * sgn * U * 1.2 * dt
                om.y += Math.cos(h) * sgn * U * 1.2 * dt
              }
              return
            }
            a.asteapta = 0
            const dur = Math.max(0.05, p.d.total / p.v)
            const u = Math.min(1, a.t / dur)
            const e = p.mod === 'lin' ? u : p.mod === 'acc' ? u * u : p.mod === 'fran' ? 1 - (1 - u) * (1 - u) : easeInOut(u)
            const { p: q, dir } = peDrum(p.d, p.d.total * e)
            m.x = q.x
            m.y = q.y
            m.h = spate ? dir + Math.PI : dir
            gata = u >= 1
            break
          }
        }
        if (!gata) return
        a.coada.shift()
        a.t = 0
        dt = 0
      }
    }
    const fa = (f: () => void): Pas => ({ k: 'fa', f })
    const stai = (s: number, h?: number): Pas => ({ k: 'stai', s, h })
    const mergi = (...pts: Vec[]): Pas => ({ k: 'mergi', pts })
    const apare = (a: 0 | 1): Pas => ({ k: 'apare', a })
    const cand = (f: () => boolean): Pas => ({ k: 'cand', f })
    const sem = (n: string) => {
      const s0 = S
      return fa(() => s0.add(n))
    }
    const pana = (n: string) => {
      const s0 = S
      return cand(() => s0.has(n))
    }
    const pune = (o: Om, p: Vec) => fa(() => {
      o.x = p.x
      o.y = p.y
    })
    // pts poate fi o functie: drumul se calculeaza abia cand incepe pasul (pleaca de unde e masina atunci)
    const conduce = (pts: Vec[] | ((p: Vec) => Vec[]), v: number, mod: 'lin' | 'acc' | 'fran' | 'ease' = 'ease', spate = false): Pas => ({
      k: 'conduce',
      pts,
      v,
      mod,
      spate,
    })

    // ---- trafic ----
    const vehicule = () => [...trafic.map((t) => t.m), ...masini.filter((m) => m.vizibila && !m.loc && !m.pasaj)]
    // banda e libera in jurul lui x0 (masinile vin din dreapta: „inapoi" = cat de departe in dreapta)
    function liber(banda: 0 | 1, x0: number, inainte: number, inapoi: number, fara?: Masina, iesire = false) {
      const y = benzi[banda]
      return !vehicule().some((m) => m !== fara && !(iesire && m.laIntrare) && Math.abs(m.y - y) < tolBanda() && m.x > x0 - inainte && m.x < x0 + inapoi)
    }
    // cat de aproape de mijlocul benzii trebuie sa fie o masina ca sa conteze pe banda aceea
    const tolBanda = () => Math.min(U * 0.45, bulH * 0.26)
    function laTrafic(m: Masina) {
      masini = masini.filter((x) => x !== m)
      m.loc = null
      m.ocupata = false
      trafic.push({ m, banda: 0, v: U * 2.6, vmax: U * intre(3, 3.6) })
    }
    function actualizeazaTrafic(dt: number, acum: number) {
      tSpawn -= dt
      if (tSpawn <= 0) {
        const agl = acum < aglomeratPana
        const banda: 0 | 1 = agl ? (Math.random() < 0.8 ? 0 : 1) : Math.random() < 0.5 ? 0 : 1
        if (liber(banda, W + U, U * 2.4, U * 2)) {
          const vmax = U * intre(3, 3.8)
          trafic.push({ m: masinaNoua(W + U * 1.2, benzi[banda], Math.PI), banda, v: vmax, vmax })
        }
        tSpawn = agl ? intre(0.6, 1.2) : intre(2.2, 5.5)
      }
      const toate = vehicule()
      const tol = tolBanda()
      const inFata = (c: Trafic, y: number) => {
        let gap = Infinity
        for (const o of toate) {
          if (o === c.m || Math.abs(o.y - y) > tol || o.x >= c.m.x) continue
          gap = Math.min(gap, c.m.x - o.x)
        }
        return gap
      }
      for (const c of trafic) {
        let gap = inFata(c, benzi[c.banda])
        // depasire: pe banda de langa trotuar, cine ajunge din urma o masina lenta sau oprita (taxi, cineva
        // care intra in parcare) trece pe banda 2 daca e libera
        if (c.banda === 0 && gap < U * 4 && c.v > U * 0.8 && liber(1, c.m.x, U * 2.5, U * 3.5, c.m)) {
          c.banda = 1
          gap = inFata(c, benzi[1])
        }
        const tinta = c.vmax * Math.max(0, Math.min(1, (gap - U * 1.35) / (U * 2.2)))
        c.v = tinta < c.v ? Math.max(tinta, c.v - U * 12 * dt) : Math.min(tinta, c.v + U * 3 * dt)
        const dx = c.v * dt
        const ty = benzi[c.banda]
        // schimbarea benzii e lina: deplasarea laterala e legata de viteza (fara sa para ca se intoarce)
        const dy = Math.sign(ty - c.m.y) * Math.min(Math.abs(ty - c.m.y), Math.max(0, c.v) * 0.3 * dt)
        c.m.x -= dx
        c.m.y += dy
        c.m.h = Math.PI + (dx > 0.01 ? Math.atan2(-dy, dx) : 0)
      }
      trafic = trafic.filter((c) => c.m.x > -U * 2)
    }

    // ---- culoarele parcarii (o retea: jos H1, sus H2, stanga V1 = aleea de iesire, dreapta V2) ----
    const R = () => U * 0.8 // raza de viraj in parcare
    const R2 = () => U * 0.8 // raza de viraj spre/din bulevard
    const yMarg = () => yBul0 - U * 0.55 // botul la marginea bulevardului
    interface Cul {
      h: boolean // orizontal
      a: number // pozitia culoarului (y daca e orizontal, x daca e vertical)
      min: number
      max: number
    }
    function culoar(id: CulId): Cul {
      if (id === 'H1') return { h: true, a: yL2, min: xA, max: lot.x + lot.w * 0.84 }
      if (id === 'H2') return { h: true, a: yUp, min: xA, max: lot.x + lot.w * 0.99 }
      if (id === 'V1') return { h: false, a: xA, min: yUp, max: yL2 }
      return { h: false, a: xRA, min: yUp, max: yL2 }
    }
    // nodurile prin care se ajunge la iesire (ultimul = botul la marginea bulevardului), mergand in directia D
    function noduri(id: CulId, D: 1 | -1): Vec[] {
      const A = { x: xA, y: yL2 }
      const E = { x: xA, y: yMarg() }
      const TL = { x: xA, y: yUp }
      const TR = { x: xRA, y: yUp }
      const BR = { x: xRA, y: yL2 }
      if (id === 'H1') return D < 0 ? [A, E] : [BR, TR, TL, A, E]
      if (id === 'H2') return D < 0 ? [TL, A, E] : [TR, BR, A, E]
      if (id === 'V1') return D > 0 ? [A, E] : [TL, TR, BR, A, E]
      return D > 0 ? [BR, A, E] : [TR, TL, A, E]
    }
    const uv = (c: Cul, p: Vec) => (c.h ? { u: p.x, v: p.y } : { u: p.y, v: p.x })
    const xy = (c: Cul, u: number, v: number): Vec => (c.h ? { x: u, y: v } : { x: v, y: u })
    function arcUV(c: Cul, cu: number, cv: number, r: number, a0: number, a1: number): Vec[] {
      let d = a1 - a0
      while (d > Math.PI) d -= 2 * Math.PI
      while (d <= -Math.PI) d += 2 * Math.PI
      return Array.from({ length: 13 }, (_, i) => {
        const a = a0 + (d * i) / 12
        return xy(c, cu + Math.cos(a) * r, cv + Math.sin(a) * r)
      })
    }
    // din loc pana pe culoar, cu botul in directia D: cu spatele (inainte = false) sau cu botul inainte
    function manevra(l: Loc, c: Cul, D: 1 | -1, inainte: boolean): Vec[] {
      const r = R()
      const { u: lu, v: lv } = uv(c, l)
      const s = Math.sign(lv - c.a)
      const cu = inainte ? lu + D * r : lu - D * r
      return [xy(c, lu, lv), xy(c, lu, c.a + s * r), ...arcUV(c, cu, c.a + s * r, r, Math.atan2(0, lu - cu), Math.atan2(-s * r, 0))]
    }
    // directia in care se poate pleca (iesire) / din care se poate veni (intrare), pe drumul cel mai scurt
    function alegeD(l: Loc, iesire: boolean): 1 | -1 | 0 {
      const c = culoar(l.cul!)
      const lu = uv(c, l).u
      const inainte = iesire ? !!l.invers : !l.invers
      let best: 1 | -1 | 0 = 0
      let bestN = 99
      for (const D of [-1, 1] as const) {
        const Pu = lu + (inainte ? D : -D) * R()
        if (Pu < c.min + U * 0.25 || Pu > c.max - U * 0.25) continue
        const nd = noduri(l.cul!, D)
        const f = c.h ? nd[0].x : nd[0].y
        if ((f - Pu) * D < U * 0.3) continue
        if (nd.length < bestN) {
          best = D
          bestN = nd.length
        }
      }
      return best
    }
    function drumIesire(l: Loc) {
      if (!l.cul) return null
      const D = alegeD(l, true)
      if (!D) return null
      const man = manevra(l, culoar(l.cul), D, !!l.invers)
      return { man, spate: !l.invers, ruta: colturi([man[man.length - 1], ...noduri(l.cul, D)], U * 1.05) }
    }
    // de pe bulevard (dinspre dreapta) pe aleea de iesire, in sus
    function intrareDinBulevard(): Vec[] {
      const r2 = R2()
      const y = benzi[0]
      return [{ x: W + U * 1.5, y }, { x: xA + r2, y }, ...arc({ x: xA + r2, y: y - r2 }, r2, Math.PI / 2, Math.PI)]
    }
    // pe bulevard pana aproape de intrarea in parcare (acolo asteapta, daca alta masina manevreaza)
    const laIntrare = (): Vec => ({ x: xA + R2() + U * 0.25, y: benzi[0] })
    const inainteDeIntrare = (): Vec => ({ x: xA + R2() + U * 3, y: benzi[0] })
    const pePanaLaIntrare = (): Vec[] => [{ x: W + U * 1.5, y: benzi[0] }, inainteDeIntrare()]
    function drumIntrare(l: Loc) {
      if (!l.cul) return null
      const D = alegeD(l, false)
      if (!D) return null
      const man = manevra(l, culoar(l.cul), D, !l.invers).reverse()
      const nd = noduri(l.cul, D).slice(0, -1).reverse()
      const ruta = [...intrareDinBulevard(), ...colturi([{ x: xA, y: benzi[0] - R2() }, ...nd, man[0]], U * 1.05)]
      return { ruta, man, spate: !!l.invers }
    }
    // virajul spre bulevard porneste de unde e masina (niciodata inapoi spre parcare, oricat de mare e ecranul)
    function inBulevard(p: Vec): Vec[] {
      const y = benzi[0]
      if (y - p.y < U * 0.2) return [p, { x: p.x - U * 0.8, y }] // e deja aproape pe banda
      const r = Math.min(R2(), y - p.y)
      const start = p.y < y - r - 0.5 ? [p, { x: p.x, y: y - r }] : [{ x: p.x, y: y - r }]
      return [...start, ...arc({ x: p.x - r, y: y - r }, r, 0, Math.PI / 2), { x: p.x - r - U * 0.4, y }]
    }

    // ---- pe unde merg oamenii in parcare (pe langa culoare, nu prin masini) ----
    const xP = () => plat.x + plat.w + U * 0.2 // culoarul oamenilor: pe langa marginea din dreapta a platformei
    const xJ = () => xA + U * 0.75 // de partea cealalta a aleii de iesire
    const xWr = () => xRA - U * 0.5
    const yWj = () => yL2 + U * 0.55
    const yWs = () => yUp + U * 0.25
    function langaMasina(l: Loc, px: number): Vec {
      const c = culoar(l.cul!)
      const { u, v } = uv(c, l)
      const s = Math.sign(v - c.a)
      return xy(c, u + px, c.a + s * U * (l.cul === 'H1' ? 0.5 : 0.4))
    }
    function laMasina(l: Loc, dx: number, px: number): Vec[] {
      const T = langaMasina(l, px)
      const x0 = xP() - Math.abs(dx) * 0.5
      const urc = [{ x: x0, y: ySw() }, { x: x0, y: yWj() + dx * 0.5 }]
      if (l.cul === 'H2') return [...urc, { x: xJ(), y: yWj() }, { x: xJ(), y: yWs() }, { x: T.x, y: yWs() }, T]
      if (l.cul === 'V2') return [...urc, { x: xJ(), y: yWj() }, { x: xWr(), y: yWj() }, { x: xWr(), y: T.y }, T]
      if (l.cul === 'V1') return [...urc, { x: T.x, y: Math.min(yWj(), T.y + U * 0.6) }, T]
      return [...urc, T]
    }
    const dinMasina = (l: Loc, dx: number): Vec[] => laMasina(l, dx, 0).reverse().slice(1)
    const usaIn = (): Vec => ({ x: sediu.usaX, y: yTrot - U * 0.15 })
    const usaAfara = (): Vec => ({ x: sediu.usaX, y: ySw() })
    const subPlatforma = (): Vec => ({ x: plat.x + plat.w * 0.6, y: yTrot + trotH * 0.3 })
    const pePlatforma = (): Vec => ({ x: plat.x + plat.w * 0.6, y: plat.y + plat.h - U * 0.12 })
    function deblocheaza(m: Masina, ori = 4) {
      const acum = performance.now()
      m.avariiStart = acum
      m.avariiPana = acum + ori * 160
      if (ori > 2) m.farPana = acum + 2600
    }

    // ---- o singura masina se misca prin parcare odata (fara accidente) ----
    const iaLacat = (a: Actor): Pas[] => [cand(() => !lacat || lacat === a), fa(() => (lacat = a))]
    const lasaLacat = (a: Actor) =>
      fa(() => {
        if (lacat === a) lacat = null
      })
    // aleea de iesire si marginea bulevardului: tot o singura masina (se ia dupa lacat, niciodata invers)
    const iaPoarta = (a: Actor): Pas[] => [cand(() => !poarta || poarta === a), fa(() => (poarta = a))]
    const lasaPoarta = (a: Actor) =>
      fa(() => {
        if (poarta === a) poarta = null
      })
    // ultima bucata dintr-un drum care se termina la marginea bulevardului: de la ~o masina inainte de aleea de iesire
    const panaLaAlee = (pts: Vec[]) => taie(pts, drum(pts).total - (yMarg() - yL2) - U)

    // ---- alegeri ----
    const liberLoc = (l: Loc) => !!l.cul && !l.rezervat && !masini.some((q) => q.loc === l)
    function alegeMasina(): Masina | null {
      const toate = masini.filter((m) => m.loc?.cul && m.vizibila && !m.ocupata && drumIesire(m.loc))
      const vizibile = toate.filter((m) => !ascunsDeFormular(m.x, m.y))
      const din = vizibile.length ? vizibile : toate
      return din.length ? unul(din) : null
    }
    function alegeLocLiber(): Loc | null {
      const toate = locuri.filter((l) => liberLoc(l) && drumIntrare(l))
      const vizibile = toate.filter((l) => !ascunsDeFormular(l.x, l.y))
      const din = vizibile.length ? vizibile : toate
      return din.length ? unul(din) : null
    }

    // ---- la tigara: colegii ies si intra independent de rest; fetele stau cel mai putin ----
    function spotLiber(): number {
      for (let i = 0; i < 4; i++) if (!fumatori.some((o) => o.spot === i)) return i
      return 0
    }
    function vineLaTigara(o: Om, intarziere: number) {
      o.spot = spotLiber()
      o.ocupat = true
      fumatori.push(o)
      oameni.push(o)
      const p = locFumat(o.spot)
      fundalActori.push({
        om: o,
        t: 0,
        coada: [
          stai(intarziere),
          pune(o, usaIn()),
          apare(1),
          mergi(usaAfara(), subPlatforma(), pePlatforma(), p),
          fa(() => {
            o.tigara = true
            o.ocupat = false
            o.panaLa = acumCurent + (o.fata ? intre(35000, 55000) : intre(60000, 110000))
          }),
        ],
      })
    }
    function pleacaDeLaTigara(o: Om, intarziere: number) {
      fumatori = fumatori.filter((x) => x !== o)
      fundalActori.push({
        om: o,
        t: 0,
        coada: [
          stai(intarziere),
          fa(() => {
            o.ocupat = true
            o.tigara = false
          }),
          mergi(pePlatforma(), subPlatforma(), usaAfara(), usaIn()),
          apare(0),
        ],
      })
    }
    function actualizeazaFumatori(dt: number, acum: number) {
      tFumat -= dt
      if (tFumat <= 0) {
        tFumat = intre(15, 35)
        const b = fumatori.filter((o) => !o.fata).length
        const f = fumatori.some((o) => o.fata)
        const max = f ? 2 : 4
        if (!f && b >= 1 && b <= 2 && Math.random() < 0.2)
          ['#2a1a12', '#8f3f1f'].forEach((par, i) => {
            const o = omNou('#f8fafc', true)
            o.fata = true
            o.par = par
            vineLaTigara(o, i * 0.45)
          })
        else if (b < max && Math.random() < 0.6) {
          const n = Math.min(Math.random() < 0.65 ? 1 : 2, max - b)
          for (let i = 0; i < n; i++) vineLaTigara(omNou('#f8fafc', true), i * 0.6)
        }
      }
      for (const o of [...fumatori]) {
        if (o.ocupat || o.rezervat || !o.panaLa || acum < o.panaLa || !fumatori.includes(o)) continue
        if (o.fata) {
          const fete = fumatori.filter((x) => x.fata)
          if (fete.every((x) => !x.ocupat && !x.rezervat)) fete.forEach((x, i) => pleacaDeLaTigara(x, i * 0.4))
        } else pleacaDeLaTigara(o, 0)
      }
    }

    // ---- masina pleaca: iese din loc direct spre iesire; pe aleea de iesire asteapta sa fie libera, iar la
    // bulevard intra doar cand e loc (uneori se chinuie din cauza traficului) ----
    function plecare(m: Masina, chinuie: boolean, o: { urcat?: string; plecat?: string } = {}): Actor {
      const l = m.loc!
      const dr = drumIesire(l)!
      const [ruta1, ruta2] = panaLaAlee(dr.ruta)
      const a: Actor = { m, t: 0, coada: [] }
      a.coada = [
        pana(o.urcat ?? 'urcat'),
        fa(() => iesiri++),
        ...iaLacat(a),
        fa(() => (m.loc = null)),
        stai(0.4),
        // pana la marginea bulevardului; daca acolo asteapta deja una, se opreste in spatele ei pe alee
        ...(dr.spate ? [conduce(dr.man, U * 0.75, 'ease', true), conduce([...ruta1, ...ruta2.slice(1)], U * 1.9)] : [conduce([...dr.man, ...ruta1, ...ruta2.slice(1)], U * 1.8)]),
        ...iaPoarta(a),
        lasaLacat(a), // alta masina poate porni (si sa astepte in spatele ei)
        fa(() => {
          m.semnal = true
          if (chinuie) aglomeratPana = acumCurent + intre(5000, 8000)
        }),
        ...(chinuie
          ? [
              stai(1),
              conduce((p) => [p, { x: p.x, y: p.y + U * 0.12 }], U * 0.25),
              stai(1.2),
              conduce((p) => [p, { x: p.x, y: p.y + U * 0.1 }], U * 0.25),
            ]
          : []),
        cand(() => liber(0, xA, U * 3, U * 8, m, true)),
        conduce((p) => inBulevard(p), U * 1.5, 'acc'),
        lasaPoarta(a),
        fa(() => {
          m.semnal = false
          iesiri--
          laTrafic(m)
        }),
        sem(o.plecat ?? 'plecat'),
      ]
      return a
    }

    // ---- o masina vine de pe bulevard si parcheaza pe oricare loc liber; cine e in ea coboara ----
    function sosire(opt: { culoare?: string; dupa?: string; asteptare: number; coboara: (l: Loc) => Actor[] }): Actor {
      const a: Actor = { t: 0, coada: [] }
      const s0 = S
      let l: Loc | null = null
      let dr: ReturnType<typeof drumIntrare> = null
      let in1: Vec[] = []
      let in2: Vec[] = []
      a.coada = [
        ...(opt.dupa ? [pana(opt.dupa)] : []),
        stai(opt.asteptare),
        cand(() => {
          if (!l) {
            l = alegeLocLiber()
            if (l) {
              l.rezervat = true
              dr = drumIntrare(l)
              // pe aleea de iesire pana putin dupa capatul ei; restul prin parcare
              const pts = [laIntrare(), ...dr!.ruta.slice(1)] // (se porneste de unde e masina)
              const pana = drum([laIntrare(), ...intrareDinBulevard().slice(1)]).total + (benzi[0] - R2() - yL2) + U
              ;[in1, in2] = taie(pts, pana)
            }
          }
          return !!l
        }),
        cand(() => !lacat && !poarta && !masini.some((q) => q.laIntrare) && liber(0, W + U, U * 2.5, U * 3)),
        fa(() => {
          const m = masinaNoua(W + U * 1.5, benzi[0], Math.PI, opt.culoare ?? unul(CULORI))
          m.laIntrare = true
          m.ocupata = true
          masini.push(m)
          a.m = m
        }),
        conduce(pePanaLaIntrare(), U * 2.6, 'lin'),
        fa(() => (a.m!.semnal = true)),
        // daca e liber, intra direct; altfel franeaza pana la intrare si asteapta acolo
        fa(() => {
          if (iesiri === 0 && (!lacat || lacat === a) && (!poarta || poarta === a)) {
            lacat = a
            poarta = a
          }
        }),
        conduce((p) => (lacat === a && poarta === a ? [p] : [p, laIntrare()]), U * 1.3, 'fran'),
        cand(() => lacat === a || (iesiri === 0 && !lacat)),
        fa(() => (lacat = a)),
        ...iaPoarta(a),
        fa(() => (a.m!.laIntrare = false)),
        conduce((p) => [p, ...in1], U * 1.6),
        fa(() => (a.m!.semnal = false)),
        lasaPoarta(a),
        conduce(() => in2, U * 1.8),
        stai(0.2),
        { k: 'conduce', pts: () => dr!.man, v: U * 0.7, mod: 'ease', spate: () => dr!.spate },
        fa(() => {
          const m = a.m!
          m.loc = l
          m.x = l!.x
          m.y = l!.y
          m.h = l!.h
          l!.rezervat = false
          const prev = S
          S = s0
          for (const x of opt.coboara(l!)) fundalActori.push(x)
          S = prev
        }),
        lasaLacat(a),
        pana('coborat'),
        stai(1.6),
        fa(() => {
          deblocheaza(a.m!, 2) // incuiere: un clipit
          a.m!.ocupata = false
        }),
      ]
      return a
    }

    // ---- taxiul intra in parcare, lasa pasagerul pe culoar, apoi face o tura sau intoarce si iese ----
    function taxi(dupa?: string, asteptare = 0): Actor {
      const a: Actor = { t: 0, coada: [] }
      const r = R()
      const xS = xA + U * 1.6
      const A = { x: xA, y: yL2 }
      const E = { x: xA, y: yMarg() }
      const xa = xRA + r
      const intra = [laIntrare(), ...intrareDinBulevard().slice(1), ...colturi([{ x: xA, y: benzi[0] - R2() }, A, { x: xS, y: yL2 }], U * 1.05)]
      const [in1, in2] = taie(intra, drum([laIntrare(), ...intrareDinBulevard().slice(1)]).total + (benzi[0] - R2() - yL2) + U)
      const tura = Math.random() < 0.5
      const iese = tura
        ? colturi([{ x: xS, y: yL2 }, { x: xRA, y: yL2 }, { x: xRA, y: yUp }, { x: xA, y: yUp }, A, E], U * 1.05)
        : [...arc({ x: xa - 2 * r, y: yL2 - r }, r, 0, Math.PI / 2), ...colturi([{ x: xa - 2 * r, y: yL2 }, A, E], U * 1.05)]
      const [ies1, ies2] = panaLaAlee(iese)
      a.coada = [
        ...(dupa ? [pana(dupa)] : []),
        stai(asteptare),
        cand(() => !lacat && !poarta && !masini.some((q) => q.laIntrare) && liber(0, W + U, U * 2.5, U * 3)),
        fa(() => {
          const tx = masinaNoua(W + U * 1.5, benzi[0], Math.PI, '#facc15')
          tx.laIntrare = true
          tx.taxi = true
          masini.push(tx)
          a.m = tx
        }),
        conduce(pePanaLaIntrare(), U * 2.6, 'lin'),
        fa(() => (a.m!.semnal = true)),
        // daca e liber, intra direct; altfel franeaza pana la intrare si asteapta acolo
        fa(() => {
          if (iesiri === 0 && (!lacat || lacat === a) && (!poarta || poarta === a)) {
            lacat = a
            poarta = a
          }
        }),
        conduce((p) => (lacat === a && poarta === a ? [p] : [p, laIntrare()]), U * 1.3, 'fran'),
        cand(() => lacat === a || (iesiri === 0 && !lacat)),
        fa(() => (lacat = a)),
        ...iaPoarta(a),
        fa(() => (a.m!.laIntrare = false)),
        conduce((p) => [p, ...in1], U * 1.6),
        fa(() => (a.m!.semnal = false)),
        lasaPoarta(a),
        conduce(in2, U * 1.8),
        sem('taxiOprit'),
        pana('dinTaxi'),
        stai(1),
        ...(tura
          ? []
          : [
              conduce(
                [
                  { x: xS, y: yL2 },
                  { x: xa, y: yL2 },
                ],
                U * 1.6,
              ),
              conduce(arc({ x: xa, y: yL2 - r }, r, Math.PI / 2, Math.PI), U * 0.55, 'ease', true),
            ]),
        conduce([...ies1, ...ies2.slice(1)], U * 1.8),
        ...iaPoarta(a),
        lasaLacat(a),
        fa(() => (a.m!.semnal = true)),
        cand(() => liber(0, xA, U * 3, U * 8, a.m, true)),
        conduce((p) => inBulevard(p), U * 1.5, 'acc'),
        lasaPoarta(a),
        fa(() => {
          a.m!.semnal = false
          laTrafic(a.m!)
        }),
      ]
      return a
    }
    // pasagerul taxiului coboara langa el, pe partea dinspre trotuar
    const dinTaxi = (o: Om): Pas[] => [
      pana('taxiOprit'),
      pune(o, { x: xA + U * 1.5, y: yWj() }),
      apare(1),
      sem('dinTaxi'),
      mergi({ x: xP(), y: yWj() }, { x: xP(), y: ySw() }),
    ]

    // ---- oamenii ----
    // colegii ies din birou, merg la masina si urca (primul o deblocheaza); la final semnalul `semnal`
    function urca(m: Masina, cine: Om[], semnal = 'urcat'): Actor[] {
      const l = m.loc!
      const acts: Actor[] = cine.map((o, i) => ({
        om: o,
        t: 0,
        coada: [
          pune(o, usaIn()),
          stai(i * 0.6),
          apare(1),
          mergi(usaAfara(), ...laMasina(l, -i * U * 0.15, i ? U * 0.35 : -U * 0.5)),
          sem(semnal + 'L' + i),
          ...(i === 0 ? [fa(() => deblocheaza(m))] : []),
          ...cine.map((_, j) => pana(semnal + 'L' + j)),
          stai(0.8),
          apare(0),
          sem(semnal + 'U' + i),
        ],
      }))
      acts.push({ t: 0, coada: [...cine.map((_, i) => pana(semnal + 'U' + i)), sem(semnal)] })
      return acts
    }
    // se intorc pe jos (de pe trotuar, din stanga sau din dreapta) si intra in birou
    function vinPeJos(cine: Om[], dupa: string, asteptare: number): Actor[] {
      const din = Math.random() < 0.5 ? -U : W + U
      return cine.map((o, i) => ({
        om: o,
        t: 0,
        coada: [pana(dupa), stai(asteptare + i * 0.5), pune(o, { x: din, y: ySw() }), apare(1), mergi(usaAfara(), usaIn()), apare(0)],
      }))
    }
    const coboaraColegi = (n: number) => (l: Loc): Actor[] =>
      Array.from({ length: n }, (_, i) => {
        const o = omNou('#f8fafc', true)
        oameni.push(o)
        return {
          om: o,
          t: 0,
          coada: [
            pune(o, langaMasina(l, i ? U * 0.35 : -U * 0.5)),
            stai(i * 0.4),
            apare(1),
            ...(i === 0 ? [sem('coborat')] : []),
            stai(0.4),
            mergi(...dinMasina(l, -i * U * 0.15), usaAfara(), usaIn()),
            apare(0),
          ],
        }
      })
    function coboaraClient(l: Loc): Actor[] {
      const o = omNou(unul(TRICOURI_CLIENT), false)
      o.dispozitie = 2
      oameni.push(o)
      const iesire = Math.random() < 0.5 ? -U : W + U
      const E = fumatori.find((f) => !f.fata && !f.rezervat && !f.ocupat)
      if (E) {
        E.rezervat = true
        E.ocupat = true
        return [
          {
            om: o,
            t: 0,
            coada: [
              pune(o, langaMasina(l, U * 0.35)),
              apare(1),
              sem('coborat'),
              pana('Esosit'),
              stai(0.3),
              fa(() => chei.push({ de: o, la: E, t0: performance.now() })),
              stai(1.2),
              sem('predat'),
              mergi(...dinMasina(l, 0), { x: iesire, y: ySw() }),
              apare(0),
            ],
          },
          {
            om: E,
            t: 0,
            coada: [
              fa(() => (E.tigara = false)),
              mergi({ x: xP(), y: E.y }, ...laMasina(l, 0, -U * 0.5).slice(1)),
              sem('Esosit'),
              pana('predat'),
              stai(0.4),
              mergi(...dinMasina(l, 0).slice(0, -1), { x: xP(), y: locFumat(E.spot ?? 0).y }, locFumat(E.spot ?? 0)),
              fa(() => {
                E.tigara = true
                E.ocupat = false
                E.rezervat = false
                E.panaLa = Math.max(E.panaLa ?? 0, acumCurent + intre(20000, 40000))
              }),
            ],
          },
        ]
      }
      // nu e nimeni afara: intra in birou sa predea cheia, apoi pleaca
      return [
        {
          om: o,
          t: 0,
          coada: [
            pune(o, langaMasina(l, U * 0.35)),
            apare(1),
            sem('coborat'),
            stai(0.4),
            mergi(...dinMasina(l, 0), usaAfara(), usaIn()),
            apare(0),
            stai(intre(4, 8)),
            apare(1),
            mergi(usaAfara(), { x: iesire, y: ySw() }),
            apare(0),
          ],
        },
      ]
    }

    // predarea la masina: angajatul (E) si clientul (K) ajung la masina; daca cheia n-a fost data inca,
    // E i-o arunca lui K; K deblocheaza masina (avarii + faruri) si urca; E se intoarce (la birou / la tigara).
    function laMasinaPasi(m: Masina, E: Om, K: Om, cheieDeja: boolean, intoarcereE: Vec[], laTigara: boolean) {
      const l = m.loc!
      const pasiE: Pas[] = [
        sem('E'),
        pana('K'),
        stai(0.2),
        ...(cheieDeja ? [] : [fa(() => chei.push({ de: E, la: K, t0: performance.now() })), stai(1.15)]),
        sem('cheie'),
        pana('urcat'),
        stai(0.3),
        mergi(...(laTigara ? dinMasina(l, 0).slice(0, -1) : dinMasina(l, 0)), ...intoarcereE),
        ...(laTigara
          ? [
              fa(() => {
                E.tigara = true
                E.ocupat = false
                E.rezervat = false
                E.panaLa = Math.max(E.panaLa ?? 0, acumCurent + intre(20000, 40000))
              }),
            ]
          : [apare(0)]),
      ]
      const pasiK: Pas[] = [
        sem('K'),
        pana('cheie'),
        fa(() => {
          K.dispozitie = 2
          deblocheaza(m)
        }),
        stai(1),
        apare(0),
        sem('urcat'),
      ]
      return { pasiE, pasiK }
    }

    // nu e nimeni la tigara: clientul intra in birou si iese cu un coleg
    function prinBirou(m: Masina, K: Om, inainte: Pas[]): Actor[] {
      const l = m.loc!
      const E = omNou('#f8fafc', true)
      oameni.push(E)
      const t = intre(1.5, 2.5)
      const { pasiE, pasiK } = laMasinaPasi(m, E, K, false, [usaAfara(), usaIn()], false)
      return [
        {
          om: K,
          t: 0,
          coada: [...inainte, mergi(usaAfara(), usaIn()), apare(0), sem('inBirou'), stai(t + 0.45), apare(1), mergi(usaAfara(), ...laMasina(l, -U * 0.15, U * 0.35)), ...pasiK],
        },
        { om: E, t: 0, coada: [pune(E, usaIn()), pana('inBirou'), stai(t), apare(1), mergi(usaAfara(), ...laMasina(l, 0, -U * 0.5)), ...pasiE] },
      ]
    }

    // sunt colegi la tigara: unul merge in calea clientului (nu-l lasa sa ajunga in birou), ii da cheia
    // pe trotuar si il duce la masina, apoi se intoarce la tigara
    function prinTigara(m: Masina, K: Om, E: Om): Actor[] {
      const l = m.loc!
      E.rezervat = true
      const jos: Vec = { x: xA + U * 1.5, y: yWj() } // unde coboara din taxi
      const Me: Vec = { x: jos.x - U * 0.5, y: jos.y } // langa client, pe marginea culoarului (nu pe alee)
      const { pasiE, pasiK } = laMasinaPasi(m, E, K, true, [{ x: xP(), y: locFumat(E.spot ?? 0).y }, locFumat(E.spot ?? 0)], true)
      return [
        {
          om: K,
          t: 0,
          coada: [pana('taxiOprit'), pune(K, jos), apare(1), sem('dinTaxi'), sem('Ksosit'), pana('cheie0'), mergi(...laMasina(l, -U * 0.15, U * 0.35).slice(1)), ...pasiK],
        },
        {
          om: E,
          t: 0,
          coada: [
            // colegul asteapta la tigara (nu in parcare) pana coboara clientul din taxi, abia apoi merge la el
            cand(() => !E.ocupat),
            pana('Ksosit'),
            fa(() => {
              E.ocupat = true
              E.tigara = false
            }),
            mergi({ x: xP(), y: E.y }, { x: xP(), y: yWj() }, Me),
            stai(0.5, 0),
            fa(() => chei.push({ de: E, la: K, t0: performance.now() })),
            stai(1.15),
            fa(() => (K.dispozitie = 2)),
            sem('cheie0'),
            mergi(...laMasina(l, 0, -U * 0.5).slice(1)),
            ...pasiE,
          ],
        },
      ]
    }

    // ---- activitatile unei zile obisnuite (mai multe deodata) ----
    function activitateNoua(): boolean {
      S = new Set()
      actori = []
      // fazele zilei: de obicei parcarea e cam plina; uneori pleaca aproape toate masinile (raman 2–3),
      // apoi vin inapoi pe rand
      const libere = locuri.filter(liberLoc).length
      const parcate = masini.filter((m) => m.loc?.cul).length
      const total = locuri.filter((l) => l.cul).length
      if (faza === 'golire' && parcate <= 3) faza = 'umplere'
      if (faza === 'umplere' && parcate >= total * 0.8) {
        faza = 'normal'
        tFaza = intre(150, 300)
      }
      const goala = parcate < total * 0.78
      const ponderi: [string, number][] =
        faza === 'golire'
          ? [
              ['client', parcate > 3 ? 5 : 0],
              ['taxi', parcate > 3 ? 2 : 0],
              ['retur', 0],
              ['spalat', parcate > 3 ? 1 : 0],
              ['doi', parcate > 3 ? 1.5 : 0],
              ['unul', parcate > 3 ? 1.5 : 0],
              ['fiecare', parcate > 4 ? 3 : 0],
            ]
          : faza === 'umplere'
            ? [
                ['client', 0.6],
                ['taxi', 0.3],
                ['retur', libere ? 10 : 0],
                ['spalat', 0.3],
                ['doi', 0],
                ['unul', 0],
                ['fiecare', 0],
              ]
            : [
                ['client', goala ? 2 : 6],
                ['taxi', goala ? 0.8 : 2],
                ['retur', libere === 0 ? 0 : goala ? 10 : libere > 2 ? 3 : 1],
                ['spalat', 1.2],
                ['doi', goala ? 0.3 : 1],
                ['unul', goala ? 0.3 : 1],
                ['fiecare', goala ? 0 : 1.6],
              ]
      if (ponderi.every(([, w]) => w <= 0)) return false
      // cine pleaca in timpul golirii se intoarce mult mai tarziu
      const intoarcere = (a: number, b: number) => (faza === 'golire' ? intre(60, 110) : intre(a, b))
      let alege = Math.random() * ponderi.reduce((x, [, w]) => x + w, 0)
      let tip = 'client'
      for (const [n, w] of ponderi) {
        alege -= w
        if (alege <= 0) {
          tip = n
          break
        }
      }
      if (tip === 'retur') {
        // un client aduce inapoi masina primita si pleaca multumit
        if (!alegeLocLiber()) return false
        actori.push(sosire({ asteptare: 0, coboara: coboaraClient }))
      } else if (tip === 'client' || tip === 'taxi') {
        const m = alegeMasina()
        if (!m) return false
        m.ocupata = true
        const K = omNou(unul(TRICOURI_CLIENT), false)
        K.dispozitie = 1
        oameni.push(K)
        // clientul venit pe jos intra in birou; pe cel adus de taxi il intampina in parcare un coleg de la
        // tigara (doar baietii predau masini), daca e cineva afara
        const E = tip === 'taxi' ? fumatori.find((o) => !o.fata && !o.rezervat && !o.ocupat) : undefined
        if (tip === 'taxi') actori.push(taxi())
        const inainte = tip === 'taxi' ? dinTaxi(K) : [pune(K, { x: Math.random() < 0.5 ? -U : W + U, y: ySw() }), apare(1)]
        actori.push(...(E ? prinTigara(m, K, E) : prinBirou(m, K, inainte)), plecare(m, Math.random() < 0.35))
      } else {
        const m = alegeMasina()
        if (!m) return false
        m.ocupata = true
        const coleg = () => {
          const o = omNou('#f8fafc', true)
          oameni.push(o)
          return o
        }
        if (tip === 'spalat') {
          // un coleg duce masina la spalat si o aduce inapoi
          const E = coleg()
          actori.push(...urca(m, [E]), plecare(m, false), sosire({ culoare: m.culoare, dupa: 'plecat', asteptare: intoarcere(10, 18), coboara: coboaraColegi(1) }))
        } else if (tip === 'doi') {
          // doi colegi pleaca intr-o masina; se intorc cu o alta masina sau pe jos
          const E1 = coleg()
          const E2 = coleg()
          actori.push(...urca(m, [E1, E2]), plecare(m, Math.random() < 0.3))
          if (Math.random() < 0.5) actori.push(sosire({ dupa: 'plecat', asteptare: intoarcere(8, 15), coboara: coboaraColegi(2) }))
          else actori.push(...vinPeJos([E1, E2], 'plecat', intoarcere(8, 15)))
        } else if (tip === 'unul') {
          // un coleg duce masina la client; se intoarce pe jos sau cu taxiul
          const E = coleg()
          actori.push(...urca(m, [E]), plecare(m, false))
          if (Math.random() < 0.5) actori.push(...vinPeJos([E], 'plecat', intoarcere(8, 15)))
          else actori.push(taxi('plecat', intoarcere(8, 15)), { om: E, t: 0, coada: [...dinTaxi(E), mergi(usaAfara(), usaIn()), apare(0)] })
        } else {
          // colegii iau masini diferite (2–3) si pleaca pe rand; se intorc impreuna cu una singura
          const n = Math.random() < 0.35 ? 3 : 2
          const ms = [m]
          for (let i = 1; i < n; i++) {
            const mi = alegeMasina()
            if (!mi) break
            mi.ocupata = true
            ms.push(mi)
          }
          ms.forEach((mi, i) => {
            const E = coleg()
            actori.push(...urca(mi, [E], 'urcat' + i), plecare(mi, i === 0 && Math.random() < 0.3, { urcat: 'urcat' + i, plecat: 'plecat' + i }))
          })
          actori.push({ t: 0, coada: [...ms.map((_, i) => pana('plecat' + i)), sem('plecat')] })
          actori.push(sosire({ dupa: 'plecat', asteptare: intoarcere(10, 16), coboara: coboaraColegi(ms.length) }))
        }
      }
      activitati.push({ actori })
      return true
    }

    // masini pe drumul din dreapta: coboara in pasajul de sub bulevard sau ies din el
    function stradaNoua() {
      const jos = Math.random() < 0.6
      const x = drum0 + drumW * (jos ? 0.27 : 0.73)
      const y0 = jos ? -U : yPasaj() + U
      const y1 = jos ? yPasaj() + U : -U
      const a: Actor = { t: 0, coada: [] }
      a.coada = [
        fa(() => {
          const m = masinaNoua(x, y0, jos ? Math.PI / 2 : -Math.PI / 2)
          m.pasaj = true
          masini.push(m)
          a.m = m
        }),
        conduce(
          [
            { x, y: y0 },
            { x, y: y1 },
          ],
          U * 2.6,
          'lin',
        ),
        fa(() => (masini = masini.filter((q) => q !== a.m))),
      ]
      fundalActori.push(a)
    }

    let ultim = performance.now()
    function cadru(acum: number) {
      const dt = Math.min(0.05, (acum - ultim) / 1000)
      ultim = acum
      acumCurent = acum
      // o zi obisnuita: mereu cate ceva se intampla, uneori mai multe deodata
      tActiv -= dt
      tFaza -= dt
      if (faza === 'normal' && tFaza <= 0) faza = 'golire'
      if (tActiv <= 0) {
        tActiv = activitati.length < 4 && activitateNoua() ? intre(4, 8) : 1.5
      }
      for (const act of activitati) for (const a of act.actori) ruleaza(a, dt)
      for (const a of fundalActori) ruleaza(a, dt)
      fundalActori = fundalActori.filter((a) => a.coada.length)
      const inainte = activitati.length
      activitati = activitati.filter((act) => act.actori.some((a) => a.coada.length))
      if (activitati.length !== inainte || oameni.length > 40) {
        const folositi = new Set<Om>()
        for (const a of [...fundalActori, ...activitati.flatMap((x) => x.actori)]) if (a.om && a.coada.length) folositi.add(a.om)
        oameni = oameni.filter((o) => fumatori.includes(o) || folositi.has(o) || (o.vizibil && o.alpha > 0.01))
      }
      tStrada -= dt
      if (tStrada <= 0) {
        if (fundalActori.filter((a) => a.m?.pasaj).length < 3) stradaNoua()
        tStrada = intre(2.5, 7)
      }
      actualizeazaTrafic(dt, acum)
      actualizeazaFum(dt, acum)
      actualizeazaFumatori(dt, acum)
      const cx = plat.x + plat.w / 2
      const cy = plat.y + plat.h / 2
      for (const o of fumatori) if (!o.ocupat && o.vizibil) o.h = Math.atan2(cy - o.y, cx - o.x)
      // farurile masinii parcate de langa cursor (lin)
      let cea: Masina | null = null
      let dmin = U * 2.2
      for (const m of masini) {
        if (!m.loc) continue
        const d = Math.hypot(m.x - mouse.x, m.y - mouse.y)
        if (d < dmin) {
          dmin = d
          cea = m
        }
      }
      for (const m of masini) m.farMouse += ((m === cea ? 0.8 : 0) - m.farMouse) * Math.min(1, dt * 5)
      ctx!.clearRect(0, 0, W, H)
      ctx!.drawImage(fundal, 0, 0, W, H)
      for (const m of masini) if (m.loc) deseneazaMasina(m, acum)
      // masinile din pasaj: taiate la gura pasajului si intunecate pe rampa
      ctx!.save()
      ctx!.beginPath()
      ctx!.rect(0, 0, W, yPasaj() - 1)
      ctx!.clip()
      for (const m of masini) if (m.pasaj) deseneazaMasina(m, acum)
      ctx!.restore()
      rampa(ctx!)
      for (const m of masini) if (!m.loc && !m.pasaj) deseneazaMasina(m, acum)
      for (const c of trafic) deseneazaMasina(c.m, acum)
      for (const o of oameni) deseneazaOm(o, acum)
      deseneazaFum()
      deseneazaCheie(acum)
      raf = requestAnimationFrame(cadru)
    }

    function deseneazaStatic() {
      const acum = performance.now()
      ctx!.clearRect(0, 0, W, H)
      ctx!.drawImage(fundal, 0, 0, W, H)
      for (const m of masini) deseneazaMasina(m, acum)
      for (const o of fumatori) deseneazaOm(o, acum)
    }

    function masinaLa(x: number, y: number): Masina | null {
      for (const m of [...masini, ...trafic.map((t) => t.m)]) {
        if (!m.vizibila) continue
        const c = Math.cos(-m.h)
        const s = Math.sin(-m.h)
        const lx = (x - m.x) * c - (y - m.y) * s
        const ly = (x - m.x) * s + (y - m.y) * c
        if (Math.abs(lx) < U * 0.55 && Math.abs(ly) < U * 0.3) return m
      }
      return null
    }
    const pesteFormular = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.('form, footer, a, button, input, [role=dialog]')

    const onDown = (e: PointerEvent) => {
      if (pesteFormular(e)) return
      const m = masinaLa(e.clientX, e.clientY)
      if (!m) return
      deblocheaza(m)
      claxon()
      if (fara) {
        // fara animatii: aratam o data starea „deblocat", apoi revenim
        deseneazaStatic()
        window.setTimeout(deseneazaStatic, 2700)
      }
    }
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      const peste = !pesteFormular(e) && !!masinaLa(e.clientX, e.clientY)
      document.documentElement.style.cursor = peste ? 'pointer' : ''
    }
    const onResize = () => {
      construieste()
      if (fara) deseneazaStatic()
    }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !fara) {
        ultim = performance.now()
        raf = requestAnimationFrame(cadru)
      }
    }
    clipesteRef.current = () => {
      const parcate = masini.filter((m) => m.vizibila && m.loc && !m.ocupata)
      const m = parcate[Math.floor(Math.random() * parcate.length)]
      if (!m) return
      deblocheaza(m, 1)
      if (fara) {
        deseneazaStatic()
        window.setTimeout(deseneazaStatic, 200)
      }
    }

    construieste()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    if (fara) deseneazaStatic()
    else {
      document.addEventListener('visibilitychange', onVis)
      raf = requestAnimationFrame(cadru)
    }
    return () => {
      cancelAnimationFrame(raf)
      clipesteRef.current = null
      document.documentElement.style.cursor = ''
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fara])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full" />
}
