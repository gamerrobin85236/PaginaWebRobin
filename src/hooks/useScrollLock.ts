import { useEffect } from 'react'

/** Mientras `locked` sea true, la página de atrás no se desplaza (ventanas y menús abiertos en el celular). */
export function useScrollLock(locked = true): void {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}
