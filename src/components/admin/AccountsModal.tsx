import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { AccountType, Product } from '../../lib/types'
import { addAccounts, deleteAccount, fetchAccounts, markAccountSold, updateAccountCode, type GameAccount } from '../../lib/adminApi'
import { parseLines } from '../../lib/accountLines'
import Modal from './Modal'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'
const MAX_LINES = 200

function AccountRow({ acc, onChange }: { acc: GameAccount; onChange: () => void }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState(acc.verificationCode)
  const [savingCode, setSavingCode] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Correo: ${acc.login}\nClave: ${acc.secret}${acc.verificationCode ? `\nCódigo de verificación: ${acc.verificationCode}` : ''}${acc.notes ? `\n${acc.notes}` : ''}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* el navegador no permitió copiar */
    }
  }

  return (
    <li className={`rounded-lg border border-line p-2.5 text-xs ${acc.status === 'sold' ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-line px-1.5 py-0.5 text-primary shrink-0">
          {acc.type === 'principal' ? 'Principal' : 'Secundaria'}
        </span>
        <span className="truncate flex-1">{acc.login}</span>
        <span className="font-mono">{show ? acc.secret : '••••••••'}</span>
        <button onClick={() => setShow(!show)} aria-label="Ver clave" className="p-1 text-muted hover:text-primary">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={500}
          placeholder="Código de verificación (opcional)"
          autoComplete="off"
          className="flex-1 min-w-0 rounded-lg bg-bg border border-line px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
        />
        {code.trim() !== acc.verificationCode && (
          <button
            disabled={savingCode}
            onClick={async () => {
              setSavingCode(true)
              setCodeError(await updateAccountCode(acc.id, code.trim()))
              setSavingCode(false)
              onChange()
            }}
            className="px-2 py-1.5 rounded-lg border border-primary/60 text-primary disabled:opacity-50"
          >
            {savingCode ? '...' : 'Guardar código'}
          </button>
        )}
      </div>
      {codeError && <p className="text-red-400 mt-1">{codeError}</p>}
      <div className="flex items-center justify-between mt-2">
        <span className="text-muted">{acc.status === 'sold' ? 'Vendida' : 'Disponible'}</span>
        <div className="flex items-center gap-1">
          <button onClick={copy} className="inline-flex items-center gap-1 px-2 py-1 text-muted hover:text-primary">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Copiar datos
          </button>
          {acc.status === 'available' && (
            <button
              onClick={async () => {
                await markAccountSold(acc.id)
                onChange()
              }}
              className="px-2 py-1 text-muted hover:text-primary"
            >
              Marcar vendida
            </button>
          )}
          <button
            onClick={async () => {
              if (!window.confirm('¿Eliminar esta cuenta del inventario?')) return
              await deleteAccount(acc.id)
              onChange()
            }}
            aria-label="Eliminar"
            className="p-1 text-muted hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </li>
  )
}

export default function AccountsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [accounts, setAccounts] = useState<GameAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<AccountType>('principal')
  const [text, setText] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const load = useCallback(() => {
    fetchAccounts(product.id)
      .then(setAccounts)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [product.id])
  useEffect(load, [load])

  const count = (t: AccountType) => accounts.filter((a) => a.type === t && a.status === 'available').length

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    const { rows, bad } = parseLines(text)
    if (rows.length === 0) return setError('Escribe al menos una cuenta con el formato correo:clave.')
    if (rows.length > MAX_LINES) return setError(`Máximo ${MAX_LINES} cuentas por vez.`)
    if (bad > 0) return setError(`${bad} línea(s) no tienen el formato correo:clave (o correo|clave|código). Revísalas.`)
    setSaving(true)
    const err = await addAccounts(product.id, type, rows, notes.trim())
    setSaving(false)
    if (err) return setError(err)
    setText('')
    setInfo(`Se agregaron ${rows.length} cuenta(s).`)
    load()
  }

  return (
    <Modal
      title={`Cuentas · ${product.name}${product.platform ? ` (${product.platform})` : ''}`}
      onClose={onClose}
      formId="accounts-form"
      submitLabel="Agregar cuentas"
      saving={saving}
    >
      <p className="text-sm text-muted">
        Disponibles: <b className="text-ink">{count('principal')}</b> principales ·{' '}
        <b className="text-ink">{count('secundaria')}</b> secundarias
      </p>

      <form id="accounts-form" onSubmit={submit} className="flex flex-col gap-3 mt-4">
        <div className="flex gap-2">
          {(['principal', 'secundaria'] as AccountType[]).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                type === t ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted'
              }`}
            >
              {t === 'principal' ? 'Principal' : 'Secundaria'}
            </button>
          ))}
        </div>
        <div>
          <label className="text-xs text-muted">Una cuenta por línea. Sin código: correo:clave · Con código de verificación: correo|clave|código</label>
          <textarea
            rows={5}
            className={`${inputCls} font-mono`}
            placeholder={'cuenta1@correo.com:clave123\ncuenta2@correo.com|clave456|123456'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <div>
          <label className="text-xs text-muted">Nota para todas (opcional, ej. instrucciones o código de respaldo)</label>
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {info && <p className="text-sm text-primary">{info}</p>}
      </form>

      <h3 className="font-semibold text-sm mt-6 mb-2">Inventario</h3>
      {loading && <p className="text-xs text-muted">Cargando...</p>}
      {!loading && accounts.length === 0 && <p className="text-xs text-muted">Todavía no hay cuentas cargadas.</p>}
      <ul className="flex flex-col gap-2">
        {accounts.map((a) => (
          <AccountRow key={a.id} acc={a} onChange={load} />
        ))}
      </ul>
    </Modal>
  )
}
