import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'
import WhatsAppButton from './WhatsAppButton'
import { useLocation } from 'react-router-dom'
import CartDrawer from './CartDrawer'

const COLLAPSE_KEY = 'gamer_robin_sidebar_collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  // El botón flotante de atención es para clientes: en el panel y el login estorba.
  const showSupport = !pathname.startsWith('/admin') && !pathname.startsWith('/login')

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      } catch {
        /* no pasa nada si no se puede guardar */
      }
      return next
    })
  }

  return (
    <div className="h-screen-d flex flex-col">
      <Header onOpenMenu={() => setMobileOpen(true)} />
      <div className="flex flex-1">
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <main className="flex-1 px-4 sm:px-6 py-6 w-full max-w-6xl mx-auto">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
      {showSupport && <WhatsAppButton />}
      <CartDrawer />
    </div>
  )
}
