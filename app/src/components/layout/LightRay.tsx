import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

const SIDEBAR_W = 245
const TURN_R = 14
const TAIL_PX = 200
const DURATION = 9

interface Geo {
  w: number
  h: number
  hdr: number
}

// O singura lumina pe un singur traseu: urca pe marginea din dreapta a sidebar-ului,
// vireaza rotunjit la marginea de jos a header-ului si continua spre dreapta.
export function LightRay() {
  const reduced = usePrefersReducedMotion()
  const [geo, setGeo] = useState<Geo | null>(null)

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

  if (reduced || !geo) return null

  const x = SIDEBAR_W - 0.5
  const y = geo.hdr - 0.5
  const d = `M ${x} ${geo.h} L ${x} ${y + TURN_R} Q ${x} ${y} ${x + TURN_R} ${y} L ${geo.w} ${y}`
  const totalPx = geo.h - (y + TURN_R) + (Math.PI * TURN_R) / 2 + (geo.w - (x + TURN_R))
  const norm = (px: number) => (px / totalPx) * 100
  const tail = norm(TAIL_PX)

  const layer = (lenPx: number, stroke: string, width: number) => {
    const l = norm(lenPx)
    return (
      <path
        d={d}
        pathLength={100}
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={`${l} 400`}
        style={{ animation: `rayRun ${DURATION}s linear infinite`, ['--l' as string]: l, ['--e' as string]: l - (100 + tail) }}
      />
    )
  }

  return (
    <svg
      aria-hidden
      width={geo.w}
      height={geo.h}
      className="pointer-events-none fixed left-0 top-0 z-[35] hidden md:block"
      style={{ filter: 'drop-shadow(0 0 3px rgba(147,197,253,.85))' }}
    >
      <g fill="none" strokeLinecap="round">
        {layer(TAIL_PX, 'rgba(96,165,250,.22)', 1)}
        {layer(TAIL_PX * 0.5, 'rgba(147,197,253,.5)', 1)}
        {layer(TAIL_PX * 0.18, '#eaf3ff', 1.1)}
      </g>
    </svg>
  )
}
