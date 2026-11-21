import { useState, type FormEvent } from 'react'
import { CreditCard } from 'lucide-react'
import type { CartItem } from '../hooks/useCart'
import { createCheckout } from '../lib/checkoutApi'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

// Los datos del cliente se recuerdan en este dispositivo para no escribirlos de nuevo.
const KEY = 'gr_customer'

function loadCustomer(): { name: string; email: string; phone: string } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { name: '', email: '', phone: '', ...(JSON.parse(raw) as object) }
  } catch {
    /* sin datos guardados */
  }
  return { name: '', email: '', phone: '' }
}

export default function OnlineCheckout({ items }: { items: CartItem[] }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(loadCustomer)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      localStorage.setItem(KEY, JSON.stringify(form))
    } catch {
      /* no pasa nada */
    }
    const result = await createCheckout(items, form)
    if ('error' in result) {
      setBusy(false)
      return setError(result.error)
    }
    window.location.href = result.checkoutUrl // pasa a la pantalla segura de pago
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-ink font-semibold rounded-full py-3 text-sm hover:brightness-110 transition"
      >
        <CreditCard className="w-4 h-4" />
        Pagar en línea
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input
        className={inputCls}
        placeholder="Tu nombre"
        autoComplete="name"
        required
        maxLength={80}
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />
      <input
        className={inputCls}
        type="email"
        placeholder="Tu correo"
        autoComplete="email"
        required
        maxLength={254}
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        className={inputCls}
        type="tel"
        inputMode="tel"
        placeholder="Tu celular (WhatsApp)"
        autoComplete="tel"
        required
        maxLength={16}
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="flex items-center justify-center gap-2 bg-primary text-primary-ink font-semibold rounded-full py-3 text-sm hover:brightness-110 disabled:opacity-60 transition"
      >
        <CreditCard className="w-4 h-4" />
        {busy ? 'Conectando con el pago...' : 'Continuar al pago seguro'}
      </button>
      <p className="text-[11px] text-muted text-center">
        Pagas en la pantalla segura de Wompi con Nequi, PSE o tarjeta. Aquí no guardamos datos de pago.
      </p>
    </form>
  )
}
