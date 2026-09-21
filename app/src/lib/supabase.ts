import { createClient } from '@supabase/supabase-js'

// Acelasi proiect Supabase si aceeasi cheie publica (anon) ca site-ul actual
// (index.html) — tabelele `dosare`/`servicii` (un rand per inregistrare) de la fix-ul
// de date din pasul anterior.
const SUPABASE_URL = 'https://dxksrbonqiajiobenwwr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_2Z7wUiGIRkkgmRgZU-FDnA__oan3Sfr'
export const SUPABASE_LOGIN_EMAIL = 'patcas99@gmail.com'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
