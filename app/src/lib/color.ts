/** Culoarea cu transparență („66” = 40%); merge și cu variabile CSS (color-mix). */
export function hex(color: string, alphaHex: string): string {
  const p = Math.round((parseInt(alphaHex, 16) / 255) * 100)
  return `color-mix(in srgb, ${color} ${p}%, transparent)`
}

export const ALPHA = {
  tileBg: '1f',
  tileBorder: '59',
  badgeBg: '22',
} as const

export interface AccentStyle {
  tileBg: string
  tileBorder: string
  badgeBg: string
}

export function accentStyle(color: string): AccentStyle {
  return {
    tileBg: hex(color, ALPHA.tileBg),
    tileBorder: hex(color, ALPHA.tileBorder),
    badgeBg: hex(color, ALPHA.badgeBg),
  }
}
