import { supabase } from './supabase'
import type { BuyMode, Product, Section } from './types'

function db() {
  if (!supabase) throw new Error('La base de datos no está configurada.')
  return supabase
}

function friendly(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'Ya existe un registro con ese nombre. Cambia el nombre o la plataforma.'
  if (error.code === '42501') return 'No tienes permiso para hacer esto. ¿Tu usuario es administrador?'
  return error.message
}

// ---------- ¿El usuario actual es administrador? ----------
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await db()
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) return false
  return Boolean(data)
}

// ---------- Secciones ----------
export interface SectionInput {
  name: string
  slug: string
  description: string
  icon: string
  coverUrl?: string
  active: boolean
  position: number
}

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

const toSection = (r: SectionRow): Section => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  description: r.description,
  icon: r.icon,
  coverUrl: r.cover_url ?? undefined,
  active: r.active,
  position: r.position,
})

export async function fetchAdminSections(): Promise<Section[]> {
  const { data, error } = await db().from('sections').select('*').order('position')
  if (error) throw new Error(friendly(error))
  return (data as SectionRow[]).map(toSection)
}

export async function saveSection(input: SectionInput, id?: string): Promise<string | null> {
  const row = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    icon: input.icon,
    cover_url: input.coverUrl ?? null,
    active: input.active,
    position: input.position,
  }
  const query = id ? db().from('sections').update(row).eq('id', id) : db().from('sections').insert(row)
  const { error } = await query
  return error ? friendly(error) : null
}

export async function deleteSection(id: string): Promise<string | null> {
  const { error } = await db().from('sections').delete().eq('id', id)
  return error ? friendly(error) : null
}

// ---------- Productos ----------
export interface ProductInput {
  sectionId: string
  name: string
  slug: string
  description: string
  imageUrl?: string
  price: number
  priceSecondary?: number
  platform?: string
  featured: boolean
  available: boolean
  buyMode: BuyMode
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

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  sectionId: r.section_id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  imageUrl: r.image_url ?? undefined,
  price: Number(r.price),
  priceSecondary: r.price_secondary != null ? Number(r.price_secondary) : undefined,
  platform: r.platform ?? undefined,
  featured: r.featured,
  available: r.available,
  buyMode: r.buy_mode,
  position: r.position,
})

export async function fetchAdminProducts(): Promise<Product[]> {
  const { data, error } = await db().from('products').select('*').order('position')
  if (error) throw new Error(friendly(error))
  return (data as ProductRow[]).map(toProduct)
}

export async function saveProduct(input: ProductInput, id?: string): Promise<string | null> {
  const row = {
    section_id: input.sectionId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    image_url: input.imageUrl ?? null,
    price: input.price,
    price_secondary: input.priceSecondary ?? null,
    platform: input.platform || null,
    featured: input.featured,
    available: input.available,
    buy_mode: input.buyMode,
    position: input.position,
  }
  const query = id ? db().from('products').update(row).eq('id', id) : db().from('products').insert(row)
  const { error } = await query
  return error ? friendly(error) : null
}

export async function setProductAvailable(id: string, available: boolean): Promise<string | null> {
  const { error } = await db().from('products').update({ available }).eq('id', id)
  return error ? friendly(error) : null
}

export async function deleteProduct(id: string): Promise<string | null> {
  const { error } = await db().from('products').delete().eq('id', id)
  return error ? friendly(error) : null
}
