// Site-ul e o "project page" GitHub Pages (.../centralizator-rca/), nu la radacina
// domeniului — referintele absolute gen "/icons/logo.png" din JS (spre deosebire de
// index.html, unde functioneaza %BASE_URL%) trebuie sa treaca prin base-ul configurat de
// Vite (vite.config.ts), altfel rezolva gresit in productie (desi merg corect in dev, unde
// base e "/").
export function assetUrl(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}
