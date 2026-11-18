import { useState } from 'react'

// Logos oficiales: se guardan en public/pagos/ con estos nombres (PNG o SVG con fondo transparente).
// Mientras un archivo no exista, se muestra el nombre en texto.
const METHODS = [
  { name: 'Nequi', file: 'nequi' },
  { name: 'Daviplata', file: 'daviplata' },
  { name: 'Visa', file: 'visa' },
  { name: 'PSE', file: 'pse' },
] as const

function Method({ name, file }: { name: string; file: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <li
      title={name}
      className="h-10 min-w-[4.5rem] px-3 rounded-lg bg-white flex items-center justify-center"
    >
      {failed ? (
        <span className="text-xs font-bold text-neutral-800">{name}</span>
      ) : (
        <img
          src={`/pagos/${file}.png`}
          alt={name}
          loading="lazy"
          decoding="async"
          height={24}
          className="h-6 w-auto max-w-[5.5rem] object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </li>
  )
}

export default function PaymentMethods() {
  return (
    <div className="max-w-6xl mx-auto px-5 pb-8">
      <p className="text-xs text-muted text-center mb-3">Medios de pago</p>
      <ul className="flex flex-wrap items-center justify-center gap-3">
        {METHODS.map((m) => (
          <Method key={m.file} {...m} />
        ))}
      </ul>
    </div>
  )
}
