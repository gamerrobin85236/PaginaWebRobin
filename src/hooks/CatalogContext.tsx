import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { Product, Section } from '../lib/types'
import { DEMO_PRODUCTS, DEMO_SECTIONS } from '../data/demo'

interface CatalogValue {
  sections: Section[]
  products: Product[]
  loading: boolean
  isDemo: boolean
}

const CatalogContext = createContext<CatalogValue | null>(null)

// Por ahora el catálogo sale de datos de ejemplo. En la siguiente fase aquí se
// leerán las tablas "sections" y "products" de Supabase; el resto de la página
// no necesita cambios.
export function CatalogProvider({ children }: { children: ReactNode }) {
  const value = useMemo<CatalogValue>(
    () => ({
      sections: DEMO_SECTIONS.filter((s) => s.active).sort((a, b) => a.position - b.position),
      products: DEMO_PRODUCTS.filter((p) => p.available).sort((a, b) => a.position - b.position),
      loading: false,
      isDemo: true,
    }),
    [],
  )
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>')
  return ctx
}
