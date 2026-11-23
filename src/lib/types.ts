export type AccountType = 'principal' | 'secundaria'

/** Cómo se compra el producto. "whatsapp" = se coordina por chat; "online" = pago en la página (más adelante). */
export type BuyMode = 'whatsapp' | 'online'

/** true cuando el producto solo se puede comprar pagando en la página (sin opción de WhatsApp). */
export const isOnlineOnly = (p: { buyMode: BuyMode; allowWhatsapp?: boolean }): boolean =>
  p.buyMode === 'online' && p.allowWhatsapp === false

/** Tipo de sección: decide qué formulario usa el administrador y cómo se vende. */
export type SectionKind = 'digital' | 'physical' | 'streaming' | 'subscription' | 'generic'

/** Una opción con precio propio (ej. "Perfil", "3 meses"). */
export interface PriceOption {
  label: string
  price: number
}

/** Cómo se entrega un producto digital: Robin lo entrega a mano, o sale solo de su inventario de cuentas. */
export type Fulfillment = 'auto' | 'manual'

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
  fulfillment?: Fulfillment // por defecto 'manual'
  accountStock?: { principal: number; secundaria: number } // solo entrega automática
  featured: boolean
  available: boolean
  buyMode: BuyMode
  allowWhatsapp?: boolean // con pago en línea: false = solo se compra en la página (sin botón de WhatsApp)
  position: number
}
