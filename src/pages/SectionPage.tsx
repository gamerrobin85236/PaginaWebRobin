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

      {section.kind === 'digital' ? (
        // Banner suave: la imagen queda difuminada y se funde con el fondo para que el título se lea bien.
        <div className="relative mt-4 overflow-hidden rounded-2xl border border-line isolate">
          <img
            src="/banners/consolas.webp"
            alt=""
            aria-hidden="true"
            width={1088}
            height={606}
            decoding="async"
            className="absolute inset-0 -z-10 w-full h-full object-cover scale-110 blur-[3px] opacity-60"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-bg/90 via-bg/55 to-bg/20" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-1/2 bg-gradient-to-t from-bg to-transparent" />
          <div className="px-5 py-8 sm:px-8 sm:py-12 max-w-xl">
            <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight">{section.name}</h1>
            <p className="text-ink/80 mt-2 text-sm sm:text-base">{section.description}</p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="font-display font-bold text-3xl mt-4">{section.name}</h1>
          <p className="text-muted mt-1">{section.description}</p>
        </>
      )}

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
