import { supabase } from './supabase'

// Portat din getSupabaseAssetsShim()/openSupaDoc() (index.html) — acelasi bucket privat
// `documente` (vezi supabase/migrations/20260919173155_documente_storage_bucket.sql),
// fisierele nu sunt publice, se deschid doar prin URL semnat, temporar.
export async function incarcaDocument(file: File): Promise<{ id: string }> {
  const path = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const { error } = await supabase.storage.from('documente').upload(path, file, { contentType: file.type || undefined })
  if (error) throw error
  return { id: path }
}

export async function stergeDocumentStocare(assetId: string): Promise<void> {
  await supabase.storage.from('documente').remove([assetId])
}

export async function deschideDocument(assetId: string): Promise<void> {
  const { data, error } = await supabase.storage.from('documente').createSignedUrl(assetId, 300)
  if (error || !data) throw error ?? new Error('Nu am putut deschide fișierul.')
  window.open(data.signedUrl, '_blank', 'noopener')
}

export function mesajEroareAsset(e: unknown): string {
  const cod = (e as { statusCode?: string; message?: string })?.statusCode
  if (cod === '413') return 'Fișierul e prea mare.'
  if (cod === '429') return 'Prea multe încărcări deodată — încearcă din nou peste puțin timp.'
  return 'Nu am putut salva fișierul.'
}
