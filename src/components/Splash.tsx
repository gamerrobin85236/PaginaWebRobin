import { useEffect, useState } from 'react'

// Pantalla de bienvenida: el logo de Robin con su barra "LOADING..." que se llena de verdad.
// Dura un par de segundos, solo en la primera visita de cada sesión (no estorba al navegar).
// Mientras tanto la tienda ya está cargando por detrás, así que no se pierde tiempo.
const SEEN_KEY = 'gr_splash_seen'
const SHOW_MS = 1800 // tiempo que se ve la animación
const SHOW_MS_REDUCED = 500 // si la persona prefiere menos movimiento
const FADE_MS = 450

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export default function Splash() {
  const [phase, setPhase] = useState<'show' | 'hide' | 'gone'>(() => (alreadySeen() ? 'gone' : 'show'))
  const reduced =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (phase === 'gone') return
    const showMs = reduced ? SHOW_MS_REDUCED : SHOW_MS
    const hide = window.setTimeout(() => setPhase('hide'), showMs)
    const gone = window.setTimeout(() => {
      setPhase('gone')
      try {
        sessionStorage.setItem(SEEN_KEY, '1')
      } catch {
        /* sin almacenamiento: simplemente se verá de nuevo en la próxima visita */
      }
    }, showMs + FADE_MS)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(gone)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      role="status"
      aria-label="Cargando Gamer Robin"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
      style={{
        opacity: phase === 'hide' ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: phase === 'hide' ? 'none' : 'auto',
      }}
    >
      {/* Resplandor verde que respira detrás del logo */}
      <div className="splash-glow absolute w-[min(90vw,520px)] aspect-square rounded-full" />

      <div className="splash-pop relative w-[min(68vw,320px)] aspect-square">
        <img src="/logo.png" alt="" width={512} height={512} className="w-full h-full select-none" draggable={false} />

        {/* Tapa la barra del logo original y dibuja encima una que se llena de izquierda a derecha */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: '32.6%',
            top: '72.6%',
            width: '34%',
            height: '3.2%',
            background: 'rgb(106 168 97)',
          }}
        >
          <div
            className="splash-fill absolute rounded-[2px]"
            style={{
              left: '1.5%',
              top: '18%',
              width: '97%',
              height: '64%',
              background: 'rgb(246 250 246)',
              boxShadow: '0 0 0 1px rgb(10 25 10 / 0.55)',
              animationDuration: `${reduced ? 1 : SHOW_MS - 250}ms`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
