import { supabase } from './supabase'
import { toProduct, toSection, type ProductRow, type SectionRow } from './catalogApi'
import type { AccountType, BuyMode, Fulfillment, PriceOption, Product, Section, SectionKind } from './types'

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
  fulfillment: Fulfillment
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
  return (await saveProductWithId(input, id)).error
}

/** Igual que saveProduct, pero devuelve también el id del producto (para cargar sus cuentas al crearlo). */
export async function saveProductWithId(input: ProductInput, id?: string): Promise<{ error: string | null; id?: string }> {
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
    fulfillment: input.fulfillment,
    featured: input.featured,
    available: input.available,
    buy_mode: input.buyMode,
    position: input.position,
  }
  if (id) {
    const { error } = await db().from('products').update(row).eq('id', id)
    return { error: error ? friendly(error) : null, id }
  }
  const { data, error } = await db().from('products').insert(row).select('id').single()
  return { error: error ? friendly(error) : null, id: (data as { id: string } | null)?.id }
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

// ---------- Inventario de cuentas (solo administrador) ----------
export interface GameAccount {
  id: string
  productId: string
  type: AccountType
  login: string
  secret: string
  notes: string
  verificationCode: string
  status: 'available' | 'sold'
  soldAt?: string
}

interface AccountRow {
  id: string
  product_id: string
  account_type: AccountType
  login: string
  secret: string
  notes: string
  verification_code: string | null
  status: 'available' | 'sold'
  sold_at: string | null
}

const toAccount = (r: AccountRow): GameAccount => ({
  id: r.id,
  productId: r.product_id,
  type: r.account_type,
  login: r.login,
  secret: r.secret,
  notes: r.notes,
  verificationCode: r.verification_code ?? '',
  status: r.status,
  soldAt: r.sold_at ?? undefined,
})

export async function fetchAccounts(productId: string): Promise<GameAccount[]> {
  const { data, error } = await db()
    .from('game_accounts')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(friendly(error))
  return (data as AccountRow[]).map(toAccount)
}

/** Cuántas cuentas disponibles hay por producto: { productId: { principal, secundaria } } */
export async function fetchAccountCounts(): Promise<Map<string, { principal: number; secundaria: number }>> {
  const map = new Map<string, { principal: number; secundaria: number }>()
  const { data, error } = await db().from('game_accounts').select('product_id, account_type').eq('status', 'available')
  if (error || !data) return map
  for (const r of data as { product_id: string; account_type: AccountType }[]) {
    const cur = map.get(r.product_id) ?? { principal: 0, secundaria: 0 }
    cur[r.account_type]++
    map.set(r.product_id, cur)
  }
  return map
}

export async function addAccounts(
  productId: string,
  rows: { type: AccountType; login: string; secret: string; code: string }[],
  notes: string,
): Promise<string | null> {
  const { error } = await db()
    .from('game_accounts')
    .insert(
      rows.map((r) => ({
        product_id: productId,
        account_type: r.type,
        login: r.login,
        secret: r.secret,
        verification_code: r.code,
        notes,
      })),
    )
  return error ? friendly(error) : null
}

export async function markAccountSold(id: string): Promise<string | null> {
  const { error } = await db()
    .from('game_accounts')
    .update({ status: 'sold', sold_at: new Date().toISOString() })
    .eq('id', id)
  return error ? friendly(error) : null
}

export async function deleteAccount(id: string): Promise<string | null> {
  const { error } = await db().from('game_accounts').delete().eq('id', id)
  return error ? friendly(error) : null
}

export async function updateAccountCode(id: string, code: string): Promise<string | null> {
  const { error } = await db().from('game_accounts').update({ verification_code: code }).eq('id', id)
  return error ? friendly(error) : null
}

// ---------- Pedidos ----------
export type OrderStatus = 'pendiente' | 'pagado' | 'entregado' | 'cancelado' | 'requiere_atencion'

export interface AdminOrder {
  id: string
  ref: string
  status: OrderStatus
  total: number
  name: string
  email: string
  phone: string
  notes: string
  createdAt: string
  items: { id: string; name: string; option?: string; accountType?: string; quantity: number; fulfillment: string }[]
}

interface OrderRow {
  id: string
  public_ref: string | null
  status: OrderStatus
  total: number | string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  notes: string | null
  created_at: string
  order_items: {
    id: string
    product_name: string
    option_label: string | null
    account_type: string | null
    quantity: number
    fulfillment: string
  }[]
}

export async function fetchOrders(): Promise<AdminOrder[]> {
  const { data, error } = await db()
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(150)
  if (error) throw new Error(friendly(error))
  return (data as OrderRow[]).map((o) => ({
    id: o.id,
    ref: o.public_ref ?? o.id.slice(0, 8),
    status: o.status,
    total: Number(o.total),
    name: o.customer_name,
    email: o.customer_email ?? '',
    phone: o.customer_phone ?? '',
    notes: o.notes ?? '',
    createdAt: o.created_at,
    items: o.order_items.map((i) => ({
      id: i.id,
      name: i.product_name,
      option: i.option_label ?? undefined,
      accountType: i.account_type ?? undefined,
      quantity: i.quantity,
      fulfillment: i.fulfillment,
    })),
  }))
}

export async function markOrderDelivered(id: string): Promise<string | null> {
  const { error } = await db()
    .from('orders')
    .update({ status: 'entregado', delivered_at: new Date().toISOString() })
    .eq('id', id)
  return error ? friendly(error) : null
}

/** Vuelve a intentar entregar las cuentas de un pedido pagado (por ejemplo, después de cargar más cuentas). */
export async function retryDelivery(id: string): Promise<string | null> {
  const { error } = await db().rpc('admin_retry_delivery', { p_order: id })
  return error ? friendly(error) : null
}
