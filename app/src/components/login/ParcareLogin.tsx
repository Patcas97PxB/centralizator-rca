import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Fundalul paginii de login: parcarea sediului Autonom vazuta de sus (ca din drona), dupa locul real
// (schita utilizatorului): sediul in stanga sus, cu trotuar in fata si Bulevardul Decebal jos (circulatie
// de la dreapta spre stanga); parcarea in dreapta sediului, cu zidul cladirii vecine in capat, masini pe
// langa zid, pe dreapta, pe coltul rotunjit din dreapta jos, in mijloc si langa platforma de beton unde se
// fumeaza (pe lateral, langa sediu). Din dreapta jos coboara o strada cu sens unic in bulevard.
// Scenarii alese la intamplare (fara repetare imediata): clientul vine din stanga / din dreapta / cu taxiul,
// intra in birou si iese cu un coleg care ii preda masina; clientul se opreste la cei de la tigara si ei ii
// dau masina; doi colegi pleaca cu o masina sa o predea si se intorc cu alta; o zi obisnuita. Masina
// clientului iese pe bulevard din prima sau se chinuie cand e aglomerat; apoi se intoarce o masina predata
// mai demult (cu o urma de tamponare) si clientul ei pleaca multumit. La tigara stau 1–2 sau 3–4 colegi.
// Interactiuni: click pe o masina = deblocare (avarii de 2 ori, faruri, „bip-bip"); masina de langa
// cursor isi aprinde usor farurile; fiecare tasta din parola = o masina clipeste o data (incuiere).
// Cu animatiile oprite: parcarea statica; click-ul tot deblocheaza (lumini, fara miscare).

type Vec = { x: number; y: number }

interface Loc {
  x: number
  y: number
  h: number // directia botului masinii parcate (radiani; 0 = spre dreapta, PI/2 = in jos)
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
  lovita?: boolean
  taxi?: boolean
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
  | { k: 'conduce'; pts: Vec[] | ((p: Vec) => Vec[]); v: number; spate?: boolean; mod?: 'lin' | 'acc' | 'fran' | 'ease'; d?: Drum }

interface Actor {
  om?: Om
  m?: Masina
  coada: Pas[]
  t: number
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
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const intre = (a: number, b: number) => a + Math.random() * (b - a)
const unul = <T,>(v: readonly T[]): T => v[Math.floor(Math.random() * v.length)]

// „bip-bip" de deblocare, generat (fara fisiere audio)
let audio: AudioContext | null = null
function bipBip() {
  try {
    audio ??= new AudioContext()
    const t0 = audio.currentTime + 0.01
    for (const off of [0, 0.16]) {
      const o = audio.createOscillator()
      const g = audio.createGain()
      o.type = 'square'
      o.frequency.setValueAtTime(1850, t0 + off)
      g.gain.setValueAtTime(0, t0 + off)
      g.gain.linearRampToValueAtTime(0.06, t0 + off + 0.01)
      g.gain.setValueAtTime(0.06, t0 + off + 0.07)
      g.gain.linearRampToValueAtTime(0, t0 + off + 0.09)
      o.connect(g).connect(audio.destination)
      o.start(t0 + off)
      o.stop(t0 + off + 0.1)
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
    let latLoc = 34
    let lungLoc = 57
    let banda = 100 // latimea unui culoar din parcare
    // geometria locului (vezi construieste)
    let yTrot = 0 // marginea de sus a trotuarului
    let trotH = 0
    let yBul0 = 0 // marginea de sus a bulevardului
    let bulH = 0
    let benzi: [number, number] = [0, 0] // y-ul celor doua benzi (0 = langa trotuar)
    let stradaW = 0 // strada cu sens unic, in dreapta
    let xStr = 0
    let xLot1 = 0 // marginea din dreapta a parcarii
    let xA = 0 // culoarul din stanga (si iesirea spre bulevard)
    let xRA = 0 // culoarul din dreapta
    let yL2 = 0 // culoarul de jos
    let wallH = 0 // zidul cladirii vecine, in capatul parcarii
    let culoare: number[] = [] // y-ul culoarelor orizontale
    let sediu = { x: 0, y: 0, w: 0, h: 0, usaX: 0 }
    let plat = { x: 0, y: 0, w: 0, h: 0 } // platforma de beton (locul de fumat)
    let locuri: Loc[] = []
    let masini: Masina[] = []
    let trafic: Trafic[] = []
    let actori: Actor[] = [] // actorii scenariului curent
    let fundalActori: Actor[] = [] // masini de pe strada cu sens unic (independente de scenariu)
    let fumatori: Om[] = []
    let oameni: Om[] = [] // toti oamenii de desenat
    let fum: { x: number; y: number; vx: number; vy: number; r: number; a: number; v: number }[] = []
    let cheie: { de: Om; la: Om; t0: number } | null = null
    let semnale = new Set<string>()
    let aglomeratPana = 0
    let tSpawn = 1
    let tStrada = 4
    let pauzaScena = 1.2
    let ultimScenariu = ''
    const mouse = { x: -999, y: -999 }
    let raf = 0
    let acumCurent = performance.now()

    const vOm = () => U * 1.5 // viteza de mers a oamenilor (px/s)
    const ySw = () => yTrot + trotH * 0.5 // mijlocul trotuarului
    const xW = () => xA - banda * 0.3 // pe unde merg oamenii pe aleea de iesire
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
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      for (const c of [canvas!, fundal]) {
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
      }
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      U = Math.max(28, Math.min(64, W / 21, H / 12.5))
      latLoc = U * 0.78
      lungLoc = U * 1.3
      banda = U * 2.3
      bulH = U * 2.5
      trotH = U * 0.62
      yBul0 = H - bulH
      yTrot = yBul0 - trotH
      benzi = [yBul0 + bulH * 0.29, yBul0 + bulH * 0.71]
      stradaW = U * 1.7
      xStr = W - stradaW / 2
      xLot1 = W - stradaW - U * 0.25
      // sediul: stanga sus, cu fata spre trotuar
      const sw = Math.max(U * 3.2, Math.min(U * 4.8, W * 0.16))
      const oh = Math.min(yTrot - U * 0.4, U * 6)
      sediu = { x: U * 0.1, y: yTrot - oh, w: sw - U * 0.1, h: oh, usaX: U * 0.1 + (sw - U * 0.1) * 0.55 }
      // langa sediu: coloana de masini + platforma de beton (locul de fumat), apoi culoarul din stanga
      const colW = U * 1.3
      const platH = Math.min(U * 2.3, oh * 0.45)
      plat = { x: sw + U * 0.22, y: yTrot - U * 0.12 - platH, w: U * 1.05, h: platH }
      xA = sw + U * 0.12 + colW + banda / 2
      const Rw = lungLoc + banda / 2
      xRA = xLot1 - Rw
      yL2 = yTrot - Rw
      const xr0 = xA + banda / 2
      const xr1 = xRA - banda / 2
      const k = Math.max(0, Math.floor((yL2 - banda / 2 - lungLoc - U * 0.35) / (2 * lungLoc + banda)))
      wallH = yL2 - banda / 2 - k * (2 * lungLoc + banda) - lungLoc
      culoare = []
      for (let j = 0; j <= k; j++) culoare.push(wallH + lungLoc + banda / 2 + j * (2 * lungLoc + banda))

      // locurile de parcare
      locuri = []
      const n = Math.max(0, Math.floor((xr1 - xr0) / latLoc))
      const x0 = xr0 + (xr1 - xr0 - n * latLoc) / 2 + latLoc / 2
      const rand = (y: number, h: number, nr = n) => {
        for (let i = 0; i < nr; i++) locuri.push({ x: x0 + i * latLoc, y, h })
      }
      rand(wallH + lungLoc / 2, -Math.PI / 2) // langa zid
      for (let j = 0; j < k; j++) {
        const y1 = culoare[j] + banda / 2 + lungLoc / 2
        rand(y1, Math.PI / 2)
        rand(y1 + lungLoc, -Math.PI / 2)
      }
      rand(yTrot - lungLoc / 2, Math.PI / 2, Math.max(0, Math.floor((xRA - latLoc * 0.55 - x0) / latLoc) + 1)) // langa trotuar
      // pe dreapta
      for (let y = wallH + latLoc / 2 + U * 0.08; y < yL2 - latLoc * 0.55; y += latLoc) locuri.push({ x: xLot1 - lungLoc / 2, y, h: 0 })
      // coltul rotunjit din dreapta jos
      const ra = lungLoc / 2 + banda / 2
      const na = Math.max(1, Math.floor(((Math.PI / 2) * ra) / latLoc))
      for (let i = 0; i < na; i++) {
        const a = ((i + 0.5) * (Math.PI / 2)) / na
        locuri.push({ x: xRA + Math.cos(a) * ra, y: yL2 + Math.sin(a) * ra, h: a })
      }
      // langa platforma de fumat (coloana dintre sediu si culoarul din stanga)
      const xc = sw + U * 0.12 + colW / 2
      for (let y = plat.y - latLoc / 2 - U * 0.1; y > wallH + latLoc / 2; y -= latLoc) locuri.push({ x: xc, y, h: 0 })

      masini = []
      for (const l of locuri) {
        if (Math.random() < 0.15) continue
        const m = masinaNoua(l.x, l.y, l.h)
        m.loc = l
        masini.push(m)
      }
      trafic = []
      actori = []
      fundalActori = []
      fum = []
      cheie = null
      semnale = new Set()
      fumatori = []
      const nf = Math.random() < 0.3 ? 3 : 1 + Math.floor(Math.random() * 2)
      for (let i = 0; i < nf; i++) {
        const o = omNou('#f8fafc', true)
        const p = locFumat(i)
        o.x = p.x
        o.y = p.y
        o.vizibil = true
        o.alpha = 1
        o.tigara = true
        o.pufStart = performance.now() + Math.random() * 3000
        fumatori.push(o)
      }
      oameni = [...fumatori]
      pauzaScena = 1.2
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

    // ---- strat static: bulevard, trotuar, strada cu sens unic, parcarea, sediul, platforma ----
    function deseneazaFundal() {
      const c = fctx
      c.clearRect(0, 0, W, H)
      c.fillStyle = 'rgba(12,18,34,0.55)'
      c.fillRect(0, 0, W, H)
      // cladirile vecine: zidul din capatul parcarii si blocul de deasupra sediului
      cladireVecina(c, sediu.x + sediu.w + U * 0.05, -U * 0.3, xLot1 - sediu.x - sediu.w + U * 0.05, wallH + U * 0.3)
      if (sediu.y > U * 0.6) cladireVecina(c, -U * 0.3, -U * 0.3, sediu.x + sediu.w + U * 0.3, sediu.y - U * 0.15 + U * 0.3)
      // strada cu sens unic (coboara in bulevard)
      c.fillStyle = 'rgba(30,38,58,.8)'
      c.fillRect(W - stradaW, 0, stradaW, yBul0)
      c.strokeStyle = 'rgba(226,232,240,.4)'
      c.lineWidth = 1.5
      c.beginPath()
      c.moveTo(W - stradaW, 0)
      c.lineTo(W - stradaW, yTrot)
      c.stroke()
      for (let y = U * 1.5; y < yTrot - U; y += U * 3.2) sageata(c, xStr, y, Math.PI / 2, 'rgba(226,232,240,.35)')
      // bulevardul (doua benzi, spre stanga)
      c.fillStyle = 'rgba(26,33,52,.92)'
      c.fillRect(0, yBul0, W, bulH)
      c.strokeStyle = 'rgba(226,232,240,.35)'
      c.lineWidth = 2
      c.setLineDash([U * 0.7, U * 0.55])
      c.beginPath()
      c.moveTo(0, yBul0 + bulH / 2)
      c.lineTo(W, yBul0 + bulH / 2)
      c.stroke()
      c.setLineDash([])
      for (let x = U * 3; x < W; x += U * 7) {
        sageata(c, x, benzi[0], Math.PI, 'rgba(226,232,240,.22)')
        sageata(c, x + U * 3.5, benzi[1], Math.PI, 'rgba(226,232,240,.22)')
      }
      // trecere de pietoni in fata sediului
      c.fillStyle = 'rgba(226,232,240,.2)'
      const zx = Math.max(U * 0.3, sediu.x + U * 0.3)
      for (let y = yBul0 + U * 0.15; y < H - U * 0.2; y += U * 0.42) c.fillRect(zx, y, U * 1.2, U * 0.2)
      // trotuarul (pana la strada cu sens unic), cu dale
      c.fillStyle = 'rgba(71,85,105,.5)'
      c.fillRect(0, yTrot, W - stradaW, trotH)
      c.strokeStyle = 'rgba(148,163,184,.12)'
      c.lineWidth = 1
      for (let x = 0; x < W - stradaW; x += U * 0.62) {
        c.beginPath()
        c.moveTo(x, yTrot)
        c.lineTo(x, yBul0)
        c.stroke()
      }
      // bordura (coborata la iesirea din parcare)
      c.strokeStyle = 'rgba(203,213,225,.55)'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, yBul0)
      c.lineTo(xA - banda / 2, yBul0)
      c.moveTo(xA + banda / 2, yBul0)
      c.lineTo(W - stradaW, yBul0)
      c.stroke()
      c.fillStyle = 'rgba(30,38,58,.7)'
      c.fillRect(xA - banda / 2, yTrot, banda, trotH)
      // marginile parcarii: dreapta, coltul rotunjit, jos
      c.strokeStyle = 'rgba(148,163,184,.4)'
      c.lineWidth = 2.5
      c.beginPath()
      c.moveTo(xLot1, wallH)
      c.lineTo(xLot1, yL2)
      c.arc(xRA, yL2, xLot1 - xRA, 0, Math.PI / 2)
      c.lineTo(xA + banda / 2, yTrot)
      c.stroke()
      // locurile de parcare (albastru ca liniile din meniu)
      c.strokeStyle = 'rgba(96,165,250,.38)'
      c.lineWidth = 2
      c.shadowColor = 'rgba(61,139,255,.55)'
      c.shadowBlur = 6
      const L = lungLoc
      const w = latLoc
      for (const l of locuri) {
        c.save()
        c.translate(l.x, l.y)
        c.rotate(l.h)
        c.beginPath()
        c.moveTo(-L / 2, -w / 2)
        c.lineTo(L / 2, -w / 2)
        c.lineTo(L / 2, w / 2)
        c.lineTo(-L / 2, w / 2)
        c.stroke()
        c.restore()
      }
      c.shadowBlur = 0
      // sageti pe culoare (sensul de iesire: spre stanga, apoi in jos spre bulevard)
      for (const y of culoare) for (let x = xA + U * 2.5; x < xRA - U; x += U * 5) sageata(c, x, y, Math.PI, 'rgba(0,245,160,.22)')
      sageata(c, xA, (yL2 + yTrot) / 2, Math.PI / 2, 'rgba(0,245,160,.3)')
      deseneazaPlatforma(c)
      deseneazaSediu(c)
    }

    function sageata(c: CanvasRenderingContext2D, x: number, y: number, dir: number, cul: string) {
      c.save()
      c.translate(x, y)
      c.rotate(dir)
      c.strokeStyle = cul
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(-U * 0.45, 0)
      c.lineTo(U * 0.3, 0)
      c.moveTo(U * 0.08, -U * 0.18)
      c.lineTo(U * 0.3, 0)
      c.lineTo(U * 0.08, U * 0.18)
      c.stroke()
      c.restore()
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
      c.strokeStyle = 'rgba(148,163,184,.5)'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(x, y + h)
      c.lineTo(x + w, y + h)
      c.stroke()
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

    // ---- desen masina, vazuta de sus ----
    function deseneazaMasina(m: Masina, acum: number) {
      if (!m.vizibila) return
      const L = U
      const w = U * 0.48
      ctx!.save()
      ctx!.translate(m.x, m.y)
      ctx!.rotate(m.h)
      const far = Math.max(acum < m.farPana ? 1 : 0, m.farMouse, m.loc ? 0 : 0.55)
      if (far > 0.02) {
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
      }
      ctx!.fillStyle = 'rgba(0,0,0,.35)'
      ctx!.beginPath()
      ctx!.roundRect(-L / 2 + 2, -w / 2 + 3, L, w, w * 0.32)
      ctx!.fill()
      ctx!.fillStyle = m.culoare
      ctx!.beginPath()
      ctx!.roundRect(-L / 2, -w / 2, L, w, w * 0.32)
      ctx!.fill()
      // geamuri: parbriz, luneta, plafon
      ctx!.fillStyle = 'rgba(15,23,42,.85)'
      ctx!.beginPath()
      ctx!.moveTo(L * 0.18, -w * 0.38)
      ctx!.lineTo(L * 0.3, -w * 0.32)
      ctx!.lineTo(L * 0.3, w * 0.32)
      ctx!.lineTo(L * 0.18, w * 0.38)
      ctx!.closePath()
      ctx!.fill()
      ctx!.beginPath()
      ctx!.moveTo(-L * 0.3, -w * 0.34)
      ctx!.lineTo(-L * 0.38, -w * 0.3)
      ctx!.lineTo(-L * 0.38, w * 0.3)
      ctx!.lineTo(-L * 0.3, w * 0.34)
      ctx!.closePath()
      ctx!.fill()
      ctx!.fillStyle = 'rgba(255,255,255,.12)'
      ctx!.beginPath()
      ctx!.roundRect(-L * 0.28, -w * 0.34, L * 0.44, w * 0.68, 3)
      ctx!.fill()
      if (m.taxi) {
        // lampa TAXI pe plafon
        ctx!.fillStyle = '#111827'
        ctx!.fillRect(-L * 0.1, -w * 0.22, L * 0.14, w * 0.44)
        ctx!.fillStyle = '#fde047'
        ctx!.fillRect(-L * 0.08, -w * 0.18, L * 0.1, w * 0.36)
      }
      ctx!.fillStyle = m.culoare
      ctx!.fillRect(L * 0.12, -w * 0.62, L * 0.06, w * 0.14)
      ctx!.fillRect(L * 0.12, w * 0.48, L * 0.06, w * 0.14)
      if (m.lovita) {
        ctx!.strokeStyle = 'rgba(15,23,42,.6)'
        ctx!.lineWidth = 1.2
        ctx!.beginPath()
        ctx!.moveTo(L * 0.42, -w * 0.4)
        ctx!.lineTo(L * 0.34, -w * 0.15)
        ctx!.lineTo(L * 0.44, w * 0.05)
        ctx!.stroke()
      }
      ctx!.fillStyle = far > 0.02 ? '#fff8dc' : 'rgba(255,248,220,.55)'
      ctx!.fillRect(L * 0.46, -w * 0.4, L * 0.04, w * 0.16)
      ctx!.fillRect(L * 0.46, w * 0.24, L * 0.04, w * 0.16)
      ctx!.fillStyle = m.loc ? 'rgba(239,68,68,.75)' : 'rgba(248,80,80,.95)'
      ctx!.fillRect(-L * 0.5, -w * 0.4, L * 0.035, w * 0.14)
      ctx!.fillRect(-L * 0.5, w * 0.26, L * 0.035, w * 0.14)
      if (acum < m.avariiPana && Math.floor((acum - m.avariiStart) / 160) % 2 === 0) {
        for (const [px, py] of [
          [L * 0.47, -w * 0.47],
          [L * 0.47, w * 0.47],
          [-L * 0.47, -w * 0.47],
          [-L * 0.47, w * 0.47],
        ]) {
          const g = ctx!.createRadialGradient(px, py, 0, px, py, U * 0.28)
          g.addColorStop(0, 'rgba(255,190,80,.95)')
          g.addColorStop(0.35, 'rgba(251,146,60,.55)')
          g.addColorStop(1, 'rgba(251,146,60,0)')
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(px, py, U * 0.28, 0, Math.PI * 2)
          ctx!.fill()
        }
      }
      ctx!.restore()
    }

    // ---- desen om, vazut de sus ----
    function deseneazaOm(o: Om, acum: number) {
      if (!o.vizibil || o.alpha <= 0.01) return
      const s = (U / 46) * 1.35
      ctx!.save()
      ctx!.globalAlpha = o.alpha
      ctx!.translate(o.x, o.y)
      ctx!.rotate(o.h)
      const leg = o.merge ? Math.sin(acum / 110) : 0
      ctx!.fillStyle = '#1e293b'
      ctx!.beginPath()
      ctx!.ellipse(3 * s * leg, -3.2 * s, 3.2 * s, 2.2 * s, 0, 0, Math.PI * 2)
      ctx!.ellipse(-3 * s * leg, 3.2 * s, 3.2 * s, 2.2 * s, 0, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.rotate(leg * 0.12)
      ctx!.fillStyle = o.tricou
      ctx!.beginPath()
      ctx!.ellipse(0, 0, 5.2 * s, 9 * s, 0, 0, Math.PI * 2)
      ctx!.fill()
      if (o.angajat) {
        ctx!.fillStyle = '#0060F0'
        ctx!.fillRect(-1 * s, -7 * s, 2 * s, 14 * s)
      }
      if (o.tigara && !o.merge) {
        // mana cu tigara, ridicata la gura din cand in cand
        const puf = o.pufStart !== undefined && acum > o.pufStart && acum < o.pufStart + 1400
        const tx = puf ? 6 * s : 4 * s
        const ty = puf ? 2.5 * s : 8.5 * s
        ctx!.strokeStyle = '#f1f5f9'
        ctx!.lineWidth = 1.3 * s
        ctx!.beginPath()
        ctx!.moveTo(tx, ty)
        ctx!.lineTo(tx + 3 * s, ty)
        ctx!.stroke()
        ctx!.fillStyle = puf ? '#fb923c' : '#f97316'
        ctx!.shadowColor = 'rgba(251,146,60,.9)'
        ctx!.shadowBlur = puf ? 8 : 4
        ctx!.beginPath()
        ctx!.arc(tx + 3.4 * s, ty, 1.1 * s, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.shadowBlur = 0
      }
      ctx!.fillStyle = '#e8c4a0'
      ctx!.beginPath()
      ctx!.arc(0.6 * s, 0, 4.2 * s, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.fillStyle = o.angajat ? '#3f2a1d' : '#1f2937'
      ctx!.beginPath()
      ctx!.arc(-0.4 * s, 0, 3.8 * s, Math.PI * 0.55, Math.PI * 1.45)
      ctx!.fill()
      ctx!.restore()
      if (o.dispozitie) {
        const bx = o.x + 10 * s
        const by = o.y - 18 * s
        const r = 9 * s
        ctx!.save()
        ctx!.globalAlpha = o.alpha
        ctx!.fillStyle = o.dispozitie === 1 ? '#ef4444' : '#22c55e'
        ctx!.shadowColor = o.dispozitie === 1 ? 'rgba(239,68,68,.7)' : 'rgba(34,197,94,.7)'
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
          ctx!.moveTo(bx - 5 * s, by - 5 * s)
          ctx!.lineTo(bx - 1.5 * s, by - 3.5 * s)
          ctx!.moveTo(bx + 5 * s, by - 5 * s)
          ctx!.lineTo(bx + 1.5 * s, by - 3.5 * s)
          ctx!.moveTo(bx - 3.5 * s, by + 4.5 * s)
          ctx!.quadraticCurveTo(bx, by + 1.5 * s, bx + 3.5 * s, by + 4.5 * s)
        } else {
          ctx!.moveTo(bx - 4 * s, by + 1.5 * s)
          ctx!.quadraticCurveTo(bx, by + 6 * s, bx + 4 * s, by + 1.5 * s)
        }
        ctx!.stroke()
        ctx!.restore()
      }
    }

    // cheia zboara de la angajat la client
    function deseneazaCheie(acum: number) {
      if (!cheie) return
      const k = (acum - cheie.t0) / 1100
      if (k >= 1) {
        cheie = null
        return
      }
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
    function ruleaza(a: Actor, dt: number) {
      for (let n = 0; n < 10 && a.coada.length; n++) {
        const p = a.coada[0]
        a.t += dt
        let gata = false
        switch (p.k) {
          case 'mergi': {
            const o = a.om!
            p.d ??= drum([{ x: o.x, y: o.y }, ...p.pts])
            const s = a.t * vOm()
            const { p: q, dir } = peDrum(p.d, s)
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
            const dur = Math.max(0.05, p.d.total / p.v)
            const u = Math.min(1, a.t / dur)
            const e = p.mod === 'lin' ? u : p.mod === 'acc' ? u * u : p.mod === 'fran' ? 1 - (1 - u) * (1 - u) : easeInOut(u)
            const { p: q, dir } = peDrum(p.d, p.d.total * e)
            m.x = q.x
            m.y = q.y
            m.h = p.spate ? dir + Math.PI : dir
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
    const sem = (n: string) => fa(() => semnale.add(n))
    const pana = (n: string) => cand(() => semnale.has(n))
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
    const vehicule = () => [...trafic.map((t) => t.m), ...masini.filter((m) => m.vizibila && !m.loc)]
    // banda e libera in jurul lui x0 (masinile vin din dreapta: „inapoi" = cat de departe in dreapta)
    function liber(banda: 0 | 1, x0: number, inainte: number, inapoi: number, fara?: Masina) {
      const y = benzi[banda]
      return !vehicule().some((m) => m !== fara && Math.abs(m.y - y) < U * 0.8 && m.x > x0 - inainte && m.x < x0 + inapoi)
    }
    function laTrafic(m: Masina) {
      masini = masini.filter((x) => x !== m)
      m.loc = null
      m.ocupata = false
      trafic.push({ m, banda: 0, v: U * 3.8, vmax: U * intre(4, 5) })
    }
    function actualizeazaTrafic(dt: number, acum: number) {
      tSpawn -= dt
      if (tSpawn <= 0) {
        const agl = acum < aglomeratPana
        const banda: 0 | 1 = agl ? (Math.random() < 0.8 ? 0 : 1) : Math.random() < 0.5 ? 0 : 1
        if (liber(banda, W + U, U * 2.4, U * 2)) {
          const vmax = U * intre(4, 5.2)
          trafic.push({ m: masinaNoua(W + U * 1.2, benzi[banda], Math.PI), banda, v: vmax, vmax })
        }
        tSpawn = agl ? intre(0.45, 0.95) : intre(1.6, 4.8)
      }
      const toate = vehicule()
      for (const c of trafic) {
        const y = benzi[c.banda]
        let gap = Infinity
        for (const o of toate) {
          if (o === c.m || Math.abs(o.y - y) > U * 0.8 || o.x >= c.m.x) continue
          gap = Math.min(gap, c.m.x - o.x)
        }
        const tinta = c.vmax * Math.max(0, Math.min(1, (gap - U * 1.35) / (U * 2.2)))
        c.v = tinta < c.v ? Math.max(tinta, c.v - U * 12 * dt) : Math.min(tinta, c.v + U * 3 * dt)
        c.m.x -= c.v * dt
        c.m.y = y
        c.m.h = Math.PI
      }
      trafic = trafic.filter((c) => c.m.x > -U * 2)
    }

    // ---- drumuri ----
    const R = () => U * 0.95 // raza de viraj in parcare
    const R2 = () => U * 0.8 // raza de viraj spre/din bulevard
    const yMarg = () => yBul0 - U * 0.55 // botul la marginea bulevardului
    const semnLoc = (l: Loc) => (l.y < yL2 ? -1 : 1)
    function iesireSpate(l: Loc): Vec[] {
      const r = R()
      const s = semnLoc(l)
      return [{ x: l.x, y: l.y }, { x: l.x, y: yL2 + s * r }, ...arc({ x: l.x + r, y: yL2 + s * r }, r, Math.PI, s < 0 ? Math.PI / 2 : (Math.PI * 3) / 2)]
    }
    function spreIesire(l: Loc): Vec[] {
      const r = R()
      return [{ x: l.x + r, y: yL2 }, { x: xA + r, y: yL2 }, ...arc({ x: xA + r, y: yL2 + r }, r, -Math.PI / 2, -Math.PI), { x: xA, y: yMarg() }]
    }
    function inBulevard(p: Vec): Vec[] {
      const r = R2()
      const y = benzi[0]
      return [p, { x: p.x, y: y - r }, ...arc({ x: p.x - r, y: y - r }, r, 0, Math.PI / 2), { x: p.x - r - U * 0.4, y }]
    }
    function intoarcere(l: Loc): Vec[] {
      const r = R()
      const r2 = R2()
      const y = benzi[0]
      const s = semnLoc(l)
      return [
        { x: W + U * 1.5, y },
        { x: xA + r2, y },
        ...arc({ x: xA + r2, y: y - r2 }, r2, Math.PI / 2, Math.PI),
        { x: xA, y: yL2 + r },
        ...arc({ x: xA + r, y: yL2 + r }, r, Math.PI, (Math.PI * 3) / 2),
        { x: l.x - r, y: yL2 },
        ...arc({ x: l.x - r, y: yL2 + s * r }, r, s < 0 ? Math.PI / 2 : -Math.PI / 2, 0),
        { x: l.x, y: l.y },
      ]
    }
    // oamenii: de pe trotuar, pe aleea de iesire, apoi pe culoar pana langa masina
    const yW = (l: Loc) => yL2 + semnLoc(l) * U * 0.5
    const laMasina = (l: Loc, dx: number, px: number): Vec[] => [
      { x: xW() + dx, y: ySw() },
      { x: xW() + dx, y: yW(l) },
      { x: l.x + px, y: yW(l) },
    ]
    const dinMasina = (l: Loc, dx: number): Vec[] => [
      { x: xW() + dx, y: yW(l) },
      { x: xW() + dx, y: ySw() },
    ]
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

    // ---- scenariile ----
    function alegeMasina(): Masina | null {
      const ySus = yL2 - banda / 2 - lungLoc / 2
      const yJos = yTrot - lungLoc / 2
      const toate = masini.filter(
        (m) =>
          m.loc &&
          m.vizibila &&
          !m.ocupata &&
          (Math.abs(m.loc.y - ySus) < 1 || Math.abs(m.loc.y - yJos) < 1) &&
          m.loc.x > xA + U * 2.3 &&
          m.loc.x < xRA - U * 0.6,
      )
      // de preferinta masini care nu stau sub formular (pe ecrane inguste nu se poate mereu)
      const vizibile = toate.filter((m) => !ascunsDeFormular(m.loc!.x, m.loc!.y))
      const bune = vizibile.length ? vizibile : toate
      const stanga = bune.filter((m) => m.loc!.x < W * 0.5)
      const din = stanga.length && (Math.random() < 0.7 || stanga.length === bune.length) ? stanga : bune
      return din.length ? unul(din) : null
    }

    // cati colegi sunt la tigara: vin din sediu sau intra inapoi, pe jos
    function ajusteazaFumatori(tinta: number) {
      while (fumatori.length < tinta) {
        const o = omNou('#f8fafc', true)
        const i = fumatori.length
        o.ocupat = true
        fumatori.push(o)
        oameni.push(o)
        actori.push({
          om: o,
          t: 0,
          coada: [
            stai(intre(0, 2.5)),
            pune(o, usaIn()),
            apare(1),
            mergi(usaAfara(), subPlatforma(), pePlatforma(), locFumat(i)),
            fa(() => {
              o.tigara = true
              o.ocupat = false
            }),
          ],
        })
      }
      while (fumatori.length > tinta) {
        const o = fumatori.pop()!
        actori.push({
          om: o,
          t: 0,
          coada: [
            stai(intre(0.5, 3)),
            fa(() => {
              o.ocupat = true
              o.tigara = false
            }),
            mergi(pePlatforma(), subPlatforma(), usaAfara(), usaIn()),
            apare(0),
            fa(() => (oameni = oameni.filter((x) => x !== o))),
          ],
        })
      }
    }

    // masina iese din loc, pana la bulevard (uneori se chinuie din cauza traficului), apoi pleaca
    function plecare(m: Masina, chinuie: boolean): Actor {
      const l = m.loc!
      return {
        m,
        t: 0,
        coada: [
          pana('urcat'),
          fa(() => {
            m.loc = null
          }),
          stai(0.5),
          conduce(iesireSpate(l), U * 0.9, 'ease', true),
          fa(() => {
            if (chinuie) aglomeratPana = acumCurent + intre(6000, 9000)
          }),
          conduce(spreIesire(l), U * 2.1),
          ...(chinuie
            ? [
                stai(1),
                conduce((p) => [p, { x: p.x, y: p.y + U * 0.12 }], U * 0.25),
                stai(1.4),
                conduce((p) => [p, { x: p.x, y: p.y + U * 0.1 }], U * 0.25),
                stai(0.8),
              ]
            : []),
          cand(() => liber(0, xA, U * 1.3, U * 7, m)),
          conduce((p) => inBulevard(p), U * 1.9, 'acc'),
          fa(() => laTrafic(m)),
          sem('plecat'),
        ],
      }
    }

    // se intoarce o masina predata mai demult (alta culoare, cu o urma de tamponare) si parcheaza in loc
    function retur(l: Loc, culoareVeche: string, coboara: (m: Masina) => Actor[], asteptare: number): Actor {
      const a: Actor = { t: 0, coada: [] }
      a.coada = [
        pana('plecat'),
        stai(asteptare),
        cand(() => liber(0, W + U, U * 2.5, U * 3)),
        fa(() => {
          let c = culoareVeche
          while (c === culoareVeche) c = unul(CULORI)
          const m = masinaNoua(W + U * 1.5, benzi[0], Math.PI, c)
          m.lovita = true
          m.ocupata = true
          masini.push(m)
          a.m = m
        }),
        conduce(intoarcere(l), U * 2.6),
        fa(() => {
          const m = a.m!
          m.loc = l
          m.x = l.x
          m.y = l.y
          m.h = l.h
          for (const x of coboara(m)) actori.push(x)
        }),
        pana('coborat'),
        stai(1.6),
        fa(() => {
          deblocheaza(a.m!, 2) // incuiere: un clipit
          a.m!.ocupata = false
        }),
      ]
      return a
    }

    // cei care coboara din masina returnata: clientul pleaca multumit (sau intra in birou), colegii merg in sediu
    function coboaraClient(l: Loc) {
      return (): Actor[] => {
        const o = omNou(unul(TRICOURI_CLIENT), false)
        o.dispozitie = 2
        oameni.push(o)
        const spreBirou = Math.random() < 0.3
        const iesire = Math.random() < 0.5 ? -U : W + U
        return [
          {
            om: o,
            t: 0,
            coada: [
              pune(o, { x: l.x + U * 0.3, y: yW(l) }),
              apare(1),
              sem('coborat'),
              stai(0.4),
              mergi(...dinMasina(l, U * 0.2), ...(spreBirou ? [usaAfara(), usaIn()] : [{ x: iesire, y: ySw() }])),
              apare(0),
            ],
          },
        ]
      }
    }
    function coboaraColegi(l: Loc, n: number) {
      return (): Actor[] =>
        Array.from({ length: n }, (_, i) => {
          const o = omNou('#f8fafc', true)
          oameni.push(o)
          return {
            om: o,
            t: 0,
            coada: [
              pune(o, { x: l.x + U * (0.3 - i * 0.55), y: yW(l) }),
              stai(i * 0.4),
              apare(1),
              ...(i === 0 ? [sem('coborat')] : []),
              stai(0.4),
              mergi(...dinMasina(l, i * U * 0.25), usaAfara(), usaIn()),
              apare(0),
            ],
          }
        })
    }

    // predarea la masina: angajatul (E) si clientul (K) ajung la masina; daca cheia n-a fost data inca,
    // E i-o arunca lui K; K deblocheaza masina (avarii + faruri) si urca; E se intoarce (la birou / la tigara).
    function laMasinaPasi(m: Masina, E: Om, K: Om, cheieDeja: boolean, intoarcereE: Vec[], laTigara: boolean) {
      const l = m.loc!
      const pasiE: Pas[] = [
        sem('E'),
        pana('K'),
        stai(0.2, 0),
        ...(cheieDeja ? [] : [fa(() => (cheie = { de: E, la: K, t0: performance.now() })), stai(1.15)]),
        sem('cheie'),
        pana('urcat'),
        stai(0.3),
        mergi(...dinMasina(l, 0), ...intoarcereE),
        ...(laTigara
          ? [
              fa(() => {
                E.tigara = true
                E.ocupat = false
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

    // clientul intra in birou si iese cu un coleg care il duce la masina
    function prinBirou(m: Masina, K: Om, inainte: Pas[]): Actor[] {
      const l = m.loc!
      const E = omNou('#f8fafc', true)
      oameni.push(E)
      const t = intre(2.5, 4)
      const { pasiE, pasiK } = laMasinaPasi(m, E, K, false, [usaAfara(), usaIn()], false)
      return [
        {
          om: K,
          t: 0,
          coada: [...inainte, mergi(usaAfara(), usaIn()), apare(0), sem('inBirou'), stai(t + 0.45), apare(1), mergi(usaAfara(), ...laMasina(l, U * 0.25, U * 0.35)), ...pasiK],
        },
        { om: E, t: 0, coada: [pune(E, usaIn()), pana('inBirou'), stai(t), apare(1), mergi(usaAfara(), ...laMasina(l, 0, -U * 0.5)), ...pasiE] },
      ]
    }

    // clientul se opreste la colegii de la tigara; unul dintre ei ii da cheia si il duce la masina
    function prinTigara(m: Masina, K: Om, inainte: Pas[]): Actor[] {
      const l = m.loc!
      const E = fumatori[0]
      const sub = subPlatforma()
      const { pasiE, pasiK } = laMasinaPasi(m, E, K, true, [sub, pePlatforma(), locFumat(0)], true)
      return [
        {
          om: K,
          t: 0,
          coada: [...inainte, mergi(sub), stai(0.1, -Math.PI / 2), sem('Ksosit'), pana('Epregatit'), mergi(...laMasina(l, U * 0.25, U * 0.35)), ...pasiK],
        },
        {
          om: E,
          t: 0,
          coada: [
            cand(() => !E.ocupat),
            fa(() => (E.ocupat = true)),
            pana('Ksosit'),
            stai(2.4, Math.PI / 2), // povestesc (clientul e inca suparat)
            fa(() => (E.tigara = false)),
            mergi(pePlatforma(), { x: sub.x + U * 0.45, y: sub.y }),
            fa(() => (cheie = { de: E, la: K, t0: performance.now() })),
            stai(1.15),
            fa(() => (K.dispozitie = 2)),
            sem('Epregatit'),
            mergi(...laMasina(l, 0, -U * 0.5)),
            ...pasiE,
          ],
        },
      ]
    }

    function scenariuNou() {
      semnale = new Set()
      actori = []
      cheie = null
      oameni = oameni.filter((o) => fumatori.includes(o))
      const toate = ['stanga', 'dreapta', 'taxi', 'livrare', 'tigara', 'zi']
      let sc = unul(toate.filter((s) => s !== ultimScenariu))
      const m = sc === 'zi' ? null : alegeMasina()
      if (!m) sc = 'zi'
      ultimScenariu = sc
      // la tigara: de obicei 1–2 colegi, uneori 3–4
      ajusteazaFumatori(Math.random() < 0.3 ? 3 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2))
      if (!m) {
        actori.push({ t: 0, coada: [stai(intre(6, 9))] })
        return
      }
      const l = m.loc!
      m.ocupata = true
      const chinuie = Math.random() < 0.4
      if (sc === 'livrare') {
        // doi colegi pleaca cu masina sa o predea clientului si se intorc cu alta
        const E1 = omNou('#f8fafc', true)
        const E2 = omNou('#f8fafc', true)
        oameni.push(E1, E2)
        actori.push(
          {
            om: E1,
            t: 0,
            coada: [pune(E1, usaIn()), apare(1), mergi(usaAfara(), ...laMasina(l, 0, -U * 0.5)), sem('E1'), pana('E2'), fa(() => deblocheaza(m)), stai(1), apare(0), sem('u1')],
          },
          {
            om: E2,
            t: 0,
            coada: [pune(E2, usaIn()), stai(0.45), apare(1), mergi(usaAfara(), ...laMasina(l, U * 0.25, U * 0.35)), sem('E2'), pana('E1'), stai(1.2), apare(0), sem('u2')],
          },
          { t: 0, coada: [pana('u1'), pana('u2'), sem('urcat')] },
          plecare(m, Math.random() < 0.3),
          retur(l, m.culoare, coboaraColegi(l, 2), intre(3, 5)),
        )
        return
      }
      const K = omNou(unul(TRICOURI_CLIENT), false)
      K.dispozitie = 1
      oameni.push(K)
      let inainte: Pas[]
      let spreTigara = sc === 'tigara'
      if (sc === 'taxi') {
        // vine cu taxiul: coboara in fata sediului sau langa cei de la tigara
        spreTigara = Math.random() < 0.5
        const xT = spreTigara ? subPlatforma().x + U * 0.3 : sediu.usaX + U * 0.5
        const b0 = benzi[0]
        const a: Actor = { t: 0, coada: [] }
        a.coada = [
          cand(() => liber(0, W + U, U * 2.5, U * 3)),
          fa(() => {
            const tx = masinaNoua(W + U * 1.5, b0, Math.PI, '#facc15')
            tx.taxi = true
            masini.push(tx)
            a.m = tx
          }),
          conduce(
            [
              { x: W + U * 1.5, y: b0 },
              { x: xT, y: b0 },
            ],
            U * 2.8,
            'fran',
          ),
          sem('taxiOprit'),
          pana('dinTaxi'),
          stai(0.9),
          conduce(
            [
              { x: xT, y: b0 },
              { x: -U * 2, y: b0 },
            ],
            U * 2.2,
            'acc',
          ),
          fa(() => (masini = masini.filter((x) => x !== a.m))),
        ]
        actori.push(a)
        inainte = [pana('taxiOprit'), pune(K, { x: xT - U * 0.15, y: yBul0 - U * 0.02 }), apare(1), sem('dinTaxi'), mergi({ x: xT - U * 0.15, y: ySw() })]
      } else {
        const start = sc === 'dreapta' || (sc === 'tigara' && Math.random() < 0.5) ? W + U : -U
        inainte = [pune(K, { x: start, y: ySw() }), apare(1)]
      }
      actori.push(...(spreTigara ? prinTigara(m, K, inainte) : prinBirou(m, K, inainte)), plecare(m, chinuie), retur(l, m.culoare, coboaraClient(l), intre(1.5, 4)))
    }

    // masini care coboara pe strada cu sens unic si intra in bulevard
    function stradaNoua() {
      const a: Actor = { t: 0, coada: [] }
      a.coada = [
        fa(() => {
          const m = masinaNoua(xStr, -U, Math.PI / 2)
          masini.push(m)
          a.m = m
        }),
        conduce(
          [
            { x: xStr, y: -U },
            { x: xStr, y: yMarg() },
          ],
          U * 2.6,
          'fran',
        ),
        cand(() => liber(0, xStr, U * 1.3, U * 6, a.m)),
        conduce((p) => inBulevard(p), U * 1.8, 'acc'),
        fa(() => laTrafic(a.m!)),
      ]
      fundalActori.push(a)
    }

    let ultim = performance.now()
    function cadru(acum: number) {
      const dt = Math.min(0.05, (acum - ultim) / 1000)
      ultim = acum
      acumCurent = acum
      if (actori.every((a) => !a.coada.length)) {
        pauzaScena -= dt
        if (pauzaScena <= 0) {
          scenariuNou()
          pauzaScena = intre(1, 2.5)
        }
      }
      for (const a of actori) ruleaza(a, dt)
      for (const a of fundalActori) ruleaza(a, dt)
      fundalActori = fundalActori.filter((a) => a.coada.length)
      tStrada -= dt
      if (tStrada <= 0) {
        if (!fundalActori.length) stradaNoua()
        tStrada = intre(7, 14)
      }
      actualizeazaTrafic(dt, acum)
      actualizeazaFum(dt, acum)
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
      for (const m of masini) if (!m.loc) deseneazaMasina(m, acum)
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
      bipBip()
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
