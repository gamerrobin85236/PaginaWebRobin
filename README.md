# Gamer Robin — Tienda oficial

Tienda web con secciones, catálogo, carrito por WhatsApp y (próximamente) pagos en línea y panel de administración.

## Estado actual (fase 1)
- Estructura de la tienda: inicio por secciones, catálogo por sección, página de producto, búsqueda, carrito.
- Menú lateral (computador) y menú hamburguesa (celular).
- Colores en **un solo archivo**: `src/styles/theme.css`.
- Datos de **ejemplo** (`src/data/demo.ts`). Aún no está conectada la base de datos.
- Esquema de base de datos listo en `supabase/schema.sql`.

## Qué sigue
1. Crear el proyecto de Supabase de Robin y ejecutar `supabase/schema.sql`.
2. Conectar el catálogo a la base de datos.
3. Panel de administración (secciones, productos, imágenes, orden).
4. Compra directa con pasarela de pagos y pedidos.

## Dónde cambiar cosas
| Qué | Dónde |
| --- | --- |
| Colores | `src/styles/theme.css` |
| Nombre, WhatsApp, dirección, redes | `src/config/store.ts` |
| Logo | `public/logo.png` y `public/favicon.png` |

## Probar en tu computador
```
npm install
npm run dev
```

## Claves
Copia `.env.example` como `.env` y completa con los datos de Supabase.
La clave `anon` puede ir ahí. La clave `service_role` **nunca** va en el código ni en el repositorio.
