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

// Nr. dosar comparat fara spatii/cratime/majuscule ("HDR121926-4698" = "hdr 121926 4698").
// Hellas: "HDR121926-4698" = "HDR 121926" (sufixul de dupa liniuta nu face parte din nr. dosar).
export function normDosar(raw?: string | null): string {
  const n = (raw || '').toUpperCase()
  const hdr = n.match(/^\s*HDR\s*(\d+)/)
  return hdr ? 'HDR' + hdr[1] : n.replace(/[^A-Z0-9]/g, '')
}

const RE_NR_RO = /^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/

// La scanari OCR-ul confunda litere/cifre (8↔B↔S↔E, 0↔O↔D, 1↔I↔L…). Doua valori de aceeasi lungime
// care difera in cel mult 2 pozitii le consideram "probabil aceeasi" — nu declaram contract gresit pe
// baza unei litere citite prost.
const CONFUZII = ['8BES53', '0ODQ', '1IL7', '2Z', '6G', '4A']
const seConfunda = (x: string, y: string) => CONFUZII.some((g) => g.includes(x) && g.includes(y))
export function aproapeLaFel(a: string, b: string): boolean {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue
    if (!seConfunda(a[i], b[i])) return false // ex. 6 vs 7 = alt dosar, nu greseala de citire
    dif++
  }
  return dif <= 2
}

// Numar cu zecimale din OCR: "128,00" / "128.00", iar daca virgula s-a pierdut ("12800") ultimele 2 cifre
// sunt zecimalele (in tabelul de cost toate sumele au 2 zecimale).
function sumaOcr(tok: string): number | null {
  const t = tok.replace(/[^\d.,]/g, '').replace(/^[.,]+|[.,]+$/g, '')
  if (!t) return null
  const m = t.match(/^(\d{1,3}(?:\.\d{3})*|\d+)[.,](\d{2})$/)
  if (m) return parseFloat(m[1].replace(/\./g, '') + '.' + m[2])
  if (/^\d{3,}$/.test(t)) return parseInt(t, 10) / 100
  return null
}
const suma2 = (n: number) => n.toFixed(2)

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
export function parseContractFinalText(fullText: string, dinOcr = false): ContractFinalExtras {
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
  } else if (dinOcr) {
    // Scan: randul "INCHIRIERE AUTO CLASA B | 4 | 32,00 | 128,00 | 154,88" iese cu coloane pierdute sau
    // virgule lipsa. Luam sumele cu zecimale de pe rand: ultimele = pret/zi, valoare fara TVA, total cu TVA.
    // Doar randul tabelului (pe linia lui din OCR) — sub el e subsolul „WinMENTOR…", citit adesea ca zgomot.
    const linie = fullText.split(/\r?\n/).find((l) => /[IÎ]NCHIRIERE\s*AUTO\s*CLASA/i.test(l)) ?? ''
    const mR = linie.match(/[IÎ]NCHIRIERE\s*AUTO\s*CLASA\s*[A-Za-z0-9/]{0,4}\s+(.*)/i)
    const rand = mR ? mR[1].split(/MENTOR/i)[0] : ''
    const sume = rand
      .split(/\s+/)
      .filter((t) => t.replace(/\D/g, '').length > 2) // 1–2 cifre = coloana de zile, nu suma
      .map(sumaOcr)
      .filter((n): n is number => n !== null)
    const mTot = norm.match(/Total\s*[:;]\s*([\d.,]+)\s*EUR/i)
    const total = mTot ? sumaOcr(mTot[1]) : null
    let cuTva = sume.length ? sume[sume.length - 1] : null
    let faraTva = sume.length >= 2 ? sume[sume.length - 2] : null
    const pretZi = sume.length >= 3 ? sume[sume.length - 3] : null
    if (total !== null) {
      // "Total: 154,88 EUR" e scris mare si se citeste sigur — are prioritate
      if (cuTva === null || Math.abs(cuTva - total) > 0.01) {
        if (faraTva !== null && Math.abs(faraTva - total) < 0.01) faraTva = null
        cuTva = total
      }
    }
    // Verificare: valoarea fara TVA trebuie sa fie mai mica decat totalul cu TVA
    if (faraTva !== null && cuTva !== null && !(faraTva < cuTva)) faraTva = null
    if (faraTva !== null) out.valoare = suma2(faraTva)
    if (cuTva !== null) out.valoareCuTVA = suma2(cuTva)
    if (pretZi !== null && faraTva !== null && pretZi < faraTva) out.pretZi = suma2(pretZi)
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
  else {
    // Scan pe 2 coloane: dupa numar poate urma text din coloana vecina — cautam direct forma unui nr. RO.
    const mNr2 = norm.match(/Nr[.,]?\s*[iî]nmatriculare\s*[:;.]?\s*([A-Z]{1,2}\s*-?\s*\d{2,3}\s*-?\s*[A-Z]{3})(?![A-Za-z])/)
    if (mNr2) out.nrInmatriculare = formatPlate(mNr2[1])
  }

  // Referinta (colț dreapta-sus): "B126PJF - U21202010742" = nr. auto PĂGUBIT - nr. dosar.
  const mRef = norm.match(/Referin[țt][ăa]\.?\s*(?:nr\.?)?\s*[:;]?\s*([A-Z0-9]{5,9})\s*-\s*([A-Za-z0-9](?:[A-Za-z0-9/]|-(?=[A-Za-z0-9])){4,29})/i)
  if (mRef) {
    // La scan, un nr. auto care nu arata a nr. romanesc e aproape sigur citit gresit — il ignoram.
    const plate = mRef[1].toUpperCase()
    if (!dinOcr || RE_NR_RO.test(plate)) out.nrAutoPagubit = formatPlate(plate)
    out.nrDosar = mRef[2].trim()
    // Hellas Direct: formatul canonic e "HDR 121926" — fara sufixul de dupa liniuta ("HDR121926-4698"),
    // aceeasi regula ca la PRELUARE DATE (shared/extractie.js).
    const mHdr = out.nrDosar.match(/^HDR\s*(\d+)/i)
    if (mHdr) out.nrDosar = 'HDR ' + mHdr[1]
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
export function detectContractGresit(ex: ContractFinalExtras, curent: DosarPentruVerificare, dinOcr = false): string | null {
  const difera = (a: string, b: string) => (dinOcr ? !aproapeLaFel(a, b) : a !== b)
  if (ex.nrContract && curent.nrRezervare && difera(ex.nrContract, curent.nrRezervare)) {
    return `⛔ CONTRACT GREȘIT — ați încărcat contractul de la ${ex.nrContract} (acest dosar e ${curent.nrRezervare}).`
  }
  if (ex.nrAutoPagubit && curent.nrAutoPagubit && difera(normPlate(ex.nrAutoPagubit), normPlate(curent.nrAutoPagubit))) {
    return `⛔ CONTRACT GREȘIT — ați încărcat contractul mașinii păgubite ${ex.nrAutoPagubit} (acest dosar e ${curent.nrAutoPagubit}).`
  }
  if (ex.nrDosar && curent.nrDosar && difera(normDosar(ex.nrDosar), normDosar(curent.nrDosar))) {
    return `⛔ CONTRACT GREȘIT — ați încărcat contractul dosarului ${ex.nrDosar} (acest dosar e ${curent.nrDosar}).`
  }
  if (ex.nrInmatriculare && curent.nrAutoInlocuire && difera(normPlate(ex.nrInmatriculare), normPlate(curent.nrAutoInlocuire))) {
    return `⛔ CONTRACT GREȘIT — pe contract mașina de înlocuire e ${ex.nrInmatriculare} (acest dosar are ${curent.nrAutoInlocuire}).`
  }
  if (ex.asigurator && curent.asigurator && ex.asigurator !== curent.asigurator) {
    return `⛔ CONTRACT GREȘIT — pe contract asiguratorul e ${ex.asigurator} (acest dosar are ${curent.asigurator}).`
  }
  return null
}
