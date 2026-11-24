// DATOS DE EJEMPLO. Sirven para ver cómo queda la tienda antes de conectar
// la base de datos. Cuando Supabase esté configurado, se reemplazan por los
// productos reales que Robin cargue desde su panel.
import type { Product, Section } from '../lib/types'

export const DEMO_SECTIONS: Section[] = [
  {
    id: 's1',
    slug: 'videojuegos-digitales',
    name: 'Videojuegos digitales',
    description: 'Cuentas principales y secundarias para PS5, PS4, Xbox y Switch.',
    icon: 'gamepad',
    kind: 'digital',
    active: true,
    position: 1,
  },
  {
    id: 's2',
    slug: 'fisicos-y-consolas',
    name: 'Físicos y consolas',
    description: 'Juegos físicos, consolas y accesorios con envío a todo el país.',
    icon: 'disc',
    kind: 'physical',
    active: true,
    position: 2,
  },
  {
    id: 's3',
    slug: 'ps-plus-game-pass',
    name: 'PS Plus y Game Pass',
    description: 'Suscripciones para jugar online y acceder a catálogos de juegos.',
    icon: 'crown',
    kind: 'subscription',
    active: true,
    position: 3,
  },
  {
    id: 's4',
    slug: 'combos-streaming',
    name: 'Combos streaming',
    description: 'Cuentas de plataformas de series y películas.',
    icon: 'tv',
    kind: 'streaming',
    active: true,
    position: 4,
  },
  {
    id: 's5',
    slug: 'gift-cards',
    name: 'Gift cards',
    description: 'Saldo para Xbox, Nintendo eShop y más.',
    icon: 'gift',
    kind: 'streaming',
    active: true,
    position: 5,
  },
]

function demo(
  n: number,
  sectionId: string,
  name: string,
  price: number,
  extra: Partial<Product> = {},
): Product {
  return {
    id: `p${n}`,
    sectionId,
    name,
    slug: `ejemplo-${n}`,
    description: 'Producto de ejemplo. La descripción real la escribe el administrador.',
    price,
    featured: false,
    available: true,
    buyMode: 'whatsapp',
    position: n,
    ...extra,
  }
}

export const DEMO_PRODUCTS: Product[] = [
  demo(1, 's1', 'Videojuego de ejemplo 1', 80000, { platform: 'PS5', priceSecondary: 60000, featured: true }),
  demo(2, 's1', 'Videojuego de ejemplo 2', 90000, { platform: 'PS5', priceSecondary: 65000, featured: true }),
  demo(3, 's1', 'Videojuego de ejemplo 3', 70000, { platform: 'PS4', priceSecondary: 50000 }),
  demo(4, 's1', 'Videojuego de ejemplo 4', 85000, { platform: 'Switch', priceSecondary: 60000 }),
  demo(5, 's2', 'Consola de ejemplo', 1800000, { platform: 'PS5', featured: true }),
  demo(6, 's2', 'Juego físico de ejemplo', 160000, { platform: 'PS4' }),
  demo(7, 's3', 'Suscripción de ejemplo (1 mes)', 45000, { platform: 'PS5', buyMode: 'online', featured: true }),
  demo(8, 's3', 'Suscripción de ejemplo (3 meses)', 120000, { platform: 'Xbox', buyMode: 'online' }),
  demo(9, 's4', 'Combo streaming de ejemplo', 25000),
  demo(10, 's5', 'Oferta de ejemplo', 49000, { platform: 'PS5', priceSecondary: 35000, featured: true }),
]
