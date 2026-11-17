export type AccountType = 'principal' | 'secundaria'

/** Cómo se compra el producto. "whatsapp" = se coordina por chat; "online" = pago en la página (más adelante). */
export type BuyMode = 'whatsapp' | 'online'

export interface Section {
  id: string
  slug: string
  name: string
  description: string
  icon: string // clave de src/lib/icons.ts
  coverUrl?: string
  active: boolean
  position: number
}

export interface Product {
  id: string
  sectionId: string
  name: string
  slug: string
  description: string
  imageUrl?: string
  price: number
  priceSecondary?: number // solo para cuentas digitales
  platform?: string // PS5, PS4, Xbox, Switch...
  featured: boolean
  available: boolean
  buyMode: BuyMode
  position: number
}
