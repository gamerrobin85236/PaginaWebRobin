import type { Product } from '../lib/types'
import ProductCard from './ProductCard'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product) => void
  emptyMessage?: string
}

export default function ProductGrid({
  products,
  onAdd,
  emptyMessage = 'No hay productos para mostrar.',
}: ProductGridProps) {
  if (products.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">{emptyMessage}</p>
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  )
}
