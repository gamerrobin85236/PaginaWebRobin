import { useEffect, useRef, useState } from 'react'
import type { Product } from '../lib/types'
import ProductCard from './ProductCard'

interface ProductGridProps {
  products: Product[]
  onAdd: (product: Product) => void
  emptyMessage?: string
}

const PAGE = 24 // tarjetas que se dibujan cada vez

export default function ProductGrid({
  products,
  onAdd,
  emptyMessage = 'No hay productos para mostrar.',
}: ProductGridProps) {
  const [count, setCount] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  // Si cambia la lista (otro filtro, otra búsqueda), se vuelve a empezar desde el principio.
  const signature = `${products.length}:${products[0]?.id ?? ''}`
  useEffect(() => setCount(PAGE), [signature])

  // Al acercarse al final, se dibuja la siguiente tanda. Así 200 productos cargan tan rápido como 24.
  useEffect(() => {
    const el = sentinel.current
    if (!el || count >= products.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setCount((c) => c + PAGE)
      },
      { rootMargin: '800px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [count, products.length])

  if (products.length === 0) {
    return <p className="text-sm text-muted py-10 text-center">{emptyMessage}</p>
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {products.slice(0, count).map((product, i) => (
          <ProductCard key={product.id} product={product} onAdd={onAdd} eager={i < 4} />
        ))}
      </div>
      {count < products.length && (
        <div ref={sentinel} className="py-8 text-center">
          <button onClick={() => setCount((c) => c + PAGE)} className="text-sm text-muted hover:text-primary">
            Ver más productos
          </button>
        </div>
      )}
    </>
  )
}
