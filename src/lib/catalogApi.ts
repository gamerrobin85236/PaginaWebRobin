import { supabase } from './supabase'
import type { AccountType, BuyMode, Fulfillment, PriceOption, Product, Section, SectionKind } from './types'

export interface SectionRow {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  kind: SectionKind | null
  cover_url: string | null
  active: boolean
  position: number
}

export interface ProductRow {
  id: string
  section_id: string
  name: string
  slug: string
  description: string
  image_url: string | null
  price: number | string
  price_secondary: number | string | null
  platform: string | null
  stock: number | null
  options: PriceOption[] | null
  fulfillment: Fulfillment | null
  featured: boolean
  available: boolean
  buy_mode: BuyMode
  allow_whatsapp?: boolean | null
  position: number
}

export function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    kind: row.kind ?? 'generic',
    coverUrl: row.cover_url ?? undefined,
    active: row.active,
    position: row.position,
  }
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    sectionId: row.section_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    price: Number(row.price),
    priceSecondary: row.price_secondary != null ? Number(row.price_secondary) : undefined,
    platform: row.platform ?? undefined,
    stock: row.stock ?? undefined,
    fulfillment: row.fulfillment ?? 'manual',
    options: (row.options ?? []).map((o) => ({ label: o.label, price: Number(o.price) })),
    featured: row.featured,
    available: row.available,
    buyMode: row.buy_mode,
    allowWhatsapp: row.allow_whatsapp ?? true,
    position: row.position,
  }
}

type Availability = Map<string, { principal: number; secundaria: number }>

/** Cuántas cuentas quedan por producto (solo números, nunca los datos). null si no se pudo leer. */
async function fetchAvailability(): Promise<Availability | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('account_availability').select('*')
  if (error || !data) return null
  const map: Availability = new Map()
  for (const r of data as { product_id: string; account_type: AccountType; available: number | string }[]) {
    const cur = map.get(r.product_id) ?? { principal: 0, secundaria: 0 }
    cur[r.account_type] = Number(r.available)
    map.set(r.product_id, cur)
  }
  return map
}

/** Lee las secciones y productos visibles al público. Lanza un Error si algo falla. */
export async function fetchCatalog(): Promise<{ sections: Section[]; products: Product[] }> {
  if (!supabase) throw new Error('Supabase no está configurado')

  const [sectionsRes, productsRes, availability] = await Promise.all([
    supabase.from('sections').select('*').eq('active', true).order('position'),
    supabase.from('products').select('*').eq('available', true).order('position'),
    fetchAvailability(),
  ])

  if (sectionsRes.error) throw new Error(sectionsRes.error.message)
  if (productsRes.error) throw new Error(productsRes.error.message)

  return {
    sections: (sectionsRes.data as SectionRow[]).map(toSection),
    products: (productsRes.data as ProductRow[]).map((row) => {
      const product = toProduct(row)
      if (product.fulfillment === 'auto' && availability) {
        product.accountStock = availability.get(product.id) ?? { principal: 0, secundaria: 0 }
      }
      return product
    }),
  }
}
