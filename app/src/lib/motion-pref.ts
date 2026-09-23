import { useSyncExternalStore } from 'react'

export type MotionPref = 'auto' | 'on'

const KEY = 'rca-motion-pref'
const listeners = new Set<() => void>()

function read(): MotionPref {
  try {
    return localStorage.getItem(KEY) === 'on' ? 'on' : 'auto'
  } catch {
    return 'auto'
  }
}

function apply(pref: MotionPref) {
  if (pref === 'on') document.documentElement.setAttribute('data-motion', 'on')
  else document.documentElement.removeAttribute('data-motion')
}

apply(read())

export function setMotionPref(pref: MotionPref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // storage indisponibil: preferinta ramane doar pentru sesiunea curenta
  }
  apply(pref)
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useMotionPref(): MotionPref {
  return useSyncExternalStore(subscribe, read, () => 'auto' as MotionPref)
}
