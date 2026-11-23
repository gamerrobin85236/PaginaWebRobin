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
  orderId?: string
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
  order_id: string | null
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
  orderId: r.order_id ?? undefined,
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

/** Cuentas disponibles por producto, y cuántas de ellas no tienen código de verificación. */
export type AccountCounts = Map<string, { principal: number; secundaria: number; sinCodigo: number }>
export async function fetchAccountCounts(): Promise<AccountCounts> {
  const map: AccountCounts = new Map()
  const { data, error } = await db()
    .from('game_accounts')
    .select('product_id, account_type, verification_code')
    .eq('status', 'available')
  if (error || !data) return map
  for (const r of data as { product_id: string; account_type: AccountType; verification_code: string | null }[]) {
    const cur = map.get(r.product_id) ?? { principal: 0, secundaria: 0, sinCodigo: 0 }
    cur[r.account_type]++
    if (!r.verification_code?.trim()) cur.sinCodigo++
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

export interface AccountEdit {
  type: AccountType
  login: string
  secret: string
  code: string
  notes: string
}

/** Corrige los datos de una cuenta (correo, contraseña, código, tipo o nota). */
export async function updateAccount(id: string, e: AccountEdit): Promise<string | null> {
  const { error } = await db()
    .from('game_accounts')
    .update({ account_type: e.type, login: e.login, secret: e.secret, verification_code: e.code, notes: e.notes })
    .eq('id', id)
  return error ? friendly(error) : null
}

/** Devuelve al inventario una cuenta marcada como vendida por error. */
export async function markAccountAvailable(id: string): Promise<string | null> {
  const { error } = await db()
    .from('game_accounts')
    .update({ status: 'available', sold_at: null, order_id: null })
    .eq('id', id)
  return error ? friendly(error) : null
}

/** Datos básicos de los pedidos que compraron cuentas: id → { ref, nombre }. */
export async function fetchBuyers(orderIds: string[]): Promise<Map<string, { ref: string; name: string }>> {
  const map = new Map<string, { ref: string; name: string }>()
  if (orderIds.length === 0) return map
  const { data } = await db().from('orders').select('id, public_ref, customer_name').in('id', orderIds)
  for (const o of (data ?? []) as { id: string; public_ref: string | null; customer_name: string }[]) {
    map.set(o.id, { ref: o.public_ref ?? o.id.slice(0, 8), name: o.customer_name })
  }
  return map
}

// ---------- Pedidos ----------
export type OrderStatus = 'pendiente' | 'pagado' | 'enviado' | 'entregado' | 'cancelado' | 'requiere_atencion'

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
  shipping?: { document: string; department: string; city: string; address: string; notes: string }
  tracking: string
  items: { id: string; productId: string | null; name: string; option?: string; accountType?: string; quantity: number; fulfillment: string }[]
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
  customer_document: string | null
  shipping_department: string | null
  shipping_city: string | null
  shipping_address: string | null
  shipping_notes: string | null
  tracking: string | null
  order_items: {
    id: string
    product_id: string | null
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
    tracking: o.tracking ?? '',
    shipping: o.shipping_address
      ? {
          document: o.customer_document ?? '',
          department: o.shipping_department ?? '',
          city: o.shipping_city ?? '',
          address: o.shipping_address,
          notes: o.shipping_notes ?? '',
        }
      : undefined,
    items: o.order_items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.product_name,
      option: i.option_label ?? undefined,
      accountType: i.account_type ?? undefined,
      quantity: i.quantity,
      fulfillment: i.fulfillment,
    })),
  }))
}

/** Marca un pedido físico como enviado, con el número de guía (opcional). */
export async function markOrderShipped(id: string, tracking: string): Promise<string | null> {
  const { error } = await db()
    .from('orders')
    .update({ status: 'enviado', tracking: tracking.trim() || null, shipped_at: new Date().toISOString() })
    .eq('id', id)
  if (error && /orders_status_check|violates check/i.test(error.message)) {
    return 'Falta ejecutar migracion_envios.sql en Supabase.'
  }
  return error ? friendly(error) : null
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

// ---------- Correo que recibe el cliente ----------
export interface EmailSettings {
  subject: string
  intro: string
  footer: string
}

export const EMAIL_DEFAULTS: EmailSettings = {
  subject: 'Tu pedido {pedido} · datos de tu compra',
  intro: '¡Gracias por tu compra, {nombre}! Aquí tienes los datos de tu pedido.',
  footer:
    'Guarda este correo: aquí están tus datos de acceso. Si el código de verificación no te funciona o tienes cualquier problema, escríbenos por WhatsApp. No compartas estos datos con nadie.',
}

export async function fetchEmailSettings(): Promise<EmailSettings> {
  const { data, error } = await db().from('store_settings').select('key,value').in('key', ['email_subject', 'email_intro', 'email_footer'])
  if (error) {
    if (error.code === '42P01' || /store_settings/.test(error.message))
      throw new Error('Falta ejecutar migracion_correo.sql en Supabase.')
    throw new Error(friendly(error))
  }
  const map = new Map((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]))
  return {
    subject: map.get('email_subject')?.trim() || EMAIL_DEFAULTS.subject,
    intro: map.get('email_intro')?.trim() || EMAIL_DEFAULTS.intro,
    footer: map.get('email_footer')?.trim() || EMAIL_DEFAULTS.footer,
  }
}

export async function saveEmailSettings(s: EmailSettings): Promise<string | null> {
  const { error } = await db()
    .from('store_settings')
    .upsert(
      [
        { key: 'email_subject', value: s.subject.trim(), updated_at: new Date().toISOString() },
        { key: 'email_intro', value: s.intro.trim(), updated_at: new Date().toISOString() },
        { key: 'email_footer', value: s.footer.trim(), updated_at: new Date().toISOString() },
      ],
      { onConflict: 'key' },
    )
  return error ? friendly(error) : null
}

/** Pide al servidor que envíe un correo de ejemplo (con los textos guardados) a la dirección indicada. */
export async function sendTestEmail(to: string): Promise<string | null> {
  const { data } = await db().auth.getSession()
  const token = data.session?.access_token
  if (!token) return 'Tu sesión venció. Entra de nuevo.'
  try {
    const res = await fetch('/api/test-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to }),
    })
    if (res.ok) return null
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    return body.error ?? 'No se pudo enviar el correo de prueba.'
  } catch {
    return 'No hay conexión. Revisa tu internet.'
  }
}
