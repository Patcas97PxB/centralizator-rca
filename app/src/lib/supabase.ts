import { createClient } from '@supabase/supabase-js'

// Implicit: proiectul Supabase de pe live. Pentru dezvoltare/teste se poate folosi un proiect
// separat, fara sa atingi dosarele reale: pune VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY si
// VITE_SUPABASE_LOGIN_EMAIL in `app/.env.development.local` (fisier ignorat de git).
const SUPABASE_LIVE_URL = 'https://dxksrbonqiajiobenwwr.supabase.co'
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || SUPABASE_LIVE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2Z7wUiGIRkkgmRgZU-FDnA__oan3Sfr'
export const SUPABASE_LOGIN_EMAIL = import.meta.env.VITE_SUPABASE_LOGIN_EMAIL || 'patcas99@gmail.com'

/** True cand aplicatia ruleaza pe un proiect Supabase de test (nu cel de pe live). */
export const MEDIU_DE_TEST = SUPABASE_URL !== SUPABASE_LIVE_URL

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
