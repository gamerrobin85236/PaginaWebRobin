import { useCallback, useEffect, useRef, useState } from 'react'
import type { CartItem } from './useCart'
import { checkCoupon, type AppliedCoupon } from '../lib/checkoutApi'

/** Código de descuento del carrito: se valida en el servidor y se revisa de nuevo si el carrito cambia. */
export function useCoupon(items: CartItem[]) {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const apply = useCallback(async (code: string) => {
    setBusy(true)
    setError(null)
    const r = await checkCoupon(itemsRef.current, code.trim())
    setBusy(false)
    if ('error' in r) setError(r.error)
    else setCoupon(r)
  }, [])

  const clear = useCallback(() => {
    setCoupon(null)
    setError(null)
  }, [])

  // Si cambian los productos o cantidades, el descuento se recalcula (o se quita si ya no aplica).
  const signature = items.map((i) => `${i.product.id}:${i.accountType}:${i.option?.label ?? ''}:${i.quantity}`).join('|')
  const code = coupon?.code
  useEffect(() => {
    if (!code) return
    if (itemsRef.current.length === 0) {
      setCoupon(null)
      return
    }
    let cancelled = false
    checkCoupon(itemsRef.current, code).then((r) => {
      if (cancelled) return
      if ('error' in r) {
        setCoupon(null)
        setError(r.error)
      } else setCoupon(r)
    })
    return () => {
      cancelled = true
    }
  }, [signature, code])

  return { coupon, error, busy, apply, clear }
}
