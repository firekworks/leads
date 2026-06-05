# Firekworks Leads

App interna para localizar, puntuar y priorizar comercios locales antes de visitas comerciales.

## V6 interna segura

- CRM interno para prospección local: dashboard comercial, pipeline, ruta, scoring avanzado y ficha editable.
- Acceso protegido con Supabase Auth y perfiles internos (`admin`, `sales`, `viewer`).
- Vista de leads con jerarquía visual, temperatura, estimación mensual, filtros y ausencia de Instagram/Facebook/web/WhatsApp/teléfono.
- Pipeline Kanban con arrastre entre estados y guardado automático.
- Ruta de visitas clickable centrada en Castalla, Ibi, Onil, Biar y Tibi.
- Supabase como base central detrás de `/api/leads`, con fallback temporal a `localStorage`.
- Audit logs y tablas CRM para actividades, tareas, notas, scoring y conversión a cliente.
- Enriquecimiento web/redes en `app/api/enrich/route.ts`.
- Importación controlada de Google Places en `app/api/places/import/route.ts`.
- Exportación CSV.

## Arranque local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xmkhdjjnxlpwqeatiwfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_o_anon_key
SUPABASE_SERVICE_ROLE_KEY=service_role_server_only
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_APP_URL=https://leads-six-tan.vercel.app
INTERNAL_ADMIN_EMAILS=tu-email-interno@firekworks.com
```

`SUPABASE_SERVICE_ROLE_KEY` y `GOOGLE_PLACES_API_KEY` son server-only y deben vivir en Vercel, no en GitHub.
`NEXT_PUBLIC_SUPABASE_ANON_KEY` puede usar la publishable/anon key del proyecto, nunca una `sb_secret_...` ni service role.
No existe ninguna variable `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

## Supabase Auth

Configurar en Supabase:

- Site URL: `https://leads-six-tan.vercel.app`
- Redirect URLs:
  - `https://leads-six-tan.vercel.app/**`
  - `https://leads-six-tan.vercel.app/auth/callback`
  - `https://leads-six-tan.vercel.app/auth/update-password`

El reset de contraseña usa `NEXT_PUBLIC_APP_URL/auth/update-password`, no `localhost`.

Las migraciones seguras viven en `supabase/migrations/` y son la fuente de verdad del schema. El esquema SQL antiguo se ha eliminado para no conservar policies anon obsoletas.
