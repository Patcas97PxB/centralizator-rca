import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const SIDEBAR_W = 245
const LENGTH = 120
const TRAVEL_MS = 5200
const CYCLE_MS = 7000

interface Geo {
  w: number
  h: number
  hdr: number
}

interface Seg {
  line: SVGLineElement
  grad: SVGLinearGradientElement
  stops: SVGStopElement[]
}

// Intensitatea de-a lungul barei: transparent -> alb la mijloc -> transparent (ca in mockup).
const profile = (f: number) => 1 - Math.abs(2 * f - 1)

function paint(seg: Seg, x1: number, y1: number, x2: number, y2: number, f0: number, f1: number) {
  const set = (el: Element, attrs: Record<string, number | string>) =>
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)))
  set(seg.line, { x1, y1, x2, y2, visibility: 'visible' })
  set(seg.grad, { x1, y1, x2, y2 })
  const peakF = Math.min(Math.max(0.5, f0), f1)
  const p = f1 === f0 ? 0 : (peakF - f0) / (f1 - f0)
  set(seg.stops[0], { offset: 0, 'stop-opacity': profile(f0) })
  set(seg.stops[1], { offset: p, 'stop-opacity': profile(peakF) })
  set(seg.stops[2], { offset: 1, 'stop-opacity': profile(f1) })
}

// O singura lumina pe un singur traseu: urca pe marginea din dreapta a sidebar-ului si, exact
// unde se intalneste cu header-ul, isi schimba directia in unghi drept si merge pe marginea
// de jos a header-ului.
export function LightRay() {
  const reduced = usePrefersReducedMotion()
  const [geo, setGeo] = useState<Geo | null>(null)
  const vLine = useRef<SVGLineElement>(null)
  const hLine = useRef<SVGLineElement>(null)
  const vGrad = useRef<SVGLinearGradientElement>(null)
  const hGrad = useRef<SVGLinearGradientElement>(null)

  useEffect(() => {
    const measure = () => {
      const header = document.querySelector('header')
      setGeo({
        w: document.documentElement.clientWidth,
        h: window.innerHeight,
        hdr: header ? header.offsetHeight : 66,
      })
    }
    measure()
    window.addEventListener('resize', measure)
    const header = document.querySelector('header')
    const ro = header ? new ResizeObserver(measure) : null
    if (header && ro) ro.observe(header)
    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  }, [])

  useEffect(() => {
    if (reduced || !geo) return
    const vl = vLine.current
    const hl = hLine.current
    const vg = vGrad.current
    const hg = hGrad.current
    if (!vl || !hl || !vg || !hg) return
    const v: Seg = { line: vl, grad: vg, stops: Array.from(vg.querySelectorAll('stop')) }
    const h: Seg = { line: hl, grad: hg, stops: Array.from(hg.querySelectorAll('stop')) }

    const x0 = SIDEBAR_W - 1
    const y0 = geo.hdr - 0.5
    const V = geo.h - y0
    const total = V + (geo.w - x0)

    let raf = 0
    const start = performance.now()
    const frame = (now: number) => {
      const t = (now - start) % CYCLE_MS
      if (t > TRAVEL_MS) {
        v.line.setAttribute('visibility', 'hidden')
        h.line.setAttribute('visibility', 'hidden')
      } else {
        const head = (t / TRAVEL_MS) * (total + LENGTH)
        const tail = head - LENGTH

        const v1 = Math.max(tail, 0)
        const v2 = Math.min(head, V)
        if (v2 > v1 + 0.5) paint(v, x0, geo.h - v1, x0, geo.h - v2, (v1 - tail) / LENGTH, (v2 - tail) / LENGTH)
        else v.line.setAttribute('visibility', 'hidden')

        const h1 = Math.max(tail, V)
        const h2 = Math.min(head, total)
        if (h2 > h1 + 0.5) paint(h, x0 + (h1 - V) - (h1 <= V + 0.01 ? 1 : 0), y0, x0 + (h2 - V), y0, (h1 - tail) / LENGTH, (h2 - tail) / LENGTH)
        else h.line.setAttribute('visibility', 'hidden')
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [geo, reduced])

  if (reduced || !geo) return null

  const stops = (
    <>
      <stop stopColor="#ffffff" stopOpacity="0" />
      <stop stopColor="#ffffff" stopOpacity="1" />
      <stop stopColor="#ffffff" stopOpacity="0" />
    </>
  )

  return (
    <svg
      aria-hidden
      width={geo.w}
      height={geo.h}
      className="pointer-events-none fixed left-0 top-0 z-[35] hidden md:block"
      style={{ filter: 'drop-shadow(0 0 5px rgba(191,219,254,.9)) drop-shadow(0 0 12px rgba(96,165,250,.55))' }}
    >
      <defs>
        <linearGradient ref={vGrad} id="lightRayV" gradientUnits="userSpaceOnUse">
          {stops}
        </linearGradient>
        <linearGradient ref={hGrad} id="lightRayH" gradientUnits="userSpaceOnUse">
          {stops}
        </linearGradient>
      </defs>
      <line ref={vLine} stroke="url(#lightRayV)" strokeWidth={2} visibility="hidden" />
      <line ref={hLine} stroke="url(#lightRayH)" strokeWidth={1} visibility="hidden" />
    </svg>
  )
}
