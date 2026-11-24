import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/** Si una pantalla falla, muestra un aviso con botón en vez de dejar toda la página en negro. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="max-w-sm mx-auto py-16 text-center">
        <h2 className="font-display font-bold text-xl">Algo no cargó bien</h2>
        <p className="text-sm text-muted mt-2">Puede ser la conexión. Vuelve a intentarlo.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 rounded-xl bg-primary text-primary-ink font-semibold px-6 py-3 text-sm"
        >
          Recargar la página
        </button>
      </div>
    )
  }
}
