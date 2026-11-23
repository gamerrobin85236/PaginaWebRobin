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
