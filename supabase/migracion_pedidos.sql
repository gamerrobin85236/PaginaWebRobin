-- Migración: pedidos con pago en línea (Wompi), compra sin cuenta y entrega automática de cuentas.
-- Ejecutar UNA vez en Supabase → SQL Editor, DESPUÉS de migracion_cuentas.sql. Es seguro repetirla.

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
