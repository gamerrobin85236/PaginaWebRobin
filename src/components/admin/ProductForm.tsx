import { useState, type FormEvent } from 'react'
import type { BuyMode, Product, Section } from '../../lib/types'
import { saveProduct } from '../../lib/adminApi'
import { uploadImage } from '../../lib/storage'
import { slugify } from '../../utils/slugify'
import ImageField from './ImageField'
import Modal from './Modal'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

interface Props {
  product: Product | null
  sections: Section[]
  defaultSectionId?: string
  onDone: () => void
  onClose: () => void
}

export default function ProductForm({ product, sections, defaultSectionId, onDone, onClose }: Props) {
  const [sectionId, setSectionId] = useState(product?.sectionId ?? defaultSectionId ?? sections[0]?.id ?? '')
  const [name, setName] = useState(product?.name ?? '')
  const [platform, setPlatform] = useState(product?.platform ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [priceSecondary, setPriceSecondary] = useState(
    product?.priceSecondary != null ? String(product.priceSecondary) : '',
  )
  const [buyMode, setBuyMode] = useState<BuyMode>(product?.buyMode ?? 'whatsapp')
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [available, setAvailable] = useState(product?.available ?? true)
  const [position, setPosition] = useState(product?.position ?? 0)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!sectionId) return setError('Primero crea una sección.')
    if (!name.trim()) return setError('Escribe el nombre del producto.')
    const priceNum = Number(price)
    if (!price || Number.isNaN(priceNum) || priceNum < 0) return setError('Escribe un precio válido.')
    const secNum = priceSecondary ? Number(priceSecondary) : undefined
    if (secNum !== undefined && (Number.isNaN(secNum) || secNum < 0)) return setError('El precio secundario no es válido.')

    setSaving(true)
    setError(null)
    const slug = product?.slug ?? slugify(`${name} ${platform}`)
    let imageUrl = product?.imageUrl
    if (file) {
      const up = await uploadImage(file, slug)
      if (up.error) {
        setSaving(false)
        return setError(`No se pudo subir la imagen: ${up.error}`)
      }
      imageUrl = up.url ?? undefined
    }
    const err = await saveProduct(
      {
        sectionId,
        name: name.trim(),
        slug,
        description: description.trim(),
        imageUrl,
        price: priceNum,
        priceSecondary: secNum,
        platform: platform.trim() || undefined,
        featured,
        available,
        buyMode,
        position,
      },
      product?.id,
    )
    setSaving(false)
    if (err) return setError(err)
    onDone()
  }

  return (
    <Modal
      title={product ? 'Editar producto' : 'Nuevo producto'}
      onClose={onClose}
      formId="product-form"
      submitLabel="Guardar"
      saving={saving}
    >
      <form id="product-form" onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted">Sección</label>
          <select className={inputCls} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted">Nombre</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted">Plataforma (opcional, ej. PS5, Switch, PC)</label>
          <input className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted">Descripción</label>
          <textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <ImageField label="Imagen" currentUrl={product?.imageUrl} file={file} onFile={setFile} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted">Precio</label>
            <input type="number" inputMode="numeric" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted">Precio secundario (opcional)</label>
            <input
              type="number"
              inputMode="numeric"
              className={inputCls}
              value={priceSecondary}
              onChange={(e) => setPriceSecondary(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted">Forma de compra</label>
            <select className={inputCls} value={buyMode} onChange={(e) => setBuyMode(e.target.value as BuyMode)}>
              <option value="whatsapp">Por WhatsApp</option>
              <option value="online">En la página (próximamente)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted">Orden</label>
            <input type="number" className={inputCls} value={position} onChange={(e) => setPosition(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Más vendido
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Disponible
          </label>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </Modal>
  )
}
