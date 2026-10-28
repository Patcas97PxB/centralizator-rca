// Culorile de stare în TypeScript — trimit la variabilele --st-* din index.css (vezi DESIGN.md), ca să
// urmeze tema (dark / light). Combinate cu transparență prin hex(culoare, '66') din lib/color.ts.
// În rest, componentele folosesc clasele Tailwind ale rolurilor (text-st-green, bg-surface-2…).
export const STARE = {
  rosu: 'var(--st-red)',
  galben: 'var(--st-amber)',
  verde: 'var(--st-green)',
  albastru: 'var(--st-blue)',
  gri: 'var(--st-gray)',
  mov: 'var(--st-violet)',
  portocaliu: 'var(--st-orange)',
  cyan: 'var(--st-cyan)',
  /** Finalizat: gri neutru (fără nuanța albăstruie a --st-gray), ca să nu semene cu albastrul. */
  stins: 'var(--tx-3)',
} as const
