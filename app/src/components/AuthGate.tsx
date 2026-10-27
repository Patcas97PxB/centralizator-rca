import { type FormEvent, type ReactNode, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { assetUrl } from '@/lib/asset-url'
import { Input } from '@/components/ui/input'
import { ESTE_DEMO } from '@/lib/demo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { DOMENIU_PERMIS } from '@/lib/autentificare'

// Pagina de login (redesign F4): un card simplu în centru, pe fundalul aplicației — fără raza de lumină,
// halou, stele sau scântei (cererea utilizatorului: „fără efecte”). (Parcarea animată de dinainte e acum un
// proiect separat: autonom-oradea-game.)

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

  // La delogare formularul revine gol (parola nu ramane completata).
  const [eraLogat, setEraLogat] = useState(isAuthenticated)
  if (isAuthenticated !== eraLogat) {
    setEraLogat(isAuthenticated)
    if (!isAuthenticated) setPassword('')
  }

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
    } else {
      setPassword('')
      if (!ESTE_DEMO) {
        try {
          localStorage.setItem(CHEIE_EMAIL, email.trim().toLowerCase())
        } catch {
          /* fara localStorage: emailul nu se mai precompleteaza */
        }
      }
    }
  }

  const campCls =
    'h-11 rounded-xl border-border-strong bg-background text-[15px] text-foreground placeholder:text-tx-3 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25'

  return (
    <div className="relative flex min-h-svh flex-col bg-background">
      <main className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="animate-fade-up w-full max-w-[400px]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-[20px] border border-border bg-card p-7 shadow-[var(--shadow-ambient)] sm:p-9"
        >
          <div className="relative mb-7 flex flex-col items-center gap-3 text-center">
            <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-14 w-auto light:hidden" />
            <img src={assetUrl('/icons/logo-light.png')} alt="Centralizator RCA" className="hidden h-14 w-auto light:block" />
            <div>
              <h1 className="text-xl font-extrabold tracking-[-.01em] text-foreground">Bine ai revenit</h1>
              <p className="mt-1 text-[13px] text-tx-3">
                {ESTE_DEMO ? 'Intră cu parola variantei de test.' : 'Intră cu contul tău Autonom.'}
              </p>
            </div>
            {ESTE_DEMO && (
              <span className="rounded-full border border-st-amber/45 bg-st-amber/15 px-2.5 py-0.5 text-[11px] font-extrabold text-st-amber-tx">
                VARIANTĂ DE TEST
              </span>
            )}
          </div>

          {!ESTE_DEMO && (
            <div className="mb-4">
              <label htmlFor="authEmail" className="mb-1.5 block text-[13px] font-semibold text-tx-2">
                Email
              </label>
              <Input
                id="authEmail"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoFocus={!email}
                placeholder={'nume.prenume' + DOMENIU_PERMIS}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={campCls}
              />
            </div>
          )}
          <label htmlFor="authPassword" className="mb-1.5 block text-[13px] font-semibold text-tx-2">
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
            className={campCls}
          />
          <p role="alert" className="min-h-5 pt-2 text-[13px] font-medium text-st-red-tx">
            {error}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="btn-brand-gradient mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold tracking-[.01em] disabled:cursor-wait disabled:opacity-80"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {submitting ? 'Se verifică…' : 'Intră'}
          </button>
        </form>
        </div>
      </main>
      <SiteFooter className="pb-4" />
    </div>
  )
}
