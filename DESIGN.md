---
version: alpha
name: Centralizator RCA — Liniștit
description: Unitatea de design pentru aplicații de lucru — dark mat, fără efecte care se mișcă singure, culoarea doar pentru stare (termen). Variante surori - Grafit, Brand; modificator light opțional (vezi tokens.css).
colors:
  bg: "#0E1320"
  surface: "#151B29"
  surface-2: "#1C2333"
  border: "#252E41"
  border-strong: "#334059"
  text: "#E8ECF4"
  text-secondary: "#A9B3C7"
  text-muted: "#8A95AC"
  primary: "#2563EB"
  accent-text: "#60A5FA"
  on-primary: "#FFFFFF"
  sidebar: "#0B101B"
  state-urgent: "#F87171"
  state-warning: "#FBBF24"
  state-ok: "#34D399"
  state-scheduled: "#60A5FA"
  state-closed: "#64748B"
  state-violet: "#C084FC"
typography:
  title:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  status-big:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: 800
    lineHeight: 1.1
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
  label:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
rounded:
  sm: 8px
  md: 12px
  full: 999px
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 14px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    height: 40px
    padding: 0 16px
  button-next-step:
    backgroundColor: "#3B82F626"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.sm}"
    height: 32px
  pill:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: 40px
---

## Overview

Sursa adevărului pentru aspectul aplicației Centralizator RCA (redesign aprobat 27.10.2026). Tokenii sunt implementați
în `app/src/index.css` (`:root`); componentele vechi încă au culori scrise direct, care se înlocuiesc treptat (etapa F2).
Masterplanul complet (variante, machete, plan F1–F8) e în `File/Master plan design/` (local, neversionat).


Aplicație de lucru (mod „Operate”): utilizatorul vrea să afle repede ce are de făcut și cât timp mai are
fiecare element. Interfața e liniștită: fundal închis mat, carduri puțin mai deschise, un singur albastru
pentru acțiuni. **Nimic nu se mișcă singur** — fără raze de lumină, strălucire, stele, bare care „respiră”.
Mișcarea apare doar ca răspuns la o acțiune.

## Colors

- Neutrele fac aproape toată munca; `primary` (#2563EB, alb pe el 5,2:1) e singura culoare de acțiune pe butoane;
  textul albastru pe fundal închis folosește `accent-text` (#60A5FA, 6,8:1).
- **Culoarea înseamnă stare** (ex. termen): `state-urgent` expirat/azi, `state-warning` 1–2 zile, `state-ok` ≥ 3 zile,
  `state-scheduled` programat, `state-closed` închis. Apare ca bară îngustă pe marginea cardului, culoarea
  textului de stare și bara de progres — nu ca fundal, contur și umbră în același timp.
- Text slab (`text-muted`) doar pentru informație secundară; contrast ≥ 4,5:1 pe `surface`.

## Typography

Un singur font (Plus Jakarta Sans — are diacritice, e deja încărcat). Mărimi 12 · 13 · 14 · 16 · 20.
Ierarhia vine din mărime și greutate, nu din culoare. Fără etichete MAJUSCULE decorative; minim 12 px.

## Layout

Meniu lateral (secțiuni + „Unelte” + „Setări”), sus: titlu, căutare, clopoțel, acțiunea principală, cont.
Pe ecranul principal: rândul „De făcut azi” → tab-uri pe etape cu numere → grilă de carduri (3 coloane pe
calculator, 1 pe telefon). Detaliile se deschid într-un panou lateral (440 px), nu într-un formular.

## Elevation & Depth

Fără umbre. Separarea vine din diferența `bg` → `surface` și un contur de 1 px (`border`).
Panoul lateral și dialogurile: o umbră închisă, moale, ca să se desprindă de listă.

## Shapes

Colțuri 12 px pe carduri și panouri, 8 px pe butoane și câmpuri, pastile complet rotunjite.

## Components

- **Card:** 5 zone în ordinea importanței — cine (identificare + etapă), referințe pe un rând, starea mare colorată
  cu data și bara, ce lipsește, pasul următor (bara de etape + un singur buton).
- **Buton pas următor:** fundal `primary` la 15%, text `accent-text`; textul descrie acțiunea („Marchează preluat”).
- **Pastilă de etapă:** fundal `surface-2`, punct mic colorat, text secundar.
- **Panou lateral:** antet cu identificarea, apoi secțiuni: stare + etape cu date, documente (lipsurile primele),
  contacte, referințe; jos „Editează” și pasul următor.

## Do's and Don'ts

- Do: un singur pas următor per card; detaliile în panou; texte în limbajul utilizatorului.
- Do: respectă `prefers-reduced-motion`; animații 150–300 ms, doar `transform`/`opacity`.
- Don't: raze de lumină care se plimbă, glow, particule, degradeuri ca decor.
- Don't: culori hex scrise direct în componente — doar roluri.
- Don't: două sisteme de culoare pe același card (stare + etapă colorată).
