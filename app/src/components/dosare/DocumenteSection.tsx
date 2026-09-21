import { useRef, useState } from 'react'
import { ExternalLink, FolderOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DOCUMENT_LABELS, detectAllDocLabels, docLabelText, docStatus } from '@/lib/documente'
import { deschideDocument, incarcaDocument, mesajEroareAsset, stergeDocumentStocare } from '@/lib/documente-storage'
import type { Dosar, DocumentDosar } from '@/lib/types'

// Portat din openDocumentsModal()/renderDocumentsModal() (index.html) — cu o simplificare
// deliberata: legacy avea DOUA fluxuri separate (unul pentru dosar nou, altul modal separat
// pentru dosar deja salvat); aici e un singur flux, in formular, care functioneaza identic
// pentru ambele cazuri. Fisierele se incarca imediat in Supabase Storage; salvarea dosarului
// (butonul Salveaza) scrie doar referintele (id/eticheta), nu fisierele.
export function DocumenteSection({
  draft,
  onPatch,
}: {
  draft: Dosar
  onPatch: (patch: Partial<Dosar>) => void
}) {
  const [status, setStatus] = useState('')
  const [seIncarca, setSeIncarca] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const st = docStatus(draft)
  // Plasa de siguranta suplimentara — sursa de date normalizeaza deja (vezi
  // normalizeazaDosar in types.ts), dar pastram asta si aici ca sectiunea sa nu pice daca
  // vreodata `draft` ajunge aici pe alta cale, cu un dosar mai vechi/incomplet.
  const documente = Array.isArray(draft.documente) ? draft.documente : []
  const etichetaOptionale = Array.isArray(draft.etichetaOptionale) ? draft.etichetaOptionale : []

  async function handleFiles(files: FileList) {
    setSeIncarca(true)
    const documenteNoi: DocumentDosar[] = []
    const rezumat: string[] = []
    for (const file of Array.from(files)) {
      setStatus('Se încarcă ' + file.name + '…')
      try {
        const res = await incarcaDocument(file)
        const labels = detectAllDocLabels(file.name)
        labels.forEach((lbl) => {
          documenteNoi.push({ id: 'doc' + Date.now() + Math.random().toString(36).slice(2, 6), nume: file.name, eticheta: lbl, assetId: res.id })
        })
        if (labels.length > 1) rezumat.push(file.name + ' → ' + labels.map(docLabelText).join(', '))
      } catch (e) {
        console.error(e)
        setStatus('Eroare la „' + file.name + '": ' + mesajEroareAsset(e))
        setSeIncarca(false)
        if (documenteNoi.length) onPatch({ documente: [...documente, ...documenteNoi] })
        return
      }
    }
    onPatch({ documente: [...documente, ...documenteNoi] })
    setStatus(rezumat.length ? 'Un fișier a acoperit mai multe documente: ' + rezumat.join(' · ') : (files.length > 1 ? files.length + ' fișiere încărcate.' : 'Fișier încărcat.'))
    setSeIncarca(false)
  }

  async function elimina(docId: string) {
    const doc = documente.find((x) => x.id === docId)
    onPatch({ documente: documente.filter((x) => x.id !== docId) })
    if (doc?.assetId) stergeDocumentStocare(doc.assetId).catch(() => {})
  }

  function schimbaEticheta(docId: string, eticheta: string) {
    onPatch({ documente: documente.map((d) => (d.id === docId ? { ...d, eticheta } : d)) })
  }

  function toggleOptional(key: string) {
    const are = etichetaOptionale.includes(key)
    onPatch({ etichetaOptionale: are ? etichetaOptionale.filter((k) => k !== key) : [...etichetaOptionale, key] })
  }

  async function deschide(assetId?: string) {
    if (!assetId) return
    try {
      await deschideDocument(assetId)
    } catch {
      setStatus('Nu am putut deschide fișierul.')
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FolderOpen className="size-4 text-primary" aria-hidden="true" />
          Documente
        </div>
        <div className="flex items-center gap-2">
          <span className={'rounded-full border px-2 py-0.5 text-xs font-bold ' + (st.complete ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning')}>
            {st.have}/{st.total} documente
          </span>
          <Button type="button" size="sm" variant="secondary" disabled={seIncarca} onClick={() => inputRef.current?.click()}>
            {seIncarca ? 'Se încarcă…' : 'Încarcă fișiere'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {status && <p className="text-xs text-muted-foreground">{status}</p>}

      {documente.length === 0 ? (
        <p className="text-xs text-muted-foreground">Niciun fișier încărcat încă.</p>
      ) : (
        <div className="space-y-1.5">
          {documente.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5">
              <button
                type="button"
                onClick={() => deschide(doc.assetId)}
                className="flex min-w-0 flex-1 items-center gap-1 truncate text-left text-xs text-foreground hover:text-primary"
                title={doc.nume}
              >
                <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{doc.nume}</span>
              </button>
              <Select value={doc.eticheta} onValueChange={(v) => schimbaEticheta(doc.id, v)}>
                <SelectTrigger size="sm" className="w-[190px] shrink-0 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_LABELS.map((l) => (
                    <SelectItem key={l.key} value={l.key}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="ghost" className="size-7 shrink-0 text-destructive hover:text-destructive" onClick={() => elimina(doc.id)}>
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {st.missing.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer select-none">Documente lipsă ({st.missing.length}) — marchează ca opționale dacă nu se aplică</summary>
          <div className="mt-2 space-y-1.5 pl-1">
            {st.missing.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox id={'opt-' + key} checked={etichetaOptionale.includes(key)} onCheckedChange={() => toggleOptional(key)} />
                <Label htmlFor={'opt-' + key} className="font-normal">
                  {docLabelText(key)}
                </Label>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
