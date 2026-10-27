import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Lista de alegere a aplicației (în locul <select> nativ, care deschide lista browserului): aceeași
// formă ca Select din formular — sub câmp, în temă, cu derulare fină.
export function Lista({
  value,
  onChange,
  optiuni,
  className,
  'aria-label': ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  optiuni: (string | { value: string; label: string })[]
  className?: string
  'aria-label'?: string
}) {
  const lista = optiuni.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn('h-10 w-full rounded-lg text-[14px]', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {lista.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
