import { Instagram, Facebook, MapPin, Phone } from 'lucide-react'
import { STORE_CONFIG } from '../config/store'
import PaymentMethods from './PaymentMethods'

export default function Footer() {
  return (
    <footer className="border-t border-line mt-16">
      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-8 md:grid-cols-2">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt={STORE_CONFIG.name} className="w-12 h-12 rounded-lg object-cover" />
          <div>
            <p className="font-display font-bold text-lg leading-none">{STORE_CONFIG.name}</p>
            <p className="text-xs text-muted mt-1">{STORE_CONFIG.tagline}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-muted">
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
            {STORE_CONFIG.address}
          </p>
          <p className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary shrink-0" />
            {STORE_CONFIG.phoneDisplay}
          </p>
          <div className="flex items-center gap-4 pt-1">
            <a
              href={STORE_CONFIG.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="hover:text-primary transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href={STORE_CONFIG.socials.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="hover:text-primary transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
      <PaymentMethods />
      <p className="text-center text-xs text-muted pb-8">
        © {new Date().getFullYear()} {STORE_CONFIG.name}. Todos los derechos reservados.
      </p>
    </footer>
  )
}
