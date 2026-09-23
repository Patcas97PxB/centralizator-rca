// Forma unui dosar, asa cum e stocata azi in Supabase (tabelul `dosare`, coloana `data`
// jsonb — vezi supabase/migrations/20260921120000_dosare_servicii_per_row.sql). Portata
// din campurile citite/scrise de saveDosar()/openModal() in index.html.
export type StatusDosar =
  | 'in_asteptare'
  | 'de_predat'
  | 'de_preluat'
  | 'de_sunat'
  | 'astept_docum'
  | 'finalizat'

export type Vehicul = 'deplasabil' | 'nedeplasabil'

export interface DocumentDosar {
  id: string
  nume: string
  eticheta: string
  assetId?: string
  url?: string
}

export interface Dosar {
  id: string
  nrDosar: string
  nrRezervare: string
  nrAutoPagubit: string
  marcaModel: string
  nrAutoInlocuire: string
  marcaModelInlocuire?: string
  /** Informativ: contractul a inceput (masina predata). Nu schimba statusul dosarului. */
  predatBifat?: boolean
  /** Informativ: masina s-a intors la client. Nu schimba statusul dosarului. */
  preluatBifat?: boolean
  clasaAuto: string
  valoareContract: string
  valoareContractCuTVA: string
  zileContractFinal: string
  asigurator: string
  vehicul: Vehicul
  zileDeviz: string
  zileDevizExplicatie: string
  zileDevizFormula: string
  dataPolita: string
  dataNcAr: string
  dataOferta: string
  service: string
  telClient: string
  telService: string
  start: string
  end: string
  notes: string
  status: StatusDosar
  documente: DocumentDosar[]
  etichetaOptionale: string[]
  dte: boolean
  dteLastCalled: string | null
  /** Randul din Supabase are propriul `updated_at` (coloana, nu in jsonb) — vezi dosare-storage.ts. */
  updatedAt?: string
  /** Folosite de Rapoarte (Financiar) — existau in obiectul JS din index.html, netipizate. */
  comisionProcent?: number
  contractFinalIncarcat?: boolean
}

export interface Serviciu {
  id: string
  nume: string
  telefon: string
}

export const STATUS_META: Record<StatusDosar, { label: string; color: string }> = {
  in_asteptare: { label: 'ÎN AȘTEPTARE', color: '#3d8bff' },
  de_predat: { label: 'DE PREDAT', color: '#3d8bff' },
  de_preluat: { label: 'DE PRELUAT', color: '#00f5a0' },
  de_sunat: { label: 'DE SUNAT', color: '#fb923c' },
  astept_docum: { label: 'SE AȘTEAPTĂ DOCUMENTE', color: '#e879f9' },
  finalizat: { label: 'FINALIZAT', color: '#94a3b8' },
}

// Dosarele mai vechi (migrate din blob-ul app_storage sau salvate inainte sa existe un
// camp anume) pot avea in Supabase un obiect caruia ii lipsesc campuri intregi — de exemplu
// `documente`/`etichetaOptionale` pur si simplu absente, nu `[]`. Codul din aplicatie (ex.
// DocumenteSection) presupune ca sunt mereu array-uri; fara normalizare, un asemenea dosar
// arunca o eroare la deschidere si utilizatorul vede "nu se intampla nimic". Se aplica o
// singura data, la citirea din Supabase (dosare-storage.ts), ca tot codul din aval sa
// primeasca mereu un obiect complet.
export function normalizeazaDosar(raw: Partial<Dosar> & { id: string }): Dosar {
  return {
    ...dosarGol(),
    ...raw,
    documente: Array.isArray(raw.documente) ? raw.documente : [],
    etichetaOptionale: Array.isArray(raw.etichetaOptionale) ? raw.etichetaOptionale : [],
  }
}

export function dosarGol(): Dosar {
  return {
    id: '',
    nrDosar: '',
    nrRezervare: '',
    nrAutoPagubit: '',
    marcaModel: '',
    nrAutoInlocuire: '',
    clasaAuto: '',
    valoareContract: '',
    valoareContractCuTVA: '',
    zileContractFinal: '',
    asigurator: '',
    vehicul: 'deplasabil',
    zileDeviz: '',
    zileDevizExplicatie: '',
    zileDevizFormula: '',
    dataPolita: '',
    dataNcAr: '',
    dataOferta: '',
    service: '',
    telClient: '',
    telService: '',
    start: '',
    end: '',
    notes: '',
    status: 'in_asteptare',
    documente: [],
    etichetaOptionale: [],
    dte: false,
    dteLastCalled: null,
  }
}
