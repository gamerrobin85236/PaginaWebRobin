import { Link } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import type { Product } from '../lib/types'
import { formatPrice } from '../utils/formatPrice'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  className?: string
}

export default function ProductCard({ product, onAdd, className = '' }: ProductCardProps) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-surface border border-line hover:border-primary/50 transition-colors ${className}`}
    >
      <Link to={`/producto/${product.slug}`} className="flex flex-col flex-1">
        <div className="relative h-44 bg-surface2 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
            />
          ) : (
            <Package className="w-12 h-12 text-muted/50" />
          )}
          {product.platform && (
            <span className="absolute top-2.5 left-2.5 rounded-md bg-bg/80 backdrop-blur px-2 py-0.5 text-[11px] font-semibold text-primary">
              {product.platform}
            </span>
          )}
          {product.featured && (
            <span className="absolute top-2.5 right-2.5 rounded-md bg-accent px-2 py-0.5 text-[11px] font-bold text-primary-ink">
              Destacado
            </span>
          )}
        </div>

        <div className="p-4 flex flex-col gap-1 flex-1">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">{product.name}</h3>
          <div className="mt-auto pt-2">
            <p className="text-base font-bold">{formatPrice(product.price)}</p>
            {product.priceSecondary && (
              <p className="text-xs text-muted">
                Secundaria: {formatPrice(product.priceSecondary)}
              </p>
            )}
          </div>
        </div>
      </Link>

      <button
        onClick={() => onAdd(product)}
        aria-label={`Agregar ${product.name} al carrito`}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-primary text-primary-ink flex items-center justify-center hover:brightness-110 transition"
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  )
}
