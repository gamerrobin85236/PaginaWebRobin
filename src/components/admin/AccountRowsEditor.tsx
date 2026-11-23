import { Plus, Trash2 } from 'lucide-react'
import type { AccountType } from '../../lib/types'

export interface AccountDraft {
  type: AccountType
  login: string
  secret: string
  code: string
}

export const emptyAccount = (type: AccountType = 'principal'): AccountDraft => ({ type, login: '', secret: '', code: '' })

const MAX_ACCOUNTS = 200
const fieldCls =
  'w-full rounded-lg bg-bg border border-line px-2.5 py-2 text-sm focus:outline-none focus:border-primary'

/** Quita las filas vacías y revisa que las demás estén completas. Devuelve las cuentas listas o un mensaje de error. */
export function readAccounts(drafts: AccountDraft[]): { rows: AccountDraft[] } | { error: string } {
  const rows: AccountDraft[] = []
  for (let i = 0; i < drafts.length; i++) {
    const d = { ...drafts[i], login: drafts[i].login.trim(), secret: drafts[i].secret.trim(), code: drafts[i].code.trim() }
    if (!d.login && !d.secret && !d.code) continue
    if (!d.login || !d.secret) return { error: `La cuenta ${i + 1} necesita correo y contraseña.` }
    rows.push(d)
  }
  if (rows.length > MAX_ACCOUNTS) return { error: `Máximo ${MAX_ACCOUNTS} cuentas por vez.` }
  return { rows }
}

export function countByType(drafts: AccountDraft[]): Record<AccountType, number> {
  const filled = drafts.filter((d) => d.login.trim() && d.secret.trim())
  return {
    principal: filled.filter((d) => d.type === 'principal').length,
    secundaria: filled.filter((d) => d.type === 'secundaria').length,
  }
}

interface Props {
  drafts: AccountDraft[]
  onChange: (next: AccountDraft[]) => void
}

/** Formulario de cuentas: una tarjeta por cuenta con tipo, correo, contraseña y código, y un "+" para agregar más. */
export default function AccountRowsEditor({ drafts, onChange }: Props) {
  const set = (i: number, patch: Partial<AccountDraft>) => onChange(drafts.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  const counts = countByType(drafts)

  return (
    <div className="flex flex-col gap-3">
      {drafts.map((d, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted">Cuenta {i + 1}</p>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-line overflow-hidden text-xs">
                {(['principal', 'secundaria'] as AccountType[]).map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => set(i, { type: t })}
                    className={`px-3 py-1.5 ${d.type === t ? 'bg-primary text-primary-ink font-semibold' : 'text-muted'}`}
                  >
                    {t === 'principal' ? 'Principal' : 'Secundaria'}
                  </button>
                ))}
              </div>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(drafts.filter((_, j) => j !== i))}
                  aria-label={`Quitar cuenta ${i + 1}`}
                  className="p-1.5 text-muted hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="text-[11px] text-muted">Correo</label>
              <input
                className={fieldCls}
                type="text"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="correo@gmail.com"
                value={d.login}
                onChange={(e) => set(i, { login: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted">Contraseña</label>
              <input
                className={`${fieldCls} font-mono`}
                type="text"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Contraseña de la cuenta"
                value={d.secret}
                onChange={(e) => set(i, { secret: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-muted">Código de verificación de 2 pasos (opcional)</label>
            <input
              className={`${fieldCls} font-mono`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Ej. 123456"
              value={d.code}
              onChange={(e) => set(i, { code: e.target.value })}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...drafts, emptyAccount(drafts[drafts.length - 1]?.type ?? 'principal')])}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/60 py-2.5 text-sm font-semibold text-primary hover:bg-primary/10"
      >
        <Plus className="w-4 h-4" /> Agregar otra cuenta
      </button>

      <p className="text-xs text-muted">
        Por cargar: <b className="text-ink">{counts.principal}</b> principal{counts.principal === 1 ? '' : 'es'} ·{' '}
        <b className="text-ink">{counts.secundaria}</b> secundaria{counts.secundaria === 1 ? '' : 's'}
      </p>
    </div>
  )
}
