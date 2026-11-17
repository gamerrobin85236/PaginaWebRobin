import { STORE_CONFIG } from '../config/store'
import type { AccountType, Product } from '../lib/types'
import type { CartItem } from '../hooks/useCart'
import { getUnitPrice } from '../hooks/useCart'
import { formatPrice } from './formatPrice'

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`
}

const ACCOUNT_LABEL: Record<AccountType, string> = {
  principal: 'Cuenta principal',
  secundaria: 'Cuenta secundaria',
}

function describe(product: Product, accountType: AccountType): string {
  const parts: string[] = []
  if (product.platform) parts.push(product.platform)
  if (product.priceSecondary) parts.push(ACCOUNT_LABEL[accountType])
  return parts.length > 0 ? ` (${parts.join(' · ')})` : ''
}

export function buildProductWhatsAppMessage(
  product: Product,
  accountType: AccountType = 'principal',
  quantity = 1,
): string {
  const price =
    accountType === 'secundaria' && product.priceSecondary ? product.priceSecondary : product.price
  return `Hola, estoy interesado en *${product.name}*${describe(product, accountType)} x${quantity} — ${formatPrice(
    price * quantity,
  )}. ¿Está disponible?`
}

export function buildCartWhatsAppMessage(items: CartItem[], total: number): string {
  const lines = items.map(
    (item) =>
      `- ${item.product.name}${describe(item.product, item.accountType)} x${item.quantity} — ${formatPrice(
        getUnitPrice(item) * item.quantity,
      )}`,
  )
  return `Hola, quiero comprar:\n${lines.join('\n')}\n\nTotal aproximado: ${formatPrice(total)}`
}
