import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { checkIsAdmin } from '../lib/adminApi'
import AdminDashboard from '../components/admin/AdminDashboard'
import OrdersAdmin from '../components/admin/OrdersAdmin'
import SectionManager from '../components/admin/SectionManager'
import type { Section } from '../lib/types'
import SectionsAdmin from '../components/admin/SectionsAdmin'

const IDLE_MS = 10 * 60 * 1000 // cierre de sesión por inactividad

type Tab = 'categories' | 'orders' | 'sections'

export default function AdminPage() {
  const { session, isAuthenticated, loading, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('categories')
  const [managing, setManaging] = useState<Section | null>(null)
  const userId = session?.user.id
  const signOutRef = useRef(signOut)
  signOutRef.current = signOut

  // Cierra la sesión sola tras 10 minutos sin tocar nada (clic, teclado, toque o desplazamiento).
  useEffect(() => {
    if (!userId) return
    const out = () => void signOutRef.current()
    let timer = window.setTimeout(out, IDLE_MS)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(out, IDLE_MS)
    }
    const events = ['click', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    checkIsAdmin(userId).then((ok) => {
      if (!cancelled) setIsAdmin(ok)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) return <p className="text-muted text-sm">Cargando...</p>
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isAdmin === null) return <p className="text-muted text-sm">Verificando permisos...</p>

  const logout = (
    <button
      onClick={signOut}
      className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm hover:border-primary/60"
    >
      <LogOut className="w-4 h-4" />
      Cerrar sesión
    </button>
  )

  if (!isAdmin) {
    return (
      <div>
        <h1 className="font-display font-bold text-2xl">Sin permisos</h1>
        <p className="text-muted mt-2 text-sm">
          Tu usuario ({session?.user.email}) no está registrado como administrador de la tienda.
        </p>
        <div className="mt-5">{logout}</div>
      </div>
    )
  }

  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-semibold rounded-xl border ${
      tab === t ? 'border-primary text-primary' : 'border-line text-muted'
    }`

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="font-display font-bold text-3xl">Panel de administración</h1>
        {logout}
      </div>
      <div className="flex gap-2 my-5">
        <button
          className={tabCls('categories')}
          onClick={() => {
            setTab('categories')
            setManaging(null)
          }}
        >
          Mis categorías
        </button>
        <button className={tabCls('orders')} onClick={() => setTab('orders')}>
          Pedidos
        </button>
        <button className={tabCls('sections')} onClick={() => setTab('sections')}>
          Configurar secciones
        </button>
      </div>
      {tab === 'sections' ? (
        <SectionsAdmin />
      ) : tab === 'orders' ? (
        <OrdersAdmin />
      ) : managing ? (
        <SectionManager section={managing} onBack={() => setManaging(null)} />
      ) : (
        <AdminDashboard onOpen={setManaging} onSettings={() => setTab('sections')} />
      )}
    </div>
  )
}
