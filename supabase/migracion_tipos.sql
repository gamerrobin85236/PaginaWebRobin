-- Migración: tipos de sección, cantidades (stock) y opciones de precio.
-- Ejecutar UNA vez en Supabase → SQL Editor. Es seguro repetirla.

alter table public.sections
  add column if not exists kind text not null default 'generic';
alter table public.sections drop constraint if exists sections_kind_check;
alter table public.sections add constraint sections_kind_check
  check (kind in ('digital', 'physical', 'streaming', 'subscription', 'generic'));

alter table public.products add column if not exists stock integer;
alter table public.products drop constraint if exists products_stock_check;
alter table public.products add constraint products_stock_check check (stock is null or stock >= 0);

-- Lista de opciones [{"label":"1 mes","price":25000}, ...] para streaming y suscripciones.
alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb;

-- Asigna el tipo a las secciones iniciales (solo si siguen como "generic").
update public.sections set kind = 'digital'      where slug = 'videojuegos-digitales' and kind = 'generic';
update public.sections set kind = 'physical'     where slug = 'fisicos-y-consolas'    and kind = 'generic';
update public.sections set kind = 'subscription' where slug = 'ps-plus-game-pass'     and kind = 'generic';
update public.sections set kind = 'streaming'    where slug = 'combos-streaming'      and kind = 'generic';
