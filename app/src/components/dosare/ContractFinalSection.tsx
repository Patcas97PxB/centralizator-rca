import { useRef, useState } from 'react'
import { FileCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { detectContractGresit, parseContractFinalText, normPlate } from '@/lib/contract-final'
import { pdfLibDisponibil, readPdfText } from '@/lib/pdf-ocr'
import type { Dosar } from '@/lib/types'

// Portat din handleContractFinalUpload() (index.html): citeste contractul final (export
// winMentor) si completeaza/verifica campurile — daca datele nu se potrivesc cu dosarul
// curent (alt nr. contract/dosar/auto/asigurator), NU completeaza nimic si avertizeaza.
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
    if (!pdfLibDisponibil()) {
      setStatus({ text: 'Biblioteca de citire PDF nu s-a încărcat. Verifică internetul și reîncarcă pagina.', eroare: true })
      return
    }
    setSeIncarca(true)
    setStatus({ text: 'Se citește contractul final…', eroare: false })
    try {
      const fullText = await readPdfText(file)
      const ex = parseContractFinalText(fullText)
      if (!ex.valid) {
        setStatus({ text: '⛔ Acest fișier nu pare să fie un contract final (nu am găsit nr. contract sau tabelul de cost). Nu am completat nimic.', eroare: true })
        return
      }
      const eroareContract = detectContractGresit(ex, {
        nrRezervare: draft.nrRezervare,
        nrAutoPagubit: draft.nrAutoPagubit,
        nrDosar: draft.nrDosar,
        nrAutoInlocuire: draft.nrAutoInlocuire,
        asigurator: draft.asigurator,
      })
      if (eroareContract) {
        setStatus({ text: eroareContract + ' Nu am completat nimic — verifică fișierul.', eroare: true })
        return
      }

      const patch: Partial<Dosar> = {}
      const gasite: string[] = []

      if (ex.nrContract && !draft.nrRezervare) { patch.nrRezervare = ex.nrContract; gasite.push('nr. contract') }
      if (ex.zile) { patch.zileContractFinal = ex.zile; gasite.push(`zile totale contract: ${ex.zile}${ex.pretZi ? ' (' + ex.pretZi + '/zi)' : ''}`) }
      if (ex.clasa) { patch.clasaAuto = ex.clasa; gasite.push('clasă auto (rezervată): ' + ex.clasa) }
      if (ex.valoare) { patch.valoareContract = ex.valoare; gasite.push('valoare contract: ' + ex.valoare + ' EUR (fără TVA)') }
      if (ex.valoareCuTVA) { patch.valoareContractCuTVA = ex.valoareCuTVA; gasite.push('valoare cu TVA: ' + ex.valoareCuTVA + ' EUR') }

      if (ex.asigurator) {
        if (!draft.asigurator) { patch.asigurator = ex.asigurator; gasite.push('asigurator') }
        else if (draft.asigurator !== ex.asigurator) gasite.push(`⚠️ asigurator detectat "${ex.asigurator}" diferă de cel selectat ("${draft.asigurator}")`)
      }
      if (ex.nrInmatriculare) {
        if (!draft.nrAutoInlocuire) { patch.nrAutoInlocuire = ex.nrInmatriculare; gasite.push('nr. auto înlocuire') }
        else if (normPlate(draft.nrAutoInlocuire) !== normPlate(ex.nrInmatriculare)) {
          gasite.push(`⚠️ nr. auto înlocuire pe contract ("${ex.nrInmatriculare}") diferă de cel de pe dosar ("${draft.nrAutoInlocuire}")`)
        }
      }
      if (ex.nrAutoPagubit) {
        if (!draft.nrAutoPagubit) { patch.nrAutoPagubit = ex.nrAutoPagubit; gasite.push('nr. auto păgubit') }
        else if (normPlate(draft.nrAutoPagubit) !== normPlate(ex.nrAutoPagubit)) {
          gasite.push(`⚠️ nr. auto păgubit pe contract ("${ex.nrAutoPagubit}") diferă de cel de pe dosar ("${draft.nrAutoPagubit}")`)
        }
      }
      if (ex.nrDosar) {
        if (!draft.nrDosar) { patch.nrDosar = ex.nrDosar; gasite.push('nr. dosar') }
        else if (draft.nrDosar !== ex.nrDosar) {
          gasite.push(`⚠️ nr. dosar pe contract ("${ex.nrDosar}") diferă de cel de pe dosar ("${draft.nrDosar}")`)
        }
      }

      if (Object.keys(patch).length) onPatch(patch)
      setStatus({
        text: gasite.length ? 'Găsit: ' + gasite.join(', ') + '. Verifică valorile.' : 'Nu am găsit date suplimentare în acest document.',
        eroare: false,
      })
    } catch (e) {
      console.error(e)
      setStatus({ text: 'Nu am putut citi acest contract (' + (e instanceof Error ? e.message : 'eroare') + ').', eroare: true })
    } finally {
      setSeIncarca(false)
    }
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
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">Exportul final (winMentor) — verifică și completează valoarea, zilele și clasa contractată.</p>
      {status && <p className={'text-xs ' + (status.eroare ? 'text-destructive font-medium' : 'text-foreground')}>{status.text}</p>}
    </div>
  )
}
