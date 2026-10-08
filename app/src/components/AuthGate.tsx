import { type FormEvent, type ReactNode, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { assetUrl } from '@/lib/asset-url'
import { Input } from '@/components/ui/input'
import { ESTE_DEMO } from '@/lib/demo'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { DOMENIU_PERMIS } from '@/lib/autentificare'
import { FundalLogin } from '@/components/login/FundalLogin'

// Pagina de login: fundalul din meniul lateral pe tot ecranul (FundalLogin) si un card din sticla mata, in
// centru, cu o raza de lumina in culorile logo-ului care se plimba lent pe margine (.login-raza). Campurile
// email / parola nu au animatii. (Parcarea animata de dinainte e acum un proiect separat: autonom-oradea-game.)

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
  const fara = usePrefersReducedMotion()
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
    'h-11 rounded-xl border-white/12 bg-[#060c1c]/70 text-[15px] text-white placeholder:text-[#64748b] focus-visible:border-[#60a5fa] focus-visible:ring-[3px] focus-visible:ring-[#3d8bff]/20'

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#070b14]">
      <FundalLogin reduced={fara} />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <div className="relative w-full max-w-[400px]">
          {/* halou moale in culorile logo-ului, in spatele cardului */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-10 -z-10 rounded-[48px] opacity-70 blur-3xl"
            style={{ background: 'radial-gradient(60% 55% at 30% 30%, rgba(0,96,240,.35), transparent 70%), radial-gradient(55% 50% at 75% 75%, rgba(96,0,192,.35), transparent 70%)' }}
          />
          {/* marginea cu raza de lumina */}
          <div className="login-raza rounded-[24px] p-[1.5px] shadow-[0_40px_90px_-30px_rgba(0,0,0,.9)]">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative overflow-hidden rounded-[22.5px] p-7 backdrop-blur-xl sm:p-9"
          style={{ background: 'radial-gradient(70% 28% at 50% 0%, rgba(61,139,255,.16), transparent 100%), rgba(10,18,38,.86)' }}
        >
          <div className="relative mb-7 flex flex-col items-center gap-3 text-center">
            <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-14 w-auto drop-shadow-[0_8px_24px_rgba(0,96,240,.45)]" />
            <span aria-hidden="true" className="h-px w-24 bg-gradient-to-r from-transparent via-[#3d8bff]/70 to-transparent" />
            <div>
              <h1 className="text-xl font-extrabold tracking-[-.01em] text-white">Bine ai revenit</h1>
              <p className="mt-1 text-[13px] text-[#9fb3d9]">
                {ESTE_DEMO ? 'Intră cu parola variantei de test.' : 'Intră cu contul tău Autonom.'}
              </p>
            </div>
            {ESTE_DEMO && (
              <span className="rounded-full border border-[#f59e0b]/45 bg-[#f59e0b]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#fde68a]">
                VARIANTĂ DE TEST
              </span>
            )}
          </div>

          {!ESTE_DEMO && (
            <div className="mb-4">
              <label htmlFor="authEmail" className="mb-1.5 block text-[13px] font-semibold text-[#cbd5e1]">
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
          <label htmlFor="authPassword" className="mb-1.5 block text-[13px] font-semibold text-[#cbd5e1]">
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
          <p role="alert" className="min-h-5 pt-2 text-[13px] font-medium text-[#fca5a5]">
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
        </div>
      </main>
      <SiteFooter className="relative z-10 pb-4" />
    </div>
  )
}
