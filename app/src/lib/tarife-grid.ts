// Portat 1:1 din index.html — grila de tarife per asigurator/clasa/zile, folosita pentru
// verificarea automata a valorii de pe contract (pagina Rapoarte). Date neschimbate.
import type { Dosar } from './types'

export const TARIFE_GRID: Record<string, {
  lista: number | null
  grawe: [number, number]
  hellas: [number, number, number]
  asirom: number
  generali: [number, number]
  eazy: [number, number, number]
  axeria: number | null
}> = {
  A:   { lista:43.9,  grawe:[38,34],     hellas:[27,23,20], asirom:40,  generali:[38,35],  eazy:[29,27,23], axeria:34  },
  eA:  { lista:44.9,  grawe:[38,34],     hellas:[27,23,20], asirom:40,  generali:[38,35],  eazy:[29,27,23], axeria:34  },
  B:   { lista:49.9,  grawe:[42,38],     hellas:[32,27,22], asirom:45,  generali:[42,39],  eazy:[35,31,25], axeria:37  },
  eB:  { lista:56.9,  grawe:[42,38],     hellas:[32,27,22], asirom:45,  generali:[42,39],  eazy:[35,31,25], axeria:37  },
  C:   { lista:59.9,  grawe:[49,44],     hellas:[41,35,29], asirom:55,  generali:[49,46],  eazy:[45,40,33], axeria:45  },
  C1:  { lista:59.9,  grawe:[49,44],     hellas:[41,35,29], asirom:55,  generali:[49,46],  eazy:[45,40,33], axeria:45  },
  D:   { lista:59.9,  grawe:[55,50],     hellas:[41,35,29], asirom:59,  generali:[55,51],  eazy:[45,40,33], axeria:45  },
  D2:  { lista:62.9,  grawe:[55,50],     hellas:[41,35,29], asirom:59,  generali:[55,55],  eazy:[45,40,33], axeria:45  },
  eD:  { lista:62.9,  grawe:[55,50],     hellas:[41,35,29], asirom:59,  generali:[55,55],  eazy:[45,40,33], axeria:45  },
  E:   { lista:68.9,  grawe:[65,59],     hellas:[51,44,35], asirom:69,  generali:[65,60],  eazy:[56,50,40], axeria:60  },
  E1:  { lista:99.9,  grawe:[65,59],     hellas:[57,51,44], asirom:69,  generali:[65,60],  eazy:[63,59,50], axeria:60  },
  F:   { lista:82.9,  grawe:[75,68],     hellas:[59,53,45], asirom:90,  generali:[75,69],  eazy:[65,61,52], axeria:60  },
  F1:  { lista:99.9,  grawe:[85,77],     hellas:[68,59,49], asirom:90,  generali:[85,79],  eazy:[74,68,56], axeria:75  },
  G:   { lista:99.9,  grawe:[90,81],     hellas:[71,64,56], asirom:95,  generali:[90,83],  eazy:[78,74,64], axeria:75  },
  G1:  { lista:115.9, grawe:[90,81],     hellas:[76,64,50], asirom:105, generali:[90,83],  eazy:[83,73,58], axeria:75  },
  eG1: { lista:null,  grawe:[90,81],     hellas:[76,62,48], asirom:105, generali:[90,83],  eazy:[83,71,55], axeria:75  },
  G2:  { lista:87.9,  grawe:[72,65],     hellas:[51,47,41], asirom:80,  generali:[72,67],  eazy:[56,54,47], axeria:65  },
  GP:  { lista:192.9, grawe:[175,158],   hellas:[130,114,95], asirom:195, generali:[175,161], eazy:[142,131,109], axeria:140 },
  GP1: { lista:161.9, grawe:[175,158],   hellas:[105,91,77],  asirom:195, generali:[155,143], eazy:[112,105,89],  axeria:135 },
  H:   { lista:349.9, grawe:[280,252],   hellas:[191,164,134],asirom:299, generali:[280,261], eazy:[208,189,154], axeria:199 },
  'L/eL': { lista:140.9, grawe:[130,117], hellas:[95,87,76], asirom:125, generali:[125,115], eazy:[104,100,87], axeria:119 },
  L1:  { lista:76.9,  grawe:[65,59],     hellas:[59,55,49], asirom:68,  generali:[65,59],  eazy:[65,63,56], axeria:60  },
  P:   { lista:125.9, grawe:[110,99],    hellas:[91,81,68],  asirom:139, generali:[110,99],  eazy:[100,93,78],  axeria:100 },
  P0:  { lista:99.9,  grawe:[85,77],     hellas:[99,91,77],  asirom:90,  generali:[75,69],   eazy:[112,105,89], axeria:75  },
  P1:  { lista:174.9, grawe:[155,140],   hellas:[130,114,95],asirom:175, generali:[155,143], eazy:[142,131,109],axeria:135 },
  eP1: { lista:174.9, grawe:[155,140],   hellas:[130,114,95],asirom:175, generali:[155,143], eazy:[142,131,109],axeria:135 },
  V:   { lista:113.9, grawe:[100,90],    hellas:[86,78,68],  asirom:110, generali:[100,92],  eazy:[94,90,78],  axeria:110 },
  V0:  { lista:74.9,  grawe:[62,56],     hellas:[51,43,34],  asirom:72,  generali:[62,58],  eazy:[56,49,39],  axeria:60  },
  V1:  { lista:110.0, grawe:[100,90],    hellas:[64,54,43],  asirom:110, generali:[90,83],  eazy:[70,62,49],  axeria:null },
  V2:  { lista:138.9, grawe:[135,120],   hellas:[110,98,85], asirom:130, generali:[120,119], eazy:[118,113,98],axeria:null },
  X:   { lista:113.9, grawe:[95,86],     hellas:[88,78,66],  asirom:105, generali:[95,90],  eazy:[96,90,76],  axeria:90  },
}

// Groupama — grila valabila din 01.08.25 (EUR), pe clasele proprii. Paliere: 1-20 zile / >20 zile.
export const GROUPAMA_TARIFE: Record<string, [number, number]> = {
  A:[28.5,25.5], B:[33.5,28.0], C:[44.5,37.5], D:[62.5,56.0], E:[74.0,65.0],
  G:[76.5,68.5], G1:[83.5,65.5], G2:[54.0,49.5], GP:[139.5,122.5], GP1:[120.0,105.0],
  'L/eL':[90.0,85.5], L1:[67.5,62.5], P:[110.0,97.5], P1:[140.5,123.5],
  V0:[56.0,44.5], V:[97.0,85.0], X:[97.0,85.5],
}

// Allianz — LEI, doar RCA intern (parc propriu), pe grupe de clase. Paliere: 1-... / peste.
export const ALLIANZ_GROUPS: { nume: string; intern: number; extern: number; clase: string[] }[] = [
  { nume: 'A/B (Economy)',        intern:125, extern:150, clase:['A','eA','B','eB'] },
  { nume: 'C/D (Intermediate)',   intern:155, extern:205, clase:['C','C1','D','D2'] },
  { nume: 'Electrice mici',       intern:200, extern:300, clase:['eD'] },
  { nume: 'Electrice mari',       intern:650, extern:800, clase:['eG1','eP1'] },
  { nume: 'E/F (Full Size)',      intern:215, extern:285, clase:['E','E1','F','F1'] },
  { nume: 'G2 (Suv Low)',         intern:215, extern:272, clase:['G2','X'] },
  { nume: 'G/GP (Suv)',           intern:320, extern:410, clase:['G','G1','GP','GP1'] },
  { nume: 'H/P/P1 (Premium)',     intern:470, extern:625, clase:['H','P','P0','P1'] },
  { nume: 'V (Cargo VAN)',        intern:450, extern:600, clase:['V'] },
  { nume: 'L (Passenger VAN)',    intern:550, extern:730, clase:['L/eL','L1'] },
  { nume: 'V0 (Small VAN)',       intern:280, extern:370, clase:['V0','V1','V2'] },
]

export function allianzGroupForClasa(clasa: string) {
  return ALLIANZ_GROUPS.find((g) => g.clase.includes(clasa)) || null
}

export interface TarifGrila {
  pretZi: number
  total: number
  moneda: string
  sursa: string
  palier: string
}

// Calculeaza tariful/zi si totalul estimat conform grilei, pentru un dosar
// (clasa+asigurator+zile). Returneaza null daca asiguratorul e pe grila "manual"
// (Omniasig) sau lipseste clasa/zilele.
export function calcTarifGrila(dosar: Pick<Dosar, 'clasaAuto' | 'asigurator' | 'zileDeviz'>, zileOverride?: number | null): TarifGrila | null {
  const clasa = dosar.clasaAuto
  const asig = (dosar.asigurator || '').toLowerCase()
  const zile = Number(zileOverride != null ? zileOverride : dosar.zileDeviz) || 0
  if (!clasa || !zile) return null
  if (asig === 'omniasig') return null

  if (asig === 'allianz') {
    const grp = allianzGroupForClasa(clasa)
    if (!grp) return null
    return { pretZi: grp.intern, total: grp.intern * zile, moneda: 'lei', sursa: grp.nume, palier: grp.nume }
  }
  if (asig === 'groupama') {
    const g = GROUPAMA_TARIFE[clasa]
    if (!g) return null
    const palier = zile <= 20 ? '1-20 zile' : '>20 zile'
    const pretZi = zile <= 20 ? g[0] : g[1]
    return { pretZi, total: pretZi * zile, moneda: 'EUR', sursa: 'Groupama', palier }
  }

  const t = TARIFE_GRID[clasa]
  if (!t) return null
  let pretZi: number | null = null
  let palier = ''
  if (asig === 'grawe' && t.grawe) {
    const p30 = zile <= 30
    pretZi = p30 ? t.grawe[0] : t.grawe[1]
    palier = p30 ? '1-30 zile' : '>31 zile'
  } else if (asig === 'hellas' && t.hellas) {
    const b = zile <= 10 ? 0 : zile <= 20 ? 1 : 2
    pretZi = t.hellas[b]
    palier = ['1-10 zile', '11-20 zile', '>20 zile'][b]
  } else if (asig === 'eazyinsure' && t.eazy) {
    const b = zile <= 10 ? 0 : zile <= 20 ? 1 : 2
    pretZi = t.eazy[b]
    palier = ['1-10 zile', '11-20 zile', '>20 zile'][b]
  } else if (asig === 'generali' && t.generali) {
    const p3 = zile <= 3
    pretZi = p3 ? t.generali[0] : t.generali[1]
    palier = p3 ? '1-3 zile' : '>4 zile'
  } else if (asig === 'asirom' && t.asirom != null) {
    pretZi = t.asirom
    palier = 'tarif unic'
  } else if (asig === 'axeria' && t.axeria != null) {
    pretZi = t.axeria
    palier = 'tarif unic'
  }
  if (pretZi == null) return null
  return { pretZi, total: pretZi * zile, moneda: 'EUR', sursa: dosar.asigurator, palier }
}
