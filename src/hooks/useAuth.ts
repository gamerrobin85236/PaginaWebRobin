import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    // Pase lo que pase (error o demora), la pantalla no se queda esperando para siempre.
    const giveUp = window.setTimeout(() => setLoading(false), 6000)
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => {
        window.clearTimeout(giveUp)
        setLoading(false)
      })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => {
      window.clearTimeout(giveUp)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: 'La base de datos todavía no está configurada.' }
    try {
      const attempt = supabase.auth.signInWithPassword({ email, password })
      const timeout = new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 15000))
      const result = await Promise.race([attempt, timeout])
      if (result === 'timeout') return { error: 'Tardó demasiado. Revisa tu internet e intenta de nuevo.' }
      return { error: result.error?.message ?? null }
    } catch {
      return { error: 'No hay conexión. Revisa tu internet e intenta de nuevo.' }
    }
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  return { session, isAuthenticated: !!session, loading, signIn, signOut }
}
