-- Endurecimiento de la base de datos. Ejecutar UNA vez en Supabase → SQL Editor. Es seguro repetirlo.
-- (Las reglas de acceso RLS ya existen: el público solo lee; solo el administrador escribe.)

-- 1) Límites de tamaño y formato en los datos: nadie puede guardar textos enormes ni precios absurdos.
alter table public.sections drop constraint if exists sections_limits;
alter table public.sections add constraint sections_limits check (
  char_length(name) between 1 and 100
  and char_length(description) <= 500
  and slug ~ '^[a-z0-9-]{1,120}$'
);

alter table public.products drop constraint if exists products_limits;
alter table public.products add constraint products_limits check (
  char_length(name) between 1 and 200
  and char_length(description) <= 5000
  and slug ~ '^[a-z0-9-]{1,200}$'
  and price <= 100000000
  and (price_secondary is null or price_secondary <= 100000000)
  and (platform is null or char_length(platform) <= 50)
  and jsonb_typeof(options) = 'array'
  and jsonb_array_length(options) <= 30
);

-- 2) Imágenes: máximo 5 MB y solo JPG, PNG o WebP (nunca SVG ni otros archivos).
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png']
where id = 'products';

-- 3) La tabla de administradores no se puede modificar desde la web, solo desde este panel de SQL.
revoke insert, update, delete on public.admin_users from anon, authenticated;
