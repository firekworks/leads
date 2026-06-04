# Firekworks Leads

App interna para localizar, puntuar y priorizar comercios locales antes de visitas comerciales.

## V4 estable

- Radar con búsqueda, filtros de ciudad, sector, estado, score, seguidores IG, uso de contenido y ausencia de Instagram/Facebook/web.
- Pipeline por estados comerciales V4.
- Ruta de visitas ordenada por oportunidad.
- Supabase como fuente principal con fallback temporal a `localStorage`.
- Auth con Supabase y rutas protegidas.
- Enriquecimiento web/redes en `app/api/enrich/route.ts`.
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
NEXT_PUBLIC_APP_URL=https://app.firekworks.es
```

La tabla `public.leads` y sus policies RLS estan definidas en `supabase/schema.sql`.
