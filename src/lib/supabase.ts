import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from '../config/public'

// Si defines VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en un archivo .env,
// se usan esas; si no, se usan los datos públicos de src/config/public.ts.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || PUBLIC_SUPABASE_URL
const supabaseKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || PUBLIC_SUPABASE_KEY

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null
