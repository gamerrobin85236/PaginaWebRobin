/** Solo se aceptan imágenes servidas por https (evita esquemas raros como javascript:). */
export function safeImageUrl(url?: string): string | undefined {
  if (!url) return undefined
  return /^https:\/\//i.test(url) ? url : undefined
}

/** Dirección de la miniatura (la que el panel genera al subir). Si no existe, se usa la completa. */
export function thumbUrl(url?: string): string | undefined {
  const safe = safeImageUrl(url)
  if (!safe) return undefined
  return /\.webp$/i.test(safe) ? safe.replace(/\.webp$/i, '_t.webp') : safe
}
