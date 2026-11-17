import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import SectionPage from './pages/SectionPage'
import ProductPage from './pages/ProductPage'
import SearchPage from './pages/SearchPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/seccion/:slug" element={<SectionPage />} />
        <Route path="/producto/:slug" element={<ProductPage />} />
        <Route path="/buscar" element={<SearchPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
