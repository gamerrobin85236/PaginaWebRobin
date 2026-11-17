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

// Todas las palabras escritas deben aparecer en el texto (en cualquier orden).
export function matchesSearch(text: string, query: string): boolean {
  const words = normalizeText(query).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const target = normalizeText(text)
  return words.every((w) => target.includes(w))
}
