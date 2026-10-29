import { formatCanonic } from './majuscule'
import { STARE } from './culori'

// Forma unui dosar, asa cum e stocata azi in Supabase (tabelul `dosare`, coloana `data`
// jsonb — vezi supabase/migrations/20260921120000_dosare_servicii_per_row.sql). Portata
// din campurile citite/scrise de saveDosar()/openModal() in index.html.
// Valorile vechi raman doar pentru dosarele salvate inainte de etape; in aplicatie conteaza doar
// „finalizat". Etapa afisata se calculeaza din bife (etapaDosar, lib/rca-calc.ts).
export type StatusDosar =
  | 'in_asteptare'
  | 'de_predat'
  | 'de_preluat'
  | 'de_sunat'
  | 'astept_docum'
  | 'finalizat'

/** Etapa dosarului, pusa automat din bifele de pe card: Predat → Preluat → Finalizat. */
export type Etapa = 'rezervat' | 'la_client' | 'de_trimis' | 'finalizat'

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
  /** Masina predata clientului → etapa „La client". */
  predatBifat?: boolean
  /** Masina s-a intors → etapa „De trimis" (documentele, drive-ul si mailul inca nu sunt gata). */
  preluatBifat?: boolean
  /** Ziua bifei Preluat (YYYY-MM-DD) — de aici se numara avizul „netrimis". */
  preluatLa?: string
  /** Fisierele din folderul de pe laptop mutate de mana in alta categorie: nume fisier → tipul ales. */
  categoriiFolder?: Record<string, string>
  /** Marcat de mana „Amintește-mi": dosarul apare in clopotel. */
  amintesteMi?: boolean
  /** Ziua din care reminderul apare în clopoțel (YYYY-MM-DD); gol = imediat. */
  amintesteLa?: string
  /** Ce ai de făcut („Sună service-ul”, text liber). */
  amintesteNota?: string
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
  /** Numele clientului (proprietarul mașinii păgubite) — completat în „Document intrare/ieșire”. */
  numeClient?: string
  /** Proprietarul auto păgubit, așa cum apare pe NC/PV (citit la PRELUARE DATE sau scris de mână). */
  proprietarPagubit?: string
  /** Din contractul final: data reală a plecării clientului cu mașina / a predării ei înapoi (YYYY-MM-DD). */
  dataPlecareContract?: string
  dataPredareContract?: string
  /** Versiunea regulii cu care s-a căutat clientul în contract (sub `VERSIUNE_CLIENT` → se recitește de pe laptop o dată). */
  clientCititV?: number
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

export const ETAPA_META: Record<Etapa, { label: string; color: string; detaliu: string }> = {
  rezervat: { label: 'DE PREDAT', color: STARE.albastru, detaliu: 'mașina nu e încă predată' },
  la_client: { label: 'LA CLIENT', color: STARE.verde, detaliu: 'predată · curge termenul' },
  de_trimis: { label: 'DE TRIMIS', color: STARE.mov, detaliu: 'preluată · documente, drive, mail' },
  finalizat: { label: 'FINALIZAT', color: STARE.gri, detaliu: 'dosar închis' },
}

// Dosarele mai vechi (migrate din blob-ul app_storage sau salvate inainte sa existe un
// camp anume) pot avea in Supabase un obiect caruia ii lipsesc campuri intregi — de exemplu
// `documente`/`etichetaOptionale` pur si simplu absente, nu `[]`. Codul din aplicatie (ex.
// DocumenteSection) presupune ca sunt mereu array-uri; fara normalizare, un asemenea dosar
// arunca o eroare la deschidere si utilizatorul vede "nu se intampla nimic". Se aplica o
// singura data, la citirea din Supabase (dosare-storage.ts), ca tot codul din aval sa
// primeasca mereu un obiect complet. Nr. auto / RBH vechi se aduc la formatul comun (formatCanonic).
// RCA vinovat / RCA pagubit au fost unite cu documentele partii respective.
const ETICHETE_VECHI_DOC: Record<string, string> = { rca_vinovat: 'doc_vinovat', rca_pagubit: 'doc_pagubit' }

export function normalizeazaDosar(raw: Partial<Dosar> & { id: string }): Dosar {
  return {
    ...dosarGol(),
    ...formatCanonic(raw),
    // vechiul status „De sunat" devine avizul „Amintește-mi"
    amintesteMi: raw.amintesteMi ?? raw.status === 'de_sunat',
    documente: Array.isArray(raw.documente) ? raw.documente.map((x) => ({ ...x, eticheta: ETICHETE_VECHI_DOC[x.eticheta] ?? x.eticheta })) : [],
    etichetaOptionale: Array.isArray(raw.etichetaOptionale)
      ? [...new Set(raw.etichetaOptionale.map((k) => ETICHETE_VECHI_DOC[k] ?? k))]
      : [],
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
