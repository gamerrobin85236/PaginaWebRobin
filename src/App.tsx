import { Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import { lazyRetry } from './lib/lazyRetry'
import Layout from './components/Layout'
import Home from './pages/Home'
import SectionPage from './pages/SectionPage'
import ProductPage from './pages/ProductPage'
import SearchPage from './pages/SearchPage'
import OrderPage from './pages/OrderPage'
import NotFound from './pages/NotFound'

// El panel y el login se descargan solo cuando alguien entra a ellos: los clientes no los cargan.
const LoginPage = lazyRetry(() => import('./pages/LoginPage'))
const AdminPage = lazyRetry(() => import('./pages/AdminPage'))

const fallback = <p className="text-sm text-muted">Cargando...</p>

export default function App() {
  const { pathname } = useLocation()
  // El aviso de error se reinicia al cambiar de pantalla.
  return (
    <ErrorBoundary key={pathname}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/seccion/:slug" element={<SectionPage />} />
        <Route path="/producto/:slug" element={<ProductPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/pedido/:ref" element={<OrderPage />} />
        <Route path="/login" element={<Suspense fallback={fallback}><LoginPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={fallback}><AdminPage /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </ErrorBoundary>
  )
}
