import { useState, type FormEvent } from 'react'
import type { Fulfillment, PriceOption, Product, Section } from '../../lib/types'
import { saveProduct, type ProductInput } from '../../lib/adminApi'
import { PLATFORMS } from '../../lib/kinds'
import { uploadImage } from '../../lib/storage'
import { slugify } from '../../utils/slugify'
import ImageField from './ImageField'
import Modal from './Modal'
import OptionsEditor, { type OptionDraft } from './OptionsEditor'

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

const SUBSCRIPTION_PRESETS = ['1 mes', '3 meses', '6 meses', '12 meses']
const STREAMING_PRESETS = ['Perfil 1 mes', 'Cuenta completa 1 mes']

interface Props {
  product: Product | null
  section: Section
  onDone: () => void
  onClose: () => void
}

export default function ProductForm({ product, section, onDone, onClose }: Props) {
  const kind = section.kind
  const withOptions = kind === 'streaming' || kind === 'subscription'

  const [name, setName] = useState(product?.name ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [priceSecondary, setPriceSecondary] = useState(
    product?.priceSecondary != null ? String(product.priceSecondary) : '',
  )
  const [platform, setPlatform] = useState(product?.platform ?? (kind === 'digital' ? PLATFORMS[0] : ''))
  const [platforms, setPlatforms] = useState<string[]>([]) // solo al crear un digital
  const [stock, setStock] = useState(product?.stock != null ? String(product.stock) : '1')
  const [options, setOptions] = useState<OptionDraft[]>(
    (product?.options ?? []).map((o) => ({ label: o.label, price: String(o.price) })),
  )
  const [fulfillment, setFulfillment] = useState<Fulfillment>(product?.fulfillment ?? 'manual')
  const [featured, setFeatured] = useState(product?.featured ?? false)
  const [available, setAvailable] = useState(product?.available ?? true)
  const [position, setPosition] = useState(product?.position ?? 0)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fail = (msg: string) => {
    setError(msg)
    setSaving(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Escribe el nombre.')

    // --- Validación según el tipo de sección ---
    let basePrice = 0
    let secondary: number | undefined
    let stockNum: number | undefined
    let parsedOptions: PriceOption[] = []

    if (withOptions) {
      if (options.length === 0) return setError('Agrega al menos una opción con precio.')
      for (const o of options) {
        const p = Number(o.price)
        if (!o.label.trim() || !o.price || Number.isNaN(p) || p < 0)
          return setError('Cada opción necesita un nombre y un precio válido.')
        parsedOptions.push({ label: o.label.trim(), price: p })
      }
      basePrice = Math.min(...parsedOptions.map((o) => o.price))
    } else {
      basePrice = Number(price)
      if (!price || Number.isNaN(basePrice) || basePrice < 0) return setError('Escribe un precio válido.')
      parsedOptions = []
    }
    if (kind === 'digital') {
      if (priceSecondary) {
        secondary = Number(priceSecondary)
        if (Number.isNaN(secondary) || secondary < 0) return setError('El precio de la cuenta secundaria no es válido.')
      }
      if (!product && platforms.length === 0) return setError('Elige al menos una plataforma.')
    }
    if (kind === 'physical') {
      stockNum = Number(stock)
      if (stock === '' || !Number.isInteger(stockNum) || stockNum < 0)
        return setError('La cantidad debe ser un número entero (0 o más).')
    }

    setSaving(true)
    const baseSlug = slugify(name)
    let imageUrl = product?.imageUrl
    if (file) {
      const up = await uploadImage(file, baseSlug || 'producto')
      if (up.error) return fail(`No se pudo subir la imagen: ${up.error}`)
      imageUrl = up.url ?? undefined
    }

    const common: Omit<ProductInput, 'slug' | 'platform'> = {
      sectionId: section.id,
      name: name.trim(),
      description: description.trim(),
      imageUrl,
      price: basePrice,
      priceSecondary: secondary,
      stock: stockNum,
      options: parsedOptions,
      fulfillment: kind === 'digital' ? fulfillment : 'manual',
      featured,
      available,
      buyMode: product?.buyMode ?? 'whatsapp',
      position,
    }

    // --- Digital nuevo: un producto por cada plataforma elegida ---
    if (kind === 'digital' && !product) {
      const errors: string[] = []
      let saved = 0
      for (const plat of platforms) {
        const err = await saveProduct({ ...common, platform: plat, slug: slugify(`${name} ${plat}`) })
        if (err) errors.push(`${plat}: ${err}`)
        else saved++
      }
      if (errors.length > 0) {
        return fail(`${saved > 0 ? `Se guardaron ${saved}, pero falló: ` : 'No se guardó: '}${errors.join(' · ')}`)
      }
      setSaving(false)
      return onDone()
    }

    const plat = platform.trim() || undefined
    const slug = product?.slug ?? slugify(plat ? `${name} ${plat}` : name)
    const err = await saveProduct({ ...common, platform: plat, slug }, product?.id)
    setSaving(false)
    if (err) return setError(err)
    onDone()
  }

  const togglePlatform = (p: string) =>
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))

  const nameLabel =
    kind === 'streaming' ? 'Servicio (ej. Netflix)' : kind === 'subscription' ? 'Suscripción (ej. PS Plus Extra)' : 'Nombre'

  return (
    <Modal
      title={`${product ? 'Editar' : 'Nuevo'} · ${section.name}`}
      onClose={onClose}
      formId="product-form"
      submitLabel={kind === 'digital' && !product && platforms.length > 1 ? `Guardar en ${platforms.length} plataformas` : 'Guardar'}
      saving={saving}
    >
      <form id="product-form" onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-muted">{nameLabel}</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {kind === 'digital' && !product && (
          <div>
            <label className="text-xs text-muted">Plataformas donde está disponible</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PLATFORMS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    platforms.includes(p) ? 'border-primary bg-primary/10 text-primary' : 'border-line text-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-1.5">Se crea un producto por cada plataforma, con los mismos precios.</p>
          </div>
        )}

        {kind === 'digital' && product && (
          <div>
            <label className="text-xs text-muted">Plataforma</label>
            <select className={inputCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {[...new Set([...PLATFORMS, platform].filter(Boolean))].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        )}

        {kind === 'physical' && (
          <div>
            <label className="text-xs text-muted">Plataforma o tipo (ej. PS5, Consola, Accesorio)</label>
            <input
              className={inputCls}
              list="tipos-fisicos"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            />
            <datalist id="tipos-fisicos">
              {[...PLATFORMS, 'Consola', 'Accesorio', 'Control'].map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        )}

        {kind === 'digital' && (
          <div>
            <label className="text-xs text-muted">¿Cómo se entrega este juego?</label>
            <div className="grid gap-2 sm:grid-cols-2 mt-1">
              {(
                [
                  ['manual', 'Manual', 'Yo entrego la cuenta (por ejemplo, la compro a otro proveedor).'],
                  ['auto', 'Automática', 'La página entrega una cuenta de mi inventario. Las cargo en "Cuentas".'],
                ] as [Fulfillment, string, string][]
              ).map(([value, title, help]) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFulfillment(value)}
                  className={`text-left rounded-xl border px-3 py-2.5 ${
                    fulfillment === value ? 'border-primary bg-primary/10' : 'border-line'
                  }`}
                >
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted mt-0.5">{help}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-muted">Descripción</label>
          <textarea rows={3} className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <ImageField
          label={withOptions ? 'Logo o imagen' : 'Imagen'}
          currentUrl={product?.imageUrl}
          file={file}
          onFile={setFile}
        />

        {withOptions ? (
          <OptionsEditor
            title={kind === 'subscription' ? 'Planes y precios' : 'Opciones y precios'}
            help={
              kind === 'subscription'
                ? 'El cliente elige el tiempo y el precio sale automático.'
                : 'Por ejemplo perfil o cuenta completa, cada una con su precio.'
            }
            presets={kind === 'subscription' ? SUBSCRIPTION_PRESETS : STREAMING_PRESETS}
            value={options}
            onChange={setOptions}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted">{kind === 'digital' ? 'Precio cuenta principal' : 'Precio'}</label>
              <input type="number" inputMode="numeric" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            {kind === 'digital' && (
              <div>
                <label className="text-xs text-muted">Precio cuenta secundaria (opcional)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inputCls}
                  value={priceSecondary}
                  onChange={(e) => setPriceSecondary(e.target.value)}
                />
              </div>
            )}
            {kind === 'physical' && (
              <div>
                <label className="text-xs text-muted">Unidades disponibles</label>
                <input type="number" inputMode="numeric" className={inputCls} value={stock} onChange={(e) => setStock(e.target.value)} />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Más vendido (sale en la portada)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
            Visible en la tienda
          </label>
          <label className="flex items-center gap-2">
            Orden
            <input
              type="number"
              className="w-20 rounded-xl bg-bg border border-line px-2 py-1.5 text-sm"
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
            />
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </Modal>
  )
}
