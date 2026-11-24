import { useState, type FormEvent } from 'react'
import { Check, Tag, X } from 'lucide-react'
import type { AppliedCoupon } from '../lib/checkoutApi'
import { formatPrice } from '../utils/formatPrice'

interface Props {
  coupon: AppliedCoupon | null
  error: string | null
  busy: boolean
  onApply: (code: string) => void
  onClear: () => void
}

export default function CouponBox({ coupon, error, busy, onApply, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')

  if (coupon) {
    return (
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-primary/50 bg-primary/10 px-3 py-2.5">
        <div className="min-w-0 text-sm">
          <p className="flex items-center gap-1.5 font-semibold text-primary">
            <Check className="w-4 h-4 shrink-0" />
            <span className="truncate">{coupon.code}</span>
          </p>
          <p className="text-xs text-muted">
            {coupon.kind === 'percent' ? `${coupon.value}% de descuento` : 'Descuento aplicado'} · −{formatPrice(coupon.discount)}
          </p>
        </div>
        <button onClick={onClear} aria-label="Quitar código" className="p-2 -mr-1 text-muted hover:text-danger shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (code.trim().length >= 3 && !busy) onApply(code)
  }

  return (
    <div className="mb-3">
      {!open && !error ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 py-1 text-sm text-primary hover:underline">
          <Tag className="w-4 h-4" /> ¿Tienes un código de descuento?
        </button>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código de descuento"
            aria-label="Código de descuento"
            maxLength={40}
            autoCapitalize="characters"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl bg-bg border border-line px-3 py-2.5 text-sm uppercase placeholder:normal-case focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={busy || code.trim().length < 3}
            className="rounded-xl bg-primary text-primary-ink font-semibold px-4 text-sm disabled:opacity-50"
          >
            {busy ? '...' : 'Aplicar'}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
    </div>
  )
}
