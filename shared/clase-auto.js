// Identifica "clasa auto" (categoria din grila de tarife) pornind de la textul marca/model,
// fie el scris de mana in formular, fie extras automat dintr-un document (js/extractie.js).
// Incarcat atat in index.html cat si in financiar.html (<script src="js/clase-auto.js">),
// si de suita de teste din tests/.
//
// Cand o masina cunoscuta nu e recunoscuta (clasa iese goala desi ar trebui sa se potriveasca):
// vezi skill-ul .claude/skills/extractie-camp-deviz/SKILL.md pentru workflow-ul de adaugare
// a unui exemplu nou in suita de teste.

// Lista canonică de clase (cu marca/model asociate), pentru dropdown + auto-sugestie clasă.
const VEHICLE_CLASSES = [
  { clasa: 'A',    models: 'Toyota Aygo, Skoda Citigo, Mitsubishi Space Star, Fiat Panda, Hyundai i10, Kia Picanto, Peugeot 108, Citroen C1' },
  { clasa: 'eA',   models: 'VW eUp' },
  { clasa: 'B',    models: 'Dacia Logan, Dacia Sandero Stepway, Ford Fiesta, Citroen C3, Hyundai I20, Opel Corsa, Peugeot 208, Renault Clio, Seat Ibiza' },
  { clasa: 'eB',   models: 'Dacia Spring' },
  { clasa: 'C',    models: 'Skoda Rapid, Skoda Scala, Seat Leon, Citroen C-Elysee, Seat Toledo, Kia Ceed, Opel Astra, Toyota Auris, Fiat Tipo' },
  { clasa: 'C1',   models: 'Dacia Logan MCV' },
  { clasa: 'D',    models: 'Ford Focus, Seat Arona, Citroen C4, Ford Ecosport, Hyundai I30, Hyundai Kona, Peugeot 2008, VW Golf, VW T-ROC, VW T-Cross, Renault Captur, Honda Civic Sedan, Hyundai Elantra, Kia Niro, VW Jetta, Mazda 3' },
  { clasa: 'D2',   models: 'Seat Arona, Skoda Kamiq, Skoda Scala, Ford Focus, VW Golf, Seat Toledo, VW T-Cross, Peugeot 2008, Opel Grandland X, Nissan Juke, Citroen C4 automat' },
  { clasa: 'eD',   models: 'Peugeot E-2008' },
  { clasa: 'E',    models: 'Skoda Octavia, Renault Megane, Hyundai Elantra, Peugeot 301, Honda Civic' },
  { clasa: 'E1',   models: 'Toyota CHR, Toyota Prius, Renault Arkana, Hyundai Ioniq, Ford Puma, Toyota Corolla' },
  { clasa: 'F',    models: 'Opel Insignia, Peugeot 508, Renault Talisman' },
  { clasa: 'F1',   models: 'Skoda Superb, VW Passat, Toyota Camry, Ford Mondeo, VW Arteon, Honda Accord' },
  { clasa: 'G',    models: 'Nissan Qashqai, Renault Kadjar, Kia Sportage, Hyundai Tucson, Peugeot 3008, Mazda CX-5, Opel Grandland, Skoda Karoq' },
  { clasa: 'G1',   models: 'Toyota RAV4, VW Tiguan, Ford Kuga, Skoda Kodiaq, Seat Ateca, Mercedes GLA, Mercedes GLB, Peugeot 3008, Hyundai Tucson, Audi Q3, BMW X1, BMW X2, Hyundai Santa Fe, Honda CR-V' },
  { clasa: 'eG1',  models: 'Mercedes Benz EQA, VW ID4' },
  { clasa: 'G2',   models: 'Dacia Duster, Suzuki Vitara, SsangYong Tivoli, Jeep Renegade, Hyundai Bayon, Fiat 500X' },
  { clasa: 'GP',   models: 'Mercedes GLE, VW Touareg, Audi Q8, BMW X5, Volvo XC90, Lexus RX, Porsche Cayenne, Range Rover Velar, Jeep Grand Cherokee, Kia Sorento' },
  { clasa: 'GP1',  models: 'Audi Q5, Mercedes GLC, BMW X3, BMW X4, Porsche Macan, Volvo XC60' },
  { clasa: 'H',    models: 'Porsche Taycan, BMW Seria 7, Audi A8, Mercedes Benz S-class' },
  { clasa: 'L/eL', models: 'Renault Trafic, Opel Vivaro, Ford Transit Custom, VW Transporter, Citroen Jumpy, Peugeot Expert, Toyota Proace, Fiat Scudo' },
  { clasa: 'L1',   models: 'Dacia Lodgy, Fiat Doblo MPV, Renault Grand Scenic, Citroen Berlingo MPV, Opel Combo Life, VW Caddy MPV, Peugeot 5008' },
  { clasa: 'P',    models: 'Audi A4, Audi A3, BMW Seria 3, Mercedes C Class, Mercedes CLA, Volvo S60, Lexus IS, Alfa Romeo Giulia, Jaguar XE, Genesis G70' },
  { clasa: 'P0',   models: 'BMW seria 1, Mini Cooper, Mercedes A-Class' },
  { clasa: 'P1',   models: 'Audi A6, BMW Seria 4, BMW Seria 5, BMW Seria 6, Mercedes E-Class, Volvo S90, Lexus ES, Jaguar XF, Genesis G80' },
  { clasa: 'eP1',  models: 'Tesla 3, Tesla Y, Polestar 2, BMW i4, Audi Q4 e-tron, Mercedes-Benz EQC, VW ID.4, Ford Mustang Mach-E' },
  { clasa: 'V',    models: 'Citroen Jumper, Opel Vivaro, Peugeot Boxer, Renault Master, VW Crafter, Ford Transit, Fiat Ducato, Mercedes Sprinter, Iveco Daily' },
  { clasa: 'V0',   models: 'Dacia Dokker, Fiat Doblo, Renault Kangoo, Opel Combo, VW Caddy, Citroen Jumpy, Peugeot Partner, Renault Express, Citroen Berlingo, Mercedes Citan, Ford Connect' },
  { clasa: 'V1',   models: 'Dacia Dokker frigo, Fiat Doblo frigo' },
  { clasa: 'V2',   models: 'Ford Transit frigo, Renault Master frigo' },
  { clasa: 'X',    models: 'Ford Ranger, Ford Raptor, Mitsubishi L200, Toyota Hilux, VW Amarok, Isuzu D-Max, Renault Alaskan, Mazda BT-50' },
];

// Alias-uri de marca: grila de mai sus scrie uneori marca prescurtat sau diferit fata de cum
// iese din extragerea automata a documentelor (ex: grila are "VW Passat", dar din document iese
// "Volkswagen Passat"; grila are "Mercedes GLA"/"Mercedes Benz EQA", documentul poate da
// "Mercedes-Benz GLA"). Normalizam ambele parti la aceeasi forma inainte de comparare.
const ALIASE_MARCA = [
  ['volkswagen', ['vw']],
  ['mercedes', ['mercedes benz']],
];

function normalizeazaTextClasa(s) {
  let t = (s || '').toLowerCase();
  t = t.replace(/[-.]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  for (const [canonic, aliasuri] of ALIASE_MARCA) {
    for (const alias of aliasuri) {
      t = t.replace(new RegExp('\\b' + alias.replace(/\s+/g, '\\s+') + '\\b', 'g'), canonic);
    }
  }
  return t.replace(/\s+/g, ' ').trim();
}

// Distanta Levenshtein — pentru greseli mici de scriere/OCR (ex: "Pasat" in loc de "Passat").
function levenshteinClasa(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function suggestClasaFromModel(text) {
  if (!text) return '';
  const t = normalizeazaTextClasa(text);
  const tWords = t.split(' ').filter(w => w.length >= 3);

  // Pas 1: potrivire directa (marca+model), pe textul normalizat — rezolva diferentele de
  // scriere a marcii (VW/Volkswagen, Mercedes-Benz/Mercedes Benz/Mercedes) si de cratima (T-Roc/T Roc).
  for (const vc of VEHICLE_CLASSES) {
    const models = vc.models.split(',').map(m => normalizeazaTextClasa(m));
    for (const m of models) {
      if (m && t.includes(m)) return vc.clasa;
    }
  }

  // Pas 2: doar numele modelului, fara marca — poate fi scris/citit doar "Passat" fara
  // "Volkswagen"/"VW" in fata, si oricum e neambiguu despre ce masina e vorba.
  for (const vc of VEHICLE_CLASSES) {
    const models = vc.models.split(',').map(m => normalizeazaTextClasa(m));
    for (const m of models) {
      const cuvinte = m.split(' ');
      const modelOnly = cuvinte.slice(1).join(' '); // primul cuvant e considerat marca
      if (modelOnly.length >= 4 && t.includes(modelOnly)) return vc.clasa;
    }
  }

  // Pas 3: potrivire aproximativa (distanta Levenshtein <= 1) pe fiecare cuvant de model
  // (minim 5 caractere, ca sa evitam potriviri false pe cuvinte scurte), pentru greseli mici
  // de tastare sau OCR (ex: "Pasat" in loc de "Passat").
  for (const vc of VEHICLE_CLASSES) {
    const models = vc.models.split(',').map(m => normalizeazaTextClasa(m));
    for (const m of models) {
      const modelWords = m.split(' ').slice(1).filter(w => w.length >= 5);
      for (const mw of modelWords) {
        for (const tw of tWords) {
          if (Math.abs(tw.length - mw.length) <= 1 && levenshteinClasa(tw, mw) <= 1) return vc.clasa;
        }
      }
    }
  }

  return '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { suggestClasaFromModel, VEHICLE_CLASSES, normalizeazaTextClasa, levenshteinClasa };
}
