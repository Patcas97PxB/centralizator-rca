import { useEffect, useRef, useSyncExternalStore } from 'react'
import { citesteContractFinal } from './contract-final-import'
import { fisiereLocale, useFolderLocal } from './folder-local'
import type { Dosar } from './types'

// Contractele finale gasite in folderul de pe laptop se citesc singure, in fundal, imediat ce aplicatia
// vede folderul — pentru dosarele care n-au inca valoare/zile din contract. Fara asta, contractul aparea
// bifat doar dupa nume, iar Rapoartele (valoare, comision, verificarea tarifului) ramaneau pe 0.
// Fisierul se citeste doar in browser, nu se urca nicaieri. Un dosar se incearca o data pe sesiune
// (butonul ⟳ din „Documente” il recitește de mana).

export type StareContractLaptop = { stare: 'citeste' } | { stare: 'citit' } | { stare: 'eroare'; mesaj: string }

let stari = new Map<string, StareContractLaptop>()
const ascultatori = new Set<() => void>()
function seteaza(id: string, s: StareContractLaptop) {
  stari = new Map(stari).set(id, s)
  ascultatori.forEach((f) => f())
}
export function useStariContracteLaptop(): Map<string, StareContractLaptop> {
  return useSyncExternalStore(
    (f) => {
      ascultatori.add(f)
      return () => ascultatori.delete(f)
    },
    () => stari,
  )
}

const incercate = new Set<string>()
// fara valoare/zile, sau citit inainte sa se caute si proprietarul (Document intrare/iesire)
export const necitit = (d: Dosar) => (!d.valoareContract && !d.zileContractFinal) || !d.proprietarCautat

/** Ruleaza in DosareProvider: citeste pe rand contractele de pe laptop ale dosarelor fara valoare. */
export function useCitireContracteLaptop(dosare: Dosar[], salveaza: (d: Dosar) => Promise<unknown>) {
  const folder = useFolderLocal()
  const ultimele = useRef(dosare)
  ultimele.current = dosare
  const ruleaza = useRef(false)

  useEffect(() => {
    if (folder.permis !== 'granted' || !folder.scanatLa || ruleaza.current) return
    const coada = dosare.flatMap((d) => {
        if (!necitit(d)) return []
        const f = fisiereLocale(folder, d).find((x) => x.deschide && x.chei.includes('contract'))
        const cheie = d.id + '|' + (f?.cale ?? '')
        if (!f || incercate.has(cheie)) return []
        return [{ id: d.id, f, cheie }]
      })
    if (coada.length === 0) return
    ruleaza.current = true
    void (async () => {
      for (const { id, f, cheie } of coada) {
        incercate.add(cheie)
        const d = ultimele.current.find((x) => x.id === id)
        if (!d || !necitit(d)) continue
        seteaza(id, { stare: 'citeste' })
        try {
          const r = await citesteContractFinal(await f.deschide!(), d)
          if (!r.valid) {
            seteaza(id, { stare: 'eroare', mesaj: f.nume + ': ' + r.mesaj })
            continue
          }
          const acum = ultimele.current.find((x) => x.id === id) ?? d
          await salveaza({ ...acum, ...r.patch, contractFinalIncarcat: true })
          seteaza(id, { stare: 'citit' })
        } catch (e) {
          console.error(e)
          seteaza(id, { stare: 'eroare', mesaj: f.nume + ': ' + (e instanceof Error ? e.message : 'nu s-a putut citi') })
        }
      }
      ruleaza.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder.scanatLa, folder.permis, dosare.length > 0])
}
