import { useEffect, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, X } from 'lucide-react'
import { getUnitPrice, lineKey, type CartItem } from '../hooks/useCart'
import { formatPrice } from '../utils/formatPrice'
import { createCheckout, needsShipping, type Customer, type Shipping } from '../lib/checkoutApi'
import { DEPARTMENTS } from '../lib/departments'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

// Los datos del cliente se recuerdan en este dispositivo para no escribirlos de nuevo.
const KEY = 'gr_customer'
const SHIP_KEY = 'gr_shipping'

function loadShipping(): Shipping {
  try {
    const raw = localStorage.getItem(SHIP_KEY)
    if (raw) return { document: '', department: '', city: '', address: '', notes: '', ...(JSON.parse(raw) as object) }
  } catch {
    /* sin datos guardados */
  }
  return { document: '', department: '', city: '', address: '', notes: '' }
}

function loadCustomer(): Customer {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { name: '', email: '', emailConfirm: '', phone: '', ...(JSON.parse(raw) as object) }
  } catch {
    /* sin datos guardados */
  }
  return { name: '', email: '', emailConfirm: '', phone: '' }
}

export default function OnlineCheckout({ items }: { items: CartItem[] }) {
  const hasAuto = items.some((i) => i.product.fulfillment === 'auto')
  const ships = needsShipping(items)
  const total = items.reduce((sum, i) => sum + getUnitPrice(i) * i.quantity, 0)
  const [ship, setShip] = useState(loadShipping)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(loadCustomer)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Con la ventana abierta: la página de atrás no se desplaza y Escape la cierra.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, busy])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (form.email.trim().toLowerCase() !== form.emailConfirm.trim().toLowerCase()) {
      return setError('Los dos correos no coinciden. Revísalos con calma.')
    }
    setBusy(true)
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...form, emailConfirm: '' }))
      if (ships) localStorage.setItem(SHIP_KEY, JSON.stringify(ship))
    } catch {
      /* no pasa nada */
    }
    const result = await createCheckout(items, ships ? { ...form, shipping: ship } : form)
    if ('error' in result) {
      setBusy(false)
      return setError(result.error)
    }
    window.location.href = result.checkoutUrl // pasa a la pantalla segura de pago
  }

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-ink font-semibold rounded-full py-3 text-sm hover:brightness-110 transition"
    >
      <CreditCard className="w-4 h-4" />
      Pagar en línea
    </button>
  )
  if (!open) return trigger

  const label = 'text-[11px] text-muted mb-1 block'

  const customerFields = (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">👤 Tus datos</p>
      <div>
        <label className={label}>Nombre completo</label>
        <input className={inputCls} placeholder="Tu nombre" autoComplete="name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className={label}>Correo</label>
        <input className={inputCls} type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className={label}>Confirma tu correo (escríbelo otra vez)</label>
        <input
          className={inputCls}
          type="email"
          placeholder="tucorreo@ejemplo.com"
          autoComplete="off"
          required
          maxLength={254}
          value={form.emailConfirm}
          onChange={(e) => setForm({ ...form, emailConfirm: e.target.value })}
          onPaste={(e) => e.preventDefault()}
        />
      </div>
      {hasAuto && (
        <p className="text-xs rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          📧 Tu cuenta llegará a <b>{form.email.trim() || 'tu correo'}</b> en cuanto se apruebe el pago. Revisa que esté bien escrito.
        </p>
      )}
      <div>
        <label className={label}>Celular (WhatsApp)</label>
        <input className={inputCls} type="tel" inputMode="tel" placeholder="3001234567" autoComplete="tel" required maxLength={16} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
    </div>
  )

  const shippingFields = ships && (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold">📦 Datos de envío</p>
      <div>
        <label className={label}>Número de documento (cédula)</label>
        <input className={inputCls} inputMode="numeric" placeholder="Ej. 1088123456" autoComplete="off" required maxLength={20} value={ship.document} onChange={(e) => setShip({ ...ship, document: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Departamento</label>
          <select className={inputCls} required autoComplete="address-level1" value={ship.department} onChange={(e) => setShip({ ...ship, department: e.target.value })}>
            <option value="">Elige...</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Ciudad o municipio</label>
          <input className={inputCls} placeholder="Ej. Pereira" autoComplete="address-level2" required maxLength={60} value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={label}>Dirección completa</label>
        <input className={inputCls} placeholder="Calle, número, barrio" autoComplete="street-address" required maxLength={160} value={ship.address} onChange={(e) => setShip({ ...ship, address: e.target.value })} />
      </div>
      <div>
        <label className={label}>Indicaciones (opcional)</label>
        <input className={inputCls} placeholder="Apartamento, conjunto, punto de referencia" maxLength={200} value={ship.notes} onChange={(e) => setShip({ ...ship, notes: e.target.value })} />
      </div>
      <p className="text-[11px] text-muted">Te escribiremos por WhatsApp para coordinar el valor y la guía del envío.</p>
    </div>
  )

  return (
    <>
      {trigger}
      {createPortal(
        <div className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Finalizar compra">
          <form onSubmit={submit} className={`w-full ${ships ? 'max-w-3xl' : 'max-w-lg'} max-h-modal flex flex-col bg-surface border border-line rounded-2xl shadow-2xl`}>
            <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-line">
              <h2 className="font-display font-bold text-xl">Finalizar compra</h2>
              <button type="button" onClick={() => !busy && setOpen(false)} aria-label="Cerrar" className="p-2 -mr-2 text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              <div className="rounded-xl bg-bg border border-line p-3">
                <ul className="text-sm flex flex-col gap-1">
                  {items.map((i) => (
                    <li key={lineKey(i)} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {i.product.name}
                        {i.product.platform ? ` (${i.product.platform})` : ''}
                        {i.option ? ` · ${i.option.label}` : ''} <span className="text-muted">x{i.quantity}</span>
                      </span>
                      <span className="shrink-0">{formatPrice(getUnitPrice(i) * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-line mt-2 pt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>

              <div className={ships ? 'grid gap-6 md:grid-cols-2' : ''}>
                {customerFields}
                {shippingFields}
              </div>
            </div>

            <div className="shrink-0 px-5 pt-4 pb-safe border-t border-line flex flex-col gap-2">
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="flex items-center justify-center gap-2 bg-primary text-primary-ink font-semibold rounded-full py-3 text-sm hover:brightness-110 disabled:opacity-60 transition"
              >
                <CreditCard className="w-4 h-4" />
                {busy ? 'Conectando con el pago...' : `Continuar al pago seguro · ${formatPrice(total)}`}
              </button>
              <p className="text-[11px] text-muted text-center">
                Pagas en la pantalla segura de Wompi con Nequi, PSE o tarjeta. Aquí no guardamos datos de pago.
              </p>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </>
  )
}
