import { MessageCircle, ShieldCheck } from 'lucide-react'
import { STORE_CONFIG } from '../config/store'
import type { Product } from '../lib/types'
import { buildWhatsAppLink } from '../utils/whatsapp'

/** Las cuentas de PlayStation piden un código de verificación al iniciar sesión. */
export const isPlayStation = (p: Product): boolean => /\b(ps\s?[1-5]|playstation)\b/i.test(p.platform ?? '')

export default function VerificationHelp({ product }: { product: Product }) {
  const message = `Hola, compré *${product.name}*${
    product.platform ? ` (${product.platform})` : ''
  } y el código de verificación de la cuenta no me funcionó. ¿Me pueden ayudar?`

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
        Código de verificación incluido
      </p>
      <p className="text-xs text-muted mt-2">
        Las cuentas de PlayStation piden un código de verificación al iniciar sesión. Te lo entregamos junto con la
        cuenta. Si el código no te funciona, escríbenos a nuestra línea de atención y te ayudamos al momento.
      </p>
      <a
        href={buildWhatsAppLink(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/60 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        <MessageCircle className="w-4 h-4" />
        ¿No te funcionó el código? Escribe a la línea de atención ({STORE_CONFIG.phoneDisplay})
      </a>
    </div>
  )
}
