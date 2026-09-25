import { aproapeLaFel, detectContractGresit, normDosar, normPlate, parseContractFinalText } from '@/lib/contract-final'
import { mesajEroareOCR, ocrImageToText, pdfLibDisponibil, pdfToImageBlobs, readPdfText } from '@/lib/pdf-ocr'
import type { Dosar } from '@/lib/types'

export interface RezultatContractFinal {
  /** true doar daca fisierul e un contract final care apartine acestui dosar. */
  valid: boolean
  /** Campurile de completat in dosar (zile, valoare, clasa etc.) — gol daca nu e valid. */
  patch: Partial<Dosar>
  mesaj: string
  eroare: boolean
}

// Textul contractului: din PDF-ul cu text (export direct), iar pentru scanari (PDF scanat la imprimanta
// sau poza) prin OCR (Tesseract, ron+eng), pagina cu pagina.
async function textContract(file: File, laStadiu?: (mesaj: string) => void): Promise<{ text: string; ocr: boolean }> {
  const estePdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (!estePdf) {
    laStadiu?.('Se citește poza contractului…')
    return { text: await ocrImageToText(file), ocr: true }
  }
  if (!pdfLibDisponibil()) throw new Error('Biblioteca de citire PDF nu s-a încărcat. Verifică internetul și reîncarcă pagina.')
  const text = await readPdfText(file)
  if (text.replace(/\s+/g, '').length >= 80 && parseContractFinalText(text).valid) return { text, ocr: false }
  // PDF fara text (scanat): randam paginile si le citim cu OCR
  laStadiu?.('Contract scanat — se citește textul din imagine…')
  const imagini = await pdfToImageBlobs(file, 4)
  return { text: text + '\n' + (await ocrImageToText(imagini)), ocr: true }
}

// Citeste contractul final (export winMentor) si completeaza/verifica campurile — daca datele nu se
// potrivesc cu dosarul curent (alt nr. contract/dosar/auto/asigurator), NU completeaza nimic si
// avertizeaza. Folosit si din formular ("Contract final"), si din modalul de documente.
export async function citesteContractFinal(
  file: File,
  dosar: Dosar,
  laStadiu?: (mesaj: string) => void,
): Promise<RezultatContractFinal> {
  const esec = (mesaj: string): RezultatContractFinal => ({ valid: false, patch: {}, mesaj, eroare: true })
  const esteConform = file.type === 'application/pdf' || /\.pdf$/i.test(file.name) || file.type.startsWith('image/')
  if (!esteConform) return esec('Contractul final trebuie să fie PDF sau poză (JPG, PNG). Nu am completat nimic.')

  let text: string
  let ocr: boolean
  try {
    ;({ text, ocr } = await textContract(file, laStadiu))
  } catch (e) {
    console.error(e)
    return esec(e instanceof Error && e.message ? e.message : mesajEroareOCR(e))
  }

  try {
    const ex = parseContractFinalText(text, ocr)
    if (!ex.valid) {
      return esec('⛔ Acest fișier nu pare să fie un contract final (nu am găsit nr. contract sau tabelul de cost). La scanări, verifică să fie drept și clar. Nu am completat nimic.')
    }
    const eroareContract = detectContractGresit(ex, {
      nrRezervare: dosar.nrRezervare,
      nrAutoPagubit: dosar.nrAutoPagubit,
      nrDosar: dosar.nrDosar,
      nrAutoInlocuire: dosar.nrAutoInlocuire,
      asigurator: dosar.asigurator,
    }, ocr)
    if (eroareContract) return esec(eroareContract + ' Nu am completat nimic — verifică fișierul.')

    const patch: Partial<Dosar> = {}
    const gasite: string[] = []

    if (ex.nrContract && !dosar.nrRezervare) { patch.nrRezervare = ex.nrContract; gasite.push('nr. contract') }
    if (ex.zile) { patch.zileContractFinal = ex.zile; gasite.push(`zile totale contract: ${ex.zile}${ex.pretZi ? ' (' + ex.pretZi + '/zi)' : ''}`) }
    if (ex.clasa) { patch.clasaAuto = ex.clasa; gasite.push('clasă auto (rezervată): ' + ex.clasa) }
    if (ex.valoare) { patch.valoareContract = ex.valoare; gasite.push('valoare contract: ' + ex.valoare + ' EUR (fără TVA)') }
    if (ex.valoareCuTVA) { patch.valoareContractCuTVA = ex.valoareCuTVA; gasite.push('valoare cu TVA: ' + ex.valoareCuTVA + ' EUR') }

    if (ex.asigurator) {
      if (!dosar.asigurator) { patch.asigurator = ex.asigurator; gasite.push('asigurator') }
      else if (dosar.asigurator !== ex.asigurator) gasite.push(`⚠️ asigurator detectat "${ex.asigurator}" diferă de cel selectat ("${dosar.asigurator}")`)
    }
    if (ex.nrInmatriculare) {
      if (!dosar.nrAutoInlocuire) { patch.nrAutoInlocuire = ex.nrInmatriculare; gasite.push('nr. auto înlocuire') }
      else if (!(ocr ? aproapeLaFel : (a: string, b: string) => a === b)(normPlate(dosar.nrAutoInlocuire), normPlate(ex.nrInmatriculare))) {
        gasite.push(`⚠️ nr. auto înlocuire pe contract ("${ex.nrInmatriculare}") diferă de cel de pe dosar ("${dosar.nrAutoInlocuire}")`)
      }
    }
    if (ex.nrAutoPagubit) {
      if (!dosar.nrAutoPagubit) { patch.nrAutoPagubit = ex.nrAutoPagubit; gasite.push('nr. auto păgubit') }
      else if (!(ocr ? aproapeLaFel : (a: string, b: string) => a === b)(normPlate(dosar.nrAutoPagubit), normPlate(ex.nrAutoPagubit))) {
        gasite.push(`⚠️ nr. auto păgubit pe contract ("${ex.nrAutoPagubit}") diferă de cel de pe dosar ("${dosar.nrAutoPagubit}")`)
      }
    }
    if (ex.nrDosar) {
      if (!dosar.nrDosar) { patch.nrDosar = ex.nrDosar; gasite.push('nr. dosar') }
      else if (!(ocr ? aproapeLaFel : (a: string, b: string) => a === b)(normDosar(dosar.nrDosar), normDosar(ex.nrDosar))) {
        gasite.push(`⚠️ nr. dosar pe contract ("${ex.nrDosar}") diferă de cel de pe dosar ("${dosar.nrDosar}")`)
      }
    }

    return {
      valid: true,
      patch,
      mesaj:
        (ocr ? 'Contract scanat, citit automat. ' : '') +
        (gasite.length ? 'Găsit: ' + gasite.join(', ') + '. Verifică valorile.' : 'Nu am găsit date suplimentare în acest document.'),
      eroare: false,
    }
  } catch (e) {
    console.error(e)
    return esec('Nu am putut citi acest contract (' + (e instanceof Error ? e.message : 'eroare') + ').')
  }
}
