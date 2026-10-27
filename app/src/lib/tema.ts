import { useSyncExternalStore } from 'react'

// Tema aplicației (Setări → Aspect): „dark” (Liniștit, implicit) sau „light”. Se ține în acest browser
// (localStorage) și se pune ca data-theme pe <html>; culorile vin din index.css (:root / [data-theme=light]).

export type Tema = 'dark' | 'light'

const KEY = 'rca-tema'
const listeners = new Set<() => void>()

function read(): Tema {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function apply(t: Tema) {
  if (t === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
}

apply(read())

export function setTema(t: Tema) {
  try {
    localStorage.setItem(KEY, t)
  } catch {
    // storage indisponibil: tema rămâne doar pentru sesiunea curentă
  }
  apply(t)
  listeners.forEach((l) => l())
}

export function useTema(): Tema {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    read,
    () => 'dark' as Tema,
  )
}
