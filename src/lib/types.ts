export type AccountType = 'principal' | 'secundaria'

/** Cómo se compra el producto. "whatsapp" = se coordina por chat; "online" = pago en la página (más adelante). */
export type BuyMode = 'whatsapp' | 'online'

/** Tipo de sección: decide qué formulario usa el administrador y cómo se vende. */
export type SectionKind = 'digital' | 'physical' | 'streaming' | 'subscription' | 'generic'

/** Una opción con precio propio (ej. "Perfil", "3 meses"). */
export interface PriceOption {
  label: string
  price: number
}

export interface Section {
  id: string
  slug: string
  name: string
  description: string
  icon: string // clave de src/lib/icons.ts
  kind: SectionKind
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
  stock?: number // solo físicos y consolas; 0 = agotado
  options?: PriceOption[] // streaming y suscripciones; price = la opción más barata
  featured: boolean
  available: boolean
  buyMode: BuyMode
  position: number
}
