import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { checkIsAdmin } from '../lib/adminApi'
import ProductsAdmin from '../components/admin/ProductsAdmin'
import SectionsAdmin from '../components/admin/SectionsAdmin'

type Tab = 'products' | 'sections'

export default function AdminPage() {
  const { session, isAuthenticated, loading, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('products')
  const userId = session?.user.id

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
        <button className={tabCls('products')} onClick={() => setTab('products')}>
          Productos
        </button>
        <button className={tabCls('sections')} onClick={() => setTab('sections')}>
          Secciones
        </button>
      </div>
      {tab === 'products' ? <ProductsAdmin /> : <SectionsAdmin />}
    </div>
  )
}
