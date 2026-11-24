import { Lock } from 'lucide-react'

// Logos en public/pagos/ (PNG con fondo transparente).
const METHODS = [
  { name: 'Nequi', file: 'nequi', w: 514, h: 120 },
  { name: 'Daviplata', file: 'daviplata', w: 298, h: 160 },
  { name: 'PSE', file: 'pse', w: 159, h: 160 },
  { name: 'Visa', file: 'visa', w: 393, h: 120 },
  { name: 'Mastercard', file: 'mastercard', w: 267, h: 160 },
] as const

export default function PaymentMethods() {
  return (
    <div className="max-w-6xl mx-auto px-5 pb-8">
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted mb-3">
        <Lock className="w-3.5 h-3.5 text-primary" />
        Paga seguro con
      </p>
      <ul className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {METHODS.map((m) => (
          <li
            key={m.file}
            title={m.name}
            className="h-12 w-[6.25rem] sm:h-14 sm:w-28 rounded-xl bg-white shadow-sm shadow-black/30 grid place-items-center px-3"
          >
            <img
              src={`/pagos/${m.file}.png`}
              alt={m.name}
              width={m.w}
              height={m.h}
              loading="lazy"
              decoding="async"
              className="max-h-7 sm:max-h-8 max-w-full w-auto h-auto object-contain"
            />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted text-center mt-3">Pagos procesados por Wompi</p>
    </div>
  )
}
