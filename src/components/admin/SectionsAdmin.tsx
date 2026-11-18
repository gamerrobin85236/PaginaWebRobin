import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Section } from '../../lib/types'
import { SECTION_ICONS, sectionIcon } from '../../lib/icons'
import { deleteSection, fetchAdminSections, saveSection } from '../../lib/adminApi'
import { uploadImage } from '../../lib/storage'
import { slugify } from '../../utils/slugify'
import { useCatalog } from '../../hooks/CatalogContext'
import ImageField from './ImageField'
import Modal from './Modal'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

function SectionForm({ section, nextPosition, onDone, onClose }: {
  section: Section | null
  nextPosition: number
  onDone: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(section?.name ?? '')
  const [description, setDescription] = useState(section?.description ?? '')
  const [icon, setIcon] = useState(section?.icon ?? 'gamepad')
  const [position, setPosition] = useState(section?.position ?? nextPosition)
  const [active, setActive] = useState(section?.active ?? true)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Escribe el nombre de la sección.')
    setSaving(true)
    setError(null)
    const slug = section?.slug ?? slugify(name)
    let coverUrl = section?.coverUrl
    if (file) {
      const up = await uploadImage(file, `seccion-${slug}`)
      if (up.error) {
        setSaving(false)
        return setError(`No se pudo subir la imagen: ${up.error}`)
      }
      coverUrl = up.url ?? undefined
    }
    const err = await saveSection(
      { name: name.trim(), slug, description: description.trim(), icon, coverUrl, active, position },
      section?.id,
    )
    setSaving(false)
    if (err) return setError(err)
    onDone()
  }

  return (
    <Modal
      title={section ? 'Editar sección' : 'Nueva sección'}
      onClose={onClose}
      formId="section-form"
      submitLabel="Guardar"
      saving={saving}
    >
      <form id="section-form" onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted">Nombre</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted">Descripción corta</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted">Icono</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.keys(SECTION_ICONS).map((k) => {
              const Icon = sectionIcon(k)
              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => setIcon(k)}
                  aria-label={k}
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                    icon === k ? 'border-primary text-primary' : 'border-line text-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </div>
        </div>
        <ImageField label="Imagen de portada (opcional)" currentUrl={section?.coverUrl} file={file} onFile={setFile} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted">Orden</label>
            <input
              type="number"
              className={inputCls}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm mt-5">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Visible en la tienda
          </label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </Modal>
  )
}

export default function SectionsAdmin() {
  const { refresh } = useCatalog()
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Section | null | undefined>(undefined) // undefined = cerrado

  const load = useCallback(() => {
    fetchAdminSections()
      .then((s) => {
        setSections(s)
        setError(null)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Error'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  function done() {
    setEditing(undefined)
    load()
    refresh()
  }

  async function remove(s: Section) {
    if (!window.confirm(`¿Eliminar la sección "${s.name}"? También se borrarán sus productos.`)) return
    const err = await deleteSection(s.id)
    if (err) return setError(err)
    load()
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl">Secciones</h2>
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-ink font-semibold px-4 py-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {loading && <p className="text-sm text-muted">Cargando...</p>}
      <ul className="flex flex-col gap-2">
        {sections.map((s) => {
          const Icon = sectionIcon(s.icon)
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
              <Icon className="w-5 h-5 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{s.name}</p>
                <p className="text-xs text-muted truncate">
                  Orden {s.position} · {s.active ? 'Visible' : 'Oculta'}
                </p>
              </div>
              <button onClick={() => setEditing(s)} aria-label="Editar" className="p-2 text-muted hover:text-primary">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(s)} aria-label="Eliminar" className="p-2 text-muted hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          )
        })}
      </ul>
      {editing !== undefined && (
        <SectionForm
          section={editing}
          nextPosition={sections.length + 1}
          onDone={done}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}
