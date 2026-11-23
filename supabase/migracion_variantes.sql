-- Variantes de suscripciones (consola, plan, duración). Ejecutar una vez en Supabase → SQL Editor.
alter table public.products add column if not exists option_groups jsonb;
