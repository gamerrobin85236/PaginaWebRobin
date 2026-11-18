import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Product, Section } from '../lib/types'
import { fetchCatalog } from '../lib/catalogApi'
import { supabaseConfigured } from '../lib/supabase'
import { DEMO_PRODUCTS, DEMO_SECTIONS } from '../data/demo'

interface CatalogValue {
  sections: Section[]
  products: Product[]
  loading: boolean
  error: string | null
  isDemo: boolean
  refresh: () => void
}

const CatalogContext = createContext<CatalogValue | null>(null)

const demoValue: CatalogValue = {
  sections: DEMO_SECTIONS,
  products: DEMO_PRODUCTS,
  loading: false,
  error: null,
  isDemo: true,
  refresh: () => {},
}

type CatalogData = Omit<CatalogValue, 'refresh'>

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogData>(
    supabaseConfigured
      ? { sections: [], products: [], loading: true, error: null, isDemo: false }
      : demoValue,
  )
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    fetchCatalog()
      .then(({ sections, products }) => {
        if (!cancelled) setData({ sections, products, loading: false, error: null, isDemo: false })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error desconocido'
          setData({ sections: [], products: [], loading: false, error: message, isDemo: false })
        }
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  return <CatalogContext.Provider value={{ ...data, refresh }}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>')
  return ctx
}
