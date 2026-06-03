FIREKWORKS LEADS V3

QUÉ ES
CRM visual para prospección local de Firekworks.
Funciona desde el primer deploy con localStorage.
Google Places se activa añadiendo GOOGLE_PLACES_API_KEY en Netlify.
Supabase está preparado en /supabase/schema.sql, pero no es obligatorio para probar.

SUBIR A GITHUB
1. Abre github.com/firekworks/leads
2. Borra los archivos actuales si quieres limpiar del todo, o reemplázalos con estos.
3. Sube EL CONTENIDO de esta carpeta, no la carpeta madre.
4. Debe quedar en raíz: app, components, lib, public, supabase, types, package.json, netlify.toml, next.config.mjs, tsconfig.json.
5. Commit changes.

NETLIFY
Build command: npm run build
Base directory: vacío
Publish directory: vacío
Node: 20

VARIABLE GOOGLE
Netlify → firekworks-leads → Project configuration → Environment variables → Add variable
Key: GOOGLE_PLACES_API_KEY
Value: tu clave de Google Places regenerada y restringida a Places API
Después: Deploys → Trigger deploy → Deploy site

USO
Radar: ver leads filtrados y priorizados.
Pipeline: ver el mismo listado por fases. Los filtros son compartidos.
Importar: traer negocios reales por ciudad + sector.
Ficha: clicar cualquier card para editar estado, canales, notas y próxima acción.

NOTA
Instagram y Facebook no se extraen de Google Places de forma fiable. En esta V3 se revisan manualmente dentro de la ficha del lead.
