import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Wrench } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Serviciu {
  id: string
  nume: string
  telefon: string
}

// Camp "Service": la click se deschide lista tuturor service-urilor (se filtreaza pe masura ce scrii),
// iar alegerea completeaza si telefonul. Se poate scrie si un service care nu e in lista.
export function ServiceCombobox({
  id,
  value,
  servicii,
  onChange,
}: {
  id?: string
  value: string
  servicii: Serviciu[]
  onChange: (nume: string) => void
}) {
  const [deschis, setDeschis] = useState(false)
  const [activ, setActiv] = useState(0)
  const radacina = useRef<HTMLDivElement>(null)

  // Cand valoarea din camp coincide exact cu un service, aratam toata lista (nu doar acel service).
  const exact = servicii.some((s) => s.nume.toLowerCase() === value.trim().toLowerCase())
  const filtrate = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q || exact) return servicii
    return servicii.filter((s) => s.nume.toLowerCase().includes(q) || s.telefon.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
  }, [servicii, value, exact])

  useEffect(() => {
    if (!deschis) return
    function inafara(e: MouseEvent) {
      if (radacina.current && !radacina.current.contains(e.target as Node)) setDeschis(false)
    }
    document.addEventListener('mousedown', inafara)
    return () => document.removeEventListener('mousedown', inafara)
  }, [deschis])

  function alege(s: Serviciu) {
    onChange(s.nume)
    setDeschis(false)
  }

  return (
    <div ref={radacina} className="relative">
      <Input
        id={id}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={deschis}
        aria-controls={id ? id + '-lista' : undefined}
        className="pr-9"
        onFocus={() => setDeschis(true)}
        onClick={() => setDeschis(true)}
        onChange={(e) => {
          onChange(e.target.value)
          setDeschis(true)
          setActiv(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setDeschis(true)
            setActiv((a) => Math.min(a + 1, filtrate.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiv((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && deschis && filtrate[activ]) {
            e.preventDefault()
            alege(filtrate[activ])
          } else if (e.key === 'Escape' && deschis) {
            e.stopPropagation()
            setDeschis(false)
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={deschis ? 'Închide lista de service-uri' : 'Alege service'}
        onClick={() => setDeschis((d) => !d)}
        className="absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-white/5 hover:text-white"
      >
        <ChevronDown className={cn('size-4 transition-transform', deschis && 'rotate-180')} aria-hidden="true" />
      </button>

      {deschis && (
        <div
          id={id ? id + '-lista' : undefined}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[#2c3a5c] bg-[#0d1524] p-1.5 shadow-[0_20px_40px_-16px_rgba(0,0,0,.9)] animate-[fadeUp_.15s_ease-out_both]"
        >
          {filtrate.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-[#8b9ab5]">
              Niciun service în listă — se va folosi „{value.trim()}” ca service nou.
            </div>
          ) : (
            filtrate.map((s, i) => {
              const selectat = s.nume.toLowerCase() === value.trim().toLowerCase()
              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={selectat}
                  onMouseEnter={() => setActiv(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => alege(s)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    i === activ ? 'bg-white/[.06]' : 'hover:bg-white/5',
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[#253150] bg-[#253150]/30 text-[#94a3b8]">
                    <Wrench className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-[#f1f5f9]">{s.nume}</span>
                    <span className="block truncate text-[11px] tabular-nums text-[#8b9ab5]">{s.telefon || 'fără telefon'}</span>
                  </span>
                  {selectat && <Check className="size-4 shrink-0 text-[#00f5a0]" strokeWidth={2.6} aria-hidden="true" />}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
