import fs from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// js/extractie.js, js/clase-auto.js (sursa unica, folosita si de index.html/financiar.html
// si de tests/) si icons/ (favicon-uri, sigla) traiesc la radacina repo-ului, in afara
// acestui proiect Vite — nu se duplica manual, ca sa nu diverga de site-ul vechi.
//
// Nu le copiem in public/: publicDir e scanat/cache-uit o singura data la pornirea
// serverului de dev (inainte sa apuce sa ruleze acest plugin), deci fisierele copiate
// ulterior "nu exista" pentru middleware-ul de fisiere statice al lui Vite si cad pe
// fallback-ul de SPA (index.html) — de-aia servim direct printr-un middleware in dev, si
// le includem explicit in build cu emitFile.
const dirname = import.meta.dirname

function servesteResurseExterne(): Plugin[] {
  const iconsSrc = path.resolve(dirname, '../icons')
  const jsSrc = path.resolve(dirname, '../js')
  const jsFiles = ['extractie.js', 'clase-auto.js']
  const MIME: Record<string, string> = {
    '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.js': 'text/javascript',
  }

  return [
    {
      name: 'servesteResurseExterne-dev',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url?.split('?')[0] ?? ''
          let filePath: string | null = null
          if (url.startsWith('/icons/')) filePath = path.join(iconsSrc, url.slice('/icons/'.length))
          else if (url.startsWith('/shared/')) filePath = path.join(jsSrc, url.slice('/shared/'.length))
          if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', MIME[path.extname(filePath)] ?? 'application/octet-stream')
            fs.createReadStream(filePath).pipe(res)
            return
          }
          next()
        })
      },
    },
    {
      name: 'servesteResurseExterne-build',
      apply: 'build',
      buildStart() {
        for (const f of jsFiles) {
          this.emitFile({ type: 'asset', fileName: `shared/${f}`, source: fs.readFileSync(path.join(jsSrc, f)) })
        }
        for (const f of fs.readdirSync(iconsSrc)) {
          this.emitFile({ type: 'asset', fileName: `icons/${f}`, source: fs.readFileSync(path.join(iconsSrc, f)) })
        }
      },
    },
  ]
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Site-ul e o "project page" GitHub Pages (patcas97pxb.github.io/centralizator-rca/),
  // nu la radacina domeniului — build-ul trebuie sa stie sub-calea asta ca sa refere corect
  // JS/CSS/iconițele. In dev raman la radacina (localhost:5180/), acolo nu exista sub-cale.
  // Cheia e `mode`, nu `command`: `vite preview` raporteaza command:'serve' la fel ca
  // dev-serverul, dar mode ramane 'production' (ca la build) — asta chiar distinge intre ele.
  base: mode === 'production' ? '/centralizator-rca/' : '/',
  plugins: [react(), tailwindcss(), ...servesteResurseExterne()],
  // Pozele de masini sunt in ../File/Cars/car_nobg, in afara proiectului Vite.
  server: { fs: { allow: ['..'] } },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
}))
