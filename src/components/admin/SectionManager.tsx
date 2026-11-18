import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Minus, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { Product, Section } from '../../lib/types'
import {
  deleteProduct,
  fetchAccountCounts,
  fetchAdminProducts,
  setProductAvailable,
  setProductStock,
} from '../../lib/adminApi'
import { KIND_HELP, KIND_LABEL } from '../../lib/kinds'
import { useCatalog } from '../../hooks/CatalogContext'
import { formatPrice } from '../../utils/formatPrice'
import AccountsModal from './AccountsModal'
import ProductForm from './ProductForm'
import ProductImage from '../ProductImage'

interface Props {
  section: Section
  onBack: () => void
}

function details(p: Product, kind: Section['kind']): string {
  if ((p.options?.length ?? 0) > 0) {
    return (p.options ?? []).map((o) => `${o.label}: ${formatPrice(o.price)}`).join(' · ')
  }
  if (kind === 'digital') {
    return `Principal ${formatPrice(p.price)}${p.priceSecondary ? ` · Secundaria ${formatPrice(p.priceSecondary)}` : ''}`
  }
  return formatPrice(p.price)
}

export default function SectionManager({ section, onBack }: Props) {
  const { refresh } = useCatalog()
  const [products, setProducts] = useState<Product[]>([])
  const [platform, setPlatform] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Product | null | undefined>(undefined)
  const [managingAccounts, setManagingAccounts] = useState<Product | null>(null)
  const [counts, setCounts] = useState<Map<string, { principal: number; secundaria: number }>>(new Map())

  const load = useCallback(() => {
    fetchAccountCounts().then(setCounts)
    fetchAdminProducts(section.id)
      .then((p) => {
        setProducts(p)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [section.id])

  useEffect(load, [load])

  const platforms = useMemo(
    () => [...new Set(products.map((p) => p.platform).filter((x): x is string => !!x))],
    [products],
  )
  const visible = products.filter(
    (p) =>
      (!platform || p.platform === platform) &&
      (!query || p.name.toLowerCase().includes(query.toLowerCase())),
  )

  const changed = () => {
    load()
    refresh()
  }

  async function toggle(p: Product) {
    const err = await setProductAvailable(p.id, !p.available)
    if (err) return setError(err)
    changed()
  }

  async function remove(p: Product) {
    if (!window.confirm(`¿Eliminar "${p.name}"? No se puede deshacer.`)) return
    const err = await deleteProduct(p.id)
    if (err) return setError(err)
    changed()
  }

  async function changeStock(p: Product, next: number) {
    const value = Math.max(0, next)
    setProducts((cur) => cur.map((x) => (x.id === p.id ? { ...x, stock: value } : x)))
    const err = await setProductStock(p.id, value)
    if (err) setError(err)
    else refresh()
  }

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${
      active ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted'
    }`

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Todas las categorías
      </button>

      <div className="flex items-start justify-between gap-3 mt-3">
        <div>
          <h2 className="font-display font-bold text-2xl">{section.name}</h2>
          <p className="text-xs text-primary mt-0.5">{KIND_LABEL[section.kind]}</p>
          <p className="text-xs text-muted mt-1 max-w-md">{KIND_HELP[section.kind]}</p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-ink font-semibold px-4 py-2 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        {platforms.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button className={chip(platform === '')} onClick={() => setPlatform('')}>
              Todas
            </button>
            {platforms.map((p) => (
              <button key={p} className={chip(platform === p)} onClick={() => setPlatform(platform === p ? '' : p)}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      {loading && <p className="text-sm text-muted mt-3">Cargando...</p>}
      {!loading && visible.length === 0 && (
        <p className="text-sm text-muted mt-6">Todavía no hay productos aquí. Pulsa "Nuevo" para agregar el primero.</p>
      )}

      <ul className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
        {visible.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-surface overflow-hidden flex flex-col">
            <div className="relative aspect-square bg-surface2">
              <ProductImage
                url={p.imageUrl}
                alt={p.name}
                width={300}
                height={300}
                className={`w-full h-full object-contain ${p.available ? '' : 'opacity-40'}`}
              />
              {p.platform && (
                <span className="absolute top-2 left-2 rounded-md bg-bg/80 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {p.platform}
                </span>
              )}
              {p.featured && <Star className="absolute top-2 right-2 w-4 h-4 text-primary" />}
              {!p.available && (
                <span className="absolute bottom-2 left-2 rounded-md bg-bg/80 px-2 py-0.5 text-[11px] text-muted">
                  Oculto
                </span>
              )}
              {section.kind === 'physical' && p.stock === 0 && (
                <span className="absolute bottom-2 right-2 rounded-md bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">
                  Agotado
                </span>
              )}
            </div>

            <div className="p-3 flex flex-col gap-2 flex-1">
              <p className="font-semibold text-sm leading-snug line-clamp-2">{p.name}</p>
              <p className="text-xs text-muted">{details(p, section.kind)}</p>

              {section.kind === 'digital' && (
                <>
                  <button
                    onClick={() => setManagingAccounts(p)}
                    className="w-full rounded-xl bg-primary text-primary-ink text-xs font-semibold py-2"
                  >
                    Cuentas · P {counts.get(p.id)?.principal ?? 0} · S {counts.get(p.id)?.secundaria ?? 0}
                  </button>
                  <p className="text-[11px] text-muted -mt-1">
                    Entrega {p.fulfillment === 'auto' ? 'automática' : 'manual'}
                  </p>
                </>
              )}

              {section.kind === 'physical' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-muted">Unidades</span>
                  <div className="flex items-center gap-1 bg-bg border border-line rounded-full px-1">
                    <button onClick={() => changeStock(p, (p.stock ?? 0) - 1)} aria-label="Restar" className="p-1.5 hover:text-primary">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center">{p.stock ?? 0}</span>
                    <button onClick={() => changeStock(p, (p.stock ?? 0) + 1)} aria-label="Sumar" className="p-1.5 hover:text-primary">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center justify-between pt-1 border-t border-line">
                <button
                  onClick={() => toggle(p)}
                  className={`text-xs rounded-full px-2.5 py-1 border ${
                    p.available ? 'border-primary/60 text-primary' : 'border-line text-muted'
                  }`}
                >
                  {p.available ? 'Visible' : 'Oculto'}
                </button>
                <div className="flex items-center">
                  <button onClick={() => setEditing(p)} aria-label="Editar" className="p-2 text-muted hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(p)} aria-label="Eliminar" className="p-2 text-muted hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {managingAccounts && (
        <AccountsModal
          product={managingAccounts}
          onClose={() => {
            setManagingAccounts(null)
            changed()
          }}
        />
      )}

      {editing !== undefined && (
        <ProductForm
          product={editing}
          section={section}
          onDone={() => {
            setEditing(undefined)
            changed()
          }}
          onClose={() => {
            setEditing(undefined)
            changed()
          }}
        />
      )}
    </div>
  )
}
