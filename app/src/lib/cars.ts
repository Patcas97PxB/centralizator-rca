// Imaginile se pun in src/assets/cars/ (png/jpg/webp), numite dupa model ("a4.png", "bmw 3.png",
// "c class.png"). Orice fisier nou adaugat acolo e luat automat, fara alte modificari de cod.
const FISIERE = import.meta.glob('../assets/cars/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function tokeni(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/-/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((t) => (t === 'clasa' ? 'class' : t))
}

const CATALOG = Object.entries(FISIERE).map(([cale, url]) => {
  const nume = cale.split('/').pop()!.replace(/\.[^.]+$/, '')
  return { tokeni: tokeni(nume), url }
})

export function imagineMasina(marcaModel: string): string | null {
  const t = new Set(tokeni(marcaModel || ''))
  if (t.size === 0) return null
  let best: { n: number; url: string } | null = null
  for (const c of CATALOG) {
    if (c.tokeni.length > 0 && c.tokeni.every((x) => t.has(x)) && (!best || c.tokeni.length > best.n)) {
      best = { n: c.tokeni.length, url: c.url }
    }
  }
  return best?.url ?? null
}
