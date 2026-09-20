// Ruleaza suita de exemple din tests/fixtures/extractie-camp.json impotriva
// motorului de extragere din js/extractie.js. Fiecare exemplu invatat vreodata
// ramane aici permanent, ca sa nu se strice la urmatoarea modificare.
//
// Rulare: node tests/run-extractie.js

const fs = require('fs');
const path = require('path');

const { extractFromText } = require('../js/extractie.js');

const fixturesPath = path.join(__dirname, 'fixtures', 'extractie-camp.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

let pass = 0;
let fail = 0;

for (const fx of fixtures) {
  const result = extractFromText(fx.text);
  const problems = [];
  for (const [field, expected] of Object.entries(fx.expected)) {
    const actual = result[field];
    if (actual !== expected) {
      problems.push(`  ${field}: asteptat "${expected}", obtinut "${actual}"`);
    }
  }
  if (problems.length) {
    fail++;
    console.log(`✗ ${fx.id} — ${fx.descriere}`);
    problems.forEach(p => console.log(p));
  } else {
    pass++;
    console.log(`✓ ${fx.id}`);
  }
}

console.log(`\n${pass} reusite, ${fail} esuate din ${fixtures.length} exemple.`);
if (fail > 0) process.exit(1);
