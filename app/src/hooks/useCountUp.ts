import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

export function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      setValue(target)
      fromRef.current = target
      return
    }
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = Math.round(from + (target - from) * eased)
      setValue(next)
      fromRef.current = next
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduced])

  return value
}
