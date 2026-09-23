export function hex(color: string, alphaHex: string): string {
  return color + alphaHex
}

export const ALPHA = {
  tileBg: '1f',
  tileBorder: '59',
  badgeBg: '22',
  glowStrong: 'cc',
  glowSoft: '2e',
  wash: '1a',
} as const

export interface AccentStyle {
  tileBg: string
  tileBorder: string
  badgeBg: string
  railGlow: string
}

export function accentStyle(color: string): AccentStyle {
  return {
    tileBg: hex(color, ALPHA.tileBg),
    tileBorder: hex(color, ALPHA.tileBorder),
    badgeBg: hex(color, ALPHA.badgeBg),
    railGlow: `0 0 14px 2px ${hex(color, 'aa')}`,
  }
}
