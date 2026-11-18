import type { Product } from '../lib/types'

export const hasOptions = (p: Product): boolean => (p.options?.length ?? 0) > 0
export const isSoldOut = (p: Product): boolean => p.stock === 0
