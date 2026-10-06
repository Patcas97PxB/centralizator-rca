import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Fundalul paginii de login: o parcare vazuta de sus (ca din drona), desenata stilizat, in liniile si
// culorile site-ului. Povestea din bucla = ce face firma: un client suparat (dupa o tamponare) vine pe
// jos, angajatul in tricou alb iese din biroul Autonom, ii preda cheia, merg la masina de inlocuire,
// aceasta se deblocheaza (avarii + faruri) si clientul pleaca fericit cu ea. Apoi se intoarce o masina
// predata mai demult, parcheaza, iar clientul ei coboara multumit (predat -> preluat).
// Interactiuni: click pe o masina = deblocare (avarii de 2 ori, faruri, „bip-bip"); masina de langa
// cursor isi aprinde usor farurile; fiecare tasta din parola = o masina clipeste o data (incuiere).
// Cu animatiile oprite: parcarea statica (fara poveste); click-ul tot deblocheaza (lumini, fara miscare).

type Vec = { x: number; y: number }

interface Masina {
  x: number
  y: number
  h: number // directia botului (radiani; 0 = spre dreapta, PI/2 = in jos)
  culoare: string
  vizibila: boolean
  avariiPana: number // momentul pana la care clipesc avariile
  avariiStart: number
  farPana: number
  farMouse: number // 0..1, farurile aprinse de apropierea cursorului
  lovita?: boolean
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
}

const CULORI = ['#e5e7eb', '#94a3b8', '#3b82f6', '#7c3aed', '#0ea5e9', '#334155', '#10b981', '#cbd5e1', '#1d4ed8', '#a855f7']

// ---- drum pentru masini: lista de puncte, cu lungimi cumulate ----
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
  const t = Math.max(0, Math.min(d.total, s))
  let i = 1
  while (i < d.cum.length - 1 && d.cum[i] < t) i++
  const a = d.pts[i - 1]
  const b = d.pts[i]
  const seg = d.cum[i] - d.cum[i - 1] || 1
  const k = (t - d.cum[i - 1]) / seg
  return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, dir: Math.atan2(b.y - a.y, b.x - a.x) }
}
const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2)
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

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
    let masini: Masina[] = []
    let yRandSus = 0 // centrul locurilor de sus
    let yRandJos = 0
    let yCuloar = 0 // culoarul de sus, pe unde ies masinile
    let birou: Vec = { x: 0, y: 0 }
    let loc: Masina | null = null // masina de inlocuire din poveste
    let xLoc = 0
    let client: Om
    let angajat: Om
    let clientIntors: Om
    let cheie: { x: number; y: number; vizibil: boolean } = { x: 0, y: 0, vizibil: false }
    let t0Poveste = performance.now()
    const mouse = { x: -999, y: -999 }
    let raf = 0

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
      U = Math.max(44, Math.min(74, W / 19))
      const latLoc = U * 0.78
      const lungLoc = U * 1.3
      yRandSus = Math.max(U * 0.9, H * 0.05) + lungLoc / 2
      yRandJos = H - Math.max(U * 0.9, H * 0.05) - lungLoc / 2
      yCuloar = yRandSus + lungLoc / 2 + U * 0.75
      birou = { x: Math.max(U * 1.6, W * 0.07), y: H * 0.64 }
      const n = Math.floor((W - U) / latLoc)
      const x0 = (W - n * latLoc) / 2 + latLoc / 2
      masini = []
      // locul masinii de inlocuire: in stanga, departe de formular
      xLoc = x0 + latLoc * Math.max(1, Math.round((W * 0.16 - x0) / latLoc))
      for (let i = 0; i < n; i++) {
        const x = x0 + i * latLoc
        for (const [y, h] of [
          [yRandSus, -Math.PI / 2],
          [yRandJos, Math.PI / 2],
        ] as const) {
          const liber = Math.random() < 0.22 && Math.abs(x - xLoc) > 1
          if (liber) continue
          masini.push({
            x,
            y,
            h,
            culoare: CULORI[Math.floor(Math.random() * CULORI.length)],
            vizibila: true,
            avariiPana: 0,
            avariiStart: 0,
            farPana: 0,
            farMouse: 0,
          })
        }
      }
      loc = masini.find((m) => Math.abs(m.x - xLoc) < 1 && m.y === yRandSus) ?? null
      if (!loc) {
        loc = { x: xLoc, y: yRandSus, h: -Math.PI / 2, culoare: '#f8fafc', vizibila: true, avariiPana: 0, avariiStart: 0, farPana: 0, farMouse: 0 }
        masini.push(loc)
      }
      loc.culoare = '#f8fafc'
      deseneazaFundal(n, x0, latLoc, lungLoc)
      const om = (tricou: string, angajat: boolean): Om => ({ x: -50, y: 0, h: 0, tricou, angajat, vizibil: false, dispozitie: 0, merge: false, alpha: 1 })
      client = om('#334155', false)
      angajat = om('#f8fafc', true)
      clientIntors = om('#1e3a5f', false)
      t0Poveste = performance.now()
    }

    // ---- strat static: asfalt, locuri de parcare, biroul Autonom ----
    function deseneazaFundal(n: number, x0: number, latLoc: number, lungLoc: number) {
      const c = fctx
      c.clearRect(0, 0, W, H)
      c.fillStyle = 'rgba(12,18,34,0.55)'
      c.fillRect(0, 0, W, H)
      // dale discrete de asfalt
      c.strokeStyle = 'rgba(148,163,184,0.035)'
      c.lineWidth = 1
      for (let x = 0; x < W; x += U * 2.2) {
        c.beginPath()
        c.moveTo(x, 0)
        c.lineTo(x, H)
        c.stroke()
      }
      // linii de parcare (albastru ca liniile din meniu)
      c.strokeStyle = 'rgba(96,165,250,0.38)'
      c.lineWidth = 2
      c.shadowColor = 'rgba(61,139,255,.55)'
      c.shadowBlur = 6
      for (const yc of [yRandSus, yRandJos]) {
        for (let i = 0; i <= n; i++) {
          const x = x0 - latLoc / 2 + i * latLoc
          c.beginPath()
          c.moveTo(x, yc - lungLoc / 2)
          c.lineTo(x, yc + lungLoc / 2)
          c.stroke()
        }
        // linia din spate a randului
        const ys = yc === yRandSus ? yc - lungLoc / 2 : yc + lungLoc / 2
        c.beginPath()
        c.moveTo(x0 - latLoc / 2, ys)
        c.lineTo(x0 - latLoc / 2 + n * latLoc, ys)
        c.stroke()
      }
      c.shadowBlur = 0
      // biroul Autonom (vazut de sus): acoperis cu dunga in culorile logo-ului
      const bw = U * 1.7
      const bh = U * 1.1
      c.fillStyle = '#121a2e'
      c.strokeStyle = 'rgba(148,163,184,.25)'
      c.lineWidth = 1.5
      c.beginPath()
      c.roundRect(birou.x - bw / 2, birou.y - bh / 2, bw, bh, 8)
      c.fill()
      c.stroke()
      const g = c.createLinearGradient(birou.x - bw / 2, 0, birou.x + bw / 2, 0)
      g.addColorStop(0, '#00A848')
      g.addColorStop(0.5, '#0060F0')
      g.addColorStop(1, '#6000C0')
      c.fillStyle = g
      c.fillRect(birou.x - bw / 2 + 6, birou.y - bh / 2 + 6, bw - 12, 4)
      c.fillStyle = 'rgba(148,163,184,.18)'
      c.fillRect(birou.x - bw / 2 + 10, birou.y - 4, bw - 20, 2)
      c.fillRect(birou.x - bw / 2 + 10, birou.y + 6, bw - 20, 2)
      // usa (spre culoar)
      c.fillStyle = 'rgba(96,165,250,.55)'
      c.fillRect(birou.x + bw / 2 - 2, birou.y - 7, 3, 14)
    }

    // ---- desen masina, vazuta de sus ----
    function deseneazaMasina(m: Masina, acum: number) {
      if (!m.vizibila) return
      const L = U
      const w = U * 0.48
      ctx!.save()
      ctx!.translate(m.x, m.y)
      ctx!.rotate(m.h)
      // faruri (fascicul in fata)
      const far = Math.max(acum < m.farPana ? 1 : 0, m.farMouse)
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
      // umbra
      ctx!.fillStyle = 'rgba(0,0,0,.35)'
      ctx!.beginPath()
      ctx!.roundRect(-L / 2 + 2, -w / 2 + 3, L, w, w * 0.32)
      ctx!.fill()
      // caroserie
      ctx!.fillStyle = m.culoare
      ctx!.beginPath()
      ctx!.roundRect(-L / 2, -w / 2, L, w, w * 0.32)
      ctx!.fill()
      // geamuri: parbriz (fata), luneta (spate), plafon
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
      // oglinzi
      ctx!.fillStyle = m.culoare
      ctx!.fillRect(L * 0.12, -w * 0.62, L * 0.06, w * 0.14)
      ctx!.fillRect(L * 0.12, w * 0.48, L * 0.06, w * 0.14)
      // urme de lovitura (masina clientului)
      if (m.lovita) {
        ctx!.strokeStyle = 'rgba(15,23,42,.6)'
        ctx!.lineWidth = 1.2
        ctx!.beginPath()
        ctx!.moveTo(L * 0.42, -w * 0.4)
        ctx!.lineTo(L * 0.34, -w * 0.15)
        ctx!.lineTo(L * 0.44, w * 0.05)
        ctx!.stroke()
      }
      // faruri si stopuri
      ctx!.fillStyle = far > 0.02 ? '#fff8dc' : 'rgba(255,248,220,.55)'
      ctx!.fillRect(L * 0.46, -w * 0.4, L * 0.04, w * 0.16)
      ctx!.fillRect(L * 0.46, w * 0.24, L * 0.04, w * 0.16)
      ctx!.fillStyle = 'rgba(239,68,68,.75)'
      ctx!.fillRect(-L * 0.5, -w * 0.4, L * 0.035, w * 0.14)
      ctx!.fillRect(-L * 0.5, w * 0.26, L * 0.035, w * 0.14)
      // avarii (colturi portocalii)
      if (acum < m.avariiPana) {
        const aprins = Math.floor((acum - m.avariiStart) / 160) % 2 === 0
        if (aprins) {
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
      // picioare (se vad putin in fata/spate cand merge)
      ctx!.fillStyle = '#1e293b'
      ctx!.beginPath()
      ctx!.ellipse(3 * s * leg, -3.2 * s, 3.2 * s, 2.2 * s, 0, 0, Math.PI * 2)
      ctx!.ellipse(-3 * s * leg, 3.2 * s, 3.2 * s, 2.2 * s, 0, 0, Math.PI * 2)
      ctx!.fill()
      // umeri / tricou
      ctx!.rotate(leg * 0.12)
      ctx!.fillStyle = o.tricou
      ctx!.beginPath()
      ctx!.ellipse(0, 0, 5.2 * s, 9 * s, 0, 0, Math.PI * 2)
      ctx!.fill()
      if (o.angajat) {
        // dunga cu culorile logo-ului pe tricoul alb
        ctx!.fillStyle = '#0060F0'
        ctx!.fillRect(-1 * s, -7 * s, 2 * s, 14 * s)
      }
      // cap
      ctx!.fillStyle = '#e8c4a0'
      ctx!.beginPath()
      ctx!.arc(0.6 * s, 0, 4.2 * s, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.fillStyle = o.angajat ? '#3f2a1d' : '#1f2937'
      ctx!.beginPath()
      ctx!.arc(-0.4 * s, 0, 3.8 * s, Math.PI * 0.55, Math.PI * 1.45)
      ctx!.fill()
      ctx!.restore()
      // bula cu dispozitia (deasupra, nerotita)
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
          // sprancene incruntate + gura in jos
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

    // ---- povestea (o bucla de ~24 s) ----
    const PAS = 70 // viteza de mers, px/s (scalata cu U)
    function mergi(o: Om, a: Vec, b: Vec, u: number) {
      const k = Math.max(0, Math.min(1, u))
      o.x = lerp(a.x, b.x, k)
      o.y = lerp(a.y, b.y, k)
      o.h = Math.atan2(b.y - a.y, b.x - a.x)
      o.merge = k > 0 && k < 1
    }
    function poveste(acum: number) {
      if (!loc) return
      const t = (acum - t0Poveste) / 1000
      const v = (PAS * U) / 46
      const yOm = H * 0.5
      const intrare: Vec = { x: -30, y: yOm }
      const intalnire: Vec = { x: Math.max(U * 3.2, W * 0.2), y: yOm }
      const usaBirou: Vec = { x: birou.x + U * 1.1, y: birou.y }
      const usaMasina: Vec = { x: xLoc + U * 0.55, y: yRandSus + U * 0.15 }
      const dIntrare = Math.hypot(intalnire.x - intrare.x, intalnire.y - intrare.y) / v
      const dAngajat = Math.hypot(intalnire.x + U * 0.5 - usaBirou.x, intalnire.y - usaBirou.y) / v
      const dLaMasina = Math.hypot(usaMasina.x - intalnire.x, usaMasina.y - intalnire.y) / v

      // 1) clientul suparat vine pe jos
      const T1 = dIntrare
      // 2) angajatul iese din birou si ajunge in acelasi timp
      const T2s = Math.max(0, T1 - dAngajat)
      // 3) predarea cheii
      const T3 = T1 + 0.3
      const T4 = T3 + 1.3
      // 4) merg la masina
      const T5 = T4 + dLaMasina
      // 5) deblocare, urca in masina; angajatul se intoarce
      const T6 = T5 + 1.1
      // 6) masina iese (in spate, apoi inainte spre dreapta)
      const iesireSpate = drum([
        { x: xLoc, y: yRandSus },
        { x: xLoc, y: yCuloar - U * 1.1 },
        ...arc({ x: xLoc - U * 1.1, y: yCuloar - U * 1.1 }, U * 1.1, 0, Math.PI / 2),
      ])
      const iesireFata = drum([
        { x: xLoc - U * 1.1, y: yCuloar },
        { x: W + U * 2, y: yCuloar },
      ])
      const T7 = T6 + 0.4
      const T8 = T7 + 2.2
      const T9 = T8 + Math.max(2.5, iesireFata.total / (U * 9))
      // 7) se intoarce o masina predata mai demult si parcheaza la loc
      const intoarcere = drum([
        { x: W + U * 2, y: yCuloar },
        { x: xLoc + U * 1.1, y: yCuloar },
        ...arc({ x: xLoc + U * 1.1, y: yCuloar - U * 1.1 }, U * 1.1, Math.PI / 2, Math.PI),
        { x: xLoc, y: yRandSus },
      ])
      const T10 = T9 + 1.2
      const T11 = T10 + Math.max(4, intoarcere.total / (U * 8))
      // 8) clientul coboara multumit si pleaca pe jos
      const T12 = T11 + 1.0
      const coborare: Vec = { x: xLoc + U * 0.55, y: yRandSus + U * 0.1 }
      const dPleaca = Math.hypot(coborare.x - intrare.x, coborare.y - yOm) / v
      const T13 = T12 + dPleaca
      const FINAL = T13 + 1.5

      if (t > FINAL) {
        // bucla noua: masina de inlocuire e din nou la locul ei
        t0Poveste = acum
        loc.culoare = '#f8fafc'
        loc.lovita = false
        return
      }

      // client suparat
      client.vizibil = t < T6 + 0.2
      client.alpha = t < T6 ? 1 : Math.max(0, 1 - (t - T6) / 0.2)
      if (t < T1) mergi(client, intrare, intalnire, t / T1)
      else if (t < T4) {
        client.merge = false
        client.h = 0
      } else if (t < T5) mergi(client, intalnire, usaMasina, (t - T4) / (T5 - T4))
      else client.merge = false
      client.dispozitie = t < T4 - 0.4 ? 1 : 2

      // angajat
      angajat.vizibil = t > T2s && t < T6 + dAngajat + dLaMasina + 0.5
      angajat.dispozitie = 0
      const lang: Vec = { x: intalnire.x + U * 0.5, y: intalnire.y }
      const langMasina: Vec = { x: usaMasina.x + U * 0.45, y: usaMasina.y + U * 0.3 }
      if (t < T1) mergi(angajat, usaBirou, lang, (t - T2s) / (T1 - T2s))
      else if (t < T4) {
        angajat.merge = false
        angajat.h = Math.PI
      } else if (t < T5) mergi(angajat, lang, langMasina, (t - T4) / (T5 - T4))
      else if (t < T6) angajat.merge = false
      else {
        const dIntoarcere = Math.hypot(usaBirou.x - langMasina.x, usaBirou.y - langMasina.y) / v
        mergi(angajat, langMasina, usaBirou, (t - T6) / dIntoarcere)
      }

      // cheia trece de la angajat la client
      cheie.vizibil = t > T3 && t < T4
      if (cheie.vizibil) {
        const k = easeInOut((t - T3) / (T4 - T3))
        cheie.x = lerp(angajat.x, client.x, k)
        cheie.y = lerp(angajat.y, client.y, k) - Math.sin(k * Math.PI) * U * 0.6
      }

      // masina de inlocuire
      if (t >= T5 && t < T5 + 0.05 && loc.avariiPana < acum) {
        loc.avariiStart = acum
        loc.avariiPana = acum + 4 * 160
        loc.farPana = acum + 2600
      }
      if (t < T7) {
        loc.x = xLoc
        loc.y = yRandSus
        loc.h = -Math.PI / 2
        loc.vizibila = true
      } else if (t < T8) {
        // in spate: botul ramane opus directiei de mers
        const { p, dir } = peDrum(iesireSpate, iesireSpate.total * easeInOut((t - T7) / (T8 - T7)))
        loc.x = p.x
        loc.y = p.y
        loc.h = dir + Math.PI
      } else if (t < T9) {
        const u = (t - T8) / (T9 - T8)
        const { p, dir } = peDrum(iesireFata, iesireFata.total * u * u)
        loc.x = p.x
        loc.y = p.y
        loc.h = dir
      } else if (t < T10) {
        loc.vizibila = false
      } else if (t < T11) {
        // masina predata se intoarce (alta culoare, cu o urma de tamponare)
        if (!loc.vizibila) {
          loc.vizibila = true
          loc.culoare = '#3b82f6'
          loc.lovita = true
        }
        const u = (t - T10) / (T11 - T10)
        const { p, dir } = peDrum(intoarcere, intoarcere.total * (1 - (1 - u) * (1 - u)))
        loc.x = p.x
        loc.y = p.y
        loc.h = dir
      } else {
        loc.x = xLoc
        loc.y = yRandSus
        loc.h = -Math.PI / 2
        if (t < T11 + 0.05 && loc.avariiPana < acum) {
          // incuiere: un clipit
          loc.avariiStart = acum
          loc.avariiPana = acum + 2 * 160
        }
      }

      // clientul care a returnat masina coboara si pleaca multumit
      clientIntors.vizibil = t > T11 + 0.3 && t < T13
      clientIntors.dispozitie = 2
      if (clientIntors.vizibil) {
        clientIntors.alpha = Math.min(1, (t - T11 - 0.3) / 0.3)
        if (t < T12) {
          clientIntors.x = coborare.x
          clientIntors.y = coborare.y
          clientIntors.merge = false
        } else mergi(clientIntors, coborare, { x: intrare.x, y: yOm + U * 0.4 }, (t - T12) / (T13 - T12))
      }
    }

    function deseneazaCheie() {
      if (!cheie.vizibil) return
      const s = U / 46
      ctx!.save()
      ctx!.translate(cheie.x, cheie.y)
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

    let fazaSageti = 0
    function deseneazaCuloar(dt: number) {
      // sageti verzi punctate pe culoarul de sus (ca linia punctata din meniu), curg spre iesire
      fazaSageti += dt * 26
      ctx!.save()
      ctx!.strokeStyle = 'rgba(0,245,160,.32)'
      ctx!.lineWidth = 1.4
      ctx!.setLineDash([4, 8])
      ctx!.lineDashOffset = -fazaSageti
      ctx!.beginPath()
      ctx!.moveTo(0, yCuloar)
      ctx!.lineTo(W, yCuloar)
      ctx!.stroke()
      ctx!.setLineDash([])
      ctx!.strokeStyle = 'rgba(0,245,160,.45)'
      for (let x = (fazaSageti * 2) % (U * 4); x < W; x += U * 4) {
        ctx!.beginPath()
        ctx!.moveTo(x - 5, yCuloar - 5)
        ctx!.lineTo(x, yCuloar)
        ctx!.lineTo(x - 5, yCuloar + 5)
        ctx!.stroke()
      }
      ctx!.restore()
    }

    let ultim = performance.now()
    function cadru(acum: number) {
      const dt = Math.min(0.05, (acum - ultim) / 1000)
      ultim = acum
      poveste(acum)
      // farurile masinii de langa cursor (lin)
      let cea = -1
      let dmin = U * 2.2
      for (let i = 0; i < masini.length; i++) {
        const d = Math.hypot(masini[i].x - mouse.x, masini[i].y - mouse.y)
        if (d < dmin) {
          dmin = d
          cea = i
        }
      }
      masini.forEach((m, i) => {
        m.farMouse += ((i === cea ? 0.8 : 0) - m.farMouse) * Math.min(1, dt * 5)
      })
      ctx!.clearRect(0, 0, W, H)
      ctx!.drawImage(fundal, 0, 0, W, H)
      deseneazaCuloar(dt)
      for (const m of masini) deseneazaMasina(m, acum)
      deseneazaOm(angajat, acum)
      deseneazaOm(client, acum)
      deseneazaOm(clientIntors, acum)
      deseneazaCheie()
      raf = requestAnimationFrame(cadru)
    }

    function deseneazaStatic() {
      const acum = performance.now()
      ctx!.clearRect(0, 0, W, H)
      ctx!.drawImage(fundal, 0, 0, W, H)
      for (const m of masini) deseneazaMasina(m, acum)
    }

    function masinaLa(x: number, y: number): Masina | null {
      for (const m of masini) {
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
      const acum = performance.now()
      m.avariiStart = acum
      m.avariiPana = acum + 4 * 160
      m.farPana = acum + 2600
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
      const parcate = masini.filter((m) => m.vizibila && m !== loc)
      const m = parcate[Math.floor(Math.random() * parcate.length)]
      if (!m) return
      const acum = performance.now()
      m.avariiStart = acum
      m.avariiPana = acum + 160
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
