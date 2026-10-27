// Culorile de stare în TypeScript — oglinda variabilelor --st-* din index.css (vezi DESIGN.md).
// Se folosesc doar unde culoarea trebuie combinată în cod cu transparență (ex. hex(culoare, '66'));
// în rest, componentele folosesc clasele Tailwind ale rolurilor (text-st-green, bg-surface-2…).
export const STARE = {
  rosu: '#f87171',
  galben: '#fbbf24',
  verde: '#34d399',
  albastru: '#60a5fa',
  gri: '#94a3b8',
  mov: '#c084fc',
  portocaliu: '#fb923c',
} as const
