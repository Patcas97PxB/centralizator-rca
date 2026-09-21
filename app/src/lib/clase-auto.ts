// js/clase-auto.js e incarcat ca script global in index.html (vezi vite.config.ts,
// copySharedJs) — exact aceeasi sursa ca site-ul vechi si ca tests/, nu se duplica logica.
export interface VehicleClass {
  clasa: string
  models: string
}

// `function` la nivel de top intr-un <script> clasic devine proprietate pe `window`;
// `const VEHICLE_CLASSES` ramane in mediul lexical global (vizibil ca identificator bar,
// nu pe `window`) — de-aia cele doua declaratii de mai jos difera.
declare const VEHICLE_CLASSES: VehicleClass[]
declare global {
  interface Window {
    suggestClasaFromModel: (text: string) => string
  }
}

export function suggestClasaFromModel(text: string): string {
  return window.suggestClasaFromModel(text)
}
export function vehicleClasses(): VehicleClass[] {
  return VEHICLE_CLASSES
}

// Portat din normalizeClasaCode() (index.html) — codul de clasa dintr-un contract final
// poate fi scris prescurtat (ex. "L" pentru "L/eL") sau doar cu literele de inceput.
export function normalizeClasaCode(raw: string): string {
  if (!raw) return ''
  const r = raw.trim().toUpperCase()
  if (VEHICLE_CLASSES.some((vc) => vc.clasa === r)) return r
  if (r === 'L' && VEHICLE_CLASSES.some((vc) => vc.clasa === 'L/eL')) return 'L/eL'
  const match = VEHICLE_CLASSES.find((vc) => vc.clasa.toUpperCase() === r || vc.clasa.toUpperCase().startsWith(r))
  return match ? match.clasa : ''
}
