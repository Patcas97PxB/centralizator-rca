// Copierea din aplicație (Ctrl+C / Copy) pune în clipboard doar textul simplu — fără fundalul, culorile
// și fontul paginii (cererea utilizatorului, 29.10.2026: lipit în mail venea „cu tot cu fundal”).
// Câmpurile de scris (input/textarea) au deja copiere de text simplu, le lăsăm în pace.
function laCopiere(e: ClipboardEvent) {
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  const text = window.getSelection()?.toString() ?? ''
  if (!text || !e.clipboardData) return
  e.clipboardData.setData('text/plain', text.replace(/ /g, ' '))
  e.preventDefault()
}

document.addEventListener('copy', laCopiere)
