import { useEffect, useState } from 'react'
import { Upload } from 'lucide-react'

interface ImageFieldProps {
  label: string
  currentUrl?: string
  file: File | null
  onFile: (file: File | null) => void
}

export default function ImageField({ label, currentUrl, file, onFile }: ImageFieldProps) {
  const [preview, setPreview] = useState<string | undefined>(currentUrl)

  useEffect(() => {
    if (!file) {
      setPreview(currentUrl)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, currentUrl])

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted">{label}</label>
      <label className="flex items-center gap-3 rounded-xl border border-dashed border-line p-3 cursor-pointer hover:border-primary/50">
        <div className="w-16 h-16 rounded-lg bg-bg border border-line overflow-hidden flex items-center justify-center shrink-0">
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <Upload className="w-5 h-5 text-muted" />
          )}
        </div>
        <span className="text-sm text-muted">
          {file ? file.name : preview ? 'Cambiar imagen' : 'Elegir imagen'}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  )
}
