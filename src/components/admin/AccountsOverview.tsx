import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import type { Product } from '../../lib/types'
import type { AccountCounts } from '../../lib/adminApi'
import { isPlayStation } from '../VerificationHelp'

const ZERO = { principal: 0, secundaria: 0, sinCodigo: 0 }

/** Qué le falta a un juego digital de entrega automática. */
export function pendingFor(p: Product, counts: AccountCounts): string[] {
  if (p.fulfillment !== 'auto') return []
  const c = counts.get(p.id) ?? ZERO
  const out: string[] = []
  if (c.principal === 0) out.push('Sin cuentas principales: nadie puede comprarlo')
  if (p.priceSecondary != null && c.secundaria === 0) out.push('Sin cuentas secundarias')
  if (isPlayStation(p) && c.sinCodigo > 0) {
    out.push(`${c.sinCodigo} cuenta${c.sinCodigo === 1 ? '' : 's'} sin código de verificación`)
  }
  return out
}

interface Props {
  products: Product[]
  counts: AccountCounts
  onManage: (p: Product) => void
}

/** Panel para Robin: qué juegos necesitan que cargue o complete cuentas (correo, contraseña o código). */
export default function AccountsOverview({ products, counts, onManage }: Props) {
  const auto = products.filter((p) => p.fulfillment === 'auto')
  const manual = products.filter((p) => p.fulfillment !== 'auto')
  const pending = auto.filter((p) => pendingFor(p, counts).length > 0)
  const ok = auto.filter((p) => pendingFor(p, counts).length === 0)

  const row = (p: Product, issues: string[]) => {
    const c = counts.get(p.id) ?? ZERO
    return (
      <li key={p.id}>
        <button
          onClick={() => onManage(p)}
          className="w-full text-left flex items-center gap-3 rounded-xl border border-line bg-surface hover:border-primary/60 px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">
              {p.name}
              {p.platform && <span className="ml-2 rounded-md border border-line px-1.5 py-0.5 text-[11px] text-primary">{p.platform}</span>}
            </p>
            <p className="text-xs text-muted mt-0.5">
              Principales {c.principal}
              {p.priceSecondary != null && ` · Secundarias ${c.secundaria}`}
            </p>
            {issues.map((t) => (
              <p key={t} className="text-xs text-amber-400 mt-0.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {t}
              </p>
            ))}
          </div>
          <span className="text-xs font-semibold text-primary shrink-0 inline-flex items-center gap-0.5">
            {issues.length > 0 ? 'Completar' : 'Ver'} <ChevronRight className="w-4 h-4" />
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs text-muted max-w-xl">
        Aquí ves qué juegos de entrega automática necesitan que cargues o completes cuentas (correo, contraseña o código de
        verificación). Toca un juego para abrir sus cuentas.
      </p>

      <section>
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" /> Por completar ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Todo al día: no hay nada pendiente.</p>
        ) : (
          <ul className="flex flex-col gap-2">{pending.map((p) => row(p, pendingFor(p, counts)))}</ul>
        )}
      </section>

      {ok.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Al día ({ok.length})
          </h3>
          <ul className="flex flex-col gap-2">{ok.map((p) => row(p, []))}</ul>
        </section>
      )}

      {manual.length > 0 && (
        <section>
          <h3 className="font-semibold text-sm mb-1">Entrega manual ({manual.length})</h3>
          <p className="text-xs text-muted">
            Estos juegos no usan cuentas cargadas: tú envías la cuenta por WhatsApp.
          </p>
          <p className="text-xs text-muted mt-1">{manual.map((p) => `${p.name}${p.platform ? ` (${p.platform})` : ''}`).join(' · ')}</p>
        </section>
      )}

      {auto.length === 0 && manual.length === 0 && <p className="text-sm text-muted">Todavía no hay juegos en esta categoría.</p>}
    </div>
  )
}
