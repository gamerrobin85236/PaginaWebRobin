-- =====================================================================
-- Base de datos de Gamer Robin (Supabase / Postgres)
-- Ejecutar completo en Supabase → SQL Editor → New query → Run.
-- Es seguro volver a ejecutarlo: usa "if not exists" donde se puede.
-- =====================================================================

-- ---------- Administradores ----------
-- Solo los usuarios listados aquí pueden editar la tienda.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ---------- Secciones (categorías de la página de inicio) ----------
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'package',
  cover_url text,
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Productos ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections (id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text not null default '',
  image_url text,
  price numeric(12, 0) not null check (price >= 0),
  price_secondary numeric(12, 0) check (price_secondary >= 0),
  platform text,
  featured boolean not null default false,
  available boolean not null default true,
  buy_mode text not null default 'whatsapp' check (buy_mode in ('whatsapp', 'online')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists products_section_idx on public.products (section_id, position);

-- ---------- Clientes (perfil extra de quien compra en línea) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- Pedidos (para la compra directa en la página) ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users (id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'entregado', 'cancelado')),
  total numeric(12, 0) not null check (total >= 0),
  payment_provider text,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  account_type text check (account_type in ('principal', 'secundaria')),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 0) not null check (unit_price >= 0)
);

-- =====================================================================
-- Seguridad (RLS): qué puede ver y hacer cada quien
-- =====================================================================
alter table public.admin_users enable row level security;
alter table public.sections enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Secciones y productos: cualquiera ve lo activo; solo el admin edita.
drop policy if exists "sections_public_read" on public.sections;
create policy "sections_public_read" on public.sections
  for select using (active or public.is_admin());

drop policy if exists "sections_admin_write" on public.sections;
create policy "sections_admin_write" on public.sections
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (available or public.is_admin());

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Administradores: cada quien solo ve su propia fila (para saber si es admin).
drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read" on public.admin_users
  for select using (user_id = auth.uid());

-- Perfiles: cada cliente ve y edita el suyo; el admin los ve todos.
drop policy if exists "profiles_self" on public.profiles;
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Pedidos: el cliente ve los suyos; el admin ve y gestiona todos.
-- Los pedidos NUEVOS los crea una función del servidor (con la clave de
-- servicio), no el navegador, para que nadie pueda inventar un pedido pagado.
drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders
  for select using (customer_id = auth.uid() or public.is_admin());

drop policy if exists "orders_admin_write" on public.orders;
create policy "orders_admin_write" on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items_owner_read" on public.order_items;
create policy "order_items_owner_read" on public.order_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists "order_items_admin_write" on public.order_items;
create policy "order_items_admin_write" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Imágenes (Storage): bucket público "products"; solo el admin sube.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

drop policy if exists "products_images_public_read" on storage.objects;
create policy "products_images_public_read" on storage.objects
  for select using (bucket_id = 'products');

drop policy if exists "products_images_admin_write" on storage.objects;
create policy "products_images_admin_write" on storage.objects
  for all using (bucket_id = 'products' and public.is_admin())
  with check (bucket_id = 'products' and public.is_admin());

-- =====================================================================
-- Secciones iniciales (editables después desde el panel)
-- =====================================================================
insert into public.sections (slug, name, description, icon, position) values
  ('videojuegos-digitales', 'Videojuegos digitales', 'Cuentas principales y secundarias para PS5, PS4, Xbox y Switch.', 'gamepad', 1),
  ('fisicos-y-consolas', 'Físicos y consolas', 'Juegos físicos, consolas y accesorios con envío a todo el país.', 'disc', 2),
  ('ps-plus-game-pass', 'PS Plus y Game Pass', 'Suscripciones para jugar online y acceder a catálogos de juegos.', 'crown', 3),
  ('combos-streaming', 'Combos streaming', 'Cuentas de plataformas de series y películas.', 'tv', 4),
  ('ofertas-relampago', 'Ofertas relámpago', 'Promociones por tiempo limitado.', 'zap', 5)
on conflict (slug) do nothing;

-- =====================================================================
-- PASO FINAL (después de crear el usuario de Robin en Authentication → Users):
-- reemplaza el correo y ejecuta esto para darle permisos de administrador.
--
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'CORREO_DE_ROBIN@ejemplo.com';
-- =====================================================================

-- =====================================================================
-- Tipos de sección, stock y opciones (ver también migracion_tipos.sql)
-- =====================================================================
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
