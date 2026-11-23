import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCatalog } from '../hooks/CatalogContext'
import { useCartContext } from '../hooks/CartContext'
import ProductGrid from '../components/ProductGrid'
import { searchProducts } from '../utils/search'

export default function SearchPage() {
  const [params] = useSearchParams()
  const query = params.get('q') ?? ''
  const { products, sections } = useCatalog()
  const { addItem, setOpen } = useCartContext()

  const { items: results, similar } = useMemo(() => {
    const names = new Map(sections.map((s) => [s.id, s.name]))
    return searchProducts(products, query, (p) => names.get(p.sectionId) ?? '')
  }, [products, sections, query])

  return (
    <div>
      <h1 className="font-display font-bold text-3xl">Resultados para “{query}”</h1>
      <p className="text-muted mt-1">
        {similar
          ? `No encontramos esa búsqueda exacta, pero estos productos se parecen (${results.length}).`
          : `${results.length} producto${results.length === 1 ? '' : 's'} encontrado${results.length === 1 ? '' : 's'}.`}
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
