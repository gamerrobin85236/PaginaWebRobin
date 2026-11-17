import { useCatalog } from '../hooks/CatalogContext'
import { useCartContext } from '../hooks/CartContext'
import SectionCard from '../components/SectionCard'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const { sections, products } = useCatalog()
  const { addItem, setOpen } = useCartContext()

  const featured = products.filter((p) => p.featured)

  return (
    <div className="flex flex-col gap-12">
      <section>
        <h1 className="font-display font-bold text-3xl">¡Bienvenido! 👋</h1>
        <p className="text-muted mt-1">Elige la categoría que deseas explorar.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              productCount={products.filter((p) => p.sectionId === section.id).length}
            />
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section>
          <h2 className="font-display font-bold text-2xl">Más vendidos</h2>
          <p className="text-muted text-sm mt-1">Selección destacada por el equipo.</p>

          <div className="scroll-row mt-5 flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                className="w-48 sm:w-52 shrink-0 snap-start"
                onAdd={(p) => {
                  addItem(p)
                  setOpen(true)
                }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
