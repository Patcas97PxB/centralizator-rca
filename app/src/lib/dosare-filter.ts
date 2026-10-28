import { avizDosar, calculRCA, etapaDosar, predareCurand, urgentaDosar, zileRamase, type TipAviz } from './rca-calc'
import type { Dosar, Etapa } from './types'

export interface DosareFiltre {
  search: string
  /** Etapa (din bife), nu statusul salvat. */
  status: Etapa | 'toate'
  perioada: 'toate' | '7' | '30'
  sortare: 'actualizare' | 'urgenta' | 'nrDosar'
  service: string
  startFrom: string
  startTo: string
  /** Setat doar de clopoțelul de notificări din Header — nu are control propriu în FilterBar. */
  doarDepasite: boolean
  /** Doar dosarele marcate „Amintește-mi" (butonul „Ale mele" din bara de filtre). */
  doarAmintite: boolean
  /** Un chip din rândul „De făcut azi": dosarele cu avizul respectiv (sau predările de azi/mâine). */
  deFacut: TipAviz | 'predare' | null
}

export const filtreImplicite: DosareFiltre = {
  search: '',
  status: 'toate',
  perioada: 'toate',
  sortare: 'actualizare',
  service: '',
  startFrom: '',
  startTo: '',
  doarDepasite: false,
  doarAmintite: false,
  deFacut: null,
}

const fara = (s: string) => s.replace(/[\s\-./]/g, '')

// Aceleasi campuri cautate ca in render() (index.html).
export function corespundeCautarii(d: Dosar, search: string): boolean {
  if (!search) return true
  const hay = [d.nrDosar, d.nrRezervare, d.nrAutoPagubit, d.marcaModel, d.nrAutoInlocuire,
    d.asigurator, d.service, d.telClient, d.telService, d.notes, d.proprietarPagubit]
    .join(' ')
    .toLowerCase()
  const s = search.toLowerCase()
  return hay.includes(s) || fara(hay).includes(fara(s))
}

function corespundePerioadei(d: Dosar, perioada: DosareFiltre['perioada']): boolean {
  if (perioada === 'toate' || !d.start) return true
  const zile = perioada === '7' ? 7 : 30
  const limita = new Date()
  limita.setDate(limita.getDate() - zile)
  return new Date(d.start + 'T00:00:00') >= limita
}

function corespundeDeFacut(d: Dosar, tip: TipAviz | 'predare'): boolean {
  return tip === 'predare' ? predareCurand(d) : avizDosar(d)?.tip === tip
}

/** Câte dosare are fiecare etapă, cu celelalte filtre aplicate (pentru tab-urile de deasupra cardurilor). */
export function numaraEtape(dosare: Dosar[], f: DosareFiltre): Record<Etapa | 'toate', number> {
  const toate = filtreazaSiSorteazaDosare(dosare, { ...f, status: 'toate' })
  const n: Record<Etapa | 'toate', number> = { toate: toate.length, rezervat: 0, la_client: 0, de_trimis: 0, finalizat: 0 }
  for (const d of toate) n[etapaDosar(d)]++
  return n
}

export function filtreazaSiSorteazaDosare(dosare: Dosar[], f: DosareFiltre): Dosar[] {
  const filtrate = dosare.filter((d) => {
    if (!corespundeCautarii(d, f.search)) return false
    if (f.status !== 'toate' && etapaDosar(d) !== f.status) return false
    if (!corespundePerioadei(d, f.perioada)) return false
    if (f.service && d.service !== f.service) return false
    if (f.startFrom && (!d.start || d.start < f.startFrom)) return false
    if (f.startTo && (!d.start || d.start > f.startTo)) return false
    if (f.doarDepasite && !urgentaDosar(d).depasit) return false
    if (f.doarAmintite && !(d.amintesteMi && d.status !== 'finalizat')) return false
    if (f.deFacut && !corespundeDeFacut(d, f.deFacut)) return false
    return true
  })

  const cu = (d: Dosar) => zileRamase(calculRCA(d).dataPreluare)

  return filtrate.slice().sort((a, b) => {
    if (f.sortare === 'nrDosar') return a.nrDosar.localeCompare(b.nrDosar, 'ro')
    if (f.sortare === 'urgenta') {
      const za = cu(a)
      const zb = cu(b)
      if (za === null && zb === null) return 0
      if (za === null) return 1
      if (zb === null) return -1
      return za - zb
    }
    // implicit: ultima actualizare, cele mai recente primele
    return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')
  })
}
