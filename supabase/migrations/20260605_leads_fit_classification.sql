alter table public.leads
  add column if not exists fit_classification text not null default 'unknown',
  add column if not exists manual_override boolean not null default false,
  add column if not exists score_tags jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_fit_classification_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_fit_classification_check
      check (fit_classification in (
        'valid_client_candidate',
        'public_entity',
        'tourism_public',
        'healthcare_public',
        'education_public',
        'emergency_service',
        'government',
        'duplicate',
        'low_fit',
        'unknown'
      ));
  end if;
end $$;

with classified as (
  select
    id,
    case
      when lower(concat_ws(' ', name, sector, description, website_title, address)) ~
        '(polic[ií]a|guardia civil|bomberos|protecci[oó]n civil)' then 'emergency_service'
      when lower(concat_ws(' ', name, sector, description, website_title, address)) ~
        '(ayuntamiento|ajuntament|diputaci[oó]n|conselleria|generalitat|ministerio|juzgado|registro civil|sepe|seguridad social|suma gesti[oó]n|mancomunidad|servicio p[úu]blico)' then 'government'
      when lower(concat_ws(' ', name, sector, description, website_title, address)) ~
        '(oficina de turismo|tourist info|turismo municipal|museo municipal|museo de|mubio|castillo de|palacio[- ]fortaleza|casa de cultura|biblioteca municipal|casa t[áa]pena|laberinto casa)' then 'tourism_public'
      when lower(concat_ws(' ', name, sector, description, website_title, address)) ~
        '(centro de salud|consultorio p[úu]blico|consultorio m[eé]dico|hospital p[úu]blico|ambulatorio)' then 'healthcare_public'
      when lower(concat_ws(' ', name, sector, description, website_title, address)) ~
        '(colegio p[úu]blico|instituto p[úu]blico|ies |ceip |escuela infantil municipal)' then 'education_public'
      else null
    end as fit
  from public.leads
)
update public.leads l
set
  fit_classification = c.fit,
  is_disqualified = true,
  is_invalid = true,
  validation_status = 'descartado',
  status = 'No contactar',
  disqualified_category = c.fit,
  invalid_reason = coalesce(nullif(l.invalid_reason, ''), 'No cliente probable'),
  disqualified_reason = coalesce(nullif(l.disqualified_reason, ''), 'No cliente probable'),
  score = least(coalesce(l.score, 0), 25),
  score_total = least(coalesce(l.score_total, l.score, 0), 25),
  score_presencia_digital = 0,
  score_urgencia = 0,
  score_dinero = 0,
  score_facilidad_contacto = 0,
  score_probabilidad_cierre = 0,
  score_potencial_mensualidad = 0,
  score_prioridad_visita = 0,
  score_explanation = jsonb_build_array('No cliente probable: entidad pública o institucional.'),
  score_tags = jsonb_build_array('No cliente', c.fit),
  updated_at = now()
from classified c
where l.id = c.id
  and c.fit is not null
  and coalesce(l.manual_override, false) = false;

update public.leads
set fit_classification = 'valid_client_candidate'
where fit_classification = 'unknown'
  and coalesce(is_invalid, false) = false
  and coalesce(is_disqualified, false) = false;

create index if not exists leads_fit_classification_idx on public.leads(fit_classification);
create index if not exists leads_manual_override_idx on public.leads(manual_override);
