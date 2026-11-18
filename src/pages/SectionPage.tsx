import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCatalog } from '../hooks/CatalogContext'
import { useCartContext } from '../hooks/CartContext'
import ProductGrid from '../components/ProductGrid'
import NotFound from './NotFound'

export default function SectionPage() {
  const { slug } = useParams<{ slug: string }>()
  const { sections, products, loading } = useCatalog()
  const { addItem, setOpen } = useCartContext()
  const [platform, setPlatform] = useState<string | null>(null)

  const section = sections.find((s) => s.slug === slug)
  const sectionProducts = useMemo(
    () => products.filter((p) => p.sectionId === section?.id),
    [products, section],
  )
  const platforms = useMemo(
    () => [...new Set(sectionProducts.map((p) => p.platform).filter((p): p is string => !!p))],
    [sectionProducts],
  )

  if (loading) return <p className="text-sm text-muted">Cargando...</p>
  if (!section) return <NotFound />

  const visible = platform ? sectionProducts.filter((p) => p.platform === platform) : sectionProducts

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary">
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      <h1 className="font-display font-bold text-3xl mt-4">{section.name}</h1>
      <p className="text-muted mt-1">{section.description}</p>

      {platforms.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-5">
          <button
            onClick={() => setPlatform(null)}
            className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
              platform === null
                ? 'bg-primary text-primary-ink border-primary'
                : 'border-line text-muted hover:text-ink'
            }`}
          >
            Todos
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(platform === p ? null : p)}
              className={`rounded-full px-4 py-1.5 text-sm border transition-colors ${
                platform === p
                  ? 'bg-primary text-primary-ink border-primary'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <ProductGrid
          products={visible}
          emptyMessage="Todavía no hay productos en esta sección."
          onAdd={(p) => {
            addItem(p)
            setOpen(true)
          }}
        />
      </div>
    </div>
  )
}
