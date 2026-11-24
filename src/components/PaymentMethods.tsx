import { Lock } from 'lucide-react'

// Logos en public/pagos/ (PNG con fondo transparente). La altura de cada uno se ajusta
// para que todos se vean del mismo peso visual (los más anchos más bajos, los cuadrados más altos).
const METHODS = [
  { name: 'Nequi', file: 'nequi', w: 514, h: 120, cls: 'h-5 sm:h-6' },
  { name: 'Daviplata', file: 'daviplata', w: 298, h: 160, cls: 'h-8 sm:h-9' },
  { name: 'PSE', file: 'pse', w: 159, h: 160, cls: 'h-8 sm:h-9' },
  { name: 'Visa', file: 'visa', w: 393, h: 120, cls: 'h-5 sm:h-6' },
  { name: 'Mastercard', file: 'mastercard', w: 267, h: 160, cls: 'h-8 sm:h-9' },
] as const

export default function PaymentMethods() {
  return (
    <div className="max-w-6xl mx-auto px-5 pb-8">
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted mb-3">
        <Lock className="w-3.5 h-3.5 text-primary" />
        Paga seguro con
      </p>
      {/* Una sola franja clara con todos los logos: así se ven con sus colores reales sobre el fondo oscuro */}
      <ul className="mx-auto w-fit max-w-full flex flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:gap-x-8 rounded-2xl bg-slate-100 px-5 py-3.5 sm:px-8 sm:py-4 shadow-lg shadow-black/30">
        {METHODS.map((m) => (
          <li key={m.file} title={m.name} className="flex items-center">
            <img
              src={`/pagos/${m.file}.png`}
              alt={m.name}
              width={m.w}
              height={m.h}
              loading="lazy"
              decoding="async"
              className={`${m.cls} w-auto object-contain`}
            />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted text-center mt-3">Pagos procesados por Wompi</p>
    </div>
  )
}
