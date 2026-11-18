// Freno contra adivinar contraseñas desde este navegador: tras 5 intentos fallidos
// se bloquea el formulario y el tiempo de espera crece (30 s, 1 min, 2 min... hasta 15 min).
// La protección real contra ataques masivos la da Supabase Auth (límites de intentos) y,
// recomendado, el CAPTCHA de su panel; esto solo suma una capa más.
const KEY = 'gr_login_guard'
const FREE_ATTEMPTS = 5
const BASE_LOCK_MS = 30_000
const MAX_LOCK_MS = 15 * 60_000

interface GuardState {
  fails: number
  lockedUntil: number
}

function read(): GuardState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { fails: 0, lockedUntil: 0 }
    const parsed = JSON.parse(raw) as Partial<GuardState>
    return { fails: Number(parsed.fails) || 0, lockedUntil: Number(parsed.lockedUntil) || 0 }
  } catch {
    return { fails: 0, lockedUntil: 0 }
  }
}

function write(state: GuardState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sin almacenamiento: el freno queda solo en memoria de la página */
  }
}

/** Segundos que faltan para poder volver a intentar (0 = libre). */
export function lockedSeconds(): number {
  const { lockedUntil } = read()
  return Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000))
}

export function registerFailure(): void {
  const state = read()
  const fails = state.fails + 1
  let lockedUntil = state.lockedUntil
  if (fails >= FREE_ATTEMPTS) {
    const exponent = fails - FREE_ATTEMPTS
    lockedUntil = Date.now() + Math.min(MAX_LOCK_MS, BASE_LOCK_MS * 2 ** exponent)
  }
  write({ fails, lockedUntil })
}

export function registerSuccess(): void {
  write({ fails: 0, lockedUntil: 0 })
}
