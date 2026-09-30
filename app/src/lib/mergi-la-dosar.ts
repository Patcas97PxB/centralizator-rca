// Deruleaza pana la cardul dosarului si il evidentiaza scurt. Cardul poate aparea cu o mica
// intarziere (dupa schimbarea sectiunii sau a filtrelor), deci il cautam cateva zeci de ms.
export function mergiLaCardDosar(id: string) {
  let incercari = 0
  const cauta = () => {
    const el = document.getElementById('dosar-' + id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.remove('dosar-evidentiat')
      void el.offsetWidth
      el.classList.add('dosar-evidentiat')
      window.setTimeout(() => el.classList.remove('dosar-evidentiat'), 2600)
    } else if (incercari++ < 30) {
      window.setTimeout(cauta, 50)
    }
  }
  window.setTimeout(cauta, 50)
}
