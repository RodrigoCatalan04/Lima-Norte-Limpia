# Lima Norte Limpia

Plataforma web para el caso **Mascotas y salubridad en Lima Norte** (Los Olivos, Comas, San Martín de Porres e Independencia): registro de mascotas, reportes ciudadanos con foto y ubicación, fiscalización municipal y mapa de calor.

## Stack
Next.js 15 (App Router) · Supabase (Auth, Postgres con RLS, Storage) · Leaflet · Vitest · GitHub Actions · Vercel

## Puesta en marcha
1. `npm install`
2. Copia `.env.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (nunca uses la `service_role`).
3. En Supabase > SQL Editor ejecuta `supabase/schema.sql`.
4. `npm run dev`
5. Para crear el primer administrador, sigue el SQL comentado al final de `schema.sql`.

## Calidad y seguridad
- `npm run lint` (ESLint + eslint-plugin-security), `npm run typecheck`, `npm test`, `npm run build`
- Pipeline `.github/workflows/ci.yml`: build y pruebas → seguridad (npm audit, Gitleaks, CodeQL) → despliegue a Vercel (solo `main`)
- Controles: RLS en todas las tablas, rol nunca tomado del cliente, validación con Zod, límite de 5 reportes/hora en base de datos, bucket de fotos privado, cabeceras de seguridad, vista pública sin datos personales.

## Ramas
`main` (producción) y `test` (integración). Los cambios entran por Pull Request.
