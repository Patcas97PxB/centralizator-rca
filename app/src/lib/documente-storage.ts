import { supabase } from './supabase'
import { ESTE_DEMO, demoStergeDocument } from './demo'

// Documentele NU se mai urca (decizia utilizatorului: ocupau spatiu degeaba) — dosarul tine doar numele
// si tipul fisierului. Ramane doar stergerea fisierelor urcate inainte, din bucket-ul privat `documente`,
// cand utilizatorul scoate un document vechi din lista.
export async function stergeDocumentStocare(assetId: string): Promise<void> {
  if (ESTE_DEMO) return demoStergeDocument(assetId)
  await supabase.storage.from('documente').remove([assetId])
}
