import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { SUPABASE_LOGIN_EMAIL, supabase } from '@/lib/supabase'
import { ESTE_DEMO, deblocheazaDemo, esteDeblocat, iesiDemo } from '@/lib/demo'

// Acelasi model de autentificare ca site-ul actual: un singur cont Supabase, partajat,
// protejat cu parola (nu e "login" individual per persoana — vezi index.html doLogin()).
export function useAuth() {
  return ESTE_DEMO ? useAuthDemo() : useAuthSupabase()
}

// Varianta de test: „login” = decriptarea copiei de dosare cu parola (vezi lib/demo.ts).
function useAuthDemo() {
  const [deblocat, setDeblocat] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    esteDeblocat().then(setDeblocat, () => setDeblocat(false))
  }, [])
  const login = useCallback(async (password: string) => {
    const eroare = await deblocheazaDemo(password)
    if (!eroare) setDeblocat(true)
    return eroare
  }, [])
  const logout = useCallback(async () => {
    await iesiDemo()
    setDeblocat(false)
  }, [])
  return { session: null, isLoading: deblocat === undefined, isAuthenticated: !!deblocat, login, logout }
}

function useAuthSupabase() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const login = useCallback(async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: SUPABASE_LOGIN_EMAIL, password })
    return error ? error.message : null
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    session,
    isLoading: session === undefined,
    isAuthenticated: !!session,
    login,
    logout,
  }
}
