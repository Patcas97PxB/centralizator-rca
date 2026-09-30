// Varianta de test: descurajeaza copierea (click dreapta, selectare, Ctrl+S/U/P, copiere text) si
// ascunde pagina de motoarele de cautare. Nu e o protectie reala — codul oricarei pagini web poate fi
// descarcat — dar opreste copierea „la indemana”. Campurile de scris (input/textarea) raman normale.
function inCampDeScris(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

export function pornesteProtectieDemo() {
  const meta = document.createElement('meta')
  meta.name = 'robots'
  meta.content = 'noindex, nofollow'
  document.head.appendChild(meta)
  document.documentElement.style.setProperty('-webkit-user-select', 'none')
  document.documentElement.style.setProperty('user-select', 'none')
  const style = document.createElement('style')
  style.textContent = 'input, textarea, [contenteditable] { -webkit-user-select: text; user-select: text; }'
  document.head.appendChild(style)

  document.addEventListener('contextmenu', (e) => {
    if (!inCampDeScris(e.target)) e.preventDefault()
  })
  for (const tip of ['copy', 'cut', 'dragstart'] as const) {
    document.addEventListener(tip, (e) => {
      if (!inCampDeScris(e.target)) e.preventDefault()
    })
  }
  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase()
    if ((e.ctrlKey || e.metaKey) && ['s', 'u', 'p'].includes(k)) e.preventDefault()
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) e.preventDefault()
    if (e.key === 'F12') e.preventDefault()
  })
}
