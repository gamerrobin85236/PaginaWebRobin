/**
 * Cada línea es una cuenta:
 *   correo:clave                    (sin código)
 *   correo|clave|código             (con código de verificación; usa "|" para separar)
 */
export function parseLines(text: string): { rows: { login: string; secret: string; code: string }[]; bad: number } {
  const rows: { login: string; secret: string; code: string }[] = []
  let bad = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    let login = ''
    let secret = ''
    let code = ''
    if (line.includes('|')) {
      const parts = line.split('|').map((x) => x.trim())
      ;[login = '', secret = '', code = ''] = parts
    } else {
      const sep = line.includes('\t') ? '\t' : ':'
      const idx = line.indexOf(sep)
      login = idx > 0 ? line.slice(0, idx).trim() : ''
      secret = idx > 0 ? line.slice(idx + 1).trim() : ''
    }
    if (login && secret) rows.push({ login, secret, code })
    else bad++
  }
  return { rows, bad }
}
