import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DOCUMENTE_LEGALE, TITULAR, type DocLegal } from './legal-texte'

const LINKURI: [DocLegal, string][] = [
  ['gdpr', 'Confidențialitate (GDPR)'],
  ['termeni', 'Termeni și condiții'],
  ['cookies', 'Cookie-uri'],
]

// Josul paginii: © + linkuri catre textele legale, deschise intr-o fereastra (fara pagini separate).
export function SiteFooter({ className }: { className?: string }) {
  const [deschis, setDeschis] = useState<DocLegal | null>(null)
  const doc = deschis ? DOCUMENTE_LEGALE[deschis] : null

  return (
    <footer className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-4 py-4 text-center text-[11.5px] text-[#8b9ab5]', className)}>
      <span>
        © {new Date().getFullYear()} {TITULAR} · Centralizator RCA. Toate drepturile rezervate.
      </span>
      <nav aria-label="Informații legale" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        {LINKURI.map(([cheie, eticheta]) => (
          <button
            key={cheie}
            type="button"
            onClick={() => setDeschis(cheie)}
            className="rounded underline-offset-2 transition-colors hover:text-[#cbd5e1] hover:underline focus-visible:outline-2 focus-visible:outline-[#60a5fa]"
          >
            {eticheta}
          </button>
        ))}
      </nav>

      <Dialog open={!!doc} onOpenChange={(o) => !o && setDeschis(null)}>
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{doc?.titlu}</DialogTitle>
          </DialogHeader>
          <div className="text-left text-[13px] leading-relaxed text-muted-foreground">{doc?.continut}</div>
        </DialogContent>
      </Dialog>
    </footer>
  )
}
