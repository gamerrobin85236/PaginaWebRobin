// Servidor de pagos de Gamer Robin (Cloudflare Worker).
// Solo atiende direcciones /api/*. Aquí viven los secretos (Wompi y Supabase): NUNCA se envían al navegador.
//
//   POST /api/checkout        crea el pedido (precios calculados AQUÍ, no por el navegador) y devuelve el enlace de pago
//   POST /api/wompi-webhook   Wompi avisa el resultado del pago; se verifica su firma y se entrega el pedido
//   GET  /api/order           el cliente consulta su pedido con su código privado

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  SITE_URL: string
  SUPABASE_URL: string
  WOMPI_PUBLIC_KEY: string
  SUPABASE_SERVICE_KEY: string // secreto
  WOMPI_INTEGRITY_SECRET: string // secreto
  WOMPI_EVENTS_SECRET: string // secreto
  RESEND_API_KEY?: string // secreto (correos al cliente; si falta, no se envían)
  EMAIL_FROM?: string // ej. "Gamer Robin <pedidos@robingames.shop>"
}

const WOMPI_CHECKOUT = 'https://checkout.wompi.co/p/'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAID_STATUSES = ['pagado', 'entregado', 'requiere_atencion']

// ---------------------------------------------------------------- utilidades
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function randomHex(bytes: number): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes))
  return Array.from(data, (b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function supabase(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const key = env.SUPABASE_SERVICE_KEY
  const headers: Record<string, string> = { apikey: key, 'content-type': 'application/json' }
  // Las llaves antiguas (JWT) también van en Authorization; las nuevas (sb_secret_...) solo en apikey.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  return fetch(`${env.SUPABASE_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) } })
}

async function rpc<T>(env: Env, fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await supabase(env, `/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
  if (!res.ok) throw new Error(`rpc ${fn} falló (${res.status}): ${await res.text()}`)
  return (await res.json()) as T
}

async function select<T>(env: Env, path: string): Promise<T[]> {
  const res = await supabase(env, `/rest/v1/${path}`)
  if (!res.ok) throw new Error(`consulta falló (${res.status}): ${await res.text()}`)
  return (await res.json()) as T[]
}

async function readBody(request: Request, maxChars: number): Promise<string | null> {
  const text = await request.text()
  return text.length > maxChars ? null : text
}

// ---------------------------------------------------------------- POST /api/checkout
interface ProductRow {
  id: string
  name: string
  platform: string | null
  price: number | string
  price_secondary: number | string | null
  options: { label: string; price: number | string }[] | null
  available: boolean
  buy_mode: string
  stock: number | null
  fulfillment: string | null
}

interface OrderLine {
  product_id: string
  product_name: string
  account_type: string
  option_label: string
  fulfillment: string
  quantity: number
  unit_price: number
}

async function handleCheckout(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  // Solo se acepta desde la propia página (evita que otros sitios disparen pedidos).
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origen no permitido.' }, 403)
  if (!env.WOMPI_PUBLIC_KEY || !env.WOMPI_INTEGRITY_SECRET || !env.SUPABASE_SERVICE_KEY) {
    return json({ error: 'El pago en línea todavía no está disponible. Puedes comprar por WhatsApp.' }, 503)
  }

  const raw = await readBody(request, 20_000)
  if (raw === null) return json({ error: 'Solicitud demasiado grande.' }, 413)
  let body: { items?: unknown; customer?: { name?: unknown; email?: unknown; emailConfirm?: unknown; phone?: unknown } }
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  // --- datos del cliente
  const name = String(body.customer?.name ?? '').trim()
  const email = String(body.customer?.email ?? '').trim().toLowerCase()
  const phone = String(body.customer?.phone ?? '').replace(/[^\d+]/g, '')
  if (name.length < 2 || name.length > 80) return json({ error: 'Escribe tu nombre.' }, 400)
  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ error: 'El correo no es válido.' }, 400)
  // El correo se escribe dos veces: ahí llegan las credenciales y un error significaría perderlas.
  const emailConfirm = String(body.customer?.emailConfirm ?? '').trim().toLowerCase()
  if (emailConfirm !== email) return json({ error: 'Los dos correos no coinciden. Revísalos.' }, 400)
  if (phone.replace(/\D/g, '').length < 7 || phone.length > 16) return json({ error: 'El celular no es válido.' }, 400)

  // --- productos pedidos
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return json({ error: 'Tu carrito está vacío.' }, 400)
  }
  const wanted: { productId: string; accountType: string; optionLabel: string; quantity: number }[] = []
  for (const it of body.items as Record<string, unknown>[]) {
    const productId = String(it.productId ?? '')
    const quantity = Number(it.quantity)
    if (!UUID_RE.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return json({ error: 'Hay un producto inválido en el carrito.' }, 400)
    }
    wanted.push({
      productId,
      accountType: it.accountType === 'secundaria' ? 'secundaria' : 'principal',
      optionLabel: String(it.optionLabel ?? '').slice(0, 100),
      quantity,
    })
  }

  // Precios y disponibilidad SIEMPRE desde la base de datos.
  const ids = [...new Set(wanted.map((w) => w.productId))]
  const products = await select<ProductRow>(
    env,
    `products?id=in.(${ids.join(',')})&select=id,name,platform,price,price_secondary,options,available,buy_mode,stock,fulfillment`,
  )
  const byId = new Map(products.map((p) => [p.id, p]))
  const availability = await select<{ product_id: string; account_type: string; available: number }>(
    env,
    `account_availability?product_id=in.(${ids.join(',')})&select=product_id,account_type,available`,
  ).catch(() => [])

  const lines: OrderLine[] = []
  const used = new Map<string, number>() // unidades pedidas por producto+tipo (para no pasarse del inventario)
  for (const w of wanted) {
    const p = byId.get(w.productId)
    if (!p || !p.available) return json({ error: 'Un producto del carrito ya no está disponible.' }, 409)
    if (p.buy_mode !== 'online') return json({ error: `"${p.name}" se compra por WhatsApp.` }, 409)

    let unit: number
    let accountType = ''
    let optionLabel = ''
    const options = p.options ?? []
    if (options.length > 0) {
      const opt = options.find((o) => o.label === w.optionLabel)
      if (!opt) return json({ error: `Elige una opción para "${p.name}".` }, 400)
      unit = Number(opt.price)
      optionLabel = opt.label
    } else if (w.accountType === 'secundaria') {
      if (p.price_secondary === null) return json({ error: `"${p.name}" no tiene cuenta secundaria.` }, 409)
      unit = Number(p.price_secondary)
      accountType = 'secundaria'
    } else {
      unit = Number(p.price)
      accountType = p.price_secondary !== null || p.fulfillment === 'auto' ? 'principal' : ''
    }
    if (!Number.isFinite(unit) || unit <= 0) return json({ error: 'Precio no válido.' }, 409)

    const key = `${p.id}|${accountType}`
    const total = (used.get(key) ?? 0) + w.quantity
    used.set(key, total)
    if (p.fulfillment === 'auto') {
      const left = availability.find((a) => a.product_id === p.id && a.account_type === accountType)?.available ?? 0
      if (total > left) return json({ error: `"${p.name}" está agotado o quedan menos unidades.` }, 409)
    }
    if (p.stock !== null && total > p.stock) {
      return json({ error: `De "${p.name}" solo quedan ${p.stock} unidades.` }, 409)
    }

    lines.push({
      product_id: p.id,
      product_name: p.platform ? `${p.name} (${p.platform})` : p.name,
      account_type: accountType,
      option_label: optionLabel,
      fulfillment: p.fulfillment === 'auto' ? 'auto' : 'manual',
      quantity: w.quantity,
      unit_price: unit,
    })
  }

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0)
  const amountInCents = Math.round(total * 100)
  const reference = `GR-${randomHex(8).toUpperCase()}`
  const token = randomHex(24) // 48 caracteres: es la "llave" privada para ver el pedido

  await rpc<string>(env, 'create_order', {
    p_name: name,
    p_email: email,
    p_phone: phone,
    p_ref: reference,
    p_token: token,
    p_items: lines,
  })

  // Firma de integridad de Wompi: SHA-256 de  referencia + monto en centavos + moneda + secreto
  const integrity = await sha256Hex(`${reference}${amountInCents}COP${env.WOMPI_INTEGRITY_SECRET}`)
  const params = new URLSearchParams({
    'public-key': env.WOMPI_PUBLIC_KEY,
    currency: 'COP',
    'amount-in-cents': String(amountInCents),
    reference,
    'signature:integrity': integrity,
    'redirect-url': `${env.SITE_URL}/pedido/${reference}?t=${token}`,
    'customer-data:email': email,
    'customer-data:full-name': name,
  })
  return json({ checkoutUrl: `${WOMPI_CHECKOUT}?${params.toString()}` })
}

// ---------------------------------------------------------------- POST /api/wompi-webhook
function pick(data: unknown, path: string): string | undefined {
  let cur: unknown = data
  for (const part of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur === undefined || cur === null ? undefined : String(cur)
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  if (!env.WOMPI_EVENTS_SECRET || !env.SUPABASE_SERVICE_KEY) return json({ error: 'No configurado.' }, 503)

  const raw = await readBody(request, 100_000)
  if (raw === null) return json({ error: 'Solicitud demasiado grande.' }, 413)
  let event: {
    event?: string
    data?: { transaction?: { id?: string; reference?: string; status?: string; amount_in_cents?: number } }
    signature?: { properties?: string[]; checksum?: string }
    timestamp?: number
  }
  try {
    event = JSON.parse(raw)
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  // Verificación de la firma: valores de "properties" (en orden) + timestamp + secreto de eventos → SHA-256.
  const props = event.signature?.properties
  if (!Array.isArray(props) || props.length === 0 || typeof event.timestamp !== 'number') {
    return json({ error: 'Firma ausente.' }, 401)
  }
  const values = props.map((p) => pick(event.data, p))
  if (values.some((v) => v === undefined)) return json({ error: 'Firma inválida.' }, 401)
  const expected = await sha256Hex(`${values.join('')}${event.timestamp}${env.WOMPI_EVENTS_SECRET}`)
  const provided = (request.headers.get('X-Event-Checksum') ?? event.signature?.checksum ?? '').toLowerCase()
  if (!safeEqual(expected, provided)) return json({ error: 'Firma inválida.' }, 401)

  // Firma válida: solo importan los cambios de estado de una transacción.
  const tx = event.data?.transaction
  if (event.event !== 'transaction.updated' || !tx?.reference || !tx.status || typeof tx.amount_in_cents !== 'number') {
    return json({ ok: true })
  }
  const result = await rpc<string>(env, 'apply_payment', {
    p_ref: tx.reference,
    p_tx: String(tx.id ?? ''),
    p_status: tx.status,
    p_amount_cents: tx.amount_in_cents,
  })
  // Solo en el momento en que el pedido pasa a pagado/entregado se envía el correo (un reenvío de Wompi no lo duplica).
  if (result === 'entregado' || result === 'pagado') {
    try {
      await sendOrderEmail(env, tx.reference)
    } catch (err) {
      console.error('correo no enviado:', err instanceof Error ? err.message : err)
    }
  }
  return json({ ok: true, result })
}

// ---------------------------------------------------------------- correo al cliente (Resend)
function esc(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cop(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`
}

interface MailOrder {
  id: string
  public_ref: string
  access_token: string
  customer_name: string
  customer_email: string
  total: number | string
  order_items: { id: string; product_name: string; option_label: string | null; quantity: number; fulfillment: string }[]
}

async function sendOrderEmail(env: Env, ref: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return // correo no configurado: la página igual muestra los datos
  const rows = await select<MailOrder>(
    env,
    `orders?public_ref=eq.${ref}&select=id,public_ref,access_token,customer_name,customer_email,total,order_items(id,product_name,option_label,quantity,fulfillment)`,
  )
  const order = rows[0]
  if (!order) return
  const accounts = await select<{ order_item_id: string; account_type: string; login: string; secret: string; verification_code: string; notes: string }>(
    env,
    `game_accounts?order_id=eq.${order.id}&select=order_item_id,account_type,login,secret,verification_code,notes`,
  )

  const link = `${env.SITE_URL}/pedido/${order.public_ref}?t=${order.access_token}`
  const field = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7a70;font-size:12px;width:140px">${esc(label)}</td><td style="padding:6px 0;font-family:Consolas,monospace;font-size:15px;color:#111"><b>${esc(value)}</b></td></tr>`

  const blocks = order.order_items
    .map((it) => {
      const mine = accounts.filter((a) => a.order_item_id === it.id)
      const title = `${esc(it.product_name)}${it.option_label ? ` · ${esc(it.option_label)}` : ''} <span style="color:#6b7a70">x${it.quantity}</span>`
      if (mine.length === 0) {
        const msg = it.fulfillment === 'auto' ? 'Estamos preparando tu cuenta; te escribiremos muy pronto.' : 'Te lo enviaremos por WhatsApp en breve.'
        return `<div style="margin:18px 0"><p style="margin:0 0 6px;font-weight:bold">${title}</p><p style="margin:0;color:#6b7a70;font-size:13px">${msg}</p></div>`
      }
      const cards = mine
        .map(
          (a) => `<table style="width:100%;border:1px solid #cfe9d6;background:#f3fbf5;border-radius:10px;padding:10px 14px;margin:8px 0" cellspacing="0">
<tr><td colspan="2" style="color:#0a7a3a;font-size:12px;font-weight:bold;padding-bottom:4px">CUENTA ${a.account_type === 'secundaria' ? 'SECUNDARIA' : 'PRINCIPAL'}</td></tr>
${field('Correo / usuario', a.login)}${field('Contraseña', a.secret)}${a.verification_code ? field('Código de verificación', a.verification_code) : ''}
${a.notes ? `<tr><td colspan="2" style="padding-top:6px;color:#444;font-size:12px">${esc(a.notes)}</td></tr>` : ''}</table>`,
        )
        .join('')
      return `<div style="margin:18px 0"><p style="margin:0 0 6px;font-weight:bold">${title}</p>${cards}</div>`
    })
    .join('')

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
<h2 style="margin:0 0 4px">¡Gracias por tu compra, ${esc(order.customer_name.split(' ')[0])}! 🎮</h2>
<p style="margin:0;color:#6b7a70;font-size:13px">Pedido ${esc(order.public_ref)} · Total ${cop(Number(order.total))}</p>
${blocks}
<p style="font-size:13px;color:#444">Guarda este correo: aquí están tus datos de acceso. También puedes verlos cuando quieras en <a href="${esc(link)}">la página de tu pedido</a> (es privada, no la compartas).</p>
<p style="font-size:12px;color:#6b7a70">Si el código de verificación no te funciona o tienes cualquier problema, escríbenos por WhatsApp. No compartas estos datos con nadie.</p>
</div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [order.customer_email],
      subject: `Tu pedido ${order.public_ref} · datos de tu compra`,
      html,
    }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

// ---------------------------------------------------------------- GET /api/order
interface OrderRow {
  id: string
  status: string
  total: number | string
  order_items: {
    id: string
    product_name: string
    option_label: string | null
    account_type: string | null
    quantity: number
    fulfillment: string
  }[]
}

async function handleOrder(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'GET') return json({ error: 'Método no permitido.' }, 405)
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'No configurado.' }, 503)

  const ref = url.searchParams.get('ref') ?? ''
  const token = url.searchParams.get('t') ?? ''
  if (!/^GR-[0-9A-F]{16}$/.test(ref) || !/^[0-9a-f]{48}$/.test(token)) return json({ error: 'Pedido no encontrado.' }, 404)

  const rows = await select<OrderRow>(
    env,
    `orders?public_ref=eq.${ref}&access_token=eq.${token}&select=id,status,total,order_items(id,product_name,option_label,account_type,quantity,fulfillment)`,
  )
  const order = rows[0]
  if (!order) return json({ error: 'Pedido no encontrado.' }, 404)

  // Los datos de las cuentas solo se entregan cuando el pago ya fue confirmado.
  type Account = { order_item_id: string; account_type: string; login: string; secret: string; verification_code: string; notes: string }
  const accounts = PAID_STATUSES.includes(order.status)
    ? await select<Account>(
        env,
        `game_accounts?order_id=eq.${order.id}&select=order_item_id,account_type,login,secret,verification_code,notes`,
      )
    : []

  return json({
    reference: ref,
    status: order.status,
    total: Number(order.total),
    items: order.order_items.map((it) => ({
      id: it.id,
      name: it.product_name,
      option: it.option_label ?? undefined,
      accountType: it.account_type ?? undefined,
      quantity: it.quantity,
      fulfillment: it.fulfillment,
      accounts: accounts
        .filter((a) => a.order_item_id === it.id)
        .map((a) => ({ type: a.account_type, login: a.login, secret: a.secret, code: a.verification_code, notes: a.notes })),
    })),
  })
}

// ---------------------------------------------------------------- entrada
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    try {
      if (url.pathname === '/api/checkout') return await handleCheckout(request, env, url)
      if (url.pathname === '/api/wompi-webhook') return await handleWebhook(request, env)
      if (url.pathname === '/api/order') return await handleOrder(request, env, url)
      if (url.pathname.startsWith('/api/')) return json({ error: 'No existe.' }, 404)
      return await env.ASSETS.fetch(request)
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      return json({ error: 'Error interno. Intenta de nuevo en un momento.' }, 500)
    }
  },
}
