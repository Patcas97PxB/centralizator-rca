import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Fundalul paginii de login: o retea de iconite-dosar (documentul din logo) care plutesc incet, unite
// prin putine linii curgatoare in stilul decorului din meniul lateral (AppSidebar.tsx):
// albastru in degrade, mov in degrade, verde punctat care curge, albastru punctat in sens invers.
//  - legaturile sunt STABILE: fiecare dosar are 1-2 legaturi cu vecinii cei mai apropiati, care apar si
//    dispar lin (nu se recalculeaza toate perechile la fiecare cadru -> fara linii incalcite/palpaitoare);
//  - mouse: dosarele din jur se dau foarte putin la o parte, cu amortizare (fara miscare de ansamblu),
//    iar legaturile din jur se aprind usor;
//  - 'email': pulsuri de lumina curg pe legaturi spre formular (centrul ecranului);
//  - 'parola': dosarele se intorc si devin scuturi (ca in logo), reteaua incetineste si capata tenta mov.
// Cu animatiile oprite (reduced motion) se deseneaza un singur cadru static.

export type StareRetea = 'liber' | 'email' | 'parola'

type StilLegatura = 'albastru' | 'mov' | 'verde' | 'punctat'
const STILURI: StilLegatura[] = ['albastru', 'mov', 'verde', 'punctat']

const LEGATURA_MAX = 230 // peste distanta asta legatura se stinge
const LEGATURA_NOUA = 190 // vecin acceptat pentru o legatura noua
const RAZA_MOUSE = 140
const IMPINGERE = 9 // px, maxim

interface Nod {
  x: number
  y: number
  vx: number
  vy: number
  ox: number
  oy: number
  s: number
  z: number
  faza: number
  f: number // 0 = dosar, 1 = scut
}

interface Legatura {
  a: number
  b: number
  stil: StilLegatura
  curb: number // curbura fixa (fractiune din lungime, cu semn)
  alpha: number
}

interface Puls {
  l: Legatura
  dir: 1 | -1
  t: number
  hopuri: number
}

// Iconite in coordonate unitare (inaltime 1, centrate), dupa logo.
const DOSAR = new Path2D('M -0.39 -0.5 H 0.16 L 0.39 -0.27 V 0.5 H -0.39 Z')
const DOSAR_COLT = new Path2D('M 0.16 -0.5 V -0.27 H 0.39')
const DOSAR_RANDURI = new Path2D('M -0.24 -0.16 H 0.22 M -0.24 0.02 H 0.22 M -0.24 0.2 H 0.06')
const SCUT = new Path2D(
  'M 0 -0.5 C 0.16 -0.4 0.32 -0.37 0.42 -0.36 C 0.42 0.04 0.3 0.3 0 0.5 C -0.3 0.3 -0.42 0.04 -0.42 -0.36 C -0.32 -0.37 -0.16 -0.4 0 -0.5 Z',
)
const BIFA = new Path2D('M -0.16 0.02 L -0.04 0.14 L 0.18 -0.1')

const rgba = (c: readonly number[], a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`
const amesteca = (a: readonly number[], b: readonly number[], t: number) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
// Culorile decorului din meniul lateral.
const C_ALBASTRU = [61, 139, 255]
const C_MOV = [178, 107, 255]
const C_VERDE = [0, 245, 160]
const C_PUNCTAT = [96, 165, 250]

export function ReteaDosare({ stare }: { stare: StareRetea }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fara = usePrefersReducedMotion()
  const stareRef = useRef(stare)
  const desenStaticRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    stareRef.current = stare
    desenStaticRef.current?.()
  }, [stare])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let noduri: Nod[] = []
    let legaturi: Legatura[] = []
    const pulsuri: Puls[] = []
    const mouse = { x: 0, y: 0, activ: false, atingere: 0 }
    let viteza = 1
    let tenta = 0
    let ultimPuls = 0
    let ultimeLegaturi = 0
    let ultim = performance.now()
    let raf = 0
    let schimbareStare = performance.now()
    let stareAnterioara = stareRef.current

    const poz = (n: Nod) => [n.x + n.ox, n.y + n.oy] as const
    const dist = (a: Nod, b: Nod) => {
      const [x1, y1] = poz(a)
      const [x2, y2] = poz(b)
      return Math.hypot(x2 - x1, y2 - y1)
    }
    const grad = (i: number) => legaturi.reduce((s, l) => s + (l.a === i || l.b === i ? 1 : 0), 0)
    const legate = (i: number, j: number) => legaturi.some((l) => (l.a === i && l.b === j) || (l.a === j && l.b === i))

    // Leaga nodurile cu putine legaturi de cel mai apropiat vecin liber (max 2 legaturi pe nod).
    function completeazaLegaturi(alphaInitial: number) {
      for (let i = 0; i < noduri.length; i++) {
        if (grad(i) >= 1) continue
        let best = -1
        let bestD = LEGATURA_NOUA
        for (let j = 0; j < noduri.length; j++) {
          if (j === i || grad(j) >= 2 || legate(i, j)) continue
          const d = dist(noduri[i], noduri[j])
          if (d < bestD) {
            bestD = d
            best = j
          }
        }
        if (best >= 0) {
          legaturi.push({
            a: i,
            b: best,
            stil: STILURI[(i + best) % STILURI.length],
            curb: (0.12 + Math.random() * 0.1) * (Math.random() < 0.5 ? -1 : 1),
            alpha: alphaInitial,
          })
        }
      }
    }

    function initializeaza() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.max(16, Math.min(56, Math.round((W * H) / 26000)))
      noduri = Array.from({ length: n }, () => {
        const z = 0.55 + Math.random() * 0.45
        const unghi = Math.random() * Math.PI * 2
        const v = 4 + Math.random() * 5
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: Math.cos(unghi) * v,
          vy: Math.sin(unghi) * v,
          ox: 0,
          oy: 0,
          s: (17 + Math.random() * 11) * z,
          z,
          faza: Math.random() * Math.PI * 2,
          f: stareRef.current === 'parola' ? 1 : 0,
        }
      })
      legaturi = []
      completeazaLegaturi(1)
      completeazaLegaturi(1) // a doua trecere: unele noduri primesc a doua legatura
      pulsuri.length = 0
    }

    function actualizeaza(dt: number, acum: number) {
      const st = stareRef.current
      // tranzitii line intre stari (~0,6 s)
      viteza += ((st === 'parola' ? 0.35 : 1) - viteza) * Math.min(1, dt * 3)
      tenta += ((st === 'parola' ? 1 : 0) - tenta) * Math.min(1, dt * 3)
      if (mouse.atingere && acum - mouse.atingere > 1200) {
        mouse.activ = false
        mouse.atingere = 0
      }
      const cx = W / 2
      const cy = H / 2
      const diag = Math.hypot(cx, cy)
      for (const n of noduri) {
        n.x += n.vx * dt * viteza
        n.y += n.vy * dt * viteza + Math.sin(acum / 2400 + n.faza) * 2 * dt * viteza
        const m = 40
        if (n.x < -m) n.x = W + m
        if (n.x > W + m) n.x = -m
        if (n.y < -m) n.y = H + m
        if (n.y > H + m) n.y = -m
        // impingere mica de la mouse, amortizata (revine lin)
        let tx = 0
        let ty = 0
        if (mouse.activ) {
          const dx = n.x - mouse.x
          const dy = n.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < RAZA_MOUSE && d > 0.1) {
            const k = (1 - d / RAZA_MOUSE) ** 2 * IMPINGERE
            tx = (dx / d) * k
            ty = (dy / d) * k
          }
        }
        const r = Math.min(1, dt * 3)
        n.ox += (tx - n.ox) * r
        n.oy += (ty - n.oy) * r
        // dosar <-> scut: val de la formular (centru) spre margini
        const tinta = st === 'parola' ? 1 : 0
        const intarziere = (Math.hypot(n.x - cx, n.y - cy) / diag) * 0.45
        if (tinta === 0 || acum - schimbareStare > intarziere * 1000) {
          n.f += Math.sign(tinta - n.f) * Math.min(Math.abs(tinta - n.f), dt * 2.2)
        }
      }
      // legaturile se sting lin cand nodurile se departeaza; din cand in cand apar altele noi
      for (const l of legaturi) {
        const d = dist(noduri[l.a], noduri[l.b])
        const tinta = d < LEGATURA_MAX - 40 ? 1 : Math.max(0, 1 - (d - (LEGATURA_MAX - 40)) / 40)
        l.alpha += (tinta - l.alpha) * Math.min(1, dt * 1.5)
      }
      legaturi = legaturi.filter((l) => l.alpha > 0.01 || dist(noduri[l.a], noduri[l.b]) < LEGATURA_MAX)
      if (acum - ultimeLegaturi > 1500) {
        ultimeLegaturi = acum
        completeazaLegaturi(0)
      }
      // pulsuri spre formular
      if (st === 'email' && acum - ultimPuls > 320 && pulsuri.length < 24 && legaturi.length) {
        ultimPuls = acum
        const l = legaturi[Math.floor(Math.random() * legaturi.length)]
        const dir = spreCentru(l)
        if (dir) pulsuri.push({ l, dir, t: 0, hopuri: 3 })
      }
      for (let k = pulsuri.length - 1; k >= 0; k--) {
        const p = pulsuri[k]
        p.t += dt * 1.1
        if (p.t < 1) continue
        const capat = p.dir === 1 ? p.l.b : p.l.a
        const urm = p.hopuri > 0 && st === 'email' ? urmatoareaSpreCentru(capat, p.l) : null
        if (urm) {
          p.l = urm.l
          p.dir = urm.dir
          p.t = 0
          p.hopuri--
        } else {
          pulsuri.splice(k, 1)
        }
      }
    }

    // sensul pe legatura care apropie de centru (formular)
    function spreCentru(l: Legatura): 1 | -1 | 0 {
      const da = Math.hypot(noduri[l.a].x - W / 2, noduri[l.a].y - H / 2)
      const db = Math.hypot(noduri[l.b].x - W / 2, noduri[l.b].y - H / 2)
      return db < da ? 1 : da < db ? -1 : 0
    }
    function urmatoareaSpreCentru(nod: number, exceptie: Legatura): { l: Legatura; dir: 1 | -1 } | null {
      const d0 = Math.hypot(noduri[nod].x - W / 2, noduri[nod].y - H / 2)
      for (const l of legaturi) {
        if (l === exceptie || l.alpha < 0.3) continue
        if (l.a !== nod && l.b !== nod) continue
        const alt = l.a === nod ? l.b : l.a
        if (Math.hypot(noduri[alt].x - W / 2, noduri[alt].y - H / 2) < d0) return { l, dir: l.a === nod ? 1 : -1 }
      }
      return null
    }

    function control(l: Legatura) {
      const [x1, y1] = poz(noduri[l.a])
      const [x2, y2] = poz(noduri[l.b])
      const d = Math.hypot(x2 - x1, y2 - y1) || 1
      const k = l.curb * d
      return [x1, y1, x2, y2, (x1 + x2) / 2 - ((y2 - y1) / d) * k, (y1 + y2) / 2 + ((x2 - x1) / d) * k] as const
    }

    function deseneaza(acum: number) {
      ctx!.clearRect(0, 0, W, H)
      ctx!.lineCap = 'round'
      // legaturi, in stilul liniilor din meniul lateral
      for (const l of legaturi) {
        if (l.alpha < 0.01) continue
        const [x1, y1, x2, y2, cx, cy] = control(l)
        let a = l.alpha * Math.min(noduri[l.a].z, noduri[l.b].z)
        if (mouse.activ) {
          const dm = Math.hypot((x1 + x2) / 2 - mouse.x, (y1 + y2) / 2 - mouse.y)
          if (dm < 200) a = Math.min(1, a * (1 + (1 - dm / 200) * 0.9))
        }
        ctx!.setLineDash([])
        if (l.stil === 'albastru' || l.stil === 'mov') {
          const c1 = l.stil === 'albastru' ? C_ALBASTRU : C_MOV
          const c2 = l.stil === 'albastru' ? C_MOV : C_VERDE
          const varf = amesteca(c1, C_MOV, tenta * 0.6)
          const g = ctx!.createLinearGradient(x1, y1, x2, y2)
          g.addColorStop(0, rgba(c1, 0))
          g.addColorStop(0.5, rgba(varf, 0.7 * a))
          g.addColorStop(1, rgba(c2, 0))
          ctx!.strokeStyle = g
          ctx!.lineWidth = l.stil === 'albastru' ? 1.4 : 1.2
        } else if (l.stil === 'verde') {
          ctx!.strokeStyle = rgba(amesteca(C_VERDE, C_MOV, tenta * 0.5), 0.5 * a)
          ctx!.lineWidth = 1.2
          ctx!.setLineDash([4, 8])
          ctx!.lineDashOffset = -((acum / 3000) * 48) % 48 // ca dashFlow 3s
        } else {
          ctx!.strokeStyle = rgba(amesteca(C_PUNCTAT, C_MOV, tenta * 0.6), 0.45 * a)
          ctx!.lineWidth = 1
          ctx!.setLineDash([2, 10])
          ctx!.lineDashOffset = ((acum / 4500) * 48) % 48 // invers, 4,5s
        }
        ctx!.beginPath()
        ctx!.moveTo(x1, y1)
        ctx!.quadraticCurveTo(cx, cy, x2, y2)
        ctx!.stroke()
      }
      ctx!.setLineDash([])
      // pulsuri
      for (const p of pulsuri) {
        const [x1, y1, x2, y2, cx, cy] = control(p.l)
        const t = p.dir === 1 ? p.t : 1 - p.t
        const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2
        const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2
        const g = ctx!.createRadialGradient(x, y, 0, x, y, 8)
        g.addColorStop(0, 'rgba(219,234,254,.95)')
        g.addColorStop(0.35, 'rgba(96,165,250,.55)')
        g.addColorStop(1, 'rgba(96,165,250,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(x, y, 8, 0, Math.PI * 2)
        ctx!.fill()
      }
      // iconite
      for (const n of noduri) {
        const [x, y] = poz(n)
        const scaleX = Math.max(0.04, Math.abs(Math.cos(n.f * Math.PI)))
        const s = n.s
        ctx!.save()
        ctx!.translate(x, y)
        ctx!.scale(s * scaleX, s)
        ctx!.lineWidth = 1.5 / s
        ctx!.lineJoin = 'round'
        const a = 0.35 + n.z * 0.5
        if (n.f > 0.5) {
          ctx!.save()
          ctx!.clip(SCUT)
          ctx!.fillStyle = `rgba(96,0,192,${a * 0.9})`
          ctx!.fillRect(-0.5, -0.5, 0.5, 1)
          ctx!.fillStyle = `rgba(0,168,72,${a * 0.9})`
          ctx!.fillRect(0, -0.5, 0.5, 1)
          ctx!.fillStyle = `rgba(0,96,240,${a})`
          ctx!.fillRect(-0.5, 0.18, 1, 0.4)
          ctx!.restore()
          ctx!.strokeStyle = `rgba(255,255,255,${a * 0.55})`
          ctx!.stroke(SCUT)
          ctx!.strokeStyle = `rgba(255,255,255,${a})`
          ctx!.lineWidth = 2 / s
          ctx!.stroke(BIFA)
        } else {
          const c = amesteca([47, 123, 255], [150, 90, 255], tenta)
          ctx!.fillStyle = rgba(c, 0.1 * a)
          ctx!.fill(DOSAR)
          ctx!.strokeStyle = rgba(c, a)
          ctx!.stroke(DOSAR)
          ctx!.stroke(DOSAR_COLT)
          ctx!.strokeStyle = rgba(c, a * 0.75)
          ctx!.stroke(DOSAR_RANDURI)
        }
        ctx!.restore()
      }
      if (tenta > 0.01) {
        ctx!.fillStyle = `rgba(96,0,192,${0.1 * tenta})`
        ctx!.fillRect(0, 0, W, H)
      }
    }

    function cadru(acum: number) {
      const dt = Math.min(0.05, (acum - ultim) / 1000)
      ultim = acum
      if (stareRef.current !== stareAnterioara) {
        stareAnterioara = stareRef.current
        schimbareStare = acum
      }
      actualizeaza(dt, acum)
      deseneaza(acum)
      raf = requestAnimationFrame(cadru)
    }

    function desenStatic() {
      const acum = performance.now()
      for (const n of noduri) n.f = stareRef.current === 'parola' ? 1 : 0
      tenta = stareRef.current === 'parola' ? 1 : 0
      deseneaza(acum)
    }

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.activ = true
      mouse.atingere = e.pointerType === 'mouse' ? 0 : performance.now()
    }
    const onLeave = () => {
      mouse.activ = false
    }
    const onResize = () => {
      initializeaza()
      if (fara) desenStatic()
    }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        ultim = performance.now()
        raf = requestAnimationFrame(cadru)
      }
    }

    initializeaza()
    window.addEventListener('resize', onResize)
    if (fara) {
      desenStatic()
      desenStaticRef.current = desenStatic
    } else {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerdown', onMove)
      document.documentElement.addEventListener('pointerleave', onLeave)
      document.addEventListener('visibilitychange', onVis)
      raf = requestAnimationFrame(cadru)
    }
    return () => {
      cancelAnimationFrame(raf)
      desenStaticRef.current = null
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fara])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 h-full w-full" />
}
