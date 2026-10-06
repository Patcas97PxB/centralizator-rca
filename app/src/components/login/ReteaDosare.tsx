import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

// Fundalul paginii de login: o retea de iconite-dosar (documentul din logo) unite prin linii fine
// curbe, desenata pe Canvas — vectorial, clar pe orice ecran, fara fisiere media.
//  - mouse: dosarele din jur se dau usor la o parte, legaturile se aprind in culorile logo-ului;
//  - stare 'email': pulsuri de lumina curg pe legaturi spre formular (centrul ecranului);
//  - stare 'parola': dosarele se intorc si devin scuturi (ca in logo), reteaua incetineste si se
//    coloreaza in mov; revin la dosare cand iesi din camp.
// Cu animatiile oprite (reduced motion) se deseneaza un singur cadru static.

export type StareRetea = 'liber' | 'email' | 'parola'

const ALBASTRU = [0, 96, 240] as const
const MOV = [96, 0, 192] as const
const VERDE = [0, 168, 72] as const
const RAZA_LEGATURA = 215
const RAZA_MOUSE = 160

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

interface Puls {
  a: number
  b: number
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

const rgba = (c: readonly number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const amesteca = (a: readonly number[], b: readonly number[], t: number) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

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
    const pulsuri: Puls[] = []
    const vecini: number[][] = []
    const mouse = { x: -9999, y: -9999, activ: 0 }
    let viteza = 1
    let tenta = 0
    let ultimPuls = 0
    let ultim = performance.now()
    let raf = 0

    function initializeaza() {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width = Math.round(W * dpr)
      canvas!.height = Math.round(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const n = Math.max(18, Math.min(70, Math.round((W * H) / 22000)))
      noduri = Array.from({ length: n }, () => {
        const z = 0.55 + Math.random() * 0.45
        const unghi = Math.random() * Math.PI * 2
        const v = 6 + Math.random() * 8
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
      pulsuri.length = 0
    }

    function pozitie(n: Nod) {
      // parallax usor dupa cursor + impingerea de la mouse
      const px = mouse.activ ? (mouse.x - W / 2) * 0.012 * n.z : 0
      const py = mouse.activ ? (mouse.y - H / 2) * 0.012 * n.z : 0
      return [n.x + n.ox + px, n.y + n.oy + py] as const
    }

    function actualizeaza(dt: number, acum: number) {
      const st = stareRef.current
      viteza += ((st === 'parola' ? 0.35 : 1) - viteza) * Math.min(1, dt * 2.5)
      tenta += ((st === 'parola' ? 1 : 0) - tenta) * Math.min(1, dt * 2.5)
      if (mouse.activ && performance.now() - mouse.activ > 1500 && mouse.x !== -9999 && esteAtingere) mouse.activ = 0
      const cx = W / 2
      const cy = H / 2
      const diag = Math.hypot(cx, cy)
      for (const n of noduri) {
        n.x += n.vx * dt * viteza
        n.y += n.vy * dt * viteza + Math.sin(acum / 1800 + n.faza) * 3 * dt * viteza
        const m = 40
        if (n.x < -m) n.x = W + m
        if (n.x > W + m) n.x = -m
        if (n.y < -m) n.y = H + m
        if (n.y > H + m) n.y = -m
        let tx = 0
        let ty = 0
        if (mouse.activ) {
          const dx = n.x - mouse.x
          const dy = n.y - mouse.y
          const d = Math.hypot(dx, dy)
          if (d < RAZA_MOUSE && d > 0.1) {
            const k = (1 - d / RAZA_MOUSE) * 26
            tx = (dx / d) * k
            ty = (dy / d) * k
          }
        }
        n.ox += (tx - n.ox) * Math.min(1, dt * 6)
        n.oy += (ty - n.oy) * Math.min(1, dt * 6)
        // dosar <-> scut: val de la formular (centru) spre margini
        const tinta = st === 'parola' ? 1 : 0
        const intarziere = (Math.hypot(n.x - cx, n.y - cy) / diag) * 0.45
        if (acum - schimbareStare > intarziere * 1000 || tinta === 0) {
          n.f += Math.sign(tinta - n.f) * Math.min(Math.abs(tinta - n.f), dt * 2.2)
        }
      }
      // vecini (legaturi)
      vecini.length = 0
      for (let i = 0; i < noduri.length; i++) vecini.push([])
      for (let i = 0; i < noduri.length; i++) {
        const [xi, yi] = pozitie(noduri[i])
        for (let j = i + 1; j < noduri.length; j++) {
          const [xj, yj] = pozitie(noduri[j])
          if (Math.abs(xi - xj) < RAZA_LEGATURA && Math.abs(yi - yj) < RAZA_LEGATURA && Math.hypot(xi - xj, yi - yj) < RAZA_LEGATURA) {
            vecini[i].push(j)
            vecini[j].push(i)
          }
        }
      }
      // pulsuri spre formular
      if (st === 'email' && acum - ultimPuls > 300 && pulsuri.length < 40) {
        ultimPuls = acum
        const a = Math.floor(Math.random() * noduri.length)
        const b = spreCentru(a)
        if (b >= 0) pulsuri.push({ a, b, t: 0, hopuri: 4 })
      }
      for (let k = pulsuri.length - 1; k >= 0; k--) {
        const p = pulsuri[k]
        p.t += dt * 1.4
        if (p.t >= 1) {
          const urm = p.hopuri > 0 ? spreCentru(p.b) : -1
          if (urm >= 0 && st === 'email') {
            p.a = p.b
            p.b = urm
            p.t = 0
            p.hopuri--
          } else {
            pulsuri.splice(k, 1)
          }
        }
      }
    }

    function spreCentru(i: number): number {
      const [xi, yi] = pozitie(noduri[i])
      const di = Math.hypot(xi - W / 2, yi - H / 2)
      let best = -1
      let bestD = di
      for (const j of vecini[i] ?? []) {
        const [xj, yj] = pozitie(noduri[j])
        const d = Math.hypot(xj - W / 2, yj - H / 2)
        if (d < bestD) {
          bestD = d
          best = j
        }
      }
      return best
    }

    function controlCurba(x1: number, y1: number, x2: number, y2: number, faza: number) {
      const mx = (x1 + x2) / 2
      const my = (y1 + y2) / 2
      const d = Math.hypot(x2 - x1, y2 - y1) || 1
      const k = 0.18 * d * Math.sin(faza)
      return [mx - ((y2 - y1) / d) * k, my + ((x2 - x1) / d) * k] as const
    }

    function deseneaza(acum: number) {
      ctx!.clearRect(0, 0, W, H)
      const culLinie = amesteca([96, 165, 250], [167, 107, 255], tenta)
      // legaturi
      ctx!.lineCap = 'round'
      for (let i = 0; i < noduri.length; i++) {
        const [x1, y1] = pozitie(noduri[i])
        for (const j of vecini[i]) {
          if (j < i) continue
          const [x2, y2] = pozitie(noduri[j])
          const d = Math.hypot(x2 - x1, y2 - y1)
          const z = Math.min(noduri[i].z, noduri[j].z)
          let a = (1 - d / RAZA_LEGATURA) * 0.55 * z
          const [cx, cy] = controlCurba(x1, y1, x2, y2, noduri[i].faza + noduri[j].faza + acum / 6000)
          let stil: string | CanvasGradient = rgba(culLinie, a)
          if (mouse.activ) {
            const dm = Math.hypot((x1 + x2) / 2 - mouse.x, (y1 + y2) / 2 - mouse.y)
            if (dm < 220) {
              const aprins = 1 - dm / 220
              a = Math.min(0.9, a + aprins * 0.6)
              const g = ctx!.createLinearGradient(x1, y1, x2, y2)
              g.addColorStop(0, rgba(VERDE, a))
              g.addColorStop(0.5, rgba(ALBASTRU, a))
              g.addColorStop(1, rgba(MOV, a))
              stil = g
            }
          }
          ctx!.strokeStyle = stil
          ctx!.lineWidth = 1.2
          ctx!.beginPath()
          ctx!.moveTo(x1, y1)
          ctx!.quadraticCurveTo(cx, cy, x2, y2)
          ctx!.stroke()
        }
      }
      // pulsuri
      for (const p of pulsuri) {
        const [x1, y1] = pozitie(noduri[p.a])
        const [x2, y2] = pozitie(noduri[p.b])
        const [cx, cy] = controlCurba(x1, y1, x2, y2, noduri[p.a].faza + noduri[p.b].faza + acum / 6000)
        const t = p.t
        const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2
        const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2
        const g = ctx!.createRadialGradient(x, y, 0, x, y, 9)
        g.addColorStop(0, 'rgba(190,225,255,.95)')
        g.addColorStop(0.35, 'rgba(59,130,246,.55)')
        g.addColorStop(1, 'rgba(59,130,246,0)')
        ctx!.fillStyle = g
        ctx!.beginPath()
        ctx!.arc(x, y, 9, 0, Math.PI * 2)
        ctx!.fill()
      }
      // iconite
      for (const n of noduri) {
        const [x, y] = pozitie(n)
        const scaleX = Math.max(0.04, Math.abs(Math.cos(n.f * Math.PI)))
        const scut = n.f > 0.5
        const s = n.s
        ctx!.save()
        ctx!.translate(x, y)
        ctx!.scale(s * scaleX, s)
        ctx!.lineWidth = 1.5 / s
        ctx!.lineJoin = 'round'
        const a = 0.35 + n.z * 0.5
        if (scut) {
          ctx!.save()
          ctx!.clip(SCUT)
          ctx!.fillStyle = rgba(MOV, a * 0.9)
          ctx!.fillRect(-0.5, -0.5, 0.5, 1)
          ctx!.fillStyle = rgba(VERDE, a * 0.9)
          ctx!.fillRect(0, -0.5, 0.5, 1)
          ctx!.fillStyle = rgba(ALBASTRU, a)
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
      // tenta mov la parola
      if (tenta > 0.01) {
        ctx!.fillStyle = `rgba(96,0,192,${0.12 * tenta})`
        ctx!.fillRect(0, 0, W, H)
      }
    }

    let schimbareStare = performance.now()
    let stareAnterioara = stareRef.current
    let esteAtingere = false

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
      viteza = 0
      actualizeaza(0, acum)
      deseneaza(acum)
    }

    const onMove = (e: PointerEvent) => {
      esteAtingere = e.pointerType !== 'mouse'
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.activ = performance.now()
    }
    const onLeave = () => {
      mouse.activ = 0
      mouse.x = mouse.y = -9999
    }
    const onResize = () => {
      initializeaza()
      if (fara) desenStatic()
    }
    const onVis = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !fara) {
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
