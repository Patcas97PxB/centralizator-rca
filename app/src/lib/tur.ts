// Tutorialul interactiv de la prima intrare (13.11.2026, din lista „Must Have” a utilizatorului:
// „Vrei tutorial?”, săgeți/iconițe/zoom pe butoane). Aici e doar ținerea de minte + pornirea;
// pașii și desenul sunt în components/tur/Tur.tsx.
//
// „Văzut” se ține pe browser ȘI pe adresă (BASE_URL): site-ul live, /demo/, /prezentare/ și /test/
// stau pe același domeniu și împart localStorage, iar un tester de pe /test/ trebuie să fie întrebat
// chiar dacă pe același calculator s-a deschis înainte altă variantă.
const CHEIE = 'rca-tur-vazut:' + import.meta.env.BASE_URL
const EVENIMENT = 'rca-tur-porneste'

export function turVazut(): boolean {
  try {
    return localStorage.getItem(CHEIE) === '1'
  } catch {
    return true // fără stocare l-am întreba la fiecare intrare — mai bine deloc
  }
}

export function marcheazaTurVazut() {
  try {
    localStorage.setItem(CHEIE, '1')
  } catch {
    /* fără stocare: rămâne doar pe sesiunea asta */
  }
}

/** Pornește tutorialul de oriunde (butonul „Reia tutorialul” din Setări). */
export function pornesteTur() {
  window.dispatchEvent(new Event(EVENIMENT))
}

export function laPornireTur(f: () => void) {
  window.addEventListener(EVENIMENT, f)
  return () => window.removeEventListener(EVENIMENT, f)
}
