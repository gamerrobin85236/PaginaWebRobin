import type { AccountType } from './types'
import type { CartItem } from '../hooks/useCart'

export interface Shipping {
  document: string
  department: string
  city: string
  address: string
  notes: string
}

/** Los productos físicos y consolas (los únicos con cantidad) se envían: hay que pedir la dirección. */
export const needsShipping = (items: CartItem[]): boolean => items.some((i) => i.product.stock !== undefined)

export interface Customer {
  name: string
  email: string
  emailConfirm: string
  phone: string
  shipping?: Shipping
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

/** Crea el pedido en el servidor y devuelve la dirección de pago de Wompi. */
export async function createCheckout(
  items: CartItem[],
  customer: Customer,
): Promise<{ checkoutUrl: string } | { error: string }> {
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        customer,
        items: items.map((i) => ({
          productId: i.product.id,
          accountType: i.accountType,
          optionLabel: i.option?.label,
          quantity: i.quantity,
        })),
      }),
    })
    const data = await readJson(res)
    if (res.ok && typeof data.checkoutUrl === 'string') return { checkoutUrl: data.checkoutUrl }
    return { error: typeof data.error === 'string' ? data.error : 'No pudimos iniciar el pago. Intenta de nuevo.' }
  } catch {
    return { error: 'No hay conexión. Revisa tu internet e intenta de nuevo.' }
  }
}

export interface DeliveredAccount {
  type: AccountType
  login: string
  secret: string
  code: string
  notes: string
}

export interface OrderView {
  reference: string
  status: 'pendiente' | 'pagado' | 'enviado' | 'entregado' | 'cancelado' | 'requiere_atencion'
  total: number
  shipping?: { city: string; tracking: string }
  items: {
    id: string
    name: string
    option?: string
    accountType?: AccountType
    quantity: number
    fulfillment: 'auto' | 'manual'
    accounts: DeliveredAccount[]
  }[]
}

export async function fetchOrder(ref: string, token: string): Promise<{ order: OrderView } | { error: string }> {
  try {
    const res = await fetch(`/api/order?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(token)}`)
    const data = await readJson(res)
    if (res.ok) return { order: data as unknown as OrderView }
    return { error: typeof data.error === 'string' ? data.error : 'No encontramos este pedido.' }
  } catch {
    return { error: 'No hay conexión. Revisa tu internet.' }
  }
}
