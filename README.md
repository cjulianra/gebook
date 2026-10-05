# Belleza — SaaS para negocios de belleza

Plataforma multi-tenant para salones, barberías, spas de uñas y estudios similares: servicios, empleados, reservas y clientes.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS)

## Poner en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Copia `.env.local.example` a `.env.local` y completa:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role; **nunca** se expone al cliente, solo se usa en `src/lib/supabase/admin.ts` para invitar empleados)
3. Ejecuta la migración inicial contra tu proyecto:
   ```bash
   npx supabase db push --db-url <tu-connection-string>
   # o pega el contenido de supabase/migrations/0001_init.sql en el SQL Editor de Supabase
   ```
4. En Supabase → Authentication → Email, habilita "Email confirmations" según prefieras, y configura la plantilla de invitación (se usa para invitar empleados).
5. Instala dependencias y arranca:
   ```bash
   npm install
   npm run dev
   ```

## Arquitectura

- **Multi-tenant**: cada negocio (`businesses`) aísla sus datos vía `business_id` + Row Level Security. Ningún negocio puede ver datos de otro, incluso si el frontend tuviera un bug.
- **Roles**: `owner` / `admin` / `employee` por negocio (tabla `business_members`), más `is_super_admin` global en `profiles` para el panel de plataforma (pendiente de construir).
- **Esquema**: ver `supabase/migrations/0001_init.sql`, documentado con comentarios sobre cada decisión.
- **Tipos**: `src/lib/types/database.ts` está escrito a mano siguiendo el esquema. Cuando el proyecto Supabase exista, reemplázalo con `npx supabase gen types typescript`.

## Estructura

```
src/app/(auth)/login|register    → autenticación
src/app/onboarding/negocio        → alta del primer negocio (owner)
src/app/app/[business]/...        → panel del negocio (dashboard, reservas, servicios, empleados, clientes)
src/components/ui                 → sistema de diseño (Button, Input, Modal, Badge, estados, toasts…)
src/components/layout             → shell de navegación (sidebar desktop / tabs mobile)
src/lib/supabase                  → clientes browser/server/middleware/admin
supabase/migrations               → esquema SQL + RLS
```

## Pendiente para siguientes iteraciones

Panel de super admin, horarios de trabajo (`work_schedules` ya está en el esquema), reprogramar reservas, reportes, recordatorios, página pública de reservas, pagos.
