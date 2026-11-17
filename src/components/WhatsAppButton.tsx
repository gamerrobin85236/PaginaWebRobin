import { MessageCircle } from 'lucide-react'
import { STORE_CONFIG } from '../config/store'
import { buildWhatsAppLink } from '../utils/whatsapp'

export default function WhatsAppButton() {
  return (
    <a
      href={buildWhatsAppLink(STORE_CONFIG.whatsappDefaultMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-primary text-primary-ink font-semibold rounded-full pl-4 pr-5 py-3.5 shadow-lg shadow-primary/20 hover:brightness-110 transition"
    >
      <MessageCircle className="w-5 h-5" />
      <span className="hidden sm:inline text-sm">WhatsApp</span>
    </a>
  )
}
