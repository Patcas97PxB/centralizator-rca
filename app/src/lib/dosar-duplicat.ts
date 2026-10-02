import type { Dosar } from './types'

// Numar de dosar comparabil: fara spatii/cratime, litere mari; la Hellas ("HDR 121926")
// sufixul de dupa cratima ("-4698") nu conteaza.
export function normDosar(nr: string): string {
  const s = (nr ?? '').toUpperCase().trim()
  const hdr = s.match(/HDR[\s-]*\d+/)
  const baza = hdr ? hdr[0] : s
  return baza.replace(/[\s-]+/g, '')
}

/** Alt dosar (cu alt id) cu acelasi numar, daca exista. */
export function gasesteDuplicat(draft: Dosar, dosare: Dosar[]): Dosar | undefined {
  const n = normDosar(draft.nrDosar)
  if (!n) return undefined
  return dosare.find((d) => d.id !== draft.id && normDosar(d.nrDosar) === n)
}
