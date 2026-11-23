-- Textos editables de la tienda (por ahora, el correo que recibe el cliente). Ejecutar una vez en Supabase → SQL Editor.
create table if not exists public.store_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.store_settings enable row level security;
drop policy if exists "settings_admin_all" on public.store_settings;
create policy "settings_admin_all" on public.store_settings
  for all using (public.is_admin()) with check (public.is_admin());
