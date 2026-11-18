import { useEffect, useState } from 'react'
import { safeImageUrl, thumbUrl } from '../utils/images'

interface Props {
  url?: string
  alt: string
  className?: string
  /** true solo para las primeras imágenes visibles; el resto se carga al acercarse. */
  eager?: boolean
  /** true = miniatura liviana (listas); false = imagen completa. */
  thumb?: boolean
  width?: number
  height?: number
}

export default function ProductImage({ url, alt, className, eager = false, thumb = true, width, height }: Props) {
  const full = safeImageUrl(url)
  const [src, setSrc] = useState(thumb ? thumbUrl(url) : full)

  useEffect(() => {
    setSrc(thumb ? thumbUrl(url) : full)
  }, [url, thumb, full])

  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      // Si la miniatura no existe (productos antiguos), se usa la imagen completa.
      onError={() => {
        if (full && src !== full) setSrc(full)
      }}
    />
  )
}
