// Portat 1:1 din index.html — extrage din textul contractului final (export winMentor)
// datele care confirma/completeaza dosarul, si detecteaza cand fisierul incarcat apartine
// altui dosar (verificare incrucisata pe nr. contract/dosar/auto/asigurator).
import { normalizeClasaCode } from './clase-auto'

export function formatPlate(raw: string): string {
  if (!raw) return ''
  const c = raw.replace(/[\s-]/g, '').toUpperCase()
  const m = c.match(/^([A-Z]{1,2})(\d{2,3})([A-Z]{3})$/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : raw.trim().toUpperCase()
}
export function normPlate(raw?: string | null): string {
  return (raw || '').toUpperCase().replace(/[\s-]/g, '')
}

export interface ContractFinalExtras {
  nrContract: string
  clasa: string
  zile: string
  valoare: string
  valoareCuTVA?: string
  pretZi?: string
  asigurator: string
  nrInmatriculare: string
  nrAutoPagubit: string
  nrDosar: string
  dataPredareReala?: string
  dataPreluareReala?: string
  valid: boolean
}

// Extrage din textul contractului final (winMentor): nr. contract RBH, clasa rezervata,
// zile totale, valoare fara TVA, asigurator, nr. inmatriculare auto inchiriat (inlocuire),
// nr. auto pagubit + nr. dosar (din "Referinta").
export function parseContractFinalText(fullText: string): ContractFinalExtras {
  // OCR-ul (scanari/poze) poate citi „și" in loc de „si", „;" in loc de „:", spatii in plus etc.
  const norm = fullText.replace(/\s+/g, ' ')
  const SI = '[sșş][iîl1]'
  const out: ContractFinalExtras = {
    nrContract: '', clasa: '', zile: '', valoare: '', asigurator: '',
    nrInmatriculare: '', nrAutoPagubit: '', nrDosar: '', valid: false,
  }
  const mContract = norm.match(/Nr[.,]?\s*contract\s*[:;.]?\s*(R[B8]H)\s*[/|]\s*(\d+)/i)
  if (mContract) out.nrContract = 'RBH/' + mContract[2]

  const mZileContract = norm.match(new RegExp(`Total\\s*zile\\s*${SI}\\s*ore\\s*[:;.]?\\s*(\\d+)\\s*zile(?:\\s*${SI}\\s*(\\d+)\\s*ore)?`, 'i'))
  if (mZileContract) {
    let zileBaza = parseInt(mZileContract[1], 10)
    const ore = mZileContract[2] ? parseInt(mZileContract[2], 10) : 0
    if (ore > 0) zileBaza += 1 // orice fractie de zi se rotunjeste la o zi intreaga in plus
    out.zile = String(zileBaza)
  }

  const mClasaRez = norm.match(/Clasa\s*auto\s*rezervat[ăa]\s*[:;.]?\s*CLASA\s*([A-Za-z0-9]+)/i)
  if (mClasaRez) out.clasa = normalizeClasaCode(mClasaRez[1])

  const mRand = norm.match(/[IÎ]NCHIRIERE\s*AUTO\s*CLASA\s*[A-Za-z0-9/]*\s+(\d+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i)
  if (mRand) {
    out.valoare = mRand[3].replace(',', '.')
    out.pretZi = mRand[2].replace(',', '.')
    out.valoareCuTVA = mRand[4].replace(',', '.')
  } else {
    const mTotal = norm.match(/Valoare\s*f[aă]r[aă]\s*TVA[\s:;]*([\d.,]+)/i)
    if (mTotal) out.valoare = mTotal[1].replace(',', '.')
  }

  // Data reala de predare (plecare client cu masina) si preluare (predare masina inapoi la Autonom).
  const mPlecare = norm.match(new RegExp(`Data\\s*${SI}\\s*ora\\s*plecare[:;]?` + String.raw`\s*[A-Za-zăâîșțĂÂÎȘȚ]*,?\s*(\d{2})[.,](\d{2})[.,](\d{4})`, 'i'))
  if (mPlecare) out.dataPredareReala = `${mPlecare[3]}-${mPlecare[2]}-${mPlecare[1]}`
  const mPredareInapoi = norm.match(new RegExp(`Data\\s*${SI}\\s*ora\\s*predare[:;]?` + String.raw`\s*[A-Za-zăâîșțĂÂÎȘȚ]*,?\s*(\d{2})[.,](\d{2})[.,](\d{4})`, 'i'))
  if (mPredareInapoi) out.dataPreluareReala = `${mPredareInapoi[3]}-${mPredareInapoi[2]}-${mPredareInapoi[1]}`

  // Nr. inmatriculare (Detalii auto) = mașina de ÎNLOCUIRE oferită de Autonom clientului — NU mașina păgubită.
  const mNr = norm.match(/Nr[.,]?\s*[iî]nmatriculare\s*[:;.]?\s*([A-Z0-9\-\s]{4,12}?)\s*(?:Marca|Km|Combustibil)/i)
  if (mNr) out.nrInmatriculare = formatPlate(mNr[1])

  // Referinta (colț dreapta-sus): "B126PJF - U21202010742" = nr. auto PĂGUBIT - nr. dosar.
  const mRef = norm.match(/Referin[țt][ăa]\.?\s*(?:nr\.?)?\s*:?\s*([A-Z0-9]{5,9})\s*-\s*([A-Za-z0-9]{5,20})/i)
  if (mRef) {
    out.nrAutoPagubit = formatPlate(mRef[1])
    out.nrDosar = mRef[2].trim()
  }

  const ALIASE: Record<string, RegExp> = {
    Allianz: /allianz/i, Asirom: /asirom/i, Axeria: /axeria/i, EazyInsure: /eazy\s*(asigurari|insure)/i,
    Generali: /generali/i, Gothaer: /gothaer/i, Grawe: /grawe/i, Groupama: /groupama/i,
    Hellas: /hellas/i, Omniasig: /omniasig/i, Uniqa: /uniqa/i,
  }
  for (const [nume, re] of Object.entries(ALIASE)) {
    if (re.test(norm)) { out.asigurator = nume; break }
  }

  out.valid = !!(out.nrContract || out.valoare)
  return out
}

export interface DosarPentruVerificare {
  nrRezervare: string
  nrAutoPagubit: string
  nrDosar: string
  nrAutoInlocuire: string
  asigurator: string
}

// Verifica incrucisat contractul extras vs. dosarul curent — daca datele apartin clar
// altui dosar, refuzam completarea automata (mai bine cerem confirmare manuala decat sa
// amestecam date intre dosare).
export function detectContractGresit(ex: ContractFinalExtras, curent: DosarPentruVerificare): string | null {
  if (ex.nrContract && curent.nrRezervare && ex.nrContract !== curent.nrRezervare) {
    return `⛔ CONTRACT GREȘIT — ați încărcat contractul de la ${ex.nrContract} (acest dosar e ${curent.nrRezervare}).`
  }
  if (ex.nrAutoPagubit && curent.nrAutoPagubit && normPlate(ex.nrAutoPagubit) !== normPlate(curent.nrAutoPagubit)) {
    return `⛔ CONTRACT GREȘIT — ați încărcat contractul mașinii păgubite ${ex.nrAutoPagubit} (acest dosar e ${curent.nrAutoPagubit}).`
  }
  if (ex.nrDosar && curent.nrDosar && ex.nrDosar !== curent.nrDosar) {
    return `⛔ CONTRACT GREȘIT — ați încărcat contractul dosarului ${ex.nrDosar} (acest dosar e ${curent.nrDosar}).`
  }
  if (ex.nrInmatriculare && curent.nrAutoInlocuire && normPlate(ex.nrInmatriculare) !== normPlate(curent.nrAutoInlocuire)) {
    return `⛔ CONTRACT GREȘIT — pe contract mașina de înlocuire e ${ex.nrInmatriculare} (acest dosar are ${curent.nrAutoInlocuire}).`
  }
  if (ex.asigurator && curent.asigurator && ex.asigurator !== curent.asigurator) {
    return `⛔ CONTRACT GREȘIT — pe contract asiguratorul e ${ex.asigurator} (acest dosar are ${curent.asigurator}).`
  }
  return null
}
