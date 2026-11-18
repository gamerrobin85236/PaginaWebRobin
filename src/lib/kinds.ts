import type { SectionKind } from './types'

export const KIND_LABEL: Record<SectionKind, string> = {
  digital: 'Videojuegos digitales',
  physical: 'Físicos y consolas (con cantidad)',
  streaming: 'Streaming (Netflix, Disney...)',
  subscription: 'Suscripciones por tiempo',
  generic: 'General',
}

export const KIND_SHORT: Record<SectionKind, string> = {
  digital: 'Digitales',
  physical: 'Con cantidad',
  streaming: 'Streaming',
  subscription: 'Suscripciones',
  generic: 'General',
}

export const KIND_HELP: Record<SectionKind, string> = {
  digital: 'Cada juego se sube para una o varias plataformas, con precio de cuenta principal y secundaria.',
  physical: 'Cada producto lleva su precio y cuántas unidades hay. Al llegar a 0 se muestra "Agotado".',
  streaming: 'Cada servicio tiene sus opciones con precio (por ejemplo perfil o cuenta completa).',
  subscription: 'Cada suscripción tiene sus planes por tiempo y el cliente elige uno; el precio sale solo.',
  generic: 'Productos con un precio simple.',
}

export const PLATFORMS = ['PS4', 'PS5', 'Nintendo Switch', 'Xbox'] as const
