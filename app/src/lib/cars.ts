// Imaginile se iau direct din D:\Centralizator RCA\File\Cars\car_nobg (png/jpg/webp), numite dupa
// model ("a4.png", "bmw 3.png", "c class.png"). Orice fisier nou pus acolo e luat automat la
// urmatorul build/pornire a serverului, fara alte modificari de cod. Folderul File/ nu e in Git
// (contine si documente interne), deci pozele ajung pe site doar prin build-ul local.
const FISIERE = import.meta.glob('../../../File/Cars/car_nobg/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function curata(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\bclasa\b/g, 'class')
}

// Doua variante pentru cratime: "C-Class" -> [c, class] sau [cclass]; "C-HR" -> [c, hr] sau [chr].
function variante(text: string): string[][] {
  const t = curata(text)
  const impartit = t.replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
  const lipit = t.replace(/-/g, '').replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean)
  return [impartit, lipit]
}

const CATALOG = Object.entries(FISIERE).map(([cale, url]) => {
  const nume = cale.split('/').pop()!.replace(/\.[^.]+$/, '')
  return { variante: variante(nume), url }
})

export function imagineMasina(marcaModel: string): string | null {
  const model = new Set(variante(marcaModel || '').flat())
  if (model.size === 0) return null
  let best: { n: number; url: string } | null = null
  for (const c of CATALOG) {
    for (const v of c.variante) {
      if (v.length > 0 && v.every((x) => model.has(x)) && (!best || v.length > best.n)) {
        best = { n: v.length, url: c.url }
      }
    }
  }
  return best?.url ?? null
}
