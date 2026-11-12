// Copiază build-ul (app/dist) în rădăcina repo-ului pentru GitHub Pages, PĂSTRÂND fișierele
// versiunii anterioare din assets/. GitHub Pages ține index.html în cache ~10 min: un browser
// cu pagina veche cere CSS/JS-ul vechi — dacă l-am șters, pagina apare fără stil (13.11.2026).
// Se păstrează doar versiunea imediat anterioară (lista ei în assets-versiune.txt); restul se șterge.
//   node app/scripts/publica-assets.mjs        (din rădăcina repo-ului, după `npm run build`)
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const rad = join(import.meta.dirname, '..', '..')
const dist = join(rad, 'app', 'dist')
const assets = join(rad, 'assets')
const lista = join(rad, 'assets-versiune.txt')

if (!existsSync(join(dist, 'index.html'))) throw new Error('Lipsește app/dist — rulează întâi `npm run build` în app/.')

const noi = readdirSync(join(dist, 'assets'))
const anteriori = existsSync(lista)
  ? readFileSync(lista, 'utf8').split(/\r?\n/).filter(Boolean)
  : existsSync(assets) ? readdirSync(assets) : []
const pastrate = new Set([...noi, ...anteriori])

let sterse = 0
if (existsSync(assets)) {
  for (const f of readdirSync(assets)) {
    if (!pastrate.has(f)) {
      rmSync(join(assets, f), { recursive: true, force: true })
      sterse++
    }
  }
}
cpSync(join(dist, 'assets'), assets, { recursive: true })
cpSync(join(dist, 'index.html'), join(rad, 'index.html'))
rmSync(join(rad, 'ocr-models'), { recursive: true, force: true })
cpSync(join(dist, 'ocr-models'), join(rad, 'ocr-models'), { recursive: true })
writeFileSync(lista, noi.join('\n') + '\n')

const pastrateVechi = anteriori.filter((f) => !noi.includes(f) && existsSync(join(assets, f))).length
console.log(`assets: ${noi.length} noi, ${pastrateVechi} păstrate din versiunea anterioară, ${sterse} șterse (mai vechi).`)
