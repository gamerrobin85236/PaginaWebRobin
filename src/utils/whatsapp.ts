import { STORE_CONFIG } from '../config/store'
import type { AccountType, PriceOption, Product } from '../lib/types'
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

function describe(product: Product, accountType: AccountType, option?: PriceOption): string {
  const parts: string[] = []
  if (product.platform) parts.push(product.platform)
  if (option) parts.push(option.label)
  else if (product.priceSecondary) parts.push(ACCOUNT_LABEL[accountType])
  return parts.length > 0 ? ` (${parts.join(' · ')})` : ''
}

export function buildProductWhatsAppMessage(
  product: Product,
  accountType: AccountType = 'principal',
  quantity = 1,
  option?: PriceOption,
): string {
  const price = option
    ? option.price
    : accountType === 'secundaria' && product.priceSecondary
      ? product.priceSecondary
      : product.price
  return `Hola, estoy interesado en *${product.name}*${describe(product, accountType, option)} x${quantity} — ${formatPrice(
    price * quantity,
  )}. ${product.stock !== undefined ? '¿Está disponible y hacen envío a mi ciudad?' : '¿Está disponible?'}`
}

export function buildCartWhatsAppMessage(items: CartItem[], total: number): string {
  const lines = items.map(
    (item) =>
      `- ${item.product.name}${describe(item.product, item.accountType, item.option)} x${item.quantity} — ${formatPrice(
        getUnitPrice(item) * item.quantity,
      )}`,
  )
  const ships = items.some((i) => i.product.stock !== undefined)
  const shipping = ships ? '\n\nDatos para el envío:\nNombre:\nCédula:\nCiudad y departamento:\nDirección:' : ''
  return `Hola, quiero comprar:\n${lines.join('\n')}\n\nTotal aproximado: ${formatPrice(total)}${shipping}`
}
