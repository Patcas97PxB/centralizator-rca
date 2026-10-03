import { useRef, useState } from 'react'
import { FileCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { citesteContractFinal } from '@/lib/contract-final-import'
import type { Dosar } from '@/lib/types'

// Citeste contractul final (export winMentor) si completeaza/verifica campurile — daca datele nu se
// potrivesc cu dosarul curent (alt nr. contract/dosar/auto/asigurator), NU completeaza nimic si avertizeaza.
export function ContractFinalSection({
  draft,
  onPatch,
}: {
  draft: Dosar
  onPatch: (patch: Partial<Dosar>) => void
}) {
  const [status, setStatus] = useState<{ text: string; eroare: boolean } | null>(null)
  const [seIncarca, setSeIncarca] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setSeIncarca(true)
    setStatus({ text: 'Se citește contractul final…', eroare: false })
    const r = await citesteContractFinal(file, draft, (text) => setStatus({ text, eroare: false }))
    if (r.valid) onPatch({ ...r.patch, contractFinalIncarcat: true })
    setStatus({ text: r.mesaj, eroare: r.eroare })
    setSeIncarca(false)
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileCheck2 className="size-4 text-primary" aria-hidden="true" />
          Contract final
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={seIncarca} onClick={() => inputRef.current?.click()}>
          {seIncarca ? 'Se citește…' : 'Încarcă contract'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Exportul final (winMentor), PDF sau scanat/poză — verifică și completează valoarea, zilele și durata contractului.</p>
      {status && <p className={'text-xs ' + (status.eroare ? 'text-destructive font-medium' : 'text-foreground')}>{status.text}</p>}
    </div>
  )
}
