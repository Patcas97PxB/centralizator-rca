// Portat 1:1 din analizaDeviz() (index.html) — calculul zilelor de reparatie dintr-un
// deviz Audatex, conform Normei ASF nr. 20/2017, art. 25 alin. 4 (timp normat total /
// 4, rotunjit). NU se reinterpreteaza formula.
export interface AnalizaDeviz {
  ul: number
  ore: number
  total: number
  unitate: string
  explicatie: string
  formulaCalcul: string
  detalii: string[]
}

export function analizaDeviz(rawText: string): AnalizaDeviz | null {
  const t = rawText.replace(/\s+/g, ' ')

  // Baza de normare a manoperei variaza pe deviz: poate fi in UL, UT sau direct in ORE.
  // Formate intalnite: "BAZA MANOPERA 10 UL=1 ORA", "100 UT=1 ORA", sau "BAZA MANOPERA = 1 ORA".
  const mBaza = t.match(/BAZA MANOPERA\s*(\d+)?\s*(UL|UT)?\s*=\s*1\s*ORA/i)
  if (!mBaza) return null
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
    const sup = t.search(/C\s*O\s*S\s*T\s*U\s*R\s*I\s+S\s*U\s*P\s*L/i)
    bloc = sup > 0 ? t.slice(0, sup) : t
  }
  let sumaUnitati = 0
  const reTotalCl = new RegExp(`(?:TOTAL CL|GEOMETRIE CL)\\s*\\d+\\s+([\\d.,]+)\\s*(?:${unitate}|ORE)\\s*X`, 'gi')
  let m: RegExpExecArray | null
  while ((m = reTotalCl.exec(bloc)) !== null) sumaUnitati += parseFloat(m[1].replace(',', '.')) || 0
  if (!sumaUnitati) return null
  const oreManopera = sumaUnitati / baza

  // Ore vopsitorie: valoarea explicita din linia "TOTAL VOPSITORIE <baza>UL/ORE : X" / "<baza>UT/ORA : X".
  // Se aduna separat de manopera, chiar daca in unele devize clasa de vopsitorie (CL) e deja
  // inclusa si in TOTAL MANOPERA — asa cere formula.
  let oreVopsitorie = 0
  const mVop = t.match(/TOTAL VOPSITORIE\s+(\d+)\s*(?:UL\/ORE|UT\/ORA|UL\s*\/\s*ORE)\s*:\s*([\d.,]+)/i)
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
