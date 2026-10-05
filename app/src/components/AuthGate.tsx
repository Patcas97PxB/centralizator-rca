import { type FormEvent, type ReactNode, useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { assetUrl } from '@/lib/asset-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ESTE_DEMO } from '@/lib/demo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { DOMENIU_PERMIS } from '@/lib/autentificare'

const CHEIE_EMAIL = 'rca-ultim-email'
function emailSalvat(): string {
  try {
    return localStorage.getItem(CHEIE_EMAIL) ?? ''
  } catch {
    return ''
  }
}

export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth()
  const [email, setEmail] = useState(emailSalvat)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return <div className="flex min-h-svh items-center justify-center bg-background" />
  }

  if (isAuthenticated) return <>{children}</>

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ESTE_DEMO && !email.trim()) {
      setError('Introdu adresa de email.')
      return
    }
    if (!password) {
      setError('Introdu parola.')
      return
    }
    setSubmitting(true)
    setError('')
    const msg = await login(email, password)
    setSubmitting(false)
    if (msg === 'domeniu') {
      setError(`Accesul e permis doar cu adresa de email ${DOMENIU_PERMIS}.`)
    } else if (msg) {
      setError(ESTE_DEMO ? 'Parolă greșită.' : 'Email sau parolă greșită.')
      setPassword('')
    } else if (!ESTE_DEMO) {
      try {
        localStorage.setItem(CHEIE_EMAIL, email.trim().toLowerCase())
      } catch {
        /* fara localStorage: emailul nu se mai precompleteaza */
      }
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-14 w-auto" />
          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            Centralizator RCA
          </div>
          {ESTE_DEMO && (
            <span className="rounded-full border border-[#f59e0b]/45 bg-[#f59e0b]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#fde68a]">
              VARIANTĂ DE TEST
            </span>
          )}
        </div>
        {!ESTE_DEMO && (
          <>
            <label htmlFor="authEmail" className="mb-1.5 block text-sm text-muted-foreground">
              Email
            </label>
            <Input
              id="authEmail"
              type="email"
              autoComplete="username"
              autoFocus={!email}
              placeholder={'nume.prenume' + DOMENIU_PERMIS}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4"
            />
          </>
        )}
        <label htmlFor="authPassword" className="mb-1.5 block text-sm text-muted-foreground">
          Parolă
        </label>
        <Input
          id="authPassword"
          type="password"
          autoComplete="current-password"
          autoFocus={ESTE_DEMO || !!email}
          placeholder="Introdu parola"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-5 w-full" disabled={submitting}>
          {submitting ? 'Se verifică…' : 'Intră'}
        </Button>
      </form>
      <SiteFooter className="mt-6" />
    </div>
  )
}
