import { Gamepad2, Disc, Crown, Tv, Zap, Gift, Package, type LucideIcon } from 'lucide-react'

// Iconos disponibles para las secciones. La clave es la que se guarda en la base de datos.
export const SECTION_ICONS: Record<string, LucideIcon> = {
  gamepad: Gamepad2,
  disc: Disc,
  crown: Crown,
  tv: Tv,
  zap: Zap,
  gift: Gift,
  package: Package,
}

export function sectionIcon(key: string): LucideIcon {
  return SECTION_ICONS[key] ?? Package
}
