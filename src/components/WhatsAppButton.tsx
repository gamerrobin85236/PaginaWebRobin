import { useEffect, useRef, useState } from 'react'
import { Phone, X } from 'lucide-react'
import { STORE_CONFIG } from '../config/store'
import { buildWhatsAppLink } from '../utils/whatsapp'

/** Globo de chat moderno (esquinas suaves, cola abajo a la derecha y tres puntos). */
function ChatBubble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 3.5c7.18 0 12.5 4.9 12.5 11.1 0 6.2-5.32 11.1-12.5 11.1-1.38 0-2.7-.18-3.93-.52-.37-.1-.77-.06-1.1.13l-3.72 2.1c-.8.46-1.76-.3-1.5-1.18l.97-3.3c.1-.34.02-.7-.2-.97C4.55 20.9 3.5 18.8 3.5 14.6 3.5 8.4 8.82 3.5 16 3.5Z"
        fill="currentColor"
      />
      <circle cx="10.6" cy="14.7" r="1.7" fill="var(--wa-dot, #04210f)" />
      <circle cx="16" cy="14.7" r="1.7" fill="var(--wa-dot, #04210f)" />
      <circle cx="21.4" cy="14.7" r="1.7" fill="var(--wa-dot, #04210f)" />
    </svg>
  )
}

export default function WhatsAppButton() {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  // Se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} className="fixed right-4 sm:right-5 z-40 flex flex-col items-end gap-3 bottom-[max(1.25rem,env(safe-area-inset-bottom))]">
      {open && (
        <div
          role="dialog"
          aria-label="Líneas de atención"
          className="wa-pop w-[min(88vw,19rem)] rounded-3xl border border-line bg-surface/95 backdrop-blur p-4 shadow-2xl shadow-black/50"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-bold text-base leading-tight">¿Necesitas ayuda?</p>
              <p className="text-xs text-muted mt-0.5">Escríbenos, te respondemos por WhatsApp.</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-muted hover:text-ink -mt-1 -mr-1 p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {STORE_CONFIG.supportLines.map((line) => (
              <li key={line.number} className="flex items-center gap-2 rounded-2xl border border-line bg-bg p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted leading-tight">{line.label}</p>
                  <p className="text-sm font-semibold mt-0.5">{line.display}</p>
                </div>
                <a
                  href={`tel:+${line.number}`}
                  aria-label={`Llamar a la ${line.label.toLowerCase()}`}
                  className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-line text-muted hover:text-primary hover:border-primary/60 transition"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={buildWhatsAppLink(STORE_CONFIG.whatsappDefaultMessage, line.number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-full bg-primary text-primary-ink text-xs font-semibold px-3.5 py-2 hover:brightness-110 transition"
                >
                  Escribir
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Cerrar líneas de atención' : 'Abrir líneas de atención'}
        aria-expanded={open}
        className="wa-fab relative grid place-items-center w-[3.75rem] h-[3.75rem] rounded-[1.35rem] rounded-br-lg text-primary-ink shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
      >
        {!open && <span className="wa-ping" aria-hidden="true" />}
        {open ? <X className="w-6 h-6" /> : <ChatBubble className="w-8 h-8 text-primary-ink" />}
      </button>
    </div>
  )
}
