import { useState } from 'react'
import { X } from 'lucide-react'
import type { OptionGroup } from '../../lib/types'

export const LABEL_SEP = ' · '

/** Plantillas listas: Robin solo ajusta los valores y escribe los precios. */
export const VARIANT_PRESETS: { name: string; groups: OptionGroup[] }[] = [
  {
    name: 'PlayStation Plus',
    groups: [
      { title: 'Consola', values: ['PS4', 'PS5'] },
      { title: 'Plan', values: ['Essential', 'Extra', 'Deluxe'] },
      { title: 'Duración', values: ['1 mes', '3 meses', '12 meses'] },
    ],
  },
  {
    name: 'Xbox Game Pass',
    groups: [
      { title: 'Plan', values: ['Essential', 'Premium', 'Ultimate', 'Solo para PC'] },
      { title: 'Duración', values: ['1 mes', '3 meses', '12 meses'] },
    ],
  },
]

/** Todas las combinaciones posibles de los grupos, en orden. */
export function combinations(groups: OptionGroup[]): string[][] {
  return groups.reduce<string[][]>(
    (acc, g) => acc.flatMap((prefix) => g.values.map((v) => [...prefix, v])),
    [[]],
  )
}

interface Props {
  groups: OptionGroup[]
  onGroups: (g: OptionGroup[]) => void
  prices: Record<string, string> // clave: la etiqueta de la combinación
  onPrices: (p: Record<string, string>) => void
}

const inputCls =
  'w-full rounded-lg bg-bg border border-line px-2.5 py-2 text-sm focus:outline-none focus:border-primary'

function ValueAdder({ onAdd }: { onAdd: (v: string) => void }) {
  const [text, setText] = useState('')
  const add = () => {
    const v = text.replace(/\s*·\s*/g, ' ').trim()
    if (v) onAdd(v)
    setText('')
  }
  return (
    <div className="flex gap-2 mt-2">
      <input
        className={inputCls}
        placeholder="Agregar otro valor"
        value={text}
        maxLength={40}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add()
          }
        }}
      />
      <button type="button" onClick={add} className="rounded-lg border border-primary/60 text-primary px-3 text-xs font-semibold shrink-0">
        Agregar
      </button>
    </div>
  )
}

export default function VariantsEditor({ groups, onGroups, prices, onPrices }: Props) {
  const setGroup = (gi: number, patch: Partial<OptionGroup>) => onGroups(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)))
  const combos = groups.length > 0 ? combinations(groups) : []
  const priced = combos.filter((c) => Number(prices[c.join(LABEL_SEP)]) > 0).length

  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted">Empieza con una plantilla (puedes cambiar sus valores después):</p>
        <div className="flex flex-wrap gap-2">
          {VARIANT_PRESETS.map((p) => (
            <button
              type="button"
              key={p.name}
              onClick={() => onGroups(p.groups.map((g) => ({ ...g, values: [...g.values] })))}
              className="rounded-full border border-primary/60 text-primary px-4 py-2 text-sm font-semibold"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-xl border border-line bg-surface p-3">
            <input
              className={`${inputCls} font-semibold`}
              value={g.title}
              maxLength={30}
              aria-label="Nombre del grupo"
              onChange={(e) => setGroup(gi, { title: e.target.value })}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {g.values.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg pl-3 pr-1.5 py-1 text-xs">
                  {v}
                  <button
                    type="button"
                    aria-label={`Quitar ${v}`}
                    onClick={() => setGroup(gi, { values: g.values.filter((x) => x !== v) })}
                    className="text-muted hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
            <ValueAdder onAdd={(v) => !g.values.includes(v) && setGroup(gi, { values: [...g.values, v] })} />
          </div>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold">Precios</p>
        <p className="text-xs text-muted mb-2">
          Escribe el precio de cada combinación. Las que dejes vacías no se ofrecen al cliente.{' '}
          <b className="text-ink">
            {priced} de {combos.length}
          </b>{' '}
          con precio.
        </p>
        <ul className="flex flex-col gap-1.5">
          {combos.map((c) => {
            const key = c.join(LABEL_SEP)
            return (
              <li key={key} className="flex items-center gap-2">
                <span className="flex-1 text-sm min-w-0">{key}</span>
                <input
                  className={`${inputCls} max-w-[9rem]`}
                  type="number"
                  inputMode="numeric"
                  placeholder="Precio"
                  value={prices[key] ?? ''}
                  onChange={(e) => onPrices({ ...prices, [key]: e.target.value })}
                />
              </li>
            )
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => {
          if (window.confirm('¿Quitar las variantes? Se pierden los precios escritos aquí.')) {
            onGroups([])
            onPrices({})
          }
        }}
        className="text-xs text-muted underline self-start"
      >
        Empezar de nuevo
      </button>
    </div>
  )
}
