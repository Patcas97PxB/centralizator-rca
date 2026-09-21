import { type FormEvent, type ReactNode, useState } from 'react'
import { Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return <div className="flex min-h-svh items-center justify-center bg-background" />
  }

  if (isAuthenticated) return <>{children}</>

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password) {
      setError('Introdu parola.')
      return
    }
    setSubmitting(true)
    setError('')
    const msg = await login(password)
    setSubmitting(false)
    if (msg) {
      setError('Parolă greșită.')
      setPassword('')
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/icons/logo.png" alt="Centralizator RCA" className="h-14 w-auto" />
          <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
            Centralizator RCA
          </div>
        </div>
        <label htmlFor="authPassword" className="mb-1.5 block text-sm text-muted-foreground">
          Parolă
        </label>
        <Input
          id="authPassword"
          type="password"
          autoComplete="current-password"
          autoFocus
          placeholder="Introdu parola"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-5 w-full" disabled={submitting}>
          {submitting ? 'Se verifică…' : 'Intră'}
        </Button>
      </form>
    </div>
  )
}
