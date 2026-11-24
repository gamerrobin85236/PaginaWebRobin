import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Copy, Check, Plus, Shuffle, Trash2 } from 'lucide-react'
import { createCoupon, deleteCoupon, fetchCoupons, setCouponActive, type Coupon } from '../../lib/adminApi'
import { formatPrice } from '../../utils/formatPrice'

const inputCls = 'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

function randomCode(): string {
  // Sin 0/O/1/I para que no se confundan al dictarlos.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return 'ROBIN' + Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

function status(c: Coupon): { label: string; ok: boolean } {
  if (!c.active) return { label: 'Pausado', ok: false }
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: 'Vencido', ok: false }
  if (c.maxUses !== null && c.uses >= c.maxUses) return { label: 'Agotado', ok: false }
  return { label: 'Activo', ok: true }
}

function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      aria-label="Copiar código"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* no se pudo copiar */
        }
      }}
      className="p-2 text-muted hover:text-primary"
    >
      {done ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

export default function CouponsAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState(randomCode)
  const [kind, setKind] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState('')
  const [minTotal, setMinTotal] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expires, setExpires] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    fetchCoupons()
      .then((c) => {
        setCoupons(c)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const v = Number(value)
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(code.trim())) return setError('El código debe tener de 3 a 30 letras o números, sin espacios.')
    if (!Number.isFinite(v) || v <= 0) return setError('Escribe cuánto descuenta.')
    if (kind === 'percent' && v > 100) return setError('El porcentaje no puede pasar de 100.')
    setSaving(true)
    const err = await createCoupon({
      code,
      kind,
      value: v,
      minTotal: Number(minTotal) > 0 ? Number(minTotal) : 0,
      maxUses: Number(maxUses) > 0 ? Math.floor(Number(maxUses)) : null,
      // vence al final del día elegido (hora de Colombia)
      expiresAt: expires ? new Date(`${expires}T23:59:59-05:00`).toISOString() : null,
      note,
    })
    setSaving(false)
    if (err) return setError(err)
    setError(null)
    setCreating(false)
    setCode(randomCode())
    setValue('')
    setMinTotal('')
    setMaxUses('')
    setExpires('')
    setNote('')
    load()
  }

  async function toggle(c: Coupon) {
    const err = await setCouponActive(c.id, !c.active)
    if (err) setError(err)
    load()
  }

  async function remove(c: Coupon) {
    if (!window.confirm(`¿Eliminar el código ${c.code}? No se puede deshacer.`)) return
    const err = await deleteCoupon(c.id)
    if (err) setError(err)
    load()
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl">Cupones de descuento</h2>
          <p className="text-xs text-muted mt-1 max-w-md">
            Crea códigos para regalar descuentos. El cliente lo escribe en el carrito y el descuento se aplica solo.
          </p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-ink font-semibold px-4 py-2 text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {creating && (
        <form onSubmit={submit} className="mt-4 rounded-xl border border-line bg-surface p-4 flex flex-col gap-4">
          <label className="text-sm">
            Código
            <div className="flex gap-2 mt-1">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={30} className={`${inputCls} uppercase`} />
              <button
                type="button"
                onClick={() => setCode(randomCode())}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 text-xs text-muted hover:text-primary shrink-0"
              >
                <Shuffle className="w-4 h-4" /> Generar
              </button>
            </div>
          </label>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
            <label className="text-sm">
              Tipo de descuento
              <select value={kind} onChange={(e) => setKind(e.target.value as 'percent' | 'fixed')} className={`${inputCls} mt-1`}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Valor fijo ($)</option>
              </select>
            </label>
            <label className="text-sm">
              {kind === 'percent' ? 'Porcentaje' : 'Valor a descontar'}
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="numeric"
                placeholder={kind === 'percent' ? 'Ej: 10' : 'Ej: 5000'}
                className={`${inputCls} mt-1`}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
            <label className="text-sm">
              Compra mínima (opcional)
              <input value={minTotal} onChange={(e) => setMinTotal(e.target.value)} inputMode="numeric" placeholder="Ej: 50000" className={`${inputCls} mt-1`} />
            </label>
            <label className="text-sm">
              Veces que se puede usar (opcional)
              <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} inputMode="numeric" placeholder="Vacío = sin límite" className={`${inputCls} mt-1`} />
            </label>
          </div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4">
            <label className="text-sm">
              Vence el (opcional)
              <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
            <label className="text-sm">
              Nota para ti (opcional)
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Ej: para Juan" className={`${inputCls} mt-1`} />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary text-primary-ink font-semibold px-6 py-3 text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Crear código'}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-muted hover:text-ink px-2 py-3">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
      {loading && <p className="text-sm text-muted mt-3">Cargando...</p>}
      {!loading && coupons.length === 0 && !error && (
        <p className="text-sm text-muted mt-6">Todavía no hay códigos. Pulsa "Nuevo" para crear el primero.</p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 mt-4">
        {coupons.map((c) => {
          const st = status(c)
          return (
            <li key={c.id} className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display font-bold text-lg tracking-wide break-all">{c.code}</p>
                <div className="flex items-center shrink-0">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${
                      st.ok ? 'border-primary/60 text-primary' : 'border-line text-muted'
                    }`}
                  >
                    {st.label}
                  </span>
                  <CopyCode code={c.code} />
                </div>
              </div>
              <p className="text-sm">
                {c.kind === 'percent' ? `${c.value}% de descuento` : `${formatPrice(c.value)} de descuento`}
                {c.minTotal > 0 ? ` · desde ${formatPrice(c.minTotal)}` : ''}
              </p>
              <p className="text-xs text-muted">
                Usado {c.uses}
                {c.maxUses !== null ? ` de ${c.maxUses}` : ''} {c.uses === 1 ? 'vez' : 'veces'}
                {c.expiresAt ? ` · vence ${new Date(c.expiresAt).toLocaleDateString('es-CO')}` : ''}
              </p>
              {c.note && <p className="text-xs text-muted">📝 {c.note}</p>}
              <div className="flex items-center justify-between border-t border-line pt-2 -mb-1">
                <button
                  onClick={() => toggle(c)}
                  className={`text-xs rounded-full px-3 py-2 border ${c.active ? 'border-primary/60 text-primary' : 'border-line text-muted'}`}
                >
                  {c.active ? 'Activo · pausar' : 'Pausado · activar'}
                </button>
                <button onClick={() => remove(c)} aria-label="Eliminar" className="p-2.5 text-muted hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
