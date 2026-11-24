-- Cambia la categoría "Ofertas relámpago" por "Gift cards" (saldo para Xbox, Nintendo, etc.).
-- Ejecutar UNA vez en Supabase > SQL Editor.
update public.sections
set slug = 'gift-cards',
    name = 'Gift cards',
    description = 'Saldo para Xbox, Nintendo eShop y más. Recarga tu cuenta y compra los juegos que quieras.',
    icon = 'gift',
    kind = 'streaming'
where slug = 'ofertas-relampago';
