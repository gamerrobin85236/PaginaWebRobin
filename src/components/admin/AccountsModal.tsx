import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Eye, EyeOff, Pencil, Trash2, X } from 'lucide-react'
import type { AccountType, Product } from '../../lib/types'
import {
  addAccounts,
  deleteAccount,
  fetchAccounts,
  fetchBuyers,
  markAccountAvailable,
  markAccountSold,
  updateAccount,
  type GameAccount,
} from '../../lib/adminApi'
import { isPlayStation } from '../../lib/platform'
import AccountRowsEditor, { emptyAccount, readAccounts, type AccountDraft } from './AccountRowsEditor'

const fieldCls =
  'w-full rounded-lg bg-bg border border-line px-2.5 py-2 text-sm focus:outline-none focus:border-primary'

type View = 'available' | 'sold' | 'add'

function dateLabel(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

interface CardProps {
  acc: GameAccount
  index: number
  needsCode: boolean
  buyer?: { ref: string; name: string }
  onChange: () => void
}

function AccountCard({ acc, index, needsCode, buyer, onChange }: CardProps) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ type: acc.type, login: acc.login, secret: acc.secret, code: acc.verificationCode, notes: acc.notes })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sold = acc.status === 'sold'

  async function copy() {
    const text = `Correo: ${acc.login}\nContraseña: ${acc.secret}${acc.verificationCode ? `\nCódigo de verificación: ${acc.verificationCode}` : ''}${acc.notes ? `\n${acc.notes}` : ''}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* el navegador no permitió copiar */
    }
  }

  async function save() {
    setError(null)
    if (!form.login.trim() || !form.secret.trim()) return setError('El correo y la contraseña no pueden quedar vacíos.')
    setSaving(true)
    const err = await updateAccount(acc.id, {
      type: form.type,
      login: form.login.trim(),
      secret: form.secret.trim(),
      code: form.code.trim(),
      notes: form.notes.trim(),
    })
    setSaving(false)
    if (err) return setError(err)
    setEditing(false)
    onChange()
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-primary/60 bg-surface p-3 flex flex-col gap-2">
        <p className="text-xs font-semibold text-primary">Editando cuenta {index}</p>
        <div className="flex rounded-full border border-line overflow-hidden text-xs w-fit">
          {(['principal', 'secundaria'] as AccountType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setForm({ ...form, type: t })}
              className={`px-3 py-1.5 ${form.type === t ? 'bg-primary text-primary-ink font-semibold' : 'text-muted'}`}
            >
              {t === 'principal' ? 'Principal' : 'Secundaria'}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="text-[11px] text-muted">Correo</label>
            <input className={fieldCls} autoComplete="off" spellCheck={false} value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} />
          </div>
          <div>
            <label className="text-[11px] text-muted">Contraseña</label>
            <input className={`${fieldCls} font-mono`} autoComplete="off" spellCheck={false} value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted">Código de verificación (opcional)</label>
          <input className={`${fieldCls} font-mono`} autoComplete="off" spellCheck={false} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </div>
        <div>
          <label className="text-[11px] text-muted">Nota (opcional)</label>
          <input className={fieldCls} maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="rounded-full bg-primary text-primary-ink font-semibold px-4 py-2 text-sm disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            onClick={() => {
              setEditing(false)
              setError(null)
            }}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted"
          >
            Cancelar
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className={`rounded-xl border bg-surface p-3 ${needsCode ? 'border-amber-400/70' : 'border-line'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">
          Cuenta {index}
          {sold && (
            <span className="ml-2 text-primary">
              Vendida {dateLabel(acc.soldAt)}
              {buyer ? ` a ${buyer.name} (${buyer.ref})` : acc.orderId ? '' : ' · marcada a mano'}
            </span>
          )}
        </p>
        <div className="flex items-center -mt-1 -mr-1">
          <button onClick={copy} aria-label="Copiar datos" className="p-1.5 text-muted hover:text-primary">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={() => setEditing(true)} aria-label="Editar" className="p-1.5 text-muted hover:text-primary">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              if (!window.confirm('¿Eliminar esta cuenta? No se puede deshacer.')) return
              await deleteAccount(acc.id)
              onChange()
            }}
            aria-label="Eliminar"
            className="p-1.5 text-muted hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <dl className="mt-1 grid gap-1 text-sm sm:grid-cols-[110px_1fr]">
        <dt className="text-xs text-muted">Correo</dt>
        <dd className="break-all">{acc.login}</dd>
        <dt className="text-xs text-muted">Contraseña</dt>
        <dd className="font-mono break-all flex items-center gap-2">
          {show ? acc.secret : '••••••••'}
          <button onClick={() => setShow(!show)} aria-label="Ver contraseña" className="text-muted hover:text-primary">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </dd>
        <dt className="text-xs text-muted">Código</dt>
        <dd className="font-mono">
          {acc.verificationCode ? (
            acc.verificationCode
          ) : needsCode ? (
            <span className="text-amber-400 font-sans text-xs">Falta el código de verificación</span>
          ) : (
            <span className="text-muted font-sans text-xs">Sin código</span>
          )}
        </dd>
        {acc.notes && (
          <>
            <dt className="text-xs text-muted">Nota</dt>
            <dd className="text-xs">{acc.notes}</dd>
          </>
        )}
      </dl>
      {sold && !acc.orderId && (
        <button
          onClick={async () => {
            await markAccountAvailable(acc.id)
            onChange()
          }}
          className="mt-2 text-xs text-primary underline"
        >
          Devolver a disponibles
        </button>
      )}
      {!sold && (
        <button
          onClick={async () => {
            if (!window.confirm('¿Marcar esta cuenta como vendida? Ya no se le entregará a ningún cliente.')) return
            await markAccountSold(acc.id)
            onChange()
          }}
          className="mt-2 text-xs text-muted hover:text-primary underline"
        >
          Marcar como vendida (la vendí por otro lado)
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </li>
  )
}

export default function AccountsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [buyers, setBuyers] = useState<Map<string, { ref: string; name: string }>>(new Map())
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('available')
  const [drafts, setDrafts] = useState<AccountDraft[]>([emptyAccount()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const ps = isPlayStation(product)

  const load = useCallback(() => {
    fetchAccounts(product.id)
      .then(async (list) => {
        setAccounts(list)
        const ids = [...new Set(list.map((a) => a.orderId).filter((x): x is string => !!x))]
        setBuyers(await fetchBuyers(ids))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [product.id])
  useEffect(load, [load])

  const available = useMemo(() => accounts.filter((a) => a.status === 'available').slice().reverse(), [accounts])
  const sold = useMemo(() => accounts.filter((a) => a.status === 'sold'), [accounts])
  const principals = available.filter((a) => a.type === 'principal')
  const secondaries = available.filter((a) => a.type === 'secundaria')
  const missingCode = ps ? available.filter((a) => !a.verificationCode.trim()).length : 0

  async function add() {
    setError(null)
    setInfo(null)
    const read = readAccounts(drafts)
    if ('error' in read) return setError(read.error)
    if (read.rows.length === 0) return setError('Escribe al menos una cuenta (correo y contraseña).')
    setSaving(true)
    const err = await addAccounts(product.id, read.rows, notes.trim())
    setSaving(false)
    if (err) return setError(err)
    setDrafts([emptyAccount()])
    setNotes('')
    setInfo(`Se agregaron ${read.rows.length} cuenta(s). Ya están disponibles para vender.`)
    setView('available')
    load()
  }

  const tab = (v: View, label: string) => (
    <button
      onClick={() => {
        setView(v)
        setError(null)
        setInfo(null)
      }}
      className={`px-4 py-2 text-sm font-semibold rounded-full border ${view === v ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted'}`}
    >
      {label}
    </button>
  )

  const section = (title: string, list: GameAccount[]) =>
    list.length > 0 && (
      <div>
        <h4 className="text-sm font-semibold mb-2">
          {title} <span className="text-muted font-normal">({list.length})</span>
        </h4>
        <ul className="flex flex-col gap-2">
          {list.map((a, i) => (
            <AccountCard key={a.id} acc={a} index={i + 1} needsCode={ps && a.status === 'available' && !a.verificationCode.trim()} buyer={a.orderId ? buyers.get(a.orderId) : undefined} onChange={load} />
          ))}
        </ul>
      </div>
    )

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-surface border border-line rounded-2xl">
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-3 border-b border-line">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg leading-tight">Cuentas · {product.name}</h2>
            {product.platform && <p className="text-xs text-primary mt-0.5">{product.platform}</p>}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-ink shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line bg-bg py-2">
              <p className="font-display font-bold text-xl">{principals.length}</p>
              <p className="text-[11px] text-muted">Principales disponibles</p>
            </div>
            <div className="rounded-xl border border-line bg-bg py-2">
              <p className="font-display font-bold text-xl">{secondaries.length}</p>
              <p className="text-[11px] text-muted">Secundarias disponibles</p>
            </div>
            <div className="rounded-xl border border-line bg-bg py-2">
              <p className="font-display font-bold text-xl">{sold.length}</p>
              <p className="text-[11px] text-muted">Ya vendidas</p>
            </div>
          </div>

          {missingCode > 0 && (
            <p className="text-xs text-amber-400 rounded-lg border border-amber-400/50 px-3 py-2">
              {missingCode} cuenta{missingCode === 1 ? '' : 's'} sin código de verificación. Toca el lápiz para agregarlo.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {tab('available', `Disponibles (${available.length})`)}
            {tab('sold', `Vendidas (${sold.length})`)}
            {tab('add', '+ Agregar cuentas')}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-primary">{info}</p>}
          {loading && <p className="text-xs text-muted">Cargando...</p>}

          {view === 'available' && !loading && (
            <>
              {available.length === 0 && <p className="text-sm text-muted">No tienes cuentas disponibles de este juego. Usa "+ Agregar cuentas".</p>}
              {section('Cuentas principales', principals)}
              {section('Cuentas secundarias', secondaries)}
            </>
          )}

          {view === 'sold' && !loading && (
            <>
              {sold.length === 0 && <p className="text-sm text-muted">Todavía no se ha vendido ninguna cuenta de este juego.</p>}
              {sold.length > 0 && (
                <ul className="flex flex-col gap-2">
                  {sold.map((a, i) => (
                    <AccountCard key={a.id} acc={a} index={i + 1} needsCode={false} buyer={a.orderId ? buyers.get(a.orderId) : undefined} onChange={load} />
                  ))}
                </ul>
              )}
            </>
          )}

          {view === 'add' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted">Escribe cada cuenta, márcala como principal o secundaria y usa "+" para agregar más.</p>
              <AccountRowsEditor drafts={drafts} onChange={setDrafts} />
              <div>
                <label className="text-xs text-muted">Nota para todas (opcional, ej. instrucciones)</label>
                <input className={fieldCls} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
              </div>
              <button onClick={add} disabled={saving} className="rounded-full bg-primary text-primary-ink font-semibold px-5 py-2.5 text-sm disabled:opacity-60 w-fit">
                {saving ? 'Guardando...' : 'Guardar cuentas'}
              </button>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-line">
          <button onClick={onClose} className="text-sm text-muted hover:text-ink">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
