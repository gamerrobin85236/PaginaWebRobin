import { Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function AdminPage() {
  const { isAuthenticated, loading, signOut } = useAuth()

  if (loading) return <p className="text-muted text-sm">Cargando...</p>
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div>
      <h1 className="font-display font-bold text-3xl">Panel de administración</h1>
      <p className="text-muted mt-2 text-sm">
        Aquí se gestionarán las secciones, los productos y los pedidos. Esta parte se construye en la
        siguiente fase.
      </p>
      <button
        onClick={signOut}
        className="mt-6 inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm hover:border-primary/60"
      >
        <LogOut className="w-4 h-4" />
        Cerrar sesión
      </button>
    </div>
  )
}
