// Motor de extragere a campurilor (nr. dosar, nr. auto, marca/model, asigurator)
// dintr-un text OCR/PDF. Folosit atat de index.html cat si de financiar.html
// (incarcat ca <script src="js/extractie.js">), si de suita de teste din tests/.
//
// Cand apare un format nou de document care nu se completeaza corect:
// vezi skill-ul .claude/skills/extractie-camp-deviz/SKILL.md pentru workflow.

// Nr. auto citit prin OCR, cu confuziile tipice cifra/litera reparate dupa pozitie:
// judet (litere) + 2-3 cifre + 3 litere. "B1045MM" -> "B104SMM". '' daca nu arata a nr. RO.
const JUDETE = ['AB','AR','AG','B','BC','BH','BN','BT','BV','BR','BZ','CS','CL','CJ','CT','CV','DB','DJ','GL','GR','GJ',
  'HR','HD','IL','IS','IF','MM','MH','MS','NT','OT','PH','SM','SJ','SB','SV','TR','TM','TL','VS','VL','VN'];
function plateDinOcr(s) {
  const t = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const LIT = { '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '8': 'B' };
  const CIF = { 'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8' };
  const m = t.match(/^([A-Z]{1,2})([0-9A-Z]{2,3})([0-9A-Z]{3})$/);
  if (!m) return '';
  const judet = m[1];
  if (!JUDETE.includes(judet)) return '';
  // Bucuresti are 2-3 cifre; celelalte judete 2 cifre.
  if (judet !== 'B' && m[2].length !== 2) return '';
  const cifre = m[2].split('').map(c => CIF[c] || c).join('');
  const litere = m[3].split('').map(c => LIT[c] || c).join('');
  if (!/^\d+$/.test(cifre) || !/^[A-Z]{3}$/.test(litere)) return '';
  return judet + cifre + litere;
}

function distanta(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// "Dada Logan" -> "Dacia Logan" (Axeria, PaddleOCR): un cuvant urmat de un model cunoscut, foarte apropiat de o marca.
function marcaAproximativa(norm, brands, modelAlt) {
  const re = new RegExp('\\b([A-Za-z]{3,12})[\\s,\\/]+(' + modelAlt + ')\\b', 'gi');
  let m;
  while ((m = re.exec(norm)) !== null) {
    const w = m[1].toLowerCase();
    if (['auto', 'tip', 'marca', 'model', 'modol', 'seria', 'serie', 'numar'].includes(w)) continue;
    // marci scurte (Audi, Opel, Ford...): max. 1 litera diferita; restul max. 2
    const b = brands.find(x => x.length >= 4 && !/\s/.test(x) && distanta(w, x.toLowerCase()) <= (x.length <= 4 ? 1 : 2));
    if (b) return b + ' ' + m[2];
  }
  return '';
}

function extractFromText(text) {
  const norm = text.replace(/\s+/g, ' ');
  const result = { nrDosar: '', nrAuto: '', marcaModel: '', asigurator: '', extraPlates: [], extraDates: [], extraPhones: [] };

  // Asigurator: cautam denumirile cunoscute oriunde in document (antet, "Date asigurator", e-mail lichidatori)
  const ALIASE = {
    'Allianz': /allianz/i,
    'Asirom': /asirom/i,
    'Axeria': /axeria/i,
    'EazyInsure': /eazy[\s.\-]*(asigurari|insure)/i, // si "eazy.insure" (antetul NC-ului)
    'Generali': /generali/i,
    'Gothaer': /gothaer/i,
    'Grawe': /grawe/i,
    'Groupama': /groupama/i,
    'Hellas': /hellas/i,
    'Omniasig': /omniasig/i,
    'Uniqa': /uniqa/i
  };
  for (const [nume, re] of Object.entries(ALIASE)) {
    if (re.test(norm)) { result.asigurator = nume; break; }
  }

  // Nr. dosar — pentru Hellas Direct, formatul canonic e "HDR 121588" (fara "HELLAS" si fara
  // eventualul sufix de dupa liniuta, ex: "HELLAS HDR 121588-8d4a" -> "HDR 121588").
  const mHDR = norm.match(/HDR\s*(\d{5,})/i);
  // \w in JS e doar ASCII — "daună"/"daune" nu se potrivesc integral cu \w* (se opreste inainte de ă/â/î/ș/ț).
  // RO_WORD extinde clasa de caractere ca sufixele romanesti (daună, daune, dauna) sa fie consumate complet.
  const RO_WORD = 'a-zA-ZăâîșțşţĂÂÎȘȚŞŢ0-9';
  if (mHDR) {
    result.nrDosar = 'HDR ' + mHDR[1];
  } else {
    // Unele formulare au spatii in jurul lui "/" sau "-" chiar in interiorul valorii
    // (Allianz: "BU / ZB422640", Grawe: "BH- 10-00-026490-2025") — le lipim doar pentru
    // acest match, ca sa incapa in clasa de caractere a grupului de captura.
    const compact = norm
      .replace(/([A-Za-z0-9])\s*\/\s*([A-Za-z0-9])/g, '$1/$2')
      .replace(/([A-Za-z0-9])\s*-\s*([A-Za-z0-9])/g, '$1-$2');
    // Acoperă "nr. dosar", "dosar nr.", "dosar daune:" / "dosar daună nr." (Groupama și alții, fără "nr" explicit)
    // (?!daun) previne capturarea cuvântului "daună/daune" ca valoare, atunci când eticheta nu îl consumă
    // Asirom (si alte formulare bilingve): "Nr. dosar/ No. of claim file: RA23/BH/26/33219865"
    const mBilingv = compact.match(/nr\.?\s*dosar\s*\/?\s*No\.?\s*of\s*claim\s*file\s*[:\-]?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,30})/i);
    let m = mBilingv || compact.match(new RegExp('(?:nr\\.?\\s*dosar(?:\\s*(?:de\\s*)?daun[' + RO_WORD + ']*)?|dosar\\s*(?:de\\s*)?daun[' + RO_WORD + ']*(?:\\s*nr\\.?)?|dosar\\s*nr\\.?|num[ăa]r\\s*dosar(?:\\s*(?:de\\s*)?daun[' + RO_WORD + ']*)?)\\s*[:\\-]?\\s*(?!daun)(?=[A-Z0-9\\/\\-\\.]*\\d)([A-Z0-9][A-Z0-9\\/\\-\\.]{2,24})', 'i'));
    if (m) result.nrDosar = m[1].trim();
    else {
      // Fallback pt. formulare tip "SERIE: BH NR: U21201994394" (proces-verbal Groupama)
      const mSerieNr = compact.match(/SERIE:?\s*[A-Z]{1,3}\s*NR:?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,24})/i);
      if (mSerieNr) result.nrDosar = mSerieNr[1].trim();
      else {
        // Fallback pt. formulare Grawe: eticheta vine DUPA valoare — "Seria: BH-...-2025 (nr. dosar)"
        const mSeriaDupa = compact.match(/Seria:?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,24})\s*\(\s*nr\.?\s*dosar/i);
        if (mSeriaDupa) result.nrDosar = mSeriaDupa[1].trim();
        else if (result.asigurator === 'Allianz') {
          // Allianz, nota de constatare cu etichetele sus si valorile jos: dupa "Dosar de dauna Nr." urmeaza
          // alta eticheta, iar numarul apare separat ca "ZB856348 / BU" (nr. dosar / regiune).
          const mAllianz = norm.match(/\b([A-Z]{2}\d{5,8})\s*\/\s*[A-Z]{2}\b/);
          if (mAllianz) result.nrDosar = mAllianz[1];
        }
      }
    }
  }

  // Generali (PV RECREX): "Serie unica (judet/ numar dosar): BH / 20261950354-C" — valorile sunt
  // tiparite DEASUPRA etichetelor, deci in text apar inaintea lor. Formatul folosit: "BH/20261950354-C".
  if (result.asigurator === 'Generali') {
    const mG = norm.match(/\b([A-Z]{1,2})[\s_]*\/?[\s_]*(\d{9,13}-[A-Z])\b/);
    if (mG) result.nrDosar = mG[1] + '/' + mG[2];
  }
  // Allianz cu nr. dosar in casute ("CJ/ C R 9 8 8 9 1 1"): OCR-ul citeste gunoi ("CJ/1"). Numarul
  // apare intreg mai jos ("dosarul de dauna Nr.CR988911"); judetul se ia din eticheta de sus.
  if (result.asigurator === 'Allianz' && !/\d{5,}/.test(result.nrDosar)) {
    const cod = norm.match(/dosar\S*\s*de\s*daun\S*\s*Nr\.?\s*([A-Z]{2}\d{6,8})\b/i);
    const jud = norm.match(/dosar\s*de\s*daun\S*\s*Nr\.?\s*([A-Z]{2})\s*\//i);
    const separat = norm.match(/\b([A-Z]{2})\s*\/\s*([A-Z]{2}\d{6,8})\b/);
    result.nrDosar = cod ? (jud ? jud[1].toUpperCase() + '/' : '') + cod[1].toUpperCase()
      : separat ? separat[1] + '/' + separat[2] : '';
  }
  // Grawe: "Seria: BH-10-00-026490-2025" (eticheta "(nr. dosar)" poate fi mai departe sau lipsi);
  // OCR-ul pune uneori "." in loc de "-" ("BH.10-00-...").
  if (result.asigurator === 'Grawe') {
    const mGr = (result.nrDosar && result.nrDosar.match(/^([A-Z]{2})[\s.\-]*(\d{2})[\s.\-]*(\d{2})[\s.\-]*(\d{5,7})[\s.\-]*(\d{4})$/i))
      || norm.match(/Seria\s*:?\s*([A-Z]{2})[\s.\-]*(\d{2})[\s.\-]*(\d{2})[\s.\-]*(\d{5,7})[\s.\-]*(\d{4})\b/i);
    if (mGr) result.nrDosar = [mGr[1].toUpperCase(), mGr[2], mGr[3], mGr[4], mGr[5]].join('-');
  }

  // EazyInsure: nr. de dosar "EZ-RCA-B-9325-2026" — util cand sigla din antet nu se citeste.
  if (!result.asigurator && /^EZ-RCA-/i.test(result.nrDosar)) result.asigurator = 'EazyInsure';

  // Plate numbers (Romanian format)
  const plateRe = /\b[A-Z]{1,2}[\s\-]?\d{2,3}[\s\-]?[A-Z]{3}\b/g;
  const plates = [...new Set((norm.match(plateRe) || []).map(p => p.replace(/[\s\-]+/g, '').toUpperCase()))];
  if (plates.length) { result.nrAuto = plates[0]; result.extraPlates = plates; }
  else {
    // Poze (OCR): valoarea de langa eticheta "Nr. inmatriculare" poate avea confuzii cifra/litera
    // (EazyInsure: "[B1045MM" pentru B104SMM). Doar langa eticheta, ca sa nu prindem orice cuvant.
    const mEt = norm.match(/(?:nr|num[aă]r)\.?\s*[îi]nmatricular[ea]\S*\s*[:|\[\](){}]*\s*([A-Z0-9]{1,2}[\s\-]?[A-Z0-9]{2,3}[\s\-]?[A-Z0-9]{3})(?![A-Z0-9])/i);
    const mRupt = mEt ? null : norm.match(/(?:nr|num[aă]r)\.?\s*(?:de\s*)?([A-Z0-9]{5,8})\s*[îi]nmatricular/i);
    let p = mEt ? plateDinOcr(mEt[1]) : mRupt ? plateDinOcr(mRupt[1]) : '';
    // Valoarea tiparita deasupra etichetei (Generali: "26.08.2026 BHI7HAZ" / "Numar inmatriculare:"):
    // primul cod care arata a nr. auto, cu cel putin o cifra reala si judet valid.
    if (!p && /[îi]nmatricular/i.test(norm)) {
      for (const c of norm.match(/\b[A-Z]{1,2}[0-9OIL]{2,3}[A-Z0-9]{3}\b/g) || []) {
        if (/\d/.test(c) && (p = plateDinOcr(c))) break;
      }
    }
    if (p) { result.nrAuto = p; result.extraPlates = [p]; }
  }

  // Marcă + model auto păgubit
  const BRANDS = ['Dacia','Ford','Renault','Opel','Volkswagen','VW','Skoda','Škoda','Toyota','Hyundai','Kia',
    'BMW','Audi','Mercedes-Benz','Mercedes','Peugeot','Citroen','Citroën','Fiat','Seat','SEAT','Nissan','Honda',
    'Mazda','Suzuki','Mitsubishi','Chevrolet','Volvo','Land Rover','Range Rover','Jeep','Mini','Smart',
    'Alfa Romeo','Lancia','Subaru','Jaguar','Porsche','Tesla','Chrysler','Dodge','Iveco','Isuzu','BYD'];
  // Modele uzuale — ajută la extragerea corectă a modelului, nu doar a mărcii
  const MODELS = ['Kuga','Focus','Fiesta','Mondeo','Puma','Transit','EcoSport','S-Max','C-Max','Ranger',
    'Logan','Sandero','Duster','Dokker','Lodgy','Spring','Jogger',
    'Clio','Megane','Mégane','Captur','Kadjar','Scenic','Laguna','Talisman','Trafic','Kangoo','Arkana','Austral',
    'Astra','Corsa','Insignia','Mokka','Zafira','Vectra','Meriva','Grandland','Crossland',
    'Golf','Passat','Polo','Tiguan','Touran','Jetta','Caddy','Sharan','Arteon','T-Roc','T-Cross','Touareg','Amarok','ID3','ID4','ID\\.3','ID\\.4','eUp',
    'Octavia','Fabia','Superb','Kodiaq','Karoq','Rapid','Scala','Kamiq','Yeti','Roomster','Citigo',
    'Corolla','Yaris','Avensis','RAV4','Auris','CH-R','C-HR','Hilux','Prius','Camry','Aygo','Land Cruiser','Highlander',
    'Tucson','Santa Fe','Santa','i10','i20','i30','i40','ix35','Kona','Elantra','Accent','Bayon','Ioniq',
    'Sportage','Ceed','Rio','Sorento','Picanto','Stonic','Niro','XCeed','ProCeed','Seltos',
    'Leon','Ibiza','Ateca','Arona','Toledo','Altea','Tarraco','Formentor',
    'Qashqai','Juke','Micra','Navara','Note','Almera','Pulsar','X-Trail','Leaf','Ariya',
    'Civic','Accord','Jazz','CR-V','HR-V','e:Ny1',
    'Clubman','Countryman','Panda','Punto','Tipo','Doblo','Ducato','500','500X','500L','Freemont',
    'Berlingo','Partner','Boxer','Jumper','Expert','Jumpy','C1','C3','C4','C5','208','308','508','2008','3008','5008','C-Elysee',
    'Vito','Sprinter','Citan','Actros','Atego','Vivaro','Movano','Master','Crafter',
    // Premium — coduri scurte (Volvo, BMW, Audi, Mercedes, Lexus, Jaguar, Genesis, Alfa Romeo, Porsche, Land Rover)
    'S60','S90','V40','V60','V90','XC40','XC60','XC90','C40',
    'Seria\\s?1','Seria\\s?2','Seria\\s?3','Seria\\s?4','Seria\\s?5','Seria\\s?6','Seria\\s?7','Seria\\s?8','X1','X2','X3','X4','X5','X6','X7','i3','i4','i7','iX',
    'A1','A3','A4','A5','A6','A7','A8','Q2','Q3','Q4','Q5','Q7','Q8','e-tron','TT','R8',
    'A-Class','B-Class','C-Class','E-Class','S-Class','CLA','CLS','ML','GLK','GL','SLK','CLK','GLA','GLB','GLC','GLE','GLS','G-Class','EQA','EQB','EQC','EQE','EQS','Vaneo',
    'IS','ES','RX','NX','UX','LS','LC',
    'XE','XF','XJ','F-Pace','E-Pace','I-Pace','F-Type',
    'G70','G80','G90','GV70','GV80',
    'Giulia','Giulietta','Stelvio','Tonale','MiTo',
    '911','Cayenne','Macan','Panamera','Taycan',
    'Defender','Discovery','Evoque','Velar','Freelander','Range Rover Sport',
    'Model 3','Model Y','Model S','Model X',
    // BYD
    'Seal U','Seal','Sealion','Dolphin','Atto\\s?3','Han','Tang'];
  const brandAlt = BRANDS.map(b => b.replace(/\s/g,'\\s+')).join('|');
  // Cele mai lungi intai, ca "GLS" sa nu fie prins ca "GL" (modelul lipit de versiune e acceptat mai jos).
  const modelAlt = [...MODELS].sort((a, b) => b.length - a.length).map(m => m.replace(/[-]/g,'[-\\s]?')).join('|');

  // Separator intre marca si model: de obicei spatiu, dar unii asiguratori/service-uri scriu
  // "VOLVO/XC40" (fara spatii) sau "VOLKSWAGEN, PASSAT" (cu virgula) — acceptam pe toate.
  const SEP = '[\\s,\\/]+';

  // 0) Asirom: "Marca: ALTE MARCI   Model: BYD SEAL 5DM-I" — marca reala e scrisa in campul Model,
  //    deci luam campul Model intreg (de pe randul lui).
  const mAlteMarci = text.match(/marc[ăa]\s*[:\-]?\s*ALT[EĂA]\s+MARC[IĂA][^\n]*?\bmodel\s*[:\-]?\s*([^\n]{2,40})/i);
  if (mAlteMarci) {
    // Sufixul de versiune "-I" (BYD "5DM-i", citit de OCR si ca "-|") nu intra: "BYD SEAL 5DM-I" -> "BYD SEAL 5DM".
    result.marcaModel = mAlteMarci[1].split(/\s{2,}/)[0].trim().split(/\s+/).slice(0, 5).join(' ').replace(/-[I|l1]$/i, '');
  }
  // 1) marcă urmată direct de un model cunoscut (accepta si conectorul "Clasa"/"Class", ex: Mercedes-Benz Clasa GLS)
  m = null;
  if (!result.marcaModel) {
    const reBM = new RegExp('\\b(' + brandAlt + ')(?:' + SEP + '(?:Clasa' + SEP + '|Class' + SEP + ')?|(?=[A-Z]))(' + modelAlt + ')', 'gi');
    let c;
    while ((c = reBM.exec(norm)) !== null) {
      const urm = norm.charAt(c.index + c[0].length);
      if (!/[a-z0-9ăâîșț]/.test(urm)) { m = c; break; }
    }
  }
  if (result.marcaModel) {
    // deja gasit la pasul 0
  } else if (m) {
    result.marcaModel = `${m[1]} ${m[2]}`.replace(/\s+/g, ' ').trim();
  } else {
    // 2) câmpuri explicite tip "Marca: X Model: Y"
    m = norm.match(/marc[ăa]\s*[:\-]?\s*([A-Za-zĂÂÎȘȚăâîșț\-]{2,20})[\s,;]*(?:model|tip)\s*[:\-]?\s*([A-Za-zĂÂÎȘȚăâîșț0-9\-]{2,20})/i);
    if (m) {
      result.marcaModel = `${m[1]} ${m[2]}`.trim();
    } else {
      // 3) marcă urmată de un cuvânt oarecare (probabil modelul) — ignorăm etichetele de câmp, nu valori reale
      // Cuvinte de etichetă (nu valori reale de model) — inclusiv continuări de etichete pe 2 cuvinte
      // gasite in formulare reale ("Numar inmatriculare", "Numar identificare", "Numar polita" etc.),
      // ca sa nu se capteze un fragment din eticheta URMATORULUI camp cand marca nu are model listat alaturi.
      const ETICHETE = ['model','tip','marca','marcă','serie','seria','versiune','caroserie','tara','țara','an',
        'fabricatie','fabricație','culoare','vin','nr','numar','număr','clasa','clasă','class',
        'inmatriculare','înmatriculare','identificare','polita','poliță','producerii','avizarii','avizării',
        'constatarii','constatării','evenimentului','cilindrica','cilindrică','intretinere','întreținere','suplimentar'];
      const modelRe = new RegExp('\\b(' + brandAlt + ')' + SEP + '([A-Za-zĂÂÎȘȚăâîșț0-9][A-Za-zĂÂÎȘȚăâîșț0-9\\-]{1,14})\\b(?:' + SEP + '([A-Za-zĂÂÎȘȚăâîșț0-9][A-Za-zĂÂÎȘȚăâîșț0-9\\-]{1,14})\\b)?', 'gi');
      // Un cuvant e acceptat ca posibil model doar daca incepe cu majuscula/cifra si are cel putin
      // 3 caractere — modelele si etichetele reale din aceste formulare sunt mereu scrise asa;
      // zgomotul OCR (litere ramase din alte elemente ale paginii) apare de regula ca fragmente
      // scurte sau cu litera mica la inceput.
      const araLaMajuscula = w => /^[A-ZĂÂÎȘȚ0-9]/.test(w) && w.length >= 3;
      let candidat = null;
      let mm;
      while ((mm = modelRe.exec(norm)) !== null) {
        if (araLaMajuscula(mm[2]) && !ETICHETE.includes(mm[2].toLowerCase())) { candidat = `${mm[1]} ${mm[2]}`.trim(); break; }
        if (mm[3] && araLaMajuscula(mm[3]) && !ETICHETE.includes(mm[3].toLowerCase())) { candidat = `${mm[1]} ${mm[3]}`.trim(); break; }
      }
      if (candidat) result.marcaModel = candidat;
      else if ((candidat = marcaAproximativa(norm, BRANDS, modelAlt))) result.marcaModel = candidat;
      else {
        // 4) doar marca, dacă nu găsim nimic după ea
        m = norm.match(new RegExp('\\b(' + brandAlt + ')\\b', 'i'));
        if (m) result.marcaModel = m[1];
      }
    }
  }
  // Siguranta finala: marca/model nu trebuie sa contina "/" ramas dintr-un separator neprins mai sus —
  // altfel potrivirea clasei auto (suggestClasaFromModel) esueaza. Cratimele raman (fac parte din
  // modele reale: T-Roc, X-Trail, G-Class etc.), doar "/" e mereu artefact de format, niciodata literă reală.
  if (result.marcaModel) {
    result.marcaModel = result.marcaModel.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Dates dd.mm.yyyy or dd/mm/yyyy
  const dateRe = /\b(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})\b/g;
  const dates = [...new Set((norm.match(dateRe) || []))];
  result.extraDates = dates;

  // Phone numbers
  const phoneRe = /\b(?:\+?4?0)?7\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b/g;
  const phones = [...new Set((norm.match(phoneRe) || []))];
  result.extraPhones = phones;

  return result;
}


if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractFromText };
}
