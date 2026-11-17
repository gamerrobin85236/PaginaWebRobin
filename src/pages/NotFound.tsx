import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display font-bold text-3xl">No encontramos esta página</h1>
      <p className="text-muted mt-2">Puede que el enlace esté mal o que el producto ya no esté disponible.</p>
      <Link
        to="/"
        className="inline-block mt-6 rounded-xl bg-primary text-primary-ink font-semibold px-6 py-2.5 text-sm hover:brightness-110"
      >
        Volver al inicio
      </Link>
    </div>
  )
}
