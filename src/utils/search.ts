import type { Product } from '../lib/types'

// Normaliza texto para buscar: sin acentos, en minúsculas y sin símbolos.
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'para', 'y', 'en', 'un', 'una', 'con'])
const compact = (s: string) => s.replace(/\s+/g, '')

// Abreviaturas que la gente usa para buscar juegos.
const ALIASES: Record<string, string> = {
  cod: 'call of duty',
  gta: 'grand theft auto',
  rdr: 'red dead redemption',
  gow: 'god of war',
  mk: 'mortal kombat',
  tlou: 'the last of us',
  fc: 'fifa',
}

/** Distancia de edición (cambiar, borrar o agregar una letra; también intercambiar dos seguidas). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const rows: number[][] = []
  for (let i = 0; i <= a.length; i++) {
    rows[i] = [i]
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        rows[i][j] = j
        continue
      }
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1)
      rows[i][j] = v
    }
  }
  return rows[a.length][b.length]
}

const tolerance = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0)

/** Qué tan bien coincide una palabra de la búsqueda con un texto (0 = no coincide). */
function scoreWord(word: string, text: string, textCompact: string, textWords: string[]): number {
  if (textWords.includes(word)) return 100
  if (textWords.some((t) => t.startsWith(word))) return 85
  if (word.length >= 3 && text.includes(word)) return 65
  if (/^\d$/.test(word) && textCompact.includes(word)) return 55 // número suelto: "ps 5" ↔ "ps5"
  if (word.length >= 3 && textCompact.includes(word)) return 60 // "blackops" ↔ "black ops"
  const tol = tolerance(word.length)
  if (tol > 0) {
    for (const t of textWords) {
      if (editDistance(word, t, tol) <= tol) return 45 // error de tipeo: "plaistation" ↔ "playstation"
      if (t.length > word.length && editDistance(word, t.slice(0, word.length), 1) <= 1) return 35 // a medio escribir
    }
  }
  return 0
}

interface Field {
  text: string
  compact: string
  words: string[]
  weight: number
}

const field = (raw: string, weight: number): Field => {
  const text = normalizeText(raw)
  return { text, compact: compact(text), words: text.split(' ').filter(Boolean), weight }
}

/** Puntaje de un producto para la búsqueda: 0 = no coincide con ninguna palabra. */
function scoreProduct(p: Product, sectionName: string, words: string[], phrase: string): { all: number; any: number } {
  const fields = [field(p.name, 1), field(`${p.platform ?? ''} ${sectionName}`, 0.6), field(p.description ?? '', 0.3)]
  // Frase pegada o separada distinto: "callofduty", "ps 5", "black ops2".
  if (phrase.length >= 4 && fields[0].compact.includes(phrase)) return { all: 200, any: 200 }

  let total = 0
  let matched = 0
  for (const w of words) {
    let best = 0
    for (const f of fields) {
      // En la descripción solo cuentan coincidencias claras.
      const s = scoreWord(w, f.text, f.compact, f.words)
      if (f.weight < 0.5 && s < 65) continue
      best = Math.max(best, s * f.weight)
    }
    if (best > 0) {
      matched++
      total += best
    }
  }
  return { all: matched === words.length ? total : 0, any: total }
}

export interface SearchResult {
  items: Product[]
  /** true cuando no hubo coincidencias completas y se muestran productos parecidos. */
  similar: boolean
}

/** Busca sin importar tildes, mayúsculas, espacios de más, pequeños errores de escritura ni el orden. */
export function searchProducts(products: Product[], query: string, sectionName: (p: Product) => string): SearchResult {
  const all = normalizeText(query).split(' ').filter(Boolean)
  if (all.length === 0) return { items: products, similar: false }
  const words = all.flatMap((w) => (ALIASES[w] ?? w).split(' ')).filter((w) => !STOP.has(w))
  const used = words.length > 0 ? words : all
  const phrase = compact(used.join(' '))

  const scored = products.map((p) => ({ p, ...scoreProduct(p, sectionName(p), used, phrase) }))
  const full = scored.filter((s) => s.all > 0).sort((a, b) => b.all - a.all)
  if (full.length > 0) return { items: full.map((s) => s.p), similar: false }
  const partial = scored.filter((s) => s.any > 0).sort((a, b) => b.any - a.any)
  return { items: partial.map((s) => s.p), similar: partial.length > 0 }
}
