import { supabase } from './supabase'

const BUCKET = 'products'
const MAX_DIMENSION = 1200 // lado más largo, en píxeles
const QUALITY = 0.85

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
async function optimizeImage(file: File): Promise<Blob> {
  const img = await loadImageElement(file)
  let { width, height } = img

  if (width > height && width > MAX_DIMENSION) {
    height = Math.round((height * MAX_DIMENSION) / width)
    width = MAX_DIMENSION
  } else if (height > MAX_DIMENSION) {
    width = Math.round((width * MAX_DIMENSION) / height)
    height = MAX_DIMENSION
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
      QUALITY,
    )
  })
}

export async function uploadImage(
  file: File,
  baseName: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'La base de datos no está configurada.' }

  let blob: Blob = file
  let ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  try {
    blob = await optimizeImage(file)
    ext = 'webp'
  } catch {
    /* si no se puede optimizar, se sube la original */
  }

  const path = `${baseName}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: '31536000',
    upsert: true,
    contentType: blob.type || file.type || 'image/webp',
  })
  if (error) return { url: null, error: error.message }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}
