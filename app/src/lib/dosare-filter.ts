import { calculRCA, urgentaDosar, zileRamase } from './rca-calc'
import type { Dosar, StatusDosar } from './types'

export interface DosareFiltre {
  search: string
  status: StatusDosar | 'toate'
  perioada: 'toate' | '7' | '30'
  sortare: 'actualizare' | 'urgenta' | 'nrDosar'
  service: string
  startFrom: string
  startTo: string
  /** Setat doar de clopoțelul de notificări din Header — nu are control propriu în FilterBar. */
  doarDepasite: boolean
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
}

const fara = (s: string) => s.replace(/[\s\-./]/g, '')

// Aceleasi campuri cautate ca in render() (index.html).
function corespundeCautarii(d: Dosar, search: string): boolean {
  if (!search) return true
  const hay = [d.nrDosar, d.nrRezervare, d.nrAutoPagubit, d.marcaModel, d.nrAutoInlocuire,
    d.asigurator, d.service, d.telClient, d.telService, d.notes]
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

export function filtreazaSiSorteazaDosare(dosare: Dosar[], f: DosareFiltre): Dosar[] {
  const filtrate = dosare.filter((d) => {
    if (!corespundeCautarii(d, f.search)) return false
    if (f.status !== 'toate' && d.status !== f.status) return false
    if (!corespundePerioadei(d, f.perioada)) return false
    if (f.service && d.service !== f.service) return false
    if (f.startFrom && (!d.start || d.start < f.startFrom)) return false
    if (f.startTo && (!d.start || d.start > f.startTo)) return false
    if (f.doarDepasite && !urgentaDosar(d).depasit) return false
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
