// Ruleaza suita de exemple din tests/fixtures/clase-auto.json impotriva
// suggestClasaFromModel din js/clase-auto.js.
//
// Rulare: node tests/run-clase-auto.js

const fs = require('fs');
const path = require('path');

const { suggestClasaFromModel } = require('../js/clase-auto.js');

const fixturesPath = path.join(__dirname, 'fixtures', 'clase-auto.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

let pass = 0;
let fail = 0;

for (const fx of fixtures) {
  const actual = suggestClasaFromModel(fx.marcaModel);
  if (actual !== fx.clasaAsteptata) {
    fail++;
    console.log(`✗ ${fx.id} — "${fx.marcaModel}": asteptat "${fx.clasaAsteptata}", obtinut "${actual}"`);
  } else {
    pass++;
    console.log(`✓ ${fx.id}`);
  }
}

console.log(`\n${pass} reusite, ${fail} esuate din ${fixtures.length} exemple.`);
if (fail > 0) process.exit(1);
