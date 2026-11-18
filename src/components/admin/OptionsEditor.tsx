import { Plus, Trash2 } from 'lucide-react'

export interface OptionDraft {
  label: string
  price: string
}

interface Props {
  title: string
  help: string
  presets: string[]
  value: OptionDraft[]
  onChange: (value: OptionDraft[]) => void
}

const inputCls =
  'w-full rounded-xl bg-bg border border-line px-3 py-2.5 text-sm focus:outline-none focus:border-primary'

export default function OptionsEditor({ title, help, presets, value, onChange }: Props) {
  const update = (i: number, patch: Partial<OptionDraft>) =>
    onChange(value.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))

  return (
    <div className="rounded-xl border border-line p-3 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{help}</p>
      </div>

      {value.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputCls}
            placeholder="Nombre (ej. 3 meses)"
            value={o.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className={`${inputCls} max-w-[9rem]`}
            type="number"
            inputMode="numeric"
            placeholder="Precio"
            value={o.price}
            onChange={(e) => update(i, { price: e.target.value })}
          />
          <button
            type="button"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            aria-label="Quitar"
            className="p-2 text-muted hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {presets
          .filter((p) => !value.some((o) => o.label === p))
          .map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => onChange([...value, { label: p, price: '' }])}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-primary hover:text-primary"
            >
              + {p}
            </button>
          ))}
        <button
          type="button"
          onClick={() => onChange([...value, { label: '', price: '' }])}
          className="inline-flex items-center gap-1 rounded-full border border-primary/60 px-3 py-1 text-xs text-primary"
        >
          <Plus className="w-3 h-3" /> Otra opción
        </button>
      </div>
    </div>
  )
}
