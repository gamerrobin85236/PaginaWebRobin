import { useEffect, useState } from 'react'
import type { Product, Section } from '../../lib/types'
import { fetchAdminProducts, fetchAdminSections } from '../../lib/adminApi'
import { sectionIcon } from '../../lib/icons'
import { KIND_SHORT } from '../../lib/kinds'

export default function AdminDashboard({ onOpen, onSettings }: { onOpen: (s: Section) => void; onSettings: () => void }) {
  const [sections, setSections] = useState<Section[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchAdminSections(), fetchAdminProducts()])
      .then(([s, p]) => {
        setSections(s)
        setProducts(p)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-muted">Cargando...</p>
  if (error) return <p className="text-sm text-red-400">{error}</p>

  if (sections.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aún no hay categorías.{' '}
        <button onClick={onSettings} className="text-primary underline">
          Crea la primera
        </button>
        .
      </p>
    )
  }

  return (
    <div>
      <p className="text-sm text-muted mb-4">Elige una categoría para administrar sus productos.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => {
          const Icon = sectionIcon(s.icon)
          const mine = products.filter((p) => p.sectionId === s.id)
          const soldOut = s.kind === 'physical' ? mine.filter((p) => p.stock === 0).length : 0
          const hidden = mine.filter((p) => !p.available).length
          return (
            <button
              key={s.id}
              onClick={() => onOpen(s)}
              className="text-left rounded-2xl border border-line bg-surface p-5 hover:border-primary/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg truncate">{s.name}</p>
                  <p className="text-xs text-primary">{KIND_SHORT[s.kind]}</p>
                </div>
              </div>
              <p className="text-sm text-muted mt-4">
                {mine.length} producto{mine.length === 1 ? '' : 's'}
                {soldOut > 0 && <span className="text-red-400"> · {soldOut} agotado{soldOut === 1 ? '' : 's'}</span>}
                {hidden > 0 && ` · ${hidden} oculto${hidden === 1 ? '' : 's'}`}
                {!s.active && ' · Sección oculta'}
              </p>
              {s.kind === 'generic' && (
                <p className="text-xs text-muted mt-2">
                  Tip: en "Configurar secciones" elige el tipo para tener un formulario a la medida.
                </p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
