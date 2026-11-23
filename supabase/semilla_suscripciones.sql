-- Crea la sección "Suscripciones" (si no existe) y los dos productos: PlayStation Plus y Xbox Game Pass.
-- Quedan OCULTOS hasta que Robin escriba los precios y marque "Disponible" en el admin.
-- Ejecutar una vez en Supabase → SQL Editor.

alter table public.products add column if not exists option_groups jsonb;
alter table public.products add column if not exists allow_whatsapp boolean not null default true;

insert into public.sections (slug, name, description, icon, kind, active, position)
select 'suscripciones', 'Suscripciones', 'PlayStation Plus y Xbox Game Pass', 'crown', 'subscription', true,
       coalesce((select max(position) + 1 from public.sections), 0)
where not exists (select 1 from public.sections where kind = 'subscription');

insert into public.products (section_id, name, slug, description, image_url, price, options, option_groups,
                             fulfillment, featured, available, buy_mode, allow_whatsapp, position)
select s.id, 'PlayStation Plus', 'playstation-plus',
       'Elige tu consola, el plan y el tiempo. El precio se calcula solo.',
       'https://robingames.shop/productos/playstation-plus.webp', 0, '[]'::jsonb,
       '[{"title":"Consola","values":["PS4","PS5"]},
         {"title":"Plan","values":["Essential","Extra","Deluxe"]},
         {"title":"Duración","values":["1 mes","3 meses","12 meses"]}]'::jsonb,
       'manual', false, false, 'online', true, 0
from (select id from public.sections where kind = 'subscription' order by position limit 1) s
on conflict (slug) do nothing;

insert into public.products (section_id, name, slug, description, image_url, price, options, option_groups,
                             fulfillment, featured, available, buy_mode, allow_whatsapp, position)
select s.id, 'Xbox Game Pass', 'xbox-game-pass',
       'Elige el plan y el tiempo. El precio se calcula solo.',
       'https://robingames.shop/productos/xbox-game-pass.webp', 0, '[]'::jsonb,
       '[{"title":"Plan","values":["Essential","Premium","Ultimate","Solo para PC"]},
         {"title":"Duración","values":["1 mes","3 meses","12 meses"]}]'::jsonb,
       'manual', false, false, 'online', true, 1
from (select id from public.sections where kind = 'subscription' order by position limit 1) s
on conflict (slug) do nothing;
