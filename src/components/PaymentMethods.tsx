import { useState } from 'react'
import { CreditCard, Landmark, Lock, ShieldCheck, Smartphone, type LucideIcon } from 'lucide-react'

// Logos oficiales: se guardan en public/pagos/ con estos nombres (PNG con fondo transparente).
// Mientras un archivo no exista, la tarjeta muestra un ícono y el nombre.
const METHODS: { name: string; detail: string; file: string; Icon: LucideIcon }[] = [
  { name: 'Nequi', detail: 'Desde tu celular', file: 'nequi', Icon: Smartphone },
  { name: 'Daviplata', detail: 'Desde tu celular', file: 'daviplata', Icon: Smartphone },
  { name: 'Tarjetas', detail: 'Débito y crédito', file: 'visa', Icon: CreditCard },
  { name: 'PSE', detail: 'Débito desde tu banco', file: 'pse', Icon: Landmark },
]

function Method({ name, detail, file, Icon }: (typeof METHODS)[number]) {
  const [failed, setFailed] = useState(false)
  return (
    <li className="group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-surface2/60 px-3 py-3 text-center transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface2">
      {failed ? (
        <span className="flex items-center gap-2 h-9">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary/15 text-primary">
            <Icon className="w-4 h-4" />
          </span>
          <span className="font-display font-bold text-sm">{name}</span>
        </span>
      ) : (
        <span className="grid place-items-center h-9 w-full rounded-lg bg-white px-3">
          <img
            src={`/pagos/${file}.png`}
            alt={name}
            loading="lazy"
            decoding="async"
            height={24}
            className="h-6 w-auto max-w-full object-contain"
            onError={() => setFailed(true)}
          />
        </span>
      )}
      <span className="text-[11px] text-muted leading-none">{detail}</span>
    </li>
  )
}

export default function PaymentMethods() {
  return (
    <div className="max-w-6xl mx-auto px-5 pb-8">
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="flex items-center gap-2 font-display font-bold">
            <Lock className="w-4 h-4 text-primary" /> Medios de pago
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            Pago seguro y cifrado, procesado por Wompi
          </p>
        </div>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {METHODS.map((m) => (
            <Method key={m.file} {...m} />
          ))}
        </ul>
      </div>
    </div>
  )
}
