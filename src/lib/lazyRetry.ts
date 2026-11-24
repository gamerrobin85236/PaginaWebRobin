import { lazy, type ComponentType } from 'react'

const FLAG = 'gr_chunk_reload'

/**
 * Como `lazy`, pero si la descarga de la pantalla falla (internet lento, o la página se actualizó
 * mientras estaba abierta) reintenta y, como último recurso, recarga la página una sola vez.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    let lastError: unknown
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const mod = await load()
        try {
          sessionStorage.removeItem(FLAG)
        } catch {
          /* sin almacenamiento */
        }
        return mod
      } catch (e) {
        lastError = e
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      }
    }
    try {
      if (!sessionStorage.getItem(FLAG)) {
        sessionStorage.setItem(FLAG, '1')
        window.location.reload()
        return await new Promise<never>(() => undefined) // espera a que recargue
      }
    } catch {
      /* sin almacenamiento */
    }
    throw lastError
  })
}
