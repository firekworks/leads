# Firekworks Leads

App interna para localizar, puntuar y priorizar comercios locales antes de visitas comerciales.

## V5 operativa

- Radar con jerarquía visual, temperatura, estimación mensual, filtros y ausencia de Instagram/Facebook/web.
- Pipeline con avance/retroceso de estados y guardado automático.
- Ruta de visitas clickable y centrada en Castalla, Ibi, Onil, Biar y Tibi.
- Supabase como base central detrás de `/api/leads`, con fallback temporal a `localStorage`.
- Sin login ni logout: herramienta interna directa.
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GOOGLE_PLACES_API_KEY=
NEXT_PUBLIC_APP_URL=https://leads-six-tan.vercel.app
```

`SUPABASE_SECRET_KEY` y `GOOGLE_PLACES_API_KEY` son server-only y deben vivir en Vercel, no en GitHub.
La tabla `public.leads` y sus policies RLS estan definidas en `supabase/schema.sql`.
