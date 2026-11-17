import { NavLink } from 'react-router-dom'
import { Store, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useCatalog } from '../hooks/CatalogContext'
import { sectionIcon } from '../lib/icons'

interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

function linkClass(isActive: boolean, collapsed: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-primary/15 text-primary' : 'text-ink/80 hover:bg-surface2'
  } ${collapsed ? 'md:justify-center' : ''}`
}

function Links({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: () => void }) {
  const { sections } = useCatalog()
  return (
    <nav className="flex flex-col gap-1 p-3">
      {!collapsed && <p className="px-3 pt-1 pb-2 text-xs uppercase tracking-wider text-muted">Tienda</p>}
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        title="Inicio"
        className={({ isActive }) => linkClass(isActive, collapsed)}
      >
        <Store className="w-5 h-5 shrink-0" />
        {!collapsed && <span>Inicio</span>}
      </NavLink>

      {sections.map((section) => {
        const Icon = sectionIcon(section.icon)
        return (
          <NavLink
            key={section.id}
            to={`/seccion/${section.slug}`}
            onClick={onNavigate}
            title={section.name}
            className={({ isActive }) => linkClass(isActive, collapsed)}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{section.name}</span>}
          </NavLink>
        )
      })}
    </nav>
  )
}

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      {/* Computador: barra fija a la izquierda, se puede contraer */}
      <aside
        className={`hidden md:flex flex-col shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-r border-line bg-surface transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          <Links collapsed={collapsed} onNavigate={() => undefined} />
        </div>
        <button
          onClick={onToggleCollapsed}
          className={`flex items-center gap-3 border-t border-line px-6 py-4 text-sm text-muted hover:text-ink ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-5 h-5" />
          ) : (
            <>
              <PanelLeftClose className="w-5 h-5" />
              <span>Contraer menú</span>
            </>
          )}
        </button>
      </aside>

      {/* Celular: menú que se abre desde la hamburguesa */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-72 max-w-[85%] bg-surface border-r border-line h-full overflow-y-auto">
            <div className="flex items-center justify-between px-4 h-16 border-b border-line">
              <span className="font-display font-bold text-lg">Menú</span>
              <button onClick={onCloseMobile} aria-label="Cerrar menú" className="p-2 text-muted hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Links collapsed={false} onNavigate={onCloseMobile} />
          </div>
          <button
            aria-label="Cerrar menú"
            onClick={onCloseMobile}
            className="flex-1 bg-black/60"
          />
        </div>
      )}
    </>
  )
}
