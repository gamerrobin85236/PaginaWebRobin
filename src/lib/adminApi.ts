import { supabase } from './supabase'
import { toProduct, toSection, type ProductRow, type SectionRow } from './catalogApi'
import type { BuyMode, PriceOption, Product, Section, SectionKind } from './types'

function db() {
  if (!supabase) throw new Error('La base de datos no está configurada.')
  return supabase
}

function friendly(error: { code?: string; message: string }): string {
  if (error.code === '23505') return 'Ya existe un registro con ese nombre. Cambia el nombre o la plataforma.'
  if (error.code === '42501') return 'No tienes permiso para hacer esto. ¿Tu usuario es administrador?'
  if (error.code === '42703' || /column .* does not exist/i.test(error.message))
    return 'Falta actualizar la base de datos (migracion_tipos.sql en Supabase).'
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
  kind: SectionKind
  coverUrl?: string
  active: boolean
  position: number
}

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
    kind: input.kind,
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
  stock?: number
  options: PriceOption[]
  featured: boolean
  available: boolean
  buyMode: BuyMode
  position: number
}

export async function fetchAdminProducts(sectionId?: string): Promise<Product[]> {
  let query = db().from('products').select('*').order('position').order('name')
  if (sectionId) query = query.eq('section_id', sectionId)
  const { data, error } = await query
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
    stock: input.stock ?? null,
    options: input.options,
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

export async function setProductStock(id: string, stock: number): Promise<string | null> {
  const { error } = await db().from('products').update({ stock }).eq('id', id)
  return error ? friendly(error) : null
}

export async function deleteProduct(id: string): Promise<string | null> {
  const { error } = await db().from('products').delete().eq('id', id)
  return error ? friendly(error) : null
}
