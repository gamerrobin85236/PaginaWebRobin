-- Migración: inventario de cuentas y tipo de entrega (automática / manual).
-- Ejecutar UNA vez en Supabase → SQL Editor. Es seguro repetirla.

-- Cómo se entrega cada producto: 'manual' (Robin entrega) o 'auto' (sale del inventario de cuentas).
alter table public.products add column if not exists fulfillment text not null default 'manual';
alter table public.products drop constraint if exists products_fulfillment_check;
alter table public.products add constraint products_fulfillment_check check (fulfillment in ('auto', 'manual'));

-- Inventario de cuentas. Contiene claves: SOLO el administrador puede leer o escribir esta tabla.
create table if not exists public.game_accounts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  account_type text not null check (account_type in ('principal', 'secundaria')),
  login text not null,
  secret text not null,
  notes text not null default '',
  status text not null default 'available' check (status in ('available', 'sold')),
  sold_at timestamptz,
  order_id uuid,
  created_at timestamptz not null default now(),
  constraint game_accounts_limits check (
    char_length(login) between 1 and 200
    and char_length(secret) between 1 and 200
    and char_length(notes) <= 1000
  )
);
create index if not exists game_accounts_lookup_idx
  on public.game_accounts (product_id, account_type, status);

alter table public.game_accounts enable row level security;
drop policy if exists "game_accounts_admin_all" on public.game_accounts;
create policy "game_accounts_admin_all" on public.game_accounts
  for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.game_accounts from anon;

-- Disponibilidad pública: solo CUÁNTAS cuentas quedan por producto y tipo (nunca los datos).
create or replace view public.account_availability as
  select product_id, account_type, count(*)::int as available
  from public.game_accounts
  where status = 'available'
  group by product_id, account_type;
grant select on public.account_availability to anon, authenticated;

-- Código de verificación de la cuenta (PlayStation lo pide al iniciar sesión).
alter table public.game_accounts add column if not exists verification_code text not null default '';
alter table public.game_accounts drop constraint if exists game_accounts_code_limit;
alter table public.game_accounts add constraint game_accounts_code_limit check (char_length(verification_code) <= 500);
