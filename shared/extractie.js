// Motor de extragere a campurilor (nr. dosar, nr. auto, marca/model, asigurator)
// dintr-un text OCR/PDF. Folosit atat de index.html cat si de financiar.html
// (incarcat ca <script src="js/extractie.js">), si de suita de teste din tests/.
//
// Cand apare un format nou de document care nu se completeaza corect:
// vezi skill-ul .claude/skills/extractie-camp-deviz/SKILL.md pentru workflow.

function extractFromText(text) {
  const norm = text.replace(/\s+/g, ' ');
  const result = { nrDosar: '', nrAuto: '', marcaModel: '', asigurator: '', extraPlates: [], extraDates: [], extraPhones: [] };

  // Asigurator: cautam denumirile cunoscute oriunde in document (antet, "Date asigurator", e-mail lichidatori)
  const ALIASE = {
    'Allianz': /allianz/i,
    'Asirom': /asirom/i,
    'Axeria': /axeria/i,
    'EazyInsure': /eazy\s*(asigurari|insure)/i,
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
  const mHDR = norm.match(/\bHDR\s*\d+/i);
  // \w in JS e doar ASCII — "daună"/"daune" nu se potrivesc integral cu \w* (se opreste inainte de ă/â/î/ș/ț).
  // RO_WORD extinde clasa de caractere ca sufixele romanesti (daună, daune, dauna) sa fie consumate complet.
  const RO_WORD = 'a-zA-ZăâîșțşţĂÂÎȘȚŞŢ0-9';
  if (mHDR) {
    result.nrDosar = mHDR[0].trim();
  } else {
    // Unele formulare au spatii in jurul lui "/" sau "-" chiar in interiorul valorii
    // (Allianz: "BU / ZB422640", Grawe: "BH- 10-00-026490-2025") — le lipim doar pentru
    // acest match, ca sa incapa in clasa de caractere a grupului de captura.
    const compact = norm
      .replace(/([A-Za-z0-9])\s*\/\s*([A-Za-z0-9])/g, '$1/$2')
      .replace(/([A-Za-z0-9])\s*-\s*([A-Za-z0-9])/g, '$1-$2');
    // Acoperă "nr. dosar", "dosar nr.", "dosar daune:" / "dosar daună nr." (Groupama și alții, fără "nr" explicit)
    // (?!daun) previne capturarea cuvântului "daună/daune" ca valoare, atunci când eticheta nu îl consumă
    let m = compact.match(new RegExp('(?:nr\\.?\\s*dosar(?:\\s*(?:de\\s*)?daun[' + RO_WORD + ']*)?|dosar\\s*(?:de\\s*)?daun[' + RO_WORD + ']*(?:\\s*nr\\.?)?|dosar\\s*nr\\.?|num[ăa]r\\s*dosar(?:\\s*(?:de\\s*)?daun[' + RO_WORD + ']*)?)\\s*[:\\-]?\\s*(?!daun)([A-Z0-9][A-Z0-9\\/\\-\\.]{2,24})', 'i'));
    if (m) result.nrDosar = m[1].trim();
    else {
      // Fallback pt. formulare tip "SERIE: BH NR: U21201994394" (proces-verbal Groupama)
      const mSerieNr = compact.match(/SERIE:?\s*[A-Z]{1,3}\s*NR:?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,24})/i);
      if (mSerieNr) result.nrDosar = mSerieNr[1].trim();
      else {
        // Fallback pt. formulare Grawe: eticheta vine DUPA valoare — "Seria: BH-...-2025 (nr. dosar)"
        const mSeriaDupa = compact.match(/Seria:?\s*([A-Z0-9][A-Z0-9\/\-\.]{2,24})\s*\(\s*nr\.?\s*dosar/i);
        if (mSeriaDupa) result.nrDosar = mSeriaDupa[1].trim();
      }
    }
  }

  // Plate numbers (Romanian format)
  const plateRe = /\b[A-Z]{1,2}[\s\-]?\d{2,3}[\s\-]?[A-Z]{3}\b/g;
  const plates = [...new Set((norm.match(plateRe) || []).map(p => p.replace(/\s+/g,'-').toUpperCase()))];
  if (plates.length) { result.nrAuto = plates[0]; result.extraPlates = plates; }

  // Marcă + model auto păgubit
  const BRANDS = ['Dacia','Ford','Renault','Opel','Volkswagen','VW','Skoda','Škoda','Toyota','Hyundai','Kia',
    'BMW','Audi','Mercedes-Benz','Mercedes','Peugeot','Citroen','Citroën','Fiat','Seat','SEAT','Nissan','Honda',
    'Mazda','Suzuki','Mitsubishi','Chevrolet','Volvo','Land Rover','Range Rover','Jeep','Mini','Smart',
    'Alfa Romeo','Lancia','Subaru','Jaguar','Porsche','Tesla','Chrysler','Dodge','Iveco','Isuzu'];
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
    'A-Class','B-Class','C-Class','E-Class','S-Class','CLA','CLS','GLA','GLB','GLC','GLE','GLS','G-Class','EQA','EQB','EQC','EQE','EQS','Vaneo',
    'IS','ES','RX','NX','UX','LS','LC',
    'XE','XF','XJ','F-Pace','E-Pace','I-Pace','F-Type',
    'G70','G80','G90','GV70','GV80',
    'Giulia','Giulietta','Stelvio','Tonale','MiTo',
    '911','Cayenne','Macan','Panamera','Taycan',
    'Defender','Discovery','Evoque','Velar','Freelander','Range Rover Sport',
    'Model 3','Model Y','Model S','Model X'];
  const brandAlt = BRANDS.map(b => b.replace(/\s/g,'\\s+')).join('|');
  const modelAlt = MODELS.map(m => m.replace(/[-]/g,'[-\\s]?')).join('|');

  // Separator intre marca si model: de obicei spatiu, dar unii asiguratori/service-uri scriu
  // "VOLVO/XC40" (fara spatii) sau "VOLKSWAGEN, PASSAT" (cu virgula) — acceptam pe toate.
  const SEP = '[\\s,\\/]+';

  // 1) marcă urmată direct de un model cunoscut (accepta si conectorul "Clasa"/"Class", ex: Mercedes-Benz Clasa GLS)
  m = norm.match(new RegExp('\\b(' + brandAlt + ')' + SEP + '(?:Clasa' + SEP + '|Class' + SEP + ')?(' + modelAlt + ')\\b', 'i'));
  if (m) {
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
