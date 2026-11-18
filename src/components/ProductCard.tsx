import { Link } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import type { Product } from '../lib/types'
import { formatPrice } from '../utils/formatPrice'
import { hasOptions, isSoldOut } from '../utils/pricing'
import ProductImage from './ProductImage'

interface ProductCardProps {
  product: Product
  onAdd: (product: Product) => void
  className?: string
  eager?: boolean
}

export default function ProductCard({ product, onAdd, className = '', eager = false }: ProductCardProps) {
  const withOptions = hasOptions(product)
  const soldOut = isSoldOut(product)
  return (
    <div
      className={`card-cv group relative flex flex-col overflow-hidden rounded-2xl bg-surface border border-line hover:border-primary/50 transition-colors ${className}`}
    >
      <Link to={`/producto/${product.slug}`} className="flex flex-col flex-1">
        <div className="relative h-44 bg-surface2 flex items-center justify-center overflow-hidden">
          {product.imageUrl ? (
            <ProductImage
              url={product.imageUrl}
              alt={product.name}
              eager={eager}
              width={300}
              height={176}
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
          {soldOut && (
            <span className="absolute bottom-2.5 left-2.5 rounded-md bg-danger px-2 py-0.5 text-[11px] font-bold text-white">
              Agotado
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
            <p className="text-base font-bold">
              {withOptions && <span className="text-xs font-normal text-muted">Desde </span>}
              {formatPrice(product.price)}
            </p>
            {product.stock !== undefined && product.stock > 0 && product.stock <= 3 && (
              <p className="text-xs text-accent">Quedan {product.stock}</p>
            )}
            {product.priceSecondary && (
              <p className="text-xs text-muted">
                Secundaria: {formatPrice(product.priceSecondary)}
              </p>
            )}
          </div>
        </div>
      </Link>

      {soldOut ? null : withOptions ? (
        <Link
          to={`/producto/${product.slug}`}
          aria-label={`Ver opciones de ${product.name}`}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-primary text-primary-ink flex items-center justify-center hover:brightness-110 transition"
        >
          <Plus className="w-5 h-5" />
        </Link>
      ) : (
        <button
          onClick={() => onAdd(product)}
          aria-label={`Agregar ${product.name} al carrito`}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-primary text-primary-ink flex items-center justify-center hover:brightness-110 transition"
        >
          <Plus className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
