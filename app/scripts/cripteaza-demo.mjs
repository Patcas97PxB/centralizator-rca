// Cripteaza un backup (rca-backup-*.json, exportat din aplicatie) pentru varianta de test.
// Folosire:  node scripts/cripteaza-demo.mjs <backup.json> <parola> <iesire date-demo.enc>
// Formatul trebuie sa ramana la fel ca in src/lib/demo.ts (PBKDF2-SHA256 600k → AES-GCM 256).
import fs from 'node:fs'
import { webcrypto as crypto } from 'node:crypto'

const [, , intrare, parola, iesire] = process.argv
if (!intrare || !parola || !iesire) {
  console.error('Folosire: node scripts/cripteaza-demo.mjs <backup.json> <parola> <iesire>')
  process.exit(1)
}
const backup = JSON.parse(fs.readFileSync(intrare, 'utf8'))
if (!Array.isArray(backup.dosare)) throw new Error('Backup invalid: lipseste lista de dosare.')
const continut = JSON.stringify({ dosare: backup.dosare, servicii: backup.servicii ?? [] })

const sare = crypto.getRandomValues(new Uint8Array(16))
const iv = crypto.getRandomValues(new Uint8Array(12))
const baza = await crypto.subtle.importKey('raw', new TextEncoder().encode(parola.trim()), 'PBKDF2', false, ['deriveKey'])
const cheie = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: sare, iterations: 600000, hash: 'SHA-256' },
  baza,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt'],
)
const date = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cheie, new TextEncoder().encode(continut))
const b64 = (u) => Buffer.from(u).toString('base64')
fs.writeFileSync(iesire, JSON.stringify({ sare: b64(sare), iv: b64(iv), date: b64(new Uint8Array(date)) }))
console.log(`OK: ${backup.dosare.length} dosare, ${(backup.servicii ?? []).length} service-uri → ${iesire}`)
