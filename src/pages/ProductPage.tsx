import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingCart, Package } from 'lucide-react'
import { useCatalog } from '../hooks/CatalogContext'
import { useCartContext } from '../hooks/CartContext'
import type { AccountType } from '../lib/types'
import { accountOut, isSoldOut } from '../utils/pricing'
import { formatPrice } from '../utils/formatPrice'
import { buildProductWhatsAppMessage, buildWhatsAppLink } from '../utils/whatsapp'
import ProductImage from '../components/ProductImage'
import NotFound from './NotFound'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { products, sections, loading } = useCatalog()
  const { addItem, setOpen } = useCartContext()
  const [acctSel, setAccountType] = useState<AccountType>('principal')
  const [quantity, setQuantity] = useState(1)
  const [optionIdx, setOptionIdx] = useState(0)

  const product = products.find((p) => p.slug === slug)
  if (loading) return <p className="text-sm text-muted">Cargando...</p>
  if (!product) return <NotFound />

  const section = sections.find((s) => s.id === product.sectionId)
  const options = product.options ?? []
  const option = options[optionIdx] ?? options[0]
  const outOf = (t: AccountType) => accountOut(product, t)
  // Si la cuenta elegida se agotó pero hay de la otra, se pasa a la otra automáticamente.
  const other: AccountType = acctSel === 'principal' ? 'secundaria' : 'principal'
  const type: AccountType =
    outOf(acctSel) && Boolean(product.priceSecondary) && !outOf(other) ? other : acctSel
  const soldOut = isSoldOut(product) || (options.length === 0 && outOf(type))
  const maxQty = Math.min(product.stock ?? Infinity, product.accountStock?.[type] ?? Infinity)
  const hasSecondary = Boolean(product.priceSecondary) && options.length === 0
  const unitPrice = option
    ? option.price
    : type === 'secundaria' && product.priceSecondary
      ? product.priceSecondary
      : product.price

  const optionClass = (selected: boolean) =>
    `flex-1 text-left border rounded-xl px-4 py-3 transition-colors disabled:opacity-40 disabled:pointer-events-none ${
      selected ? 'border-primary bg-primary/10' : 'border-line hover:border-muted'
    }`

  return (
    <div>
      <Link
        to={section ? `/seccion/${section.slug}` : '/'}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver{section ? ` a ${section.name}` : ''}
      </Link>

      <div className="mt-5 grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl bg-surface border border-line flex items-center justify-center min-h-[280px] overflow-hidden">
          {product.imageUrl ? (
            <ProductImage url={product.imageUrl} alt={product.name} thumb={false} eager className="w-full max-h-[480px] object-contain" />
          ) : (
            <Package className="w-20 h-20 text-muted/40" />
          )}
        </div>

        <div className="flex flex-col">
          {product.platform && (
            <span className="text-sm font-semibold text-primary">{product.platform}</span>
          )}
          <h1 className="font-display font-bold text-3xl leading-tight mt-1">{product.name}</h1>
          <p className="text-muted text-sm mt-4 whitespace-pre-line">
            {product.description || 'Sin descripción disponible.'}
          </p>

          {hasSecondary && (
            <div className="mt-6">
              <span className="text-xs text-muted">Tipo de cuenta</span>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <button onClick={() => setAccountType('principal')} disabled={outOf('principal')} className={optionClass(type === 'principal')}>
                  <p className="text-sm font-medium">Cuenta principal{outOf('principal') ? ' · Agotada' : ''}</p>
                  <p className="text-base font-semibold mt-2">{formatPrice(product.price)}</p>
                </button>
                <button onClick={() => setAccountType('secundaria')} disabled={outOf('secundaria')} className={optionClass(type === 'secundaria')}>
                  <p className="text-sm font-medium">Cuenta secundaria{outOf('secundaria') ? ' · Agotada' : ''}</p>
                  <p className="text-base font-semibold mt-2">{formatPrice(product.priceSecondary ?? 0)}</p>
                </button>
              </div>
            </div>
          )}

          {options.length > 0 && (
            <div className="mt-6">
              <span className="text-xs text-muted">Elige tu opción</span>
              <div className="grid gap-3 sm:grid-cols-2 mt-2">
                {options.map((o, i) => (
                  <button
                    key={`${o.label}-${i}`}
                    onClick={() => setOptionIdx(i)}
                    className={optionClass(options[optionIdx] === o || (!options[optionIdx] && i === 0))}
                  >
                    <p className="text-sm font-medium">{o.label}</p>
                    <p className="text-base font-semibold mt-2">{formatPrice(o.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-3xl font-display font-bold mt-6">{formatPrice(unitPrice * quantity)}</p>

          <div className="flex items-center gap-4 mt-4">
            <span className="text-xs text-muted">Cantidad</span>
            <div className="flex items-center gap-3 bg-surface border border-line rounded-full px-2 py-1">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Restar"
                className="p-1.5 hover:text-primary"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-6 text-center text-sm">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                aria-label="Sumar"
                className="p-1.5 hover:text-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {soldOut ? (
            <p className="mt-4 text-sm font-semibold text-danger">Agotado por ahora</p>
          ) : (
            product.stock !== undefined && (
              <p className="mt-3 text-xs text-muted">
                {product.stock <= 3 ? `¡Últimas ${product.stock} unidades!` : `${product.stock} unidades disponibles`}
              </p>
            )
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              disabled={soldOut}
              onClick={() => {
                addItem(product, type, quantity, option)
                setOpen(true)
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-primary text-primary font-semibold py-3 text-sm hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <ShoppingCart className="w-4 h-4" />
              Agregar al carrito
            </button>
            <a
              href={buildWhatsAppLink(buildProductWhatsAppMessage(product, type, quantity, option))}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-ink font-semibold py-3 text-sm hover:brightness-110 transition ${
                soldOut ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Comprar por WhatsApp
            </a>
          </div>

          {product.buyMode === 'online' && (
            <p className="text-xs text-muted mt-3">
              El pago en línea con tarjeta, PSE o Nequi estará disponible pronto para este producto.
              Mientras tanto, puedes comprarlo por WhatsApp.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
