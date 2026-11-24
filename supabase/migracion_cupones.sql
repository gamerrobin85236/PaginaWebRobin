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
