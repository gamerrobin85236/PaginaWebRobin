import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabaseConfigured } from '../lib/supabase'
import { lockedSeconds, registerFailure, registerSuccess } from '../lib/loginGuard'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locked, setLocked] = useState(lockedSeconds)

  // Cuenta regresiva mientras el formulario está bloqueado por intentos fallidos.
  useEffect(() => {
    if (locked <= 0) return
    const timer = setInterval(() => setLocked(lockedSeconds()), 1000)
    return () => clearInterval(timer)
  }, [locked])

  if (!loading && isAuthenticated) return <Navigate to="/admin" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (lockedSeconds() > 0) return setLocked(lockedSeconds())
    const cleanEmail = email.trim().toLowerCase()
    if (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail) || password.length === 0 || password.length > 128) {
      setError('Correo o contraseña incorrectos.')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await signIn(cleanEmail, password)
    setSubmitting(false)
    if (result.error) {
      registerFailure()
      setLocked(lockedSeconds())
      // Mensaje igual para "correo no existe" y "contraseña mala": no revela qué correos son válidos.
      setError('Correo o contraseña incorrectos.')
      setPassword('')
      return
    }
    registerSuccess()
    navigate('/admin')
  }

  const inputClass =
    'w-full rounded-xl bg-surface2 border border-line py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/60'

  return (
    <div className="max-w-sm mx-auto py-10">
      <h1 className="font-display font-bold text-3xl">Iniciar sesión</h1>
      <p className="text-muted text-sm mt-1">Acceso para el administrador de la tienda.</p>

      {!supabaseConfigured && (
        <p className="mt-5 rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          La base de datos todavía no está conectada, por eso el acceso aún no funciona.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <div className="relative">
          <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            maxLength={254}
            spellCheck={false}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            className={inputClass}
          />
        </div>
        <div className="relative">
          <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {locked > 0 && (
          <p className="text-sm text-muted">
            Demasiados intentos. Por seguridad, espera {locked >= 60 ? `${Math.ceil(locked / 60)} min` : `${locked} s`} para volver a intentar.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || locked > 0 || !supabaseConfigured}
          className="rounded-xl bg-primary text-primary-ink font-semibold py-3 text-sm hover:brightness-110 disabled:opacity-50 transition"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
