import type { Product } from './types'

/** Las cuentas de PlayStation piden un código de verificación al iniciar sesión. */
export const isPlayStation = (p: Product): boolean => /\b(ps\s?[1-5]|playstation)\b/i.test(p.platform ?? '')
