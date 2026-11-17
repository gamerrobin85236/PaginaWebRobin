import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingCart, Package } from 'lucide-react'
import { useCatalog } from '../hooks/CatalogContext'
import { useCartContext } from '../hooks/CartContext'
import type { AccountType } from '../lib/types'
import { formatPrice } from '../utils/formatPrice'
import { buildProductWhatsAppMessage, buildWhatsAppLink } from '../utils/whatsapp'
import NotFound from './NotFound'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const { products, sections } = useCatalog()
  const { addItem, setOpen } = useCartContext()
  const [accountType, setAccountType] = useState<AccountType>('principal')
  const [quantity, setQuantity] = useState(1)

  const product = products.find((p) => p.slug === slug)
  if (!product) return <NotFound />

  const section = sections.find((s) => s.id === product.sectionId)
  const hasSecondary = Boolean(product.priceSecondary)
  const unitPrice =
    accountType === 'secundaria' && product.priceSecondary ? product.priceSecondary : product.price

  const optionClass = (selected: boolean) =>
    `flex-1 text-left border rounded-xl px-4 py-3 transition-colors ${
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
            <img src={product.imageUrl} alt={product.name} className="w-full max-h-[480px] object-contain" />
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
                <button onClick={() => setAccountType('principal')} className={optionClass(accountType === 'principal')}>
                  <p className="text-sm font-medium">Cuenta principal</p>
                  <p className="text-base font-semibold mt-2">{formatPrice(product.price)}</p>
                </button>
                <button onClick={() => setAccountType('secundaria')} className={optionClass(accountType === 'secundaria')}>
                  <p className="text-sm font-medium">Cuenta secundaria</p>
                  <p className="text-base font-semibold mt-2">{formatPrice(product.priceSecondary ?? 0)}</p>
                </button>
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
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Sumar"
                className="p-1.5 hover:text-primary"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => {
                addItem(product, accountType, quantity)
                setOpen(true)
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-primary text-primary font-semibold py-3 text-sm hover:bg-primary/10 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Agregar al carrito
            </button>
            <a
              href={buildWhatsAppLink(buildProductWhatsAppMessage(product, accountType, quantity))}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-ink font-semibold py-3 text-sm hover:brightness-110 transition"
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
