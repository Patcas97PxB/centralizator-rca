# Centralizator RCA — ghid pentru Claude

Aplicație pentru gestionarea dosarelor RCA (mașini de înlocuire). Limba interfeței și a conversației: **română**.
Live: https://patcas97pxb.github.io/centralizator-rca/ · Repo: `Patcas97PxB/centralizator-rca` (ramura `main`).

## Structura repo-ului
- `app/` — aplicația nouă: Vite + React 19 + TypeScript, Tailwind v4 (config în `app/src/index.css`), shadcn/ui, lucide-react. **Aici se lucrează.**
- **Rădăcina repo-ului (`index.html`, `assets/`) = build-ul publicat.** GitHub Pages servește rădăcina, nu `app/`.
- `icons/`, `js/`, `shared/` — resurse folosite și de app (Vite le servește/copiază, vezi `app/vite.config.ts`).
- `supabase/` — migrări. Datele stau în Supabase (tabelul `dosare`, coloana `data` jsonb; câmpuri noi opționale nu cer migrare).
- `File/` — **în .gitignore** (documente interne, grile asiguratori, poze mașini). Nu ajunge pe GitHub.
- `Centralizator RCA - site.html` — mockup-ul de design (netrack-uit). Sursa adevărului pentru aspect. Varianta „standalone" era greșită și a fost eliminată.

## Comenzi (din `app/`)
- Typecheck: `npx tsc --noEmit -p tsconfig.app.json`
- Build: `npm run build`
- Dev: în Claude Code, `preview_start` cu `rca-app-nou` (port 5180, vezi `.claude/launch.json`); `rca-site` (5175) servește mockup-ul.
- Aplicația cere parolă la intrare. **Nu introduce parola** — cere utilizatorului să se logheze în panoul Browser.

## Publicare pe live (IMPORTANT — nu ajunge un simplu push)
1. `cd app && npm run build`
2. Din rădăcină: `git rm -rq assets && cp -r app/dist/assets assets && cp app/dist/index.html index.html && git add assets index.html`
3. `git commit` + `git push origin main`
4. Așteaptă „pages build and deployment" (`gh run list --limit 1`), apoi verifică asset-urile noi (curl 200).
Comite local oricând, dar **push doar când cere utilizatorul**. Pozele de mașini ajung pe site doar prin acest build local.

## Reguli de business stabilite
- **Culoarea cardului = termenul**, nu statusul: roșu ≤0 zile/expirat, galben 1–2, verde ≥3, albastru programare (înainte de predare), gri finalizat. Pastila de status păstrează culoarea statusului (`STATUS_META`). Implementare: `prioritateDosar`/`urgentaDosar` în `lib/rca-calc.ts`.
- **Ordinea cardurilor**: roșu → galben → verde → albastru → finalizate jos. Un dosar tocmai finalizat rămâne pe loc ~2,5 s (animația de finalizare), apoi coboară cu animație de mutare (`DosarePage.tsx`).
- **Clopoțel (`dosareDeSunat`)**: intră dosarele cu status `de_sunat` (manual) sau cu ≤2 zile până la termen (inclusiv expirate). Se sting la `in_asteptare`, `astept_docum`, `finalizat`. Click pe un dosar din listă te duce la cardul lui.
- **Finalizarea e blocată** dacă lipsesc documente obligatorii (`lipsuriFinalizare`, `lib/documente.ts`). 9 tipuri numărate; „RCA vinovat/păgubit" sunt incluse în „Documente vinovat/păgubit"; **Contract final** = cheia `contract`, mereu obligatoriu. Etichetele vechi `rca_*` se normalizează la citire (`types.ts`).
- **Contract final**: se încarcă din modalul de documente sau din „Editează". `lib/contract-final-import.ts` verifică să fie al dosarului și completează zile, valoare (cu/fără TVA), clasă etc. Un fișier greșit e respins fără să încarce nimic.
- **Predat / Preluat** pe card: bife informative (`predatBifat`/`preluatBifat`), fără efect pe status. Preluat se poate bifa doar după Predat.
- **Poza cardului = vehiculul de înlocuire** (`marcaModelInlocuire`), nu mașina păgubită. Pozele se iau din `File/Cars/car_nobg` (`lib/cars.ts`, potrivire pe cuvinte: „Arkana" = „Renault Arkana"). Poză nouă în folder → repornește serverul de dev.
- **Statistici** (panoul din dreapta): total/finalizate/în curs, service și asigurator cu cele mai multe dosare, vehiculul de înlocuire cel mai oferit (cu poză).
- Legenda culorilor e în butonul „i" din rândul de filtre. „Modificare PDF" e afișat dar dezactivat („în curând"); Dashboard/Setări = „în curând".

## Design și animații
- Tokens și `@keyframes` în `app/src/index.css`. Toate animațiile respectă `prefers-reduced-motion`; există comutator „Animații: automat/pornite" în meniul avatarului (`lib/motion-pref.ts`). Pe Windows cu „Efecte de animație" oprite, browserul raportează reduced-motion.
- Lumina de pe marginea sidebar-ului + header-ului: `components/layout/LightRay.tsx` (un singur traseu SVG, colț drept).
- Sidebar 245px, header cu gradient; pe mobil (<md) bara de jos înlocuiește sidebar-ul (`MobileBottomNav.tsx`).
- Mockup-ul nu are variantă de mobil — mobilul e decis separat.

## Capcane cunoscute
- Comenzile bash cu heredoc lung eșuează uneori: scrie scripturile cu `Write` (în scratchpad) și rulează-le.
- Serverul de dev și site-ul live folosesc **aceeași bază de date Supabase**: la teste nu salva/șterge dosare reale (deschide formulare și închide cu Anulează).
- Avertismentele Git „LF will be replaced by CRLF" sunt inofensive.
- Modalul de documente salvează automat fiecare schimbare.
- Netestat cu fișiere reale: extragerea zilelor dintr-un deviz real și citirea unui contract final real (codul e portat din versiunea veche).

## Preferințe de lucru ale utilizatorului
Răspunsuri scurte, în română. Verifică vizual în browser înainte să spui că e gata. Când nu ești sigur de o regulă de business, întreabă. Nu adăuga butoane sau elemente noi pe card fără cerere explicită.
