import { useCallback, useEffect, useState } from 'react'
import { MessageCircle, RefreshCw } from 'lucide-react'
import { fetchOrders, markOrderDelivered, retryDelivery, type AdminOrder, type OrderStatus } from '../../lib/adminApi'
import { formatPrice } from '../../utils/formatPrice'
import { buildWhatsAppLink } from '../../utils/whatsapp'

const LABEL: Record<OrderStatus, string> = {
  pendiente: 'Esperando pago',
  pagado: 'Pagado · por entregar',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  requiere_atencion: 'Requiere atención',
}
const COLOR: Record<OrderStatus, string> = {
  pendiente: 'text-muted border-line',
  pagado: 'text-primary border-primary/60',
  entregado: 'text-muted border-line',
  cancelado: 'text-muted border-line',
  requiere_atencion: 'text-red-400 border-red-400/60',
}
const FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pagado', label: 'Por entregar' },
  { value: 'requiere_atencion', label: 'Requieren atención' },
  { value: 'entregado', label: 'Entregados' },
  { value: 'pendiente', label: 'Sin pagar' },
  { value: 'cancelado', label: 'Cancelados' },
]

function whatsappTo(phone: string, text: string): string {
  // Los celulares colombianos se guardan con 10 dígitos; se les antepone el 57.
  const digits = phone.replace(/\D/g, '')
  const full = digits.length === 10 ? `57${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

export default function OrdersAdmin() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [filter, setFilter] = useState<OrderStatus | ''>('pagado')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchOrders()
      .then((o) => {
        setOrders(o)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  async function act(id: string, run: () => Promise<string | null>) {
    setBusy(id)
    const err = await run()
    setBusy(null)
    if (err) setError(err)
    load()
  }

  const visible = orders.filter((o) => !filter || o.status === filter)
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs ${active ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted'}`

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Pedidos</h2>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button key={f.value} className={chip(filter === f.value)} onClick={() => setFilter(f.value)}>
            {f.label}
            {f.value && ` (${orders.filter((o) => o.status === f.value).length})`}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {loading && <p className="text-sm text-muted">Cargando...</p>}
      {!loading && visible.length === 0 && <p className="text-sm text-muted">No hay pedidos en esta lista.</p>}

      <ul className="flex flex-col gap-3">
        {visible.map((o) => (
          <li key={o.id} className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{o.name}</p>
                <p className="text-xs text-muted break-all">
                  {o.phone} · {o.email}
                </p>
                <p className="text-[11px] text-muted mt-0.5">
                  {o.ref} · {new Date(o.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold">{formatPrice(o.total)}</p>
                <span className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-[11px] ${COLOR[o.status]}`}>
                  {LABEL[o.status]}
                </span>
              </div>
            </div>

            <ul className="text-sm border-t border-line pt-2 flex flex-col gap-1">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span>
                    {i.name}
                    {i.option ? ` · ${i.option}` : i.accountType ? ` · ${i.accountType}` : ''} x{i.quantity}
                  </span>
                  <span className="text-xs text-muted shrink-0">
                    {i.fulfillment === 'auto' ? 'Entrega automática' : 'Entrega manual'}
                  </span>
                </li>
              ))}
            </ul>

            {o.notes && <p className="text-xs text-red-400">{o.notes}</p>}

            <div className="flex flex-wrap items-center gap-2">
              {o.phone && (
                <a
                  href={whatsappTo(o.phone, `Hola ${o.name}, te escribimos de Gamer Robin por tu pedido ${o.ref}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/60 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Escribir al cliente
                </a>
              )}
              {o.status === 'requiere_atencion' && (
                <button
                  disabled={busy === o.id}
                  onClick={() => act(o.id, () => retryDelivery(o.id))}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-muted hover:text-primary disabled:opacity-50"
                >
                  Reintentar entrega automática
                </button>
              )}
              {(o.status === 'pagado' || o.status === 'requiere_atencion') && (
                <button
                  disabled={busy === o.id}
                  onClick={() => act(o.id, () => markOrderDelivered(o.id))}
                  className="rounded-lg bg-primary text-primary-ink px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  Marcar como entregado
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
