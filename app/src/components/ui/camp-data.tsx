import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { isHoliday, isoLocal, todayStr } from '@/lib/rca-calc'
import { cn } from '@/lib/utils'

// Câmpul de dată al aplicației (în locul calendarului nativ al browserului/Windows, „care arată vechi” —
// cererea utilizatorului, 28.10.2026). Valoarea rămâne ISO („2026-10-27”), ca la <input type="date">.
// Se poate scrie direct „27.10.2026” (sau „27.10.26”, „27/10/2026”) ori alege din calendar: în română,
// săptămâna începe luni, azi încercuit, sărbătorile legale și weekendul mai șterse.

const LUNI = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
const ZILE_SAPT = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']

export const dinIso = (iso: string) => (iso ? iso.split('-').reverse().join('.') : '')

/** „27.10.2026”, „27.10.26”, „27/10/2026”, „27-10-2026” → ISO; altfel null. */
export function inIso(text: string): string | null {
  const t = text.trim()
  // doar cifre (tastatura numerică de pe telefon n-are punct): „29102026” / „291026”
  const c = /^\d{6}$|^\d{8}$/.test(t) ? t.match(/^(\d{2})(\d{2})(\d{2,4})$/) : null
  const m = c ?? t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/)
  if (!m) return null
  const zi = +m[1]
  const luna = +m[2]
  const an = m[3].length === 2 ? 2000 + +m[3] : +m[3]
  const d = new Date(an, luna - 1, zi)
  if (d.getFullYear() !== an || d.getMonth() !== luna - 1 || d.getDate() !== zi) return null
  return isoLocal(d)
}

// Pe telefon/tabletă (deget, nu mouse): atingi textul = scrii (tastatură numerică, punctele se pun singure),
// atingi iconița = calendarul (tastatura se închide întâi). Înainte, tastatura muta fereastra în timp ce
// apăsai pe o zi, iar calendarul „sărea” și trebuia apăsat de mai multe ori (raportat 29.10.2026 la
// Calculator de date).
const esteAtingere = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

/** Când scrii doar cifre, punctele se pun singure: „2910” → „29.10”, „29102026” → „29.10.2026”. */
function cuPuncte(v: string, anterior: string): string {
  if (!/^[\d.]*$/.test(v)) return v
  if (v.length < anterior.length) return v // ștergi: lasă cum e
  const c = v.replace(/\D/g, '').slice(0, 8)
  return [c.slice(0, 2), c.slice(2, 4), c.slice(4)].filter(Boolean).join('.') + (c.length === 2 || c.length === 4 ? '.' : '')
}

const CAMP_IMPLICIT =
  'flex h-[38px] w-full min-w-0 items-center gap-2 rounded-[11px] border border-border-strong bg-background px-3 text-[13.5px] text-foreground transition-colors focus-within:border-accent-tx'

export function CampData({
  value,
  onChange,
  id,
  min,
  disabled,
  golPermis = true,
  placeholder = 'zz.ll.aaaa',
  className,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (iso: string) => void
  id?: string
  min?: string
  disabled?: boolean
  /** Arată „Șterge” în calendar (câmpurile opționale / filtre). */
  golPermis?: boolean
  placeholder?: string
  className?: string
  'aria-label'?: string
}) {
  const [deschis, setDeschis] = useState(false)
  const [atingere] = useState(esteAtingere)
  const [vedere, setVedere] = useState<'zile' | 'luni'>('zile')
  const ancora = useRef<HTMLDivElement>(null)
  const [text, setText] = useState(dinIso(value))
  const [luna, setLuna] = useState(() => (value || todayStr()).slice(0, 7))

  useEffect(() => setText(dinIso(value)), [value])
  useEffect(() => {
    if (deschis) {
      setLuna((value || todayStr()).slice(0, 7))
      setVedere('zile')
    }
  }, [deschis, value])

  function alege(iso: string) {
    onChange(iso)
    setText(dinIso(iso))
    setDeschis(false)
  }
  function confirmaText() {
    if (!text.trim()) return golPermis ? onChange('') : setText(dinIso(value))
    const iso = inIso(text)
    if (iso && (!min || iso >= min)) onChange(iso)
    else setText(dinIso(value))
  }

  // grila: 6 săptămâni, de luni, începând cu săptămâna în care cade 1 a lunii
  const [an, l] = luna.split('-').map(Number)
  const prima = new Date(an, l - 1, 1)
  const start = new Date(prima)
  start.setDate(1 - ((prima.getDay() + 6) % 7))
  const zile = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const azi = todayStr()
  const muta = (n: number) => setLuna(isoLocal(new Date(an, l - 1 + n, 1)).slice(0, 7))

  return (
    <Popover open={deschis && !disabled} onOpenChange={setDeschis}>
      <PopoverAnchor asChild>
        <div
          ref={ancora}
          className={cn(CAMP_IMPLICIT, disabled && 'pointer-events-none opacity-50', atingere && 'cursor-pointer', className)}
          onClick={(e) => {
            // clicurile din calendar (portal) urcă în React până aici — nu redeschid calendarul după alegere
            if (disabled || !ancora.current?.contains(e.target as Node)) return
            // pe telefon textul = tastatura; calendarul se deschide doar din iconiță
            if (!atingere) setDeschis(true)
          }}
        >
          <input
            id={id}
            value={text}
            disabled={disabled}
            aria-label={ariaLabel}
            inputMode="numeric"
            placeholder={placeholder}
            onFocus={() => atingere && setDeschis(false)}
            onChange={(e) => {
              const t = cuPuncte(e.target.value, text)
              setText(t)
              // data întreagă scrisă („29.10.2026”) se aplică pe loc, fără să mai ieși din câmp
              const iso = t.length >= 10 ? inIso(t) : null
              if (iso && (!min || iso >= min) && iso !== value) onChange(iso)
            }}
            onBlur={confirmaText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                confirmaText()
                setDeschis(false)
              } else if (e.key === 'Escape') setDeschis(false)
              else if (e.key === 'ArrowDown') setDeschis(true)
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-inherit tabular-nums placeholder:text-tx-3 focus:outline-none"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Calendar"
            onClick={(e) => {
              e.stopPropagation()
              if (disabled) return
              // închide tastatura înainte să apară calendarul (altfel fereastra se mișcă)
              ;(document.activeElement as HTMLElement | null)?.blur?.()
              setDeschis((o) => !o)
            }}
            className={cn('-mr-2 flex shrink-0 items-center justify-center self-stretch rounded-md text-tx-3 hover:text-foreground', atingere ? 'w-10' : 'w-7')}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        // apăsarea pe câmp nu închide-și-redeschide calendarul (clipea)
        onInteractOutside={(e) => {
          if (ancora.current?.contains(e.target as Node)) e.preventDefault()
        }}
        className="w-[284px] gap-2 rounded-xl border border-border-strong bg-surface-2 p-3 text-foreground shadow-lg shadow-black/40 ring-0"
      >
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Luna trecută" onClick={() => muta(vedere === 'luni' ? -12 : -1)} className="flex size-8 items-center justify-center rounded-lg text-tx-2 hover:bg-surface-hover hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setVedere((v) => (v === 'zile' ? 'luni' : 'zile'))}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[14px] font-bold hover:bg-surface-hover"
            aria-label="Alege luna și anul"
          >
            {vedere === 'zile' ? `${LUNI[l - 1]} ${an}` : an}
            <ChevronDown className={cn('size-3.5 text-tx-3 transition-transform', vedere === 'luni' && 'rotate-180')} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Luna viitoare" onClick={() => muta(vedere === 'luni' ? 12 : 1)} className="flex size-8 items-center justify-center rounded-lg text-tx-2 hover:bg-surface-hover hover:text-foreground">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
        {vedere === 'luni' ? (
          <div className="grid grid-cols-3 gap-1.5 py-1">
            {LUNI.map((nume, i) => {
              const cheie = `${an}-${String(i + 1).padStart(2, '0')}`
              const aleasa = (value || '').slice(0, 7) === cheie
              const curenta = azi.slice(0, 7) === cheie
              return (
                <button
                  key={nume}
                  type="button"
                  onClick={() => {
                    setLuna(cheie)
                    setVedere('zile')
                  }}
                  className={cn(
                    'flex h-11 items-center justify-center rounded-lg text-[13.5px] font-semibold transition-colors',
                    aleasa ? 'bg-primary text-primary-foreground' : cn('text-foreground hover:bg-surface-hover', curenta && 'text-accent-tx ring-1 ring-inset ring-accent-tx/60'),
                  )}
                >
                  {nume.slice(0, 3)}
                </button>
              )
            })}
          </div>
        ) : (
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {ZILE_SAPT.map((z, i) => (
            <span key={z} className={cn('pb-1 text-[11.5px] font-semibold', i >= 5 ? 'text-tx-3' : 'text-tx-2')}>
              {z}
            </span>
          ))}
          {zile.map((d) => {
            const iso = isoLocal(d)
            const inLuna = d.getMonth() === l - 1
            const ales = iso === value
            const liber = d.getDay() === 0 || d.getDay() === 6 || isHoliday(d)
            const blocat = !!min && iso < min
            return (
              <button
                key={iso}
                type="button"
                disabled={blocat}
                onClick={() => alege(iso)}
                title={isHoliday(d) ? 'Sărbătoare legală' : undefined}
                className={cn(
                  'flex items-center justify-center rounded-lg',
                  atingere ? 'h-10' : 'h-8',
                  ' text-[13px] tabular-nums transition-colors',
                  ales
                    ? 'bg-primary font-bold text-primary-foreground'
                    : cn(
                        'hover:bg-surface-hover',
                        !inLuna ? 'text-tx-3/50' : liber ? 'text-tx-3' : 'text-foreground',
                        iso === azi && 'font-bold text-accent-tx ring-1 ring-inset ring-accent-tx/60',
                      ),
                  blocat && 'pointer-events-none opacity-30',
                )}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
        )}
        <div className="flex items-center justify-between border-t border-border pt-2">
          {golPermis ? (
            <button type="button" onClick={() => alege('')} className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-tx-3 hover:bg-surface-hover hover:text-foreground">
              Șterge
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            disabled={!!min && azi < min}
            onClick={() => alege(azi)}
            className="rounded-md px-2 py-1 text-[12.5px] font-semibold text-accent-tx hover:bg-surface-hover"
          >
            Azi
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
