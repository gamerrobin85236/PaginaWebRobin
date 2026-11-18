import type { AccountType, Product } from '../lib/types'

export const hasOptions = (p: Product): boolean => (p.options?.length ?? 0) > 0

/** ¿Se acabaron las cuentas de este tipo? (solo aplica a entrega automática) */
export const accountOut = (p: Product, type: AccountType): boolean =>
  p.accountStock !== undefined && p.accountStock[type] === 0

/** Agotado: sin unidades (físicos) o sin cuentas de ningún tipo en venta (entrega automática). */
export function isSoldOut(p: Product): boolean {
  if (p.stock === 0) return true
  if (p.accountStock) {
    return accountOut(p, 'principal') && (!p.priceSecondary || accountOut(p, 'secundaria'))
  }
  return false
}
