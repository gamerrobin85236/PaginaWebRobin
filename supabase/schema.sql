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

-- =====================================================================
-- Inventario de cuentas (ver también migracion_cuentas.sql)
-- =====================================================================
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

-- =====================================================================
-- Pedidos y pagos (ver también migracion_pedidos.sql)
-- =====================================================================
-- ---------- Pedidos ----------
alter table public.orders add column if not exists public_ref text;
alter table public.orders add column if not exists access_token text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
create unique index if not exists orders_public_ref_key on public.orders (public_ref);

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pendiente', 'pagado', 'entregado', 'cancelado', 'requiere_atencion'));

alter table public.order_items add column if not exists option_label text;
alter table public.order_items add column if not exists fulfillment text not null default 'manual';
alter table public.order_items add column if not exists stock_applied boolean not null default false;

alter table public.game_accounts add column if not exists order_item_id uuid references public.order_items (id) on delete set null;

-- ---------- Crear pedido (solo lo llama el servidor de pagos, con la clave de servicio) ----------
create or replace function public.create_order(
  p_name text, p_email text, p_phone text, p_ref text, p_token text, p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_total numeric := 0;
  it jsonb;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (it->>'unit_price')::numeric * (it->>'quantity')::int;
  end loop;

  insert into public.orders (customer_name, customer_email, customer_phone, status, total,
                             payment_provider, public_ref, access_token)
  values (p_name, p_email, p_phone, 'pendiente', v_total, 'wompi', p_ref, p_token)
  returning id into v_id;

  insert into public.order_items (order_id, product_id, product_name, account_type, option_label,
                                  fulfillment, quantity, unit_price)
  select v_id, (x->>'product_id')::uuid, x->>'product_name', nullif(x->>'account_type', ''),
         nullif(x->>'option_label', ''), coalesce(x->>'fulfillment', 'manual'),
         (x->>'quantity')::int, (x->>'unit_price')::numeric
  from jsonb_array_elements(p_items) x;

  return v_id;
end;
$$;

-- ---------- Entregar un pedido pagado (atómico: dos clientes nunca reciben la misma cuenta) ----------
create or replace function public.deliver_order(p_order uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  it record;
  v_ids uuid[];
  v_have int;
  v_need int;
  v_missing boolean := false;
  v_manual int := 0;
  v_new text;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then return 'no_order'; end if;
  if o.status not in ('pagado', 'requiere_atencion') then return 'bad_status:' || o.status; end if;

  for it in select * from public.order_items where order_id = p_order loop
    if it.fulfillment = 'auto' and it.account_type is not null then
      select count(*) into v_have from public.game_accounts where order_item_id = it.id;
      v_need := it.quantity - v_have;
      if v_need > 0 then
        select array_agg(id) into v_ids from (
          select id from public.game_accounts
          where product_id = it.product_id and account_type = it.account_type and status = 'available'
          order by created_at
          limit v_need
          for update skip locked
        ) s;
        if coalesce(array_length(v_ids, 1), 0) < v_need then v_missing := true; end if;
        if v_ids is not null then
          update public.game_accounts
             set status = 'sold', sold_at = now(), order_id = p_order, order_item_id = it.id
           where id = any (v_ids);
        end if;
      end if;
    else
      v_manual := v_manual + 1;
      -- Productos con unidades (físicos): se descuentan al confirmar el pago.
      if not it.stock_applied and it.product_id is not null then
        update public.products set stock = stock - it.quantity
         where id = it.product_id and stock is not null and stock >= it.quantity;
        if found then
          update public.order_items set stock_applied = true where id = it.id;
        elsif exists (select 1 from public.products where id = it.product_id and stock is not null) then
          v_missing := true;
        end if;
      end if;
    end if;
  end loop;

  if v_missing then
    v_new := 'requiere_atencion';
  elsif v_manual = 0 then
    v_new := 'entregado';
  else
    v_new := 'pagado';
  end if;

  update public.orders
     set status = v_new,
         delivered_at = case when v_new = 'entregado' then now() else delivered_at end
   where id = p_order;
  return v_new;
end;
$$;

-- ---------- Registrar el resultado de un pago (lo llama el webhook de Wompi) ----------
create or replace function public.apply_payment(
  p_ref text, p_tx text, p_status text, p_amount_cents bigint
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
begin
  select * into o from public.orders where public_ref = p_ref for update;
  if not found then return 'not_found'; end if;

  if p_status = 'APPROVED' and o.status in ('pendiente', 'cancelado') then
    if p_amount_cents <> (o.total * 100)::bigint then
      update public.orders
         set status = 'requiere_atencion', payment_reference = p_tx,
             notes = coalesce(notes, '') || ' El monto pagado no coincide con el del pedido.'
       where id = o.id;
      return 'amount_mismatch';
    end if;
    update public.orders set status = 'pagado', paid_at = now(), payment_reference = p_tx where id = o.id;
    return public.deliver_order(o.id);
  elsif p_status in ('DECLINED', 'VOIDED', 'ERROR') and o.status = 'pendiente' then
    update public.orders set status = 'cancelado', payment_reference = p_tx where id = o.id;
    return 'cancelled';
  end if;
  return 'ignored:' || o.status;
end;
$$;

-- ---------- Reintentar la entrega desde el panel (solo administradores) ----------
create or replace function public.admin_retry_delivery(p_order uuid) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'no autorizado'; end if;
  update public.orders set status = 'pagado' where id = p_order and status = 'requiere_atencion';
  return public.deliver_order(p_order);
end;
$$;

-- ---------- Permisos: las funciones internas SOLO las usa el servidor; el reintento, el admin ----------
revoke all on function public.create_order(text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.deliver_order(uuid) from public, anon, authenticated;
revoke all on function public.apply_payment(text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.admin_retry_delivery(uuid) from public, anon;
grant execute on function public.create_order(text, text, text, text, text, jsonb) to service_role;
grant execute on function public.deliver_order(uuid) to service_role;
grant execute on function public.apply_payment(text, text, text, bigint) to service_role;
grant execute on function public.admin_retry_delivery(uuid) to authenticated;

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
-- Envíos de productos físicos y consolas: datos de envío del cliente y estado "enviado".
-- Ejecutar una vez en Supabase → SQL Editor (después de migracion_pedidos.sql).

alter table public.orders add column if not exists customer_document text;
alter table public.orders add column if not exists shipping_department text;
alter table public.orders add column if not exists shipping_city text;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists shipping_notes text;
alter table public.orders add column if not exists tracking text;
alter table public.orders add column if not exists shipped_at timestamptz;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado', 'requiere_atencion'));

drop function if exists public.create_order(text, text, text, text, text, jsonb);
create or replace function public.create_order(
  p_name text, p_email text, p_phone text, p_ref text, p_token text, p_items jsonb,
  p_shipping jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_total numeric := 0;
  it jsonb;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (it->>'unit_price')::numeric * (it->>'quantity')::int;
  end loop;

  insert into public.orders (customer_name, customer_email, customer_phone, status, total,
                             payment_provider, public_ref, access_token,
                             customer_document, shipping_department, shipping_city, shipping_address, shipping_notes)
  values (p_name, p_email, p_phone, 'pendiente', v_total, 'wompi', p_ref, p_token,
          nullif(p_shipping->>'document', ''), nullif(p_shipping->>'department', ''),
          nullif(p_shipping->>'city', ''), nullif(p_shipping->>'address', ''), nullif(p_shipping->>'notes', ''))
  returning id into v_id;

  insert into public.order_items (order_id, product_id, product_name, account_type, option_label,
                                  fulfillment, quantity, unit_price)
  select v_id, (x->>'product_id')::uuid, x->>'product_name', nullif(x->>'account_type', ''),
         nullif(x->>'option_label', ''), coalesce(x->>'fulfillment', 'manual'),
         (x->>'quantity')::int, (x->>'unit_price')::numeric
  from jsonb_array_elements(p_items) x;

  return v_id;
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, text, text, jsonb, jsonb) to service_role;

alter table public.products add column if not exists allow_whatsapp boolean not null default true;

alter table public.products add column if not exists option_groups jsonb;
-- Cupones de descuento. Ejecutar UNA vez en Supabase > SQL Editor.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric not null check (value > 0),
  min_total numeric not null default 0,
  max_uses int check (max_uses is null or max_uses > 0),
  expires_at timestamptz,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

alter table public.coupons enable row level security;
drop policy if exists "coupons: solo admin" on public.coupons;
create policy "coupons: solo admin" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.orders add column if not exists coupon_code text;
alter table public.orders add column if not exists discount numeric not null default 0;

-- Veces que se usó un código: pedidos pagados, o sin pagar pero recién creados (1 hora).
create or replace function public.coupon_used(p_code text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.orders
  where coupon_code = p_code
    and (status in ('pagado', 'enviado', 'entregado', 'requiere_atencion')
         or (status = 'pendiente' and created_at > now() - interval '1 hour'));
$$;
revoke all on function public.coupon_used(text) from public, anon, authenticated;
grant execute on function public.coupon_used(text) to service_role;

-- Para el panel: cuántas veces se usó cada código.
create or replace function public.admin_coupon_uses() returns table(code text, uses int)
language sql stable security definer set search_path = public as $$
  select c.code, public.coupon_used(c.code) from public.coupons c where public.is_admin();
$$;
revoke all on function public.admin_coupon_uses() from public, anon;
grant execute on function public.admin_coupon_uses() to authenticated;

-- Valida un código contra un subtotal y calcula el descuento (solo la usa el servidor).
create or replace function public.validate_coupon(p_code text, p_subtotal numeric) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons%rowtype;
  v_disc numeric;
begin
  select * into c from public.coupons where code = upper(trim(p_code));
  if not found or not c.active then
    return jsonb_build_object('ok', false, 'error', 'Ese código no existe o ya no está activo.');
  end if;
  if c.expires_at is not null and c.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'Este código ya venció.');
  end if;
  if c.max_uses is not null and public.coupon_used(c.code) >= c.max_uses then
    return jsonb_build_object('ok', false, 'error', 'Este código ya se agotó.');
  end if;
  if p_subtotal < c.min_total then
    return jsonb_build_object('ok', false, 'error',
      'Este código aplica en compras desde $' || replace(to_char(c.min_total, 'FM999,999,999'), ',', '.') || '.');
  end if;
  v_disc := case when c.kind = 'percent' then floor(p_subtotal * c.value / 100) else c.value end;
  v_disc := least(v_disc, p_subtotal - 2000); -- el pago en línea necesita un mínimo
  if v_disc <= 0 then
    return jsonb_build_object('ok', false, 'error', 'Este código no aplica a este total.');
  end if;
  return jsonb_build_object('ok', true, 'code', c.code, 'kind', c.kind, 'value', c.value, 'discount', v_disc);
end;
$$;
revoke all on function public.validate_coupon(text, numeric) from public, anon, authenticated;
grant execute on function public.validate_coupon(text, numeric) to service_role;

-- create_order ahora guarda el cupón y el descuento.
drop function if exists public.create_order(text, text, text, text, text, jsonb, jsonb);
create or replace function public.create_order(
  p_name text, p_email text, p_phone text, p_ref text, p_token text, p_items jsonb,
  p_shipping jsonb default null, p_coupon text default null, p_discount numeric default 0
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_total numeric := 0;
  it jsonb;
begin
  for it in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (it->>'unit_price')::numeric * (it->>'quantity')::int;
  end loop;
  v_total := v_total - coalesce(p_discount, 0);

  insert into public.orders (customer_name, customer_email, customer_phone, status, total,
                             payment_provider, public_ref, access_token,
                             customer_document, shipping_department, shipping_city, shipping_address, shipping_notes,
                             coupon_code, discount)
  values (p_name, p_email, p_phone, 'pendiente', v_total, 'wompi', p_ref, p_token,
          nullif(p_shipping->>'document', ''), nullif(p_shipping->>'department', ''),
          nullif(p_shipping->>'city', ''), nullif(p_shipping->>'address', ''), nullif(p_shipping->>'notes', ''),
          nullif(p_coupon, ''), coalesce(p_discount, 0))
  returning id into v_id;

  insert into public.order_items (order_id, product_id, product_name, account_type, option_label,
                                  fulfillment, quantity, unit_price)
  select v_id, (x->>'product_id')::uuid, x->>'product_name', nullif(x->>'account_type', ''),
         nullif(x->>'option_label', ''), coalesce(x->>'fulfillment', 'manual'),
         (x->>'quantity')::int, (x->>'unit_price')::numeric
  from jsonb_array_elements(p_items) x;

  return v_id;
end;
$$;

revoke all on function public.create_order(text, text, text, text, text, jsonb, jsonb, text, numeric) from public, anon, authenticated;
grant execute on function public.create_order(text, text, text, text, text, jsonb, jsonb, text, numeric) to service_role;
