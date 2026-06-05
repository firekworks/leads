create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text default '',
  role text not null default 'viewer'
    check (role in ('admin', 'sales', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_internal_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.is_active = true
  limit 1
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_internal_role() in ('admin', 'sales', 'viewer')
$$;

create or replace function public.can_edit_leads()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_internal_role() in ('admin', 'sales')
$$;

create or replace function public.is_internal_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_internal_role() = 'admin'
$$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  lead_id text references public.leads(id) on delete set null,
  name text not null,
  sector text default '',
  city text default '',
  address text default '',
  phone text default '',
  website text default '',
  instagram_url text default '',
  facebook_url text default '',
  whatsapp_url text default '',
  logo_url text default '',
  billing_name text default '',
  tax_id text default '',
  billing_email text default '',
  billing_address text default '',
  status text not null default 'Activo'
    check (status in ('Pendiente datos fiscales', 'Activo', 'Pausado', 'Baja')),
  source text not null default 'lead',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_to_client_links (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (lead_id, client_id)
);

alter table public.leads
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists team_id uuid,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists next_follow_up_type text default '',
  add column if not exists problem_detected text default '',
  add column if not exists opportunity_detected text default '',
  add column if not exists sales_hook text default '',
  add column if not exists recommended_service text default '',
  add column if not exists probable_objection text default '',
  add column if not exists suggested_whatsapp_message text default '',
  add column if not exists suggested_instagram_message text default '',
  add column if not exists in_person_argument text default '',
  add column if not exists recommended_offer text default '',
  add column if not exists score_total integer default 0,
  add column if not exists score_presencia_digital integer default 0,
  add column if not exists score_urgencia integer default 0,
  add column if not exists score_dinero integer default 0,
  add column if not exists score_facilidad_contacto integer default 0,
  add column if not exists score_probabilidad_cierre integer default 0,
  add column if not exists score_potencial_mensualidad integer default 0,
  add column if not exists score_prioridad_visita integer default 0,
  add column if not exists score_explanation jsonb not null default '[]'::jsonb,
  add column if not exists ads_signal text default '',
  add column if not exists data_quality jsonb not null default '{}'::jsonb;

alter table public.leads drop constraint if exists leads_status_check;

update public.leads
set status = case status
  when 'Descartado' then 'No contactar'
  when 'Interesado' then 'Respondió'
  when 'Visita/Reunión' then 'Reunión agendada'
  when 'Cliente' then 'Ganado'
  when 'Desinteresado' then 'Perdido'
  else status
end
where status in ('Descartado', 'Interesado', 'Visita/Reunión', 'Cliente', 'Desinteresado');

alter table public.leads
  add constraint leads_status_check
  check (status in (
    'Detectado',
    'Validado',
    'Prioritario',
    'Contactado',
    'Respondió',
    'Reunión agendada',
    'Diagnóstico hecho',
    'Propuesta enviada',
    'Negociación',
    'Ganado',
    'Perdido',
    'No encaja',
    'No contactar'
  ));

update public.leads
set score_total = coalesce(nullif(score_total, 0), score, 0),
    score_presencia_digital = coalesce(nullif(score_presencia_digital, 0), least(100, greatest(0, score))),
    score_urgencia = coalesce(nullif(score_urgencia, 0), least(100, greatest(0, score))),
    score_dinero = coalesce(nullif(score_dinero, 0), least(100, greatest(0, round(potential / 10.0)::int))),
    score_facilidad_contacto = coalesce(nullif(score_facilidad_contacto, 0),
      least(100, (case when phone <> '' then 35 else 0 end) + (case when whatsapp_url <> '' then 35 else 0 end) + (case when website <> '' then 15 else 0 end) + (case when google_maps_url <> '' then 15 else 0 end))),
    score_probabilidad_cierre = coalesce(nullif(score_probabilidad_cierre, 0), least(100, greatest(0, score - 10))),
    score_potencial_mensualidad = coalesce(nullif(score_potencial_mensualidad, 0), least(100, greatest(0, round(potential / 10.0)::int))),
    score_prioridad_visita = coalesce(nullif(score_prioridad_visita, 0),
      least(100, greatest(0, score + case when city in ('Castalla', 'Ibi', 'Onil', 'Biar', 'Tibi') then 10 else -15 end))),
    score_explanation = case
      when score_explanation = '[]'::jsonb then jsonb_build_array('Score inicial migrado desde el CRM V5.')
      else score_explanation
    end
where true;

create table if not exists public.lead_scores (
  lead_id text primary key references public.leads(id) on delete cascade,
  score_total integer not null default 0,
  score_presencia_digital integer not null default 0,
  score_urgencia integer not null default 0,
  score_dinero integer not null default 0,
  score_facilidad_contacto integer not null default 0,
  score_probabilidad_cierre integer not null default 0,
  score_potencial_mensualidad integer not null default 0,
  score_prioridad_visita integer not null default 0,
  explanation jsonb not null default '[]'::jsonb,
  generated_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.lead_scores (
  lead_id,
  score_total,
  score_presencia_digital,
  score_urgencia,
  score_dinero,
  score_facilidad_contacto,
  score_probabilidad_cierre,
  score_potencial_mensualidad,
  score_prioridad_visita,
  explanation
)
select
  id,
  score_total,
  score_presencia_digital,
  score_urgencia,
  score_dinero,
  score_facilidad_contacto,
  score_probabilidad_cierre,
  score_potencial_mensualidad,
  score_prioridad_visita,
  score_explanation
from public.leads
on conflict (lead_id) do update set
  score_total = excluded.score_total,
  score_presencia_digital = excluded.score_presencia_digital,
  score_urgencia = excluded.score_urgencia,
  score_dinero = excluded.score_dinero,
  score_facilidad_contacto = excluded.score_facilidad_contacto,
  score_probabilidad_cierre = excluded.score_probabilidad_cierre,
  score_potencial_mensualidad = excluded.score_potencial_mensualidad,
  score_prioridad_visita = excluded.score_prioridad_visita,
  explanation = excluded.explanation,
  updated_at = now();

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null
    check (type in ('llamada', 'WhatsApp', 'email', 'Instagram', 'visita', 'reunión', 'propuesta', 'nota', 'sistema')),
  occurred_at timestamptz not null default now(),
  result text default '',
  next_action text default '',
  reminder_at timestamptz,
  file_url text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  type text not null default 'seguimiento',
  title text not null default '',
  description text default '',
  due_at timestamptz,
  priority text not null default 'Media'
    check (priority in ('Muy alta', 'Alta', 'Media', 'Baja')),
  status text not null default 'pendiente'
    check (status in ('pendiente', 'hecha', 'pospuesta', 'cancelada')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  note text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  source_type text not null default 'manual',
  source_url text default '',
  provider text default '',
  external_id text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_duplicates (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  duplicate_lead_id text not null references public.leads(id) on delete cascade,
  reason text not null,
  confidence numeric not null default 0,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'fusionado', 'descartado')),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (lead_id <> duplicate_lead_id),
  unique (lead_id, duplicate_lead_id, reason)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null,
  user_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.audit_important_lead_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    old.status is distinct from new.status or
    old.priority is distinct from new.priority or
    old.assigned_to is distinct from new.assigned_to or
    old.client_id is distinct from new.client_id or
    old.is_invalid is distinct from new.is_invalid
  ) then
    insert into public.audit_logs(table_name, record_id, action, user_id, old_data, new_data)
    values (
      'leads',
      new.id,
      'UPDATE',
      auth.uid(),
      jsonb_build_object(
        'status', old.status,
        'priority', old.priority,
        'assigned_to', old.assigned_to,
        'client_id', old.client_id,
        'is_invalid', old.is_invalid
      ),
      jsonb_build_object(
        'status', new.status,
        'priority', new.priority,
        'assigned_to', new.assigned_to,
        'client_id', new.client_id,
        'is_invalid', new.is_invalid
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_important_lead_changes on public.leads;
create trigger trg_audit_important_lead_changes
after update on public.leads
for each row
execute function public.audit_important_lead_changes();

create index if not exists leads_owner_user_idx on public.leads(owner_user_id);
create index if not exists leads_assigned_to_idx on public.leads(assigned_to);
create index if not exists leads_client_id_idx on public.leads(client_id);
create index if not exists leads_next_follow_up_idx on public.leads(next_follow_up_at) where next_follow_up_at is not null;
create index if not exists leads_score_total_idx on public.leads(score_total desc);
create index if not exists leads_status_score_idx on public.leads(status, score_total desc);
create index if not exists lead_activities_lead_date_idx on public.lead_activities(lead_id, occurred_at desc);
create index if not exists lead_tasks_due_idx on public.lead_tasks(status, due_at);
create index if not exists lead_notes_lead_idx on public.lead_notes(lead_id, created_at desc);
create index if not exists clients_lead_id_idx on public.clients(lead_id);
create index if not exists audit_logs_record_idx on public.audit_logs(table_name, record_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.lead_to_client_links enable row level security;
alter table public.lead_scores enable row level security;
alter table public.lead_activities enable row level security;
alter table public.lead_tasks enable row level security;
alter table public.lead_notes enable row level security;
alter table public.lead_sources enable row level security;
alter table public.lead_duplicates enable row level security;
alter table public.audit_logs enable row level security;

revoke all on public.leads from anon;
revoke all on public.profiles from anon;
revoke all on public.clients from anon;
revoke all on public.lead_to_client_links from anon;
revoke all on public.lead_scores from anon;
revoke all on public.lead_activities from anon;
revoke all on public.lead_tasks from anon;
revoke all on public.lead_notes from anon;
revoke all on public.lead_sources from anon;
revoke all on public.lead_duplicates from anon;
revoke all on public.audit_logs from anon;

grant select, insert, update, delete on public.leads to authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.clients to authenticated, service_role;
grant select, insert, update, delete on public.lead_to_client_links to authenticated, service_role;
grant select, insert, update, delete on public.lead_scores to authenticated, service_role;
grant select, insert, update, delete on public.lead_activities to authenticated, service_role;
grant select, insert, update, delete on public.lead_tasks to authenticated, service_role;
grant select, insert, update, delete on public.lead_notes to authenticated, service_role;
grant select, insert, update, delete on public.lead_sources to authenticated, service_role;
grant select, insert, update, delete on public.lead_duplicates to authenticated, service_role;
grant select, insert on public.audit_logs to authenticated, service_role;

drop policy if exists "leads_select_own" on public.leads;
drop policy if exists "leads_insert_own" on public.leads;
drop policy if exists "leads_update_own" on public.leads;
drop policy if exists "leads_delete_own" on public.leads;
drop policy if exists "leads_select_shared" on public.leads;
drop policy if exists "leads_insert_shared" on public.leads;
drop policy if exists "leads_update_shared" on public.leads;
drop policy if exists "leads_delete_shared" on public.leads;

create policy "internal_leads_select"
  on public.leads for select
  to authenticated
  using (public.is_internal_user());

create policy "internal_leads_insert"
  on public.leads for insert
  to authenticated
  with check (public.can_edit_leads());

create policy "internal_leads_update"
  on public.leads for update
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "internal_leads_delete"
  on public.leads for delete
  to authenticated
  using (public.is_internal_admin());

create policy "profiles_select_internal"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid() or public.is_internal_admin());

create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_internal_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_internal_admin())
  with check (public.is_internal_admin());

create policy "clients_select_internal"
  on public.clients for select
  to authenticated
  using (public.is_internal_user());

create policy "clients_write_sales"
  on public.clients for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "links_select_internal"
  on public.lead_to_client_links for select
  to authenticated
  using (public.is_internal_user());

create policy "links_write_sales"
  on public.lead_to_client_links for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "scores_select_internal"
  on public.lead_scores for select
  to authenticated
  using (public.is_internal_user());

create policy "scores_write_sales"
  on public.lead_scores for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "activities_select_internal"
  on public.lead_activities for select
  to authenticated
  using (public.is_internal_user());

create policy "activities_write_sales"
  on public.lead_activities for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "tasks_select_internal"
  on public.lead_tasks for select
  to authenticated
  using (public.is_internal_user());

create policy "tasks_write_sales"
  on public.lead_tasks for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "notes_select_internal"
  on public.lead_notes for select
  to authenticated
  using (public.is_internal_user());

create policy "notes_write_sales"
  on public.lead_notes for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "sources_select_internal"
  on public.lead_sources for select
  to authenticated
  using (public.is_internal_user());

create policy "sources_write_sales"
  on public.lead_sources for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "duplicates_select_internal"
  on public.lead_duplicates for select
  to authenticated
  using (public.is_internal_user());

create policy "duplicates_write_sales"
  on public.lead_duplicates for all
  to authenticated
  using (public.can_edit_leads())
  with check (public.can_edit_leads());

create policy "audit_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.is_internal_admin());

create policy "audit_insert_internal"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_internal_user());
