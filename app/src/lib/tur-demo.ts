import { addDaysIso } from './rca-calc'
import { dosarGol, type Dosar, type DocumentDosar } from './types'

// Dosarele de exemplu din tutorial (vezi lib/tur.ts). Datele sunt puse față de ziua de azi, ca fiecare
// card să iasă mereu pe culoarea lui: roșu (termen depășit), galben, verde, albastru (de predat) și
// mov (preluată, de trimis). Sunt CINCI intenționat: pe 3 coloane ultima căsuță rămâne liberă și acolo
// încape explicația pasului „Culoarea = termenul” fără să acopere un card. Numere și nume inventate —
// repo-ul e public.
const doc = (eticheta: string): DocumentDosar => ({ id: 'tur-' + eticheta, nume: eticheta + '.pdf', eticheta })
const TOATE = ['nc', 'deviz', 'doc_pagubit', 'doc_vinovat', 'amiabila', 'cesiune', 'cerere_despagubire', 'contract', 'pv_predare', 'intrare_iesire']

export const ID_PANOU_TUR = 'tur-1'

export function dosareTur(): Dosar[] {
  const d = new Date()
  const azi = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const zi = (n: number) => addDaysIso(azi, n)
  const baza = (id: string, p: Partial<Dosar>): Dosar => ({ ...dosarGol(), id, vehicul: 'deplasabil', endManual: true, ...p })
  return [
    baza(ID_PANOU_TUR, {
      nrDosar: 'HDR 100001', nrRezervare: 'RBH 30001', asigurator: 'Hellas', nrAutoPagubit: 'BH01EXE', marcaModel: 'DACIA LOGAN',
      nrAutoInlocuire: 'BH11EXE', marcaModelInlocuire: 'DACIA DUSTER', zileDeviz: '5', start: zi(-9), end: zi(-2), predatBifat: true,
      service: 'SERVICE EXEMPLU', telClient: '0700 000 001', proprietarPagubit: 'POPESCU ION',
      notes: 'CLIENT SUNAT — ADUCE MAȘINA MÂINE DIMINEAȚĂ', documente: ['nc', 'deviz', 'doc_pagubit'].map(doc),
    }),
    baza('tur-2', {
      nrDosar: 'CJ/EX200002', nrRezervare: 'RBH 30002', asigurator: 'Allianz', nrAutoPagubit: 'BH02EXE', marcaModel: 'VW GOLF',
      nrAutoInlocuire: 'BH12EXE', marcaModelInlocuire: 'SKODA OCTAVIA', zileDeviz: '4', start: zi(-5), end: zi(1), predatBifat: true,
      documente: ['nc', 'deviz', 'doc_pagubit', 'doc_vinovat', 'amiabila'].map(doc),
    }),
    baza('tur-3', {
      nrDosar: 'BH/20260000003-C', nrRezervare: 'RBH 30003', asigurator: 'Generali', nrAutoPagubit: 'BH03EXE', marcaModel: 'FORD FOCUS',
      nrAutoInlocuire: 'BH13EXE', marcaModelInlocuire: 'RENAULT ARKANA', zileDeviz: '7', start: zi(-3), end: zi(6), predatBifat: true,
      documente: ['nc', 'deviz'].map(doc),
    }),
    baza('tur-4', {
      nrDosar: 'GR 400004', nrRezervare: 'RBH 30004', asigurator: 'Groupama', nrAutoPagubit: 'BH04EXE', marcaModel: 'TOYOTA COROLLA',
      nrAutoInlocuire: 'BH14EXE', marcaModelInlocuire: 'DACIA JOGGER', start: zi(1), end: '', endManual: false, documente: ['nc'].map(doc),
    }),
    baza('tur-5', {
      nrDosar: 'HDR 100005', nrRezervare: 'RBH 30005', asigurator: 'Hellas', nrAutoPagubit: 'BH05EXE', marcaModel: 'SKODA SUPERB',
      nrAutoInlocuire: 'BH15EXE', marcaModelInlocuire: 'VW PASSAT', zileDeviz: '6', start: zi(-10), end: zi(-1), predatBifat: true,
      preluatBifat: true, preluatLa: zi(-1), documente: TOATE.filter((k) => k !== 'cesiune' && k !== 'cerere_despagubire').map(doc),
    }),
  ]
}
