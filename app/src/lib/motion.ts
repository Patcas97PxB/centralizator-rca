import type { CSSProperties } from 'react'

export function staggerDelay(index: number, stepMs = 45, maxIndex = 10): CSSProperties {
  return { animationDelay: `${Math.min(index, maxIndex) * stepMs}ms` }
}
