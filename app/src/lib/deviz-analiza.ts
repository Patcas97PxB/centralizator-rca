// Portat 1:1 din analizaDeviz() (index.html) — calculul zilelor de reparatie dintr-un
// deviz Audatex (si GT Estimate, vezi analizaDevizGT), conform Normei ASF nr. 20/2017, art. 25 alin. 4 (timp normat total /
// 4, rotunjit). NU se reinterpreteaza formula.
export interface AnalizaDeviz {
  ul: number
  ore: number
  total: number
  unitate: string
  explicatie: string
  formulaCalcul: string
  detalii: string[]
  /** Citire din poza fara orele de vopsitorie, desi devizul are vopsitorie — de verificat. */
  incomplet?: boolean
}

export function analizaDeviz(rawText: string): AnalizaDeviz | null {
  const t = rawText.replace(/\s+/g, ' ')

  // Baza de normare a manoperei variaza pe deviz: poate fi in UL, UT sau direct in ORE.
  // Formate intalnite: "BAZA MANOPERA 10 UL=1 ORA", "100 UT=1 ORA", sau "BAZA MANOPERA = 1 ORA".
  const mBaza = t.match(/BAZA MANOPERA\s*(\d+)?\s*(UL|UT)?\s*=\s*1\s*ORA/i)
  if (!mBaza) return analizaDevizGT(t) ?? analizaAudatexPoza(rawText)
  const baza = mBaza[1] ? parseFloat(mBaza[1]) : 1
  const unitate = mBaza[2] ? mBaza[2].toUpperCase() : 'ORE'

  // Ore manopera generala: suma liniilor "TOTAL CL n" / "GEOMETRIE CL n" din blocul
  // CALCULATIE FINALA, pana la "TOTAL MANOPERA ....." (exclude Costuri suplimentare).
  const mEnd = t.match(/TOTAL MANOPERA \.{3,}/)
  let bloc: string
  if (mEnd) {
    const end = mEnd.index as number
    const startIdx = t.lastIndexOf('BAZA MANOPERA', end)
    bloc = t.slice(startIdx >= 0 ? startIdx : Math.max(0, end - 600), end)
  } else {
    // Poza/scan: linia "TOTAL MANOPERA ....." iese adesea zgomot. Blocul = de la ultimul "BAZA MANOPERA"
    // (cel din CALCULATIE FINALA) pana la "COSTURI SUPLIMENTARE" de dupa el (acelea nu se numara).
    const toate = [...t.matchAll(/BAZA MANOPERA/gi)]
    const start = toate.length ? (toate[toate.length - 1].index as number) : 0
    const rest = t.slice(start)
    const sup = rest.search(/C\s*O\s*S\s*T\s*U\s*R\s*I\s+S\s*U\s*P\s*L/i)
    bloc = sup > 0 ? rest.slice(0, sup) : rest.slice(0, 800)
  }
  let sumaUnitati = 0
  // OCR-ul poate strica eticheta ("lacs CL 2" in loc de "TOTAL CL 2") — conteaza "CL n  <ore> ORE X".
  const reTotalCl = new RegExp(`(?:TOTAL|GEOMETRIE|[A-Za-z]{2,8})\\s*C[LI1]\\s*\\d+\\s+([\\d.,]+)\\s*(?:${unitate}|ORE)\\s*X`, 'gi')
  let m: RegExpExecArray | null
  while ((m = reTotalCl.exec(bloc)) !== null) sumaUnitati += parseFloat(m[1].replace(',', '.')) || 0
  if (!sumaUnitati) return analizaAudatexPoza(rawText)
  // La poze eticheta unui rand poate iesi ilizibila si randul se pierde — daca randurile verificate
  // aritmetic (ore x pret = suma) dau mai multe ore, le folosim pe acelea.
  const verificate = oreVerificateAudatex(rawText)
  if (verificate && verificate.ore > sumaUnitati / baza + 0.05) return analizaAudatexPoza(rawText)
  const oreManopera = sumaUnitati / baza

  // Ore vopsitorie: valoarea explicita din linia "TOTAL VOPSITORIE <baza>UL/ORE : X" / "<baza>UT/ORA : X".
  // Se aduna separat de manopera, chiar daca in unele devize clasa de vopsitorie (CL) e deja
  // inclusa si in TOTAL MANOPERA — asa cere formula.
  let oreVopsitorie = 0
  const mVop = t.match(/TOTAL VOPSITORIE\s+(\d+)\s*(?:UL\/ORE|UT\/ORA|UL\s*\/\s*ORE)\s*[:;+]\s*([\d.,]+)/i)
  if (mVop) {
    oreVopsitorie = parseFloat(mVop[2].replace(',', '.')) / parseFloat(mVop[1])
  } else {
    // Format alternativ: "TOTAL VOPSITORIE 1 ORA : 6.5 ORE" (valorile sunt deja in ore)
    const mVop2 = t.match(/TOTAL VOPSITORIE\s+1\s*ORA\s*:\s*([\d.,]+)\s*ORE/i)
    if (mVop2) oreVopsitorie = parseFloat(mVop2[1].replace(',', '.'))
  }

  const ore = oreManopera + oreVopsitorie
  const total = Math.round(ore / 4)

  return {
    ul: sumaUnitati,
    ore,
    total,
    unitate,
    explicatie: `${sumaUnitati} ${unitate}, ${ore.toFixed(1).replace('.', ',')} ore`,
    formulaCalcul: `${ore.toFixed(1).replace('.', ',')} ore ÷ 4 = ${(ore / 4).toFixed(2).replace('.', ',')} → ${total} ${total === 1 ? 'zi' : 'zile'}`,
    detalii: [
      `Manoperă: ${sumaUnitati} ${unitate} (bază ${baza}${unitate}=1 oră) = ${oreManopera.toFixed(1)} ore`,
      `Vopsitorie: ${oreVopsitorie.toFixed(1)} ore`,
      `Total ore normate: ${ore.toFixed(1)} ore ÷ 4 = ${total} ${total === 1 ? 'zi' : 'zile'} (Norma ASF nr. 20/2017, art. 25 alin. 4)`,
    ],
  }
}

// Ore din sumar: "17,20" (sau "17.20" cand OCR-ul citeste virgula ca punct).
function oreGT(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0
}

// Devize GT Estimate (GtEstimate Web), PDF sau poza (OCR): orele se iau din sumarul de la final —
// "Total exc. reducere (17,20 h)" = manopera si "Subtotal Manoperă (13,10 h)" = vopsitorie
// (singurele randuri din deviz cu ore intre paranteze). Aceeasi formula ca la Audatex:
// (manopera + vopsitorie) / 4, rotunjit. Orele de manopera se iau intregi (inclusiv
// "Timp intocmire deviz" / "Timp reconstatare"), confirmat de utilizator. Regex-urile tolereaza
// greselile tipice de OCR: punct in loc de virgula, "h" lipsa/citit "n", paranteza citita "{" / "[".
function analizaDevizGT(t: string): AnalizaDeviz | null {
  const ORE = String.raw`[(\[{]\s*(\d{1,3}[.,]\d{1,2})\s*[hn]?\s*[)\]}]`
  const mMan = t.match(new RegExp(String.raw`Total\s*exc\.?\s*reducere\s*` + ORE, 'i'))
  const mVop = t.match(new RegExp(String.raw`Subtotal\s*Manoper\S*\s*` + ORE, 'i'))
  if (!mMan && !mVop) return null
  const oreManopera = mMan ? oreGT(mMan[1]) : 0
  const oreVopsitorie = mVop ? oreGT(mVop[1]) : 0
  const ore = oreManopera + oreVopsitorie
  if (!ore) return null
  const total = Math.round(ore / 4)
  const f = (n: number, d = 1) => n.toFixed(d).replace('.', ',')
  return {
    ul: ore,
    ore,
    total,
    unitate: 'ORE',
    explicatie: `GT Estimate: ${f(oreManopera, 2)} h manoperă + ${f(oreVopsitorie, 2)} h vopsitorie = ${f(ore, 2)} ore`,
    formulaCalcul: `${f(oreManopera, 2)} h manoperă + ${f(oreVopsitorie, 2)} h vopsitorie = ${f(ore, 2)} ore ÷ 4 = ${f(ore / 4, 2)} → ${total} ${total === 1 ? 'zi' : 'zile'}`,
    detalii: [
      `Manoperă: ${f(oreManopera, 2)} ore`,
      `Vopsitorie: ${f(oreVopsitorie, 2)} ore`,
      `Total ore normate: ${f(ore)} ore ÷ 4 = ${total} ${total === 1 ? 'zi' : 'zile'} (Norma ASF nr. 20/2017, art. 25 alin. 4)`,
    ],
  }
}

// ---- Audatex fotografiat / scanat -------------------------------------------------------------
// Pe poze facute cu telefonul OCR-ul strica etichetele ("BAZA MANOPERA" -> "SBIR MANDPERA",
// "TOTAL CL 1" -> "DCR A"), dar randurile din CALCULATIE FINALA au o forma usor de verificat:
//   "3.4 ORE X 150.00 RON/ORA 510.00"  -> 3,4 x 150 = 510
// Numaram doar randurile la care socoteala se potriveste (deci cifrele au fost citite corect) si sarim
// peste cele din "COSTURI SUPLIMENTARE" (nu intra in formula, ca la varianta cu text).
function numarOcr(x: string): number {
  return parseFloat(x.replace(/\s+/g, '').replace(',', '.')) || 0
}

function oreVerificateAudatex(raw: string): { ore: number; randuri: number[]; preturi: number[] } | null {
  const linii = raw.split(/\r?\n/)
  const reRand = /(\d{1,3}[.,]\d{1,2})\s*(ORE|UL|UT)\s*[,.]?\s*[xX×]\s*(\d{1,4}[.,]\d{2})\s*RON\s*\/\s*\S*\s+(\d{1,3}(?:\s\d{3})*[.,]\d{2})/i
  const mBaza = raw.match(/(\d+)\s*(?:UL|UT)\s*=\s*1\s*ORA/i)
  const bazaUl = mBaza ? parseFloat(mBaza[1]) : 10
  // Pretul orei apare si in alte locuri („PRET ORA MANOPERA 250.00 RON/ORA”, „PRET =250.00 RON/ORA”):
  // daca OCR-ul greseste o cifra din pretul de pe rand (250 → 350), verificam si cu acesta.
  const preturiOra = [...raw.matchAll(/PRET[^\d\n]{0,30}?(\d{2,4}[.,]\d{2})\s*R[O0][NM]\s*\/\s*O/gi)].map((m) => numarOcr(m[1]))
  let suplimentare = false
  const randuri: number[] = []
  for (const l of linii) {
    if (/COSTURI\s*SU[PB]L/i.test(l)) suplimentare = !/TOTAL\s*COSTURI/i.test(l)
    else if (/V\s*O\s*P\s*S|PIESE/i.test(l)) suplimentare = false
    const m = l.replace(/[|[\]]/g, ' ').match(reRand)
    if (!m || suplimentare) continue
    const cant = numarOcr(m[1])
    const pret = numarOcr(m[3])
    const suma = numarOcr(m[4])
    const sePotriveste = (p: number) => Math.abs(cant * p - suma) <= Math.max(1, suma * 0.01)
    if (!cant || !pret) continue
    const pretBun = sePotriveste(pret) ? pret : preturiOra.find(sePotriveste)
    if (!pretBun) continue
    randuri.push(/ORE/i.test(m[2]) ? cant : cant / bazaUl)
    if (/ORE/i.test(m[2])) preturiOra.unshift(pretBun)
  }
  if (!randuri.length) return null
  return { ore: randuri.reduce((a, b) => a + b, 0), randuri, preturi: preturiOra }
}

function analizaAudatexPoza(raw: string): AnalizaDeviz | null {
  const v = oreVerificateAudatex(raw)
  if (!v) return null
  // OCR pe poze de ecran: „VORSITORIE”, bare „|” intre coloane, „ORAL” in loc de „ORA :”.
  const t = raw.replace(/\|/g, ' ').replace(/\s+/g, ' ')
  let oreVopsitorie = 0
  const mVop2 = t.match(/TOTAL VO[PR]SITORIE\s+1\s*ORA\w?\s*[:;]?\s*([\d.,]+)\s*ORE/i)
  const mVop = t.match(/TOTAL VO[PR]SITORIE\s+(\d+)\s*(?:UL|UT)\s*\/\s*OR[EA]\s*[:;+]?\s*([\d.,]+)/i)
  if (mVop2) oreVopsitorie = numarOcr(mVop2[1])
  else if (mVop) oreVopsitorie = numarOcr(mVop[2]) / parseFloat(mVop[1])
  else {
    // Poza de ecran: eticheta iese stalcita („VORSITORIE II [MI ORA 7.5 ORE”), dar pe randul
    // totalului de vopsitorie orele apar ca „X.Y ORE” (cu zecimala — „10UL/ORE” nu se potriveste).
    for (const l of raw.split(/\r?\n/)) {
      if (!/VO\w{0,3}TORIE/i.test(l) || /MATERIAL|COST/i.test(l)) continue
      const m = l.match(/(\d{1,3}[.,]\d)\s*ORE\b/i)
      if (m) {
        oreVopsitorie = numarOcr(m[1])
        break
      }
    }
  }
  // Orele nu s-au citit: le scoatem din costul manoperei de vopsitorie ÷ pretul orei
  // („TOTAL VOPSITORIE 1 ORA : 7.5 ORE 1875.00” → 1875 ÷ 250, sau „COST MANOPERA 1 875.00” din
  // sectiunea Vopsitorie a calculatiei finale). Se accepta doar un rezultat cu o zecimala (7,5 h).
  let dinCost = false
  if (!oreVopsitorie && v.preturi.length) {
    const linii = raw.split(/\r?\n/).map((l) => l.replace(/[|[\]]/g, ' '))
    const costuri: number[] = []
    linii.forEach((l, i) => {
      const suma = l.match(/(\d{1,3}(?:\s?\d{3})*[.,]\d{2})\s*$/)
      if (!suma) return
      const randVop = /VO\w{0,3}TORIE/i.test(l) && /\bOR[AE]\w?\b/i.test(l) && !/MATERIAL/i.test(l)
      const costManVop = /COST\s*MANOPERA/i.test(l) && linii.slice(Math.max(0, i - 3), i).some((x) => /V\s*O\s*P\s*S/i.test(x))
      if (randVop || costManVop) costuri.push(numarOcr(suma[1]))
    })
    for (const c of costuri) {
      const h = c / v.preturi[0]
      if (h > 0 && h < 200 && Math.abs(h * 10 - Math.round(h * 10)) < 0.02) {
        oreVopsitorie = Math.round(h * 10) / 10
        dinCost = true
        break
      }
    }
  }
  const areVopsitorie = raw.split(/\r?\n/).some((l) => /VO\w{0,3}TORIE/i.test(l) && /\d[.,]\d{2}/.test(l))
  const incomplet = !oreVopsitorie && areVopsitorie
  const ore = v.ore + oreVopsitorie
  const total = Math.round(ore / 4)
  const f = (n: number, d = 1) => n.toFixed(d).replace('.', ',')
  return {
    incomplet,
    ul: v.ore,
    ore,
    total,
    unitate: 'ORE',
    explicatie: `${f(v.ore)} ore manoperă + ${f(oreVopsitorie)} ore vopsitorie = ${f(ore)} ore (citit din poză)`,
    formulaCalcul:
      `${f(ore)} ore ÷ 4 = ${f(ore / 4, 2)} → ${total} ${total === 1 ? 'zi' : 'zile'}` +
      (incomplet ? ' — vopsitoria nu s-a putut citi, verifică' : ''),
    detalii: [
      `Manoperă: ${v.randuri.map((r) => f(r)).join(' + ')} = ${f(v.ore)} ore (rânduri verificate ore × preț = sumă)`,
      incomplet
        ? 'Vopsitorie: nu s-a putut citi din poză — verifică devizul'
        : `Vopsitorie: ${f(oreVopsitorie)} ore${dinCost ? ` (din cost ÷ ${f(v.preturi[0], 2)} RON/oră)` : ''}`,
      `Total ore normate: ${f(ore)} ore ÷ 4 = ${total} ${total === 1 ? 'zi' : 'zile'} (Norma ASF nr. 20/2017, art. 25 alin. 4)`,
    ],
  }
}
