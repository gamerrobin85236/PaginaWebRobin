import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { useScrollLock } from '../../hooks/useScrollLock'

interface ModalProps {
  title: string
  onClose: () => void
  formId: string
  submitLabel: string
  saving: boolean
  children: ReactNode
}

// Cuadro con título y botones fijos; solo el contenido del medio se desplaza.
export default function Modal({ title, onClose, formId, submitLabel, saving, children }: ModalProps) {
  useScrollLock()
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-2xl max-h-modal flex flex-col bg-surface border border-line rounded-2xl">
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-line">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button onClick={onClose} disabled={saving} aria-label="Cerrar" className="text-muted hover:text-ink p-2 -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="shrink-0 flex items-center gap-3 px-5 pt-3 pb-safe border-t border-line">
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="rounded-xl bg-primary text-primary-ink font-semibold px-6 py-3 text-sm hover:brightness-110 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : submitLabel}
          </button>
          <button onClick={onClose} disabled={saving} className="text-sm text-muted hover:text-ink px-2 py-3">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
