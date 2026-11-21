import { X, Plus, Minus, Trash2, MessageCircle, ShoppingCart } from 'lucide-react'
import type { AccountType } from '../lib/types'
import { getUnitPrice, lineKey } from '../hooks/useCart'
import { useCartContext } from '../hooks/CartContext'
import ProductImage from './ProductImage'
import OnlineCheckout from './OnlineCheckout'
import { formatPrice } from '../utils/formatPrice'
import { buildCartWhatsAppMessage, buildWhatsAppLink } from '../utils/whatsapp'

const ACCOUNT_LABEL: Record<AccountType, string> = {
  principal: 'Cuenta principal',
  secundaria: 'Cuenta secundaria',
}

export default function CartDrawer() {
  const { open, setOpen, items, total, updateQuantity, removeItem } = useCartContext()
  if (!open) return null

  const close = () => setOpen(false)
  // El pago en línea se habilita cuando TODOS los productos del carrito se venden así.
  const onlineOk = items.length > 0 && items.every((i) => i.product.buyMode === 'online')
  const whatsappLink =
    items.length > 0 ? buildWhatsAppLink(buildCartWhatsAppMessage(items, total)) : '#'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Cerrar carrito" onClick={close} className="absolute inset-0 bg-black/70" />

      <div className="relative w-full max-w-sm bg-surface border-l border-line h-full flex flex-col">
        <div className="flex items-center justify-between px-5 h-16 border-b border-line shrink-0">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Tu carrito
          </h2>
          <button onClick={close} aria-label="Cerrar" className="text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted text-sm px-6 text-center">
            <ShoppingCart className="w-10 h-10 opacity-30" />
            Tu carrito está vacío.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {items.map((item) => (
              <div key={lineKey(item)} className="flex gap-3">
                <div className="w-14 h-14 rounded-lg bg-bg border border-line flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product.imageUrl ? (
                    <ProductImage url={item.product.imageUrl} alt={item.product.name} width={56} height={56} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="w-5 h-5 text-muted" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted">
                    {[
                      item.product.platform,
                      item.option ? item.option.label : item.product.priceSecondary ? ACCOUNT_LABEL[item.accountType] : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-bg border border-line rounded-full px-1">
                      <button
                        onClick={() => updateQuantity(lineKey(item), item.quantity - 1)}
                        className="p-1 hover:text-primary"
                        aria-label="Restar"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(lineKey(item), item.quantity + 1)}
                        className="p-1 hover:text-primary"
                        aria-label="Sumar"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPrice(getUnitPrice(item) * item.quantity)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(lineKey(item))}
                  className="text-muted hover:text-danger shrink-0"
                  aria-label="Eliminar del carrito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="border-t border-line p-5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-muted text-sm">Total aproximado</span>
              <span className="text-lg font-display font-bold">{formatPrice(total)}</span>
            </div>
            {onlineOk && <OnlineCheckout items={items} />}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 font-semibold rounded-full py-3 text-sm transition ${
                onlineOk
                  ? 'mt-3 border border-line text-muted hover:text-ink'
                  : 'bg-primary text-primary-ink hover:brightness-110'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              {onlineOk ? 'Prefiero pedir por WhatsApp' : 'Finalizar por WhatsApp'}
            </a>
            {!onlineOk && (
              <p className="text-[11px] text-muted text-center mt-3">
                Se abrirá WhatsApp con tu pedido. El pago y la entrega se coordinan con la tienda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
