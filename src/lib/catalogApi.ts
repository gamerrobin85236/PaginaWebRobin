import { supabase } from './supabase'
import type { BuyMode, Product, Section } from './types'

interface SectionRow {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  cover_url: string | null
  active: boolean
  position: number
}

interface ProductRow {
  id: string
  section_id: string
  name: string
  slug: string
  description: string
  image_url: string | null
  price: number | string
  price_secondary: number | string | null
  platform: string | null
  featured: boolean
  available: boolean
  buy_mode: BuyMode
  position: number
}

function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    coverUrl: row.cover_url ?? undefined,
    active: row.active,
    position: row.position,
  }
}

function toProduct(row: ProductRow): Product {
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
    featured: row.featured,
    available: row.available,
    buyMode: row.buy_mode,
    position: row.position,
  }
}

/** Lee las secciones y productos visibles al público. Lanza un Error si algo falla. */
export async function fetchCatalog(): Promise<{ sections: Section[]; products: Product[] }> {
  if (!supabase) throw new Error('Supabase no está configurado')

  const [sectionsRes, productsRes] = await Promise.all([
    supabase.from('sections').select('*').eq('active', true).order('position'),
    supabase.from('products').select('*').eq('available', true).order('position'),
  ])

  if (sectionsRes.error) throw new Error(sectionsRes.error.message)
  if (productsRes.error) throw new Error(productsRes.error.message)

  return {
    sections: (sectionsRes.data as SectionRow[]).map(toSection),
    products: (productsRes.data as ProductRow[]).map(toProduct),
  }
}
