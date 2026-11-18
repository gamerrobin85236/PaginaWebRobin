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

// Copia local del catálogo: en la siguiente visita la tienda aparece al instante
// y se actualiza en segundo plano con lo último de la base de datos.
const CACHE_KEY = 'gr_catalog_v1'

function readCache(): CatalogData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { sections: Section[]; products: Product[] }
    if (!Array.isArray(parsed.sections) || !Array.isArray(parsed.products)) return null
    return { sections: parsed.sections, products: parsed.products, loading: false, error: null, isDemo: false }
  } catch {
    return null
  }
}

function writeCache(sections: Section[], products: Product[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ sections, products }))
  } catch {
    /* sin espacio o bloqueado: no pasa nada */
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CatalogData>(
    supabaseConfigured
      ? (readCache() ?? { sections: [], products: [], loading: true, error: null, isDemo: false })
      : demoValue,
  )
  const [tick, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    fetchCatalog()
      .then(({ sections, products }) => {
        if (cancelled) return
        setData({ sections, products, loading: false, error: null, isDemo: false })
        writeCache(sections, products)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Error desconocido'
          // Si ya había una copia guardada, se sigue mostrando (aunque no haya internet).
          setData((prev) =>
            prev.sections.length > 0
              ? { ...prev, loading: false }
              : { sections: [], products: [], loading: false, error: message, isDemo: false },
          )
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
