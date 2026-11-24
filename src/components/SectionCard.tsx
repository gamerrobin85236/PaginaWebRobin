import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Section } from '../lib/types'
import { sectionIcon } from '../lib/icons'

interface SectionCardProps {
  section: Section
  productCount: number
}

export default function SectionCard({ section, productCount }: SectionCardProps) {
  const Icon = sectionIcon(section.icon)

  return (
    <Link
      to={`/seccion/${section.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-surface border border-line hover:border-primary/50 transition-colors"
    >
      <div className="relative isolate h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-primary/25 via-surface2 to-surface">
        {section.coverUrl ? (
          <img
            src={section.coverUrl}
            alt={section.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : section.kind === 'digital' ? (
          // Imagen de consolas en tono verde de la tienda, que se funde hacia abajo con la tarjeta.
          <>
            <img
              src="/banners/consolas.webp"
              alt=""
              aria-hidden="true"
              width={1088}
              height={606}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 opacity-70 blur-[1.5px] scale-105 group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-primary/40 mix-blend-color" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-16 h-16 text-primary/70 group-hover:scale-110 transition-transform duration-300" />
          </div>
        )}
        <span className="absolute top-3 left-3 w-9 h-9 rounded-full bg-bg/70 backdrop-blur flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </span>
      </div>

      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-display font-bold text-xl leading-tight">{section.name}</h3>
          <p className="text-sm text-muted mt-1 line-clamp-2">{section.description}</p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {productCount} producto{productCount === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Activa
          </span>
        </div>

        <span className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-surface2 group-hover:bg-primary group-hover:text-primary-ink py-2.5 text-sm font-semibold transition-colors">
          Ingresar
          <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}
