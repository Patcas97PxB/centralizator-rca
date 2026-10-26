import { todayStr, zileRamase } from './rca-calc'
import type { Dosar } from './types'

// „Amintește-mi" cu zi si text: dosarele marcate de utilizator. Pana in ziua aleasa nu apar in
// clopotel (doar la „Ale mele" si in filtrul cu acelasi nume), din ziua aleasa apar sus in clopotel.

export const ACTIUNI_REMINDER = ['Sună clientul', 'Sună service-ul', 'Trimite mailul', 'Verifică devizul'] as const

/** Ziua (YYYY-MM-DD) peste `n` zile de azi. */
export function peste(n: number): string {
  const d = new Date(todayStr() + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const areReminder = (d: Dosar) => !!d.amintesteMi && d.status !== 'finalizat'

/** A venit ziua (sau reminder fara zi, ca inainte). */
export const reminderScadent = (d: Dosar) => areReminder(d) && (!d.amintesteLa || d.amintesteLa <= todayStr())

/** Toate reminderele mele, cele scadente primele, apoi dupa zi. */
export function remindere(dosare: Dosar[]): Dosar[] {
  return dosare.filter(areReminder).sort((a, b) => (a.amintesteLa || '').localeCompare(b.amintesteLa || ''))
}

/** „azi", „mâine", „peste 3 zile", „de 2 zile" (întârziat). */
export function textCand(zi?: string): string {
  if (!zi) return 'azi'
  const n = zileRamase(zi) ?? 0
  if (n === 0) return 'azi'
  if (n === 1) return 'mâine'
  if (n > 1) return `peste ${n} zile`
  return n === -1 ? 'de ieri' : `de ${-n} zile`
}

export const fmtZi = (zi?: string) => (zi ? zi.split('-').reverse().join('.') : '')

/** Patch-ul care scoate reminderul. */
export const faraReminder: Partial<Dosar> = { amintesteMi: false, amintesteLa: '', amintesteNota: '' }
