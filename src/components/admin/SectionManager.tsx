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

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 mt-4">
        {visible.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-lg bg-surface2 border border-line overflow-hidden shrink-0">
                <ProductImage
                  url={p.imageUrl}
                  alt=""
                  width={64}
                  height={64}
                  className={`w-full h-full object-cover ${p.available ? '' : 'opacity-40'}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm leading-snug line-clamp-2 flex items-start gap-1">
                  {p.featured && <Star className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
                  <span>{p.name}</span>
                </p>
                <p className="text-xs text-muted mt-1">{details(p, section.kind)}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {p.platform && (
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                      {p.platform}
                    </span>
                  )}
                  {!p.available && <span className="text-[11px] text-muted">Oculto</span>}
                  {section.kind === 'physical' && p.stock === 0 && (
                    <span className="rounded-md bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">Agotado</span>
                  )}
                  {section.kind === 'digital' && (
                    <span className="text-[11px] text-muted">
                      Entrega {p.fulfillment === 'auto' ? 'automática' : 'manual'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {section.kind === 'digital' && (
              <button
                onClick={() => setManagingAccounts(p)}
                className="flex items-center justify-between rounded-lg border border-primary/60 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
              >
                <span>Cuentas</span>
                <span>
                  Principales {counts.get(p.id)?.principal ?? 0} · Secundarias {counts.get(p.id)?.secundaria ?? 0}
                </span>
              </button>
            )}

            {section.kind === 'physical' && (
              <div className="flex items-center justify-between rounded-lg bg-bg border border-line px-3 py-1.5 text-sm">
                <span className="text-xs text-muted">Unidades disponibles</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => changeStock(p, (p.stock ?? 0) - 1)} aria-label="Restar" className="p-1.5 hover:text-primary">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-semibold">{p.stock ?? 0}</span>
                  <button onClick={() => changeStock(p, (p.stock ?? 0) + 1)} aria-label="Sumar" className="p-1.5 hover:text-primary">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-line pt-2 -mb-1">
              <button
                onClick={() => toggle(p)}
                className={`text-xs rounded-full px-2.5 py-1 border ${
                  p.available ? 'border-primary/60 text-primary' : 'border-line text-muted'
                }`}
              >
                {p.available ? 'Visible' : 'Oculto'}
              </button>
              <div className="flex items-center">
                <button onClick={() => setEditing(p)} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted hover:text-primary">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => remove(p)} aria-label="Eliminar" className="p-2 text-muted hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
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
