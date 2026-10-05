// Acces doar cu conturi Autonom (email + parola). Conturile le creeaza administratorul in Supabase
// (inregistrarea libera e oprita). Regula e aplicata si in baza de date (RLS, migrarea
// 20261005120000_doar_autonom.sql) — verificarea de aici e doar pentru un mesaj clar.
export const DOMENIU_PERMIS = '@autonom.com'

export function emailPermis(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith(DOMENIU_PERMIS)
}

// Nume cu diacritice pentru adresele cunoscute; restul se deduc din adresa (prenume.nume -> Nume Prenume).
const NUME_CUNOSCUTE: Record<string, string> = {
  'bogdan.patcas@autonom.com': 'Pătcaș Bogdan',
}

export function numeDinEmail(email: string | null | undefined): string {
  if (!email) return ''
  const e = email.trim().toLowerCase()
  if (NUME_CUNOSCUTE[e]) return NUME_CUNOSCUTE[e]
  const parti = e.split('@')[0].split(/[._-]+/).filter(Boolean)
  return parti
    .reverse()
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

export function initiale(nume: string): string {
  return nume
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
}
