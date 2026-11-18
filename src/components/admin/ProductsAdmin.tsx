import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Product, Section } from '../../lib/types'
import { deleteProduct, fetchAdminProducts, fetchAdminSections, setProductAvailable } from '../../lib/adminApi'
import { useCatalog } from '../../hooks/CatalogContext'
import { formatPrice } from '../../utils/formatPrice'
import ProductForm from './ProductForm'

export default function ProductsAdmin() {
  const { refresh } = useCatalog()
  const [sections, setSections] = useState<Section[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)

  const load = useCallback(() => {
    Promise.all([fetchAdminSections(), fetchAdminProducts()])
      .then(([s, p]) => {
        setSections(s)
        setProducts(p)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const sectionName = useMemo(() => new Map(sections.map((s) => [s.id, s.name])), [sections])
  const visible = products.filter(
    (p) =>
      (!filter || p.sectionId === filter) &&
      (!query || p.name.toLowerCase().includes(query.toLowerCase())),
  )

  function done() {
    setEditing(undefined)
    load()
    refresh()
  }

  async function toggle(p: Product) {
    const err = await setProductAvailable(p.id, !p.available)
    if (err) return setError(err)
    load()
    refresh()
  }

  async function remove(p: Product) {
    if (!window.confirm(`¿Eliminar "${p.name}"? No se puede deshacer.`)) return
    const err = await deleteProduct(p.id)
    if (err) return setError(err)
    load()
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Productos ({visible.length})</h2>
        <button
          onClick={() => setEditing(null)}
          disabled={sections.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-ink font-semibold px-4 py-2 text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>
      {!loading && sections.length === 0 && (
        <p className="text-sm text-muted mb-3">Primero crea al menos una sección en la pestaña "Secciones".</p>
      )}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl bg-bg border border-line px-3 py-2.5 text-sm"
        >
          <option value="">Todas las secciones</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {loading && <p className="text-sm text-muted">Cargando...</p>}
      <ul className="flex flex-col gap-2">
        {visible.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
            <div className="w-12 h-12 rounded-lg bg-bg border border-line overflow-hidden shrink-0">
              {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate flex items-center gap-1">
                {p.featured && <Star className="w-3.5 h-3.5 text-primary shrink-0" />}
                <span className="truncate">{p.name}</span>
              </p>
              <p className="text-xs text-muted truncate">
                {sectionName.get(p.sectionId) ?? '—'}
                {p.platform ? ` · ${p.platform}` : ''} · {formatPrice(p.price)}
              </p>
            </div>
            <button
              onClick={() => toggle(p)}
              className={`text-xs rounded-full px-2.5 py-1 border ${
                p.available ? 'border-primary/60 text-primary' : 'border-line text-muted'
              }`}
            >
              {p.available ? 'Disponible' : 'Oculto'}
            </button>
            <button onClick={() => setEditing(p)} aria-label="Editar" className="p-2 text-muted hover:text-primary">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => remove(p)} aria-label="Eliminar" className="p-2 text-muted hover:text-red-400">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
      {editing !== undefined && (
        <ProductForm
          product={editing}
          sections={sections}
          defaultSectionId={filter || undefined}
          onDone={done}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}
