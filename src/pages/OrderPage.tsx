import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Check, Copy, MessageCircle } from 'lucide-react'
import { STORE_CONFIG } from '../config/store'
import { useCartContext } from '../hooks/CartContext'
import { fetchOrder, type DeliveredAccount, type OrderView } from '../lib/checkoutApi'
import { formatPrice } from '../utils/formatPrice'
import { buildWhatsAppLink } from '../utils/whatsapp'

const POLL_MS = 3000
const MAX_POLLS = 40 // ~2 minutos esperando la confirmación del banco

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* el navegador no permitió copiar */
        }
      }}
      aria-label={`Copiar ${label}`}
      className="p-1.5 text-muted hover:text-primary"
    >
      {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-bg border border-line px-3 py-2">
      <div className="min-w-0">
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-sm font-mono break-all">{value}</p>
      </div>
      <CopyButton text={value} label={label} />
    </div>
  )
}

function AccountCard({ acc }: { acc: DeliveredAccount }) {
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 flex flex-col gap-2">
      <p className="text-xs font-semibold text-primary">
        Cuenta {acc.type === 'secundaria' ? 'secundaria' : 'principal'}
      </p>
      <Field label="Correo / usuario" value={acc.login} />
      <Field label="Contraseña" value={acc.secret} />
      {acc.code && <Field label="Código de verificación" value={acc.code} />}
      {acc.notes && <p className="text-xs text-muted whitespace-pre-line">{acc.notes}</p>}
    </div>
  )
}

export default function OrderPage() {
  const { ref = '' } = useParams<{ ref: string }>()
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  const { clearCart } = useCartContext()
  const [order, setOrder] = useState<OrderView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gaveUp, setGaveUp] = useState(false)
  const polls = useRef(0)

  // El pedido no debe indexarse en buscadores.
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  // Consulta el pedido y, mientras el pago esté pendiente, vuelve a preguntar cada 3 segundos.
  useEffect(() => {
    let stopped = false
    let timer = 0
    polls.current = 0
    async function load() {
      const result = await fetchOrder(ref, token)
      if (stopped) return
      if ('error' in result) return setError(result.error)
      setOrder(result.order)
      if (result.order.status === 'pendiente') {
        if (polls.current++ < MAX_POLLS) timer = window.setTimeout(load, POLL_MS)
        else setGaveUp(true)
      }
    }
    void load()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [ref, token])

  // Con el pago confirmado, el carrito ya no hace falta.
  const status = order?.status
  useEffect(() => {
    if (status && status !== 'pendiente' && status !== 'cancelado') clearCart()
  }, [status, clearCart])

  const supportLink = buildWhatsAppLink(`Hola, tengo una consulta sobre mi pedido ${ref}.`)
  const support = (
    <a
      href={supportLink}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-primary/60 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
    >
      <MessageCircle className="w-4 h-4" />
      Escribir a la línea de atención ({STORE_CONFIG.phoneDisplay})
    </a>
  )

  if (error) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display font-bold text-2xl">No encontramos este pedido</h1>
        <p className="text-sm text-muted mt-2">{error} Revisa que hayas abierto el enlace completo.</p>
        {support}
      </div>
    )
  }
  if (!order) return <p className="text-sm text-muted">Cargando tu pedido...</p>

  const delivered = order.items.some((i) => i.accounts.length > 0)
  const hasManual = order.items.some((i) => i.fulfillment !== 'auto')

  return (
    <div className="max-w-xl">
      <p className="text-xs text-muted">Pedido {order.reference}</p>

      {order.status === 'pendiente' && !gaveUp && (
        <>
          <h1 className="font-display font-bold text-2xl mt-1">Confirmando tu pago...</h1>
          <p className="text-sm text-muted mt-2">
            Estamos esperando la confirmación de tu banco o billetera. Esto toma unos segundos; no cierres esta página.
          </p>
        </>
      )}
      {order.status === 'pendiente' && gaveUp && (
        <>
          <h1 className="font-display font-bold text-2xl mt-1">Aún no vemos tu pago</h1>
          <p className="text-sm text-muted mt-2">
            Si ya pagaste, puede tardar unos minutos más: guarda esta página. Si tienes dudas, escríbenos.
          </p>
          {support}
        </>
      )}
      {order.status === 'cancelado' && (
        <>
          <h1 className="font-display font-bold text-2xl mt-1">El pago no fue aprobado</h1>
          <p className="text-sm text-muted mt-2">No se cobró nada. Puedes volver a intentarlo desde tu carrito.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">
            Volver a la tienda
          </Link>
        </>
      )}
      {order.status === 'requiere_atencion' && (
        <>
          <h1 className="font-display font-bold text-2xl mt-1">¡Pago recibido!</h1>
          <p className="text-sm text-muted mt-2">
            Estamos terminando de preparar tu pedido y te escribiremos muy pronto. Si necesitas algo ya, escríbenos.
          </p>
          {support}
        </>
      )}
      {(order.status === 'pagado' || order.status === 'entregado') && (
        <>
          <h1 className="font-display font-bold text-2xl mt-1">¡Pago aprobado! 🎮</h1>
          <p className="text-sm text-muted mt-2">
            Gracias por tu compra de {formatPrice(order.total)}.
            {hasManual && ' Te enviaremos el resto de tu pedido por WhatsApp en breve.'}
          </p>
        </>
      )}

      {(order.status === 'pagado' || order.status === 'entregado' || order.status === 'requiere_atencion') && (
        <div className="mt-6 flex flex-col gap-5">
          {order.items.map((item) => (
            <div key={item.id}>
              <p className="font-semibold text-sm">
                {item.name}
                {item.option ? ` · ${item.option}` : ''} <span className="text-muted">x{item.quantity}</span>
              </p>
              {item.accounts.length > 0 ? (
                <div className="mt-2 flex flex-col gap-3">
                  {item.accounts.map((acc, i) => (
                    <AccountCard key={i} acc={acc} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted mt-1">
                  {item.fulfillment === 'auto' ? 'Preparando tu cuenta...' : 'Te lo enviaremos por WhatsApp.'}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {delivered && (
        <div className="mt-6 rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold">Guarda estos datos</p>
          <p className="text-xs text-muted mt-1">
            Esta página es privada: solo quien tiene el enlace puede verla. Si el código de verificación no te funciona o
            tienes cualquier problema con la cuenta, escríbenos.
          </p>
          {support}
        </div>
      )}
    </div>
  )
}
