import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { AccountType, Product } from '../../lib/types'
import { addAccounts, deleteAccount, fetchAccounts, markAccountSold, updateAccountCode, type GameAccount } from '../../lib/adminApi'
import AccountRowsEditor, { emptyAccount, readAccounts, type AccountDraft } from './AccountRowsEditor'
import Modal from './Modal'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

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
  const [drafts, setDrafts] = useState<AccountDraft[]>([emptyAccount()])
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
    const read = readAccounts(drafts)
    if ('error' in read) return setError(read.error)
    if (read.rows.length === 0) return setError('Escribe al menos una cuenta (correo y contraseña).')
    setSaving(true)
    const err = await addAccounts(product.id, read.rows, notes.trim())
    setSaving(false)
    if (err) return setError(err)
    setDrafts([emptyAccount()])
    setInfo(`Se agregaron ${read.rows.length} cuenta(s).`)
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
        <AccountRowsEditor drafts={drafts} onChange={setDrafts} />
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
