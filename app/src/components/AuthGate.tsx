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
import { ReteaDosare, type StareRetea } from '@/components/login/ReteaDosare'

// Pagina de login: fundalul din meniul lateral (valuri, puncte, stele) pe tot ecranul, peste el o
// retea de dosare care reactioneaza la mouse si la formular (la Email pulsuri spre formular, la
// Parola dosarele devin scuturi). Formularul din sticla mata, in centru. Fara poze/video (decizia
// utilizatorului).

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
  const [stare, setStare] = useState<StareRetea>('liber')

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

  const campCls =
    'camp-glow h-11 rounded-xl border-white/15 bg-[#060c1c]/75 text-[15px] text-white placeholder:text-[#64748b] focus-visible:border-[#60a5fa] focus-visible:ring-0'

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-[#070b14]">
      <FundalLogin reduced={fara} />
      <ReteaDosare stare={stare} />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] border border-white/12 bg-[#0a1226]/60 p-7 shadow-[0_30px_80px_-30px_#000] backdrop-blur-xl sm:p-8"
        >
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#00A848] via-[#0060F0] to-[#6000C0]" />
          <div className="mb-7 flex flex-col items-center gap-3 text-center">
            <img src={assetUrl('/icons/logo.png')} alt="Centralizator RCA" className="h-14 w-auto drop-shadow-[0_6px_18px_rgba(0,96,240,.35)]" />
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
                onFocus={() => setStare('email')}
                onBlur={() => setStare('liber')}
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
            onFocus={() => setStare('parola')}
            onBlur={() => setStare('liber')}
            className={campCls}
          />
          <p role="alert" className="min-h-5 pt-2 text-[13px] font-medium text-[#fca5a5]">
            {error}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="btn-brand-gradient mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold tracking-[.01em] disabled:cursor-wait disabled:opacity-80"
          >
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {submitting ? 'Se verifică…' : 'Intră'}
          </button>
        </form>
      </main>
      <SiteFooter className="relative z-10 pb-4" />
    </div>
  )
}
