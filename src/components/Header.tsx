import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Search, ShoppingCart, LogIn } from 'lucide-react'
import { STORE_CONFIG } from '../config/store'
import { useCartContext } from '../hooks/CartContext'

interface HeaderProps {
  onOpenMenu: () => void
}

export default function Header({ onOpenMenu }: HeaderProps) {
  const navigate = useNavigate()
  const cart = useCartContext()
  const [query, setQuery] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    navigate(q ? `/buscar?q=${encodeURIComponent(q)}` : '/')
  }

  const searchForm = (
    <form onSubmit={handleSubmit} className="relative w-full">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="¿Qué estás buscando?"
        className="w-full rounded-xl bg-surface2 border border-line py-2.5 pl-4 pr-11 text-sm placeholder:text-muted focus:outline-none focus:border-primary/60"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-primary"
      >
        <Search className="w-4 h-4" />
      </button>
    </form>
  )

  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur border-b border-line">
      <div className="flex items-center gap-3 px-4 h-16">
        <button
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="md:hidden p-2 -ml-2 text-ink hover:text-primary"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <img
            src="/logo.png"
            alt={STORE_CONFIG.name}
            className="w-10 h-10 rounded-lg object-cover"
          />
          <span className="hidden sm:block font-display font-bold text-lg leading-none">
            {STORE_CONFIG.name}
          </span>
        </Link>

        <div className="hidden md:block flex-1 max-w-xl mx-auto">{searchForm}</div>
        <div className="flex-1 md:hidden" />

        <button
          onClick={() => cart.setOpen(true)}
          aria-label="Abrir carrito"
          className="relative p-2 text-ink hover:text-primary"
        >
          <ShoppingCart className="w-6 h-6" />
          {cart.count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-ink text-[11px] font-bold flex items-center justify-center">
              {cart.count}
            </span>
          )}
        </button>

        <Link
          to="/login"
          className="flex items-center gap-2 rounded-lg bg-surface2 border border-line px-3 py-2 text-sm font-medium hover:border-primary/60 transition-colors"
        >
          <LogIn className="w-4 h-4" />
          <span>Iniciar sesión</span>
        </Link>
      </div>

      <div className="md:hidden px-4 pb-3">{searchForm}</div>
    </header>
  )
}
