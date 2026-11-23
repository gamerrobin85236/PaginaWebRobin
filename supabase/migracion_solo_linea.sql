-- Permite que un producto se venda SOLO en la página (sin botón de WhatsApp). Ejecutar una vez en Supabase → SQL Editor.
alter table public.products add column if not exists allow_whatsapp boolean not null default true;
