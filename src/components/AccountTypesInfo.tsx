import { CheckCircle2, UserRound, Wifi, WifiOff } from 'lucide-react'
import type { AccountType, Product } from '../lib/types'

interface Props {
  product: Product
  selected: AccountType
}

/** Explica al cliente qué cambia entre una cuenta principal y una secundaria. */
export default function AccountTypesInfo({ product, selected }: Props) {
  const hasSecondary = product.priceSecondary != null
  const card = (type: AccountType, title: string, lines: { icon: typeof Wifi; text: string }[]) => (
    <div className={`rounded-xl border p-4 ${hasSecondary && selected === type ? 'border-primary bg-primary/5' : 'border-line bg-surface'}`}>
      <p className="text-sm font-semibold text-primary">{title}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {lines.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-2 text-xs text-muted">
            <Icon className="w-4 h-4 text-primary shrink-0 mt-px" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="mt-6">
      <p className="text-sm font-semibold mb-3">{hasSecondary ? '¿Cuenta principal o secundaria?' : 'Cuenta principal'}</p>
      <div className={`grid gap-3 ${hasSecondary ? 'sm:grid-cols-2' : ''}`}>
        {card('principal', 'Principal', [
          { icon: UserRound, text: 'Juegas desde tu propio perfil.' },
          { icon: WifiOff, text: 'No necesitas conexión a internet para jugar.' },
          { icon: CheckCircle2, text: 'El juego es completo.' },
        ])}
        {hasSecondary &&
          card('secundaria', 'Secundaria', [
            { icon: UserRound, text: 'Juegas desde el perfil que te entregamos.' },
            { icon: Wifi, text: 'Necesitas conexión a internet para jugar.' },
            { icon: CheckCircle2, text: 'El juego es completo.' },
          ])}
      </div>
    </div>
  )
}
