import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { SUPABASE_LOGIN_EMAIL, supabase } from '@/lib/supabase'

// Acelasi model de autentificare ca site-ul actual: un singur cont Supabase, partajat,
// protejat cu parola (nu e "login" individual per persoana — vezi index.html doLogin()).
export function useAuth() {
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
