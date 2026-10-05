import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ESTE_DEMO, deblocheazaDemo, esteDeblocat, iesiDemo } from '@/lib/demo'
import { emailPermis } from '@/lib/autentificare'

// Fiecare persoana are contul ei (email Autonom + parola), creat de administrator in Supabase.
export function useAuth() {
  return ESTE_DEMO ? useAuthDemo() : useAuthSupabase()
}

// Varianta de test: „login” = decriptarea copiei de dosare cu parola (vezi lib/demo.ts); fara email.
function useAuthDemo() {
  const [deblocat, setDeblocat] = useState<boolean | undefined>(undefined)
  useEffect(() => {
    esteDeblocat().then(setDeblocat, () => setDeblocat(false))
  }, [])
  const login = useCallback(async (_email: string, password: string) => {
    const eroare = await deblocheazaDemo(password)
    if (!eroare) setDeblocat(true)
    return eroare
  }, [])
  const logout = useCallback(async () => {
    await iesiDemo()
    setDeblocat(false)
  }, [])
  return { session: null as Session | null, email: '', isLoading: deblocat === undefined, isAuthenticated: !!deblocat, login, logout }
}

function useAuthSupabase() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    // O sesiune ramasa de la un cont care nu e Autonom (ex. contul vechi, partajat) se inchide.
    const aplica = (s: Session | null) => {
      if (s && !emailPermis(s.user.email)) {
        void supabase.auth.signOut()
        setSession(null)
      } else {
        setSession(s)
      }
    }
    supabase.auth.getSession().then(({ data }) => aplica(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => aplica(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!emailPermis(email)) return 'domeniu'
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    return error ? error.message : null
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return {
    session,
    email: session?.user.email ?? '',
    isLoading: session === undefined,
    isAuthenticated: !!session,
    login,
    logout,
  }
}
