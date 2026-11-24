// Servidor de pagos de Gamer Robin (Cloudflare Worker).
// Solo atiende direcciones /api/*. Aquí viven los secretos (Wompi y Supabase): NUNCA se envían al navegador.
//
//   POST /api/checkout        crea el pedido (precios calculados AQUÍ, no por el navegador) y devuelve el enlace de pago
//   POST /api/coupon          valida un código de descuento contra el carrito
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
  SUPABASE_PUBLIC_KEY?: string // llave publicable (para comprobar que quien pide un correo de prueba es administrador)
  WHATSAPP_NUMBER?: string
}

const WOMPI_CHECKOUT = 'https://checkout.wompi.co/p/'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PAID_STATUSES = ['pagado', 'enviado', 'entregado', 'requiere_atencion']

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

interface CouponResult {
  ok: boolean
  error?: string
  code?: string
  kind?: string
  value?: number
  discount?: number
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

/** Precios y disponibilidad SIEMPRE desde la base de datos. Devuelve las líneas del pedido o una respuesta de error. */
async function priceCart(env: Env, rawItems: unknown): Promise<{ lines: OrderLine[]; needsShipping: boolean } | Response> {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 20) {
    return json({ error: 'Tu carrito está vacío.' }, 400)
  }
  const wanted: { productId: string; accountType: string; optionLabel: string; quantity: number }[] = []
  for (const it of rawItems as Record<string, unknown>[]) {
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
  let needsShipping = false // hay productos físicos: se piden los datos de envío
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
    if (p.stock !== null) needsShipping = true
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
  return { lines, needsShipping }
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
  let body: { items?: unknown; coupon?: unknown; customer?: { shipping?: Record<string, unknown>; name?: unknown; email?: unknown; emailConfirm?: unknown; phone?: unknown } }
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
  const priced = await priceCart(env, body.items)
  if (priced instanceof Response) return priced
  const { lines, needsShipping } = priced

  // --- datos de envío (solo si hay productos físicos o consolas)
  let shipping: { document: string; department: string; city: string; address: string; notes: string } | null = null
  if (needsShipping) {
    const sh = body.customer?.shipping ?? {}
    const clean = (v: unknown, max: number) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
    shipping = {
      document: clean(sh.document, 20).replace(/[^\dA-Za-z.-]/g, ''),
      department: clean(sh.department, 40),
      city: clean(sh.city, 60),
      address: clean(sh.address, 160),
      notes: clean(sh.notes, 200),
    }
    if (shipping.document.replace(/\D/g, '').length < 5) return json({ error: 'Escribe tu número de documento (cédula) para el envío.' }, 400)
    if (shipping.department.length < 3) return json({ error: 'Elige el departamento del envío.' }, 400)
    if (shipping.city.length < 2) return json({ error: 'Escribe la ciudad o municipio del envío.' }, 400)
    if (shipping.address.length < 6) return json({ error: 'Escribe la dirección completa del envío.' }, 400)
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0)
  // Cupón: se vuelve a validar aquí; el descuento nunca lo decide el navegador.
  let couponCode: string | null = null
  let discount = 0
  const couponText = String(body.coupon ?? '').trim()
  if (couponText) {
    const v = await rpc<CouponResult>(env, 'validate_coupon', { p_code: couponText.slice(0, 40), p_subtotal: subtotal })
    if (!v.ok) return json({ error: v.error ?? 'El código no es válido.' }, 400)
    couponCode = v.code ?? null
    discount = Number(v.discount ?? 0)
  }
  const total = subtotal - discount
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
    p_shipping: shipping,
    p_coupon: couponCode,
    p_discount: discount,
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

// ---------------------------------------------------------------- POST /api/coupon
// Revisa un código contra el carrito y dice cuánto descuenta (el pedido lo vuelve a validar).
async function handleCoupon(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origen no permitido.' }, 403)
  if (!env.SUPABASE_SERVICE_KEY) return json({ error: 'Los códigos no están disponibles todavía.' }, 503)
  const raw = await readBody(request, 20_000)
  if (raw === null) return json({ error: 'Solicitud demasiado grande.' }, 413)
  let body: { items?: unknown; code?: unknown }
  try {
    body = JSON.parse(raw)
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  const code = String(body.code ?? '').trim()
  if (code.length < 3 || code.length > 40) return json({ error: 'Escribe tu código de descuento.' }, 400)
  const priced = await priceCart(env, body.items)
  if (priced instanceof Response) return priced
  const subtotal = priced.lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0)
  const v = await rpc<CouponResult>(env, 'validate_coupon', { p_code: code, p_subtotal: subtotal })
  if (!v.ok) return json({ error: v.error ?? 'El código no es válido.' }, 400)
  return json({ code: v.code, kind: v.kind, value: v.value, discount: v.discount })
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

// Textos del correo que Robin puede editar en el panel (tabla store_settings). {nombre} y {pedido} se reemplazan.
const EMAIL_DEFAULTS = {
  email_subject: 'Tu pedido {pedido} · datos de tu compra',
  email_intro: '¡Gracias por tu compra, {nombre}! Aquí tienes los datos de tu pedido.',
  email_footer:
    'Guarda este correo: aquí están tus datos de acceso. Si el código de verificación no te funciona o tienes cualquier problema, escríbenos por WhatsApp. No compartas estos datos con nadie.',
}
type EmailTexts = typeof EMAIL_DEFAULTS

async function loadEmailTexts(env: Env): Promise<EmailTexts> {
  const texts: EmailTexts = { ...EMAIL_DEFAULTS }
  try {
    const rows = await select<{ key: string; value: string }>(
      env,
      'store_settings?select=key,value&key=in.(email_subject,email_intro,email_footer)',
    )
    for (const r of rows) {
      if (r.key in texts && r.value.trim()) texts[r.key as keyof EmailTexts] = r.value.trim().slice(0, 2000)
    }
  } catch {
    /* si la tabla aún no existe se usan los textos por defecto */
  }
  return texts
}

interface MailAccount {
  account_type: string
  login: string
  secret: string
  verification_code: string
  notes: string
}
interface MailItem {
  product_name: string
  option_label: string | null
  quantity: number
  fulfillment: string
  accounts: MailAccount[]
}
interface MailData {
  ref: string
  name: string
  total: number
  link: string
  items: MailItem[]
}

function fill(text: string, data: MailData): string {
  return text.replace(/\{nombre\}/g, data.name.split(' ')[0]).replace(/\{pedido\}/g, data.ref)
}

function renderEmail(env: Env, texts: EmailTexts, data: MailData): { subject: string; html: string } {
  const para = (t: string) => esc(fill(t, data)).replace(/\n/g, '<br>')
  const field = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7a70;font-size:12px;width:130px;vertical-align:top">${esc(label)}</td><td style="padding:6px 0;font-family:Consolas,monospace;font-size:15px;color:#111;word-break:break-all"><b>${esc(value)}</b></td></tr>`

  const blocks = data.items
    .map((it) => {
      const title = `${esc(it.product_name)}${it.option_label ? ` · ${esc(it.option_label)}` : ''} <span style="color:#6b7a70">x${it.quantity}</span>`
      if (it.accounts.length === 0) {
        const msg = it.fulfillment === 'auto' ? 'Estamos preparando tu cuenta; te escribiremos muy pronto.' : 'Te lo enviaremos por WhatsApp en breve.'
        return `<div style="margin:18px 0"><p style="margin:0 0 6px;font-weight:bold">${title}</p><p style="margin:0;color:#6b7a70;font-size:13px">${msg}</p></div>`
      }
      const cards = it.accounts
        .map(
          (a) => `<table role="presentation" style="width:100%;border:1px solid #bfe6cb;background:#f1fbf4;border-radius:10px;margin:8px 0" cellspacing="0" cellpadding="10"><tr><td>
<p style="margin:0 0 4px;color:#0a7a3a;font-size:12px;font-weight:bold">CUENTA ${a.account_type === 'secundaria' ? 'SECUNDARIA' : 'PRINCIPAL'}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%">${field('Correo / usuario', a.login)}${field('Contraseña', a.secret)}${a.verification_code ? field('Código de verificación', a.verification_code) : ''}</table>
${a.notes ? `<p style="margin:6px 0 0;color:#444;font-size:12px">${esc(a.notes)}</p>` : ''}</td></tr></table>`,
        )
        .join('')
      return `<div style="margin:18px 0"><p style="margin:0 0 6px;font-weight:bold">${title}</p>${cards}</div>`
    })
    .join('')

  const wa = env.WHATSAPP_NUMBER ? `https://wa.me/${env.WHATSAPP_NUMBER}` : ''
  const html = `<!doctype html><html><body style="margin:0;background:#eef2ef">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ef"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#111">
<tr><td align="center" style="background:#000000;padding:18px"><img src="${esc(env.SITE_URL)}/logo-email.png" width="120" height="120" alt="Gamer Robin" style="display:block;border:0"></td></tr>
<tr><td style="padding:24px 26px">
<h2 style="margin:0 0 8px;font-size:20px">${para(texts.email_intro)}</h2>
<p style="margin:0;color:#6b7a70;font-size:13px">Pedido ${esc(data.ref)} · Total ${cop(data.total)}</p>
${blocks}
<p style="margin:20px 0 14px;font-size:13px;color:#333;line-height:1.5">${para(texts.email_footer)}</p>
<p style="margin:0 0 6px"><a href="${esc(data.link)}" style="display:inline-block;background:#16c75a;color:#04210f;text-decoration:none;font-weight:bold;font-size:14px;padding:11px 20px;border-radius:999px">Ver mi pedido</a>
${wa ? ` <a href="${esc(wa)}" style="display:inline-block;border:1px solid #16c75a;color:#0a7a3a;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 20px;border-radius:999px">Escribir por WhatsApp</a>` : ''}</p>
<p style="margin:14px 0 0;font-size:11px;color:#8a978f">La página de tu pedido es privada: no compartas el enlace.</p>
</td></tr>
<tr><td align="center" style="background:#f6f8f7;padding:12px;font-size:11px;color:#8a978f">Gamer Robin · Santa Rosa de Cabal</td></tr>
</table></td></tr></table></body></html>`
  return { subject: fill(texts.email_subject, data), html }
}

async function resendSend(env: Env, to: string, mail: { subject: string; html: string }): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: mail.subject, html: mail.html }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
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
  const accounts = await select<MailAccount & { order_item_id: string }>(
    env,
    `game_accounts?order_id=eq.${order.id}&select=order_item_id,account_type,login,secret,verification_code,notes`,
  )
  const data: MailData = {
    ref: order.public_ref,
    name: order.customer_name,
    total: Number(order.total),
    link: `${env.SITE_URL}/pedido/${order.public_ref}?t=${order.access_token}`,
    items: order.order_items.map((it) => ({
      product_name: it.product_name,
      option_label: it.option_label,
      quantity: it.quantity,
      fulfillment: it.fulfillment,
      accounts: accounts.filter((a) => a.order_item_id === it.id),
    })),
  }
  await resendSend(env, order.customer_email, renderEmail(env, await loadEmailTexts(env), data))
}

// ---------------------------------------------------------------- POST /api/test-email (solo administradores)
async function handleTestEmail(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origen no permitido.' }, 403)
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    return json({ error: 'Falta configurar el envío de correos (RESEND_API_KEY y EMAIL_FROM).' }, 503)
  }
  // Solo un administrador con sesión iniciada puede enviar correos de prueba.
  const auth = request.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ') || !env.SUPABASE_PUBLIC_KEY) return json({ error: 'No autorizado.' }, 401)
  const adminRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLIC_KEY, Authorization: auth, 'content-type': 'application/json' },
    body: '{}',
  })
  if (!adminRes.ok || (await adminRes.json()) !== true) return json({ error: 'No autorizado.' }, 403)

  const raw = await readBody(request, 2_000)
  let to = ''
  try {
    to = String((JSON.parse(raw ?? '{}') as { to?: unknown }).to ?? '').trim()
  } catch {
    /* sin cuerpo */
  }
  if (to.length > 254 || !EMAIL_RE.test(to)) return json({ error: 'Escribe un correo válido.' }, 400)

  const data: MailData = {
    ref: 'GR-EJEMPLO000000000',
    name: 'Cliente de Ejemplo',
    total: 80000,
    link: `${env.SITE_URL}/`,
    items: [
      {
        product_name: 'Juego de ejemplo (PS5)',
        option_label: null,
        quantity: 1,
        fulfillment: 'auto',
        accounts: [
          { account_type: 'principal', login: 'ejemplo@correo.com', secret: 'ClaveDeEjemplo123', verification_code: '123456', notes: '' },
        ],
      },
    ],
  }
  try {
    await resendSend(env, to, renderEmail(env, await loadEmailTexts(env), data))
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'No se pudo enviar.' }, 502)
  }
  return json({ ok: true })
}

// ---------------------------------------------------------------- GET /api/order
interface OrderRow {
  id: string
  status: string
  total: number | string
  tracking: string | null
  shipping_city: string | null
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
    `orders?public_ref=eq.${ref}&access_token=eq.${token}&select=id,status,total,tracking,shipping_city,order_items(id,product_name,option_label,account_type,quantity,fulfillment)`,
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
    shipping: order.shipping_city ? { city: order.shipping_city, tracking: order.tracking ?? '' } : undefined,
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
      if (url.pathname === '/api/coupon') return await handleCoupon(request, env, url)
      if (url.pathname === '/api/wompi-webhook') return await handleWebhook(request, env)
      if (url.pathname === '/api/order') return await handleOrder(request, env, url)
      if (url.pathname === '/api/test-email') return await handleTestEmail(request, env, url)
      if (url.pathname.startsWith('/api/')) return json({ error: 'No existe.' }, 404)
      return await env.ASSETS.fetch(request)
    } catch (err) {
      console.error(err instanceof Error ? err.message : err)
      return json({ error: 'Error interno. Intenta de nuevo en un momento.' }, 500)
    }
  },
}
