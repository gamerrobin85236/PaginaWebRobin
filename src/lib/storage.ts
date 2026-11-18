import { supabase } from './supabase'

const BUCKET = 'products'
const MAX_DIMENSION = 1200 // imagen completa (página del producto)
const QUALITY = 0.85
const THUMB_DIMENSION = 400 // miniatura (tarjetas de las listas): pesa ~10 veces menos
const THUMB_QUALITY = 0.8
const MAX_INPUT_BYTES = 15 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    img.src = URL.createObjectURL(file)
  })
}

// Redimensiona y comprime la imagen en el navegador antes de subirla (WebP,
// máximo 1200 px): se ve igual de bien, pero pesa mucho menos y la tienda carga más rápido.
async function optimizeImage(file: File, maxDim = MAX_DIMENSION, quality = QUALITY): Promise<Blob> {
  const img = await loadImageElement(file)
  let { width, height } = img

  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width)
    width = maxDim
  } else if (height > maxDim) {
    width = Math.round((width * maxDim) / height)
    height = maxDim
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Este navegador no puede procesar la imagen.')
  ctx.drawImage(img, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
      'image/webp',
      quality,
    )
  })
}

export async function uploadImage(
  file: File,
  baseName: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'La base de datos no está configurada.' }
  if (!ALLOWED_TYPES.includes(file.type)) return { url: null, error: 'Solo se permiten imágenes JPG, PNG o WebP.' }
  if (file.size > MAX_INPUT_BYTES) return { url: null, error: 'La imagen pesa más de 15 MB.' }

  let blob: Blob = file
  let ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  try {
    blob = await optimizeImage(file)
    ext = 'webp'
  } catch {
    /* si no se puede optimizar, se sube la original */
  }

  const stamp = `${baseName}-${Date.now()}`
  const path = `${stamp}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: '31536000',
    upsert: true,
    contentType: blob.type || file.type || 'image/webp',
  })
  if (error) return { url: null, error: error.message }

  // Miniatura para las listas. Si falla, la tienda usa la imagen completa.
  if (ext === 'webp') {
    try {
      const thumb = await optimizeImage(file, THUMB_DIMENSION, THUMB_QUALITY)
      await supabase.storage.from(BUCKET).upload(`${stamp}_t.webp`, thumb, {
        cacheControl: '31536000',
        upsert: true,
        contentType: 'image/webp',
      })
    } catch {
      /* sin miniatura */
    }
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
