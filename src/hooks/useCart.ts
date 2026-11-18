import { useCallback, useEffect, useState } from 'react'
import type { AccountType, PriceOption, Product } from '../lib/types'

export interface CartItem {
  product: Product
  accountType: AccountType
  option?: PriceOption // plan o variante elegida (streaming / suscripciones)
  quantity: number
}

const STORAGE_KEY = 'gamer_robin_cart'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CartItem[]
  } catch {
    return []
  }
}

export function getUnitPrice(item: CartItem): number {
  if (item.option) return item.option.price
  if (item.accountType === 'secundaria' && item.product.priceSecondary) {
    return item.product.priceSecondary
  }
  return item.product.price
}

/** Identifica una línea del carrito: mismo producto + misma cuenta + misma opción. */
export function lineKey(item: CartItem): string {
  return `${item.product.id}|${item.accountType}|${item.option?.label ?? ''}`
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* si el navegador no deja guardar, el carrito sigue funcionando en memoria */
    }
  }, [items])

  const addItem = useCallback(
    (product: Product, accountType: AccountType = 'principal', quantity = 1, option?: PriceOption) => {
      const added: CartItem = { product, accountType, option, quantity }
      setItems((current) => {
        const key = lineKey(added)
        const existing = current.find((item) => lineKey(item) === key)
        if (existing) {
          // No se pasa de las unidades disponibles.
          const max = product.stock ?? Infinity
          return current.map((item) =>
            lineKey(item) === key ? { ...item, quantity: Math.min(max, item.quantity + quantity) } : item,
          )
        }
        return [...current, added]
      })
    },
    [],
  )

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => lineKey(item) !== key))
  }, [])

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((item) => lineKey(item) !== key)
        : current.map((item) => {
            if (lineKey(item) !== key) return item
            const max = item.product.stock ?? Infinity
            return { ...item, quantity: Math.min(max, quantity) }
          }),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const count = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + getUnitPrice(item) * item.quantity, 0)

  return { items, addItem, removeItem, updateQuantity, clearCart, count, total }
}
