import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from '../hooks/CatalogContext'
import { useCartContext } from '../hooks/CartContext'
import ProductGrid from '../components/ProductGrid'
import { matchesSearch } from '../utils/search'

export default function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const { products } = useCatalog()
  const { addItem, setOpen } = useCartContext()

  const results = useMemo(
    () => products.filter((p) => matchesSearch(`${p.name} ${p.platform ?? ''}`, query)),
    [products, query],
  )

  return (
    <div>
      <h1 className="font-display font-bold text-3xl">Resultados para “{query}”</h1>
      <p className="text-muted mt-1">
        {results.length} producto{results.length === 1 ? '' : 's'} encontrado
        {results.length === 1 ? '' : 's'}.
      </p>
      <div className="mt-6">
        <ProductGrid
          products={results}
          emptyMessage="No encontramos nada con esa búsqueda. Prueba con otra palabra."
          onAdd={(p) => {
            addItem(p)
            setOpen(true)
          }}
        />
      </div>
    </div>
  )
}
