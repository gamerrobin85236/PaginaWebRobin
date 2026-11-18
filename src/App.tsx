import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SectionPage from './pages/SectionPage'
import ProductPage from './pages/ProductPage'
import SearchPage from './pages/SearchPage'
import NotFound from './pages/NotFound'

// El panel y el login se descargan solo cuando alguien entra a ellos: los clientes no los cargan.
const LoginPage = lazy(() => import('./pages/LoginPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

const fallback = <p className="text-sm text-muted">Cargando...</p>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/seccion/:slug" element={<SectionPage />} />
        <Route path="/producto/:slug" element={<ProductPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/login" element={<Suspense fallback={fallback}><LoginPage /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={fallback}><AdminPage /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
