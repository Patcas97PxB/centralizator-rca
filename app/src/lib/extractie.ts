// js/extractie.js e incarcat ca script global in index.html (vezi vite.config.ts,
// copySharedJs). Nu e folosit inca in runda curenta (modalul de documente/OCR e
// deferred — vezi planul), dar wrapper-ul exista pregatit pentru rundele urmatoare.
export interface RezultatExtractie {
  nrDosar: string
  nrAuto: string
  marcaModel: string
  asigurator: string
  extraPlates: string[]
  extraDates: string[]
  extraPhones: string[]
}

declare global {
  interface Window {
    extractFromText: (text: string) => RezultatExtractie
  }
}

export function extractFromText(text: string): RezultatExtractie {
  return window.extractFromText(text)
}
