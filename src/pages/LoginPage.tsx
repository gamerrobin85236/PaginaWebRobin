import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock, Mail } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabaseConfigured } from '../lib/supabase'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isAuthenticated, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) return <Navigate to="/admin" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await signIn(email, password)
    setSubmitting(false)
    if (result.error) {
      setError('Correo o contraseña incorrectos.')
      return
    }
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className={inputClass}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !supabaseConfigured}
          className="rounded-xl bg-primary text-primary-ink font-semibold py-3 text-sm hover:brightness-110 disabled:opacity-50 transition"
        >
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
