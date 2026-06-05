create extension if not exists pgcrypto;
create schema if not exists private;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'sales', 'viewer', 'client'));

create table if not exists public.client_login_aliases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null unique,
  auth_email text not null unique,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_login_aliases_username_format
    check (
      username = lower(username)
      and username !~ '\s'
      and username not in (
        'admin', 'root', 'firekworks', 'soporte', 'stats', 'leads',
        'radar', 'null', 'undefined', 'test', 'demo'
      )
    )
);

create index if not exists idx_client_login_aliases_client_id
  on public.client_login_aliases(client_id);
create index if not exists idx_client_login_aliases_user_id
  on public.client_login_aliases(user_id);

create table if not exists public.app_texts (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('web', 'radar', 'leads', 'stats')),
  key text not null,
  value text not null,
  description text,
  category text,
  is_public boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (app, key)
);

create index if not exists idx_app_texts_app_category on public.app_texts(app, category);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  visible_to_client boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_client_id on public.tasks(client_id);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_client_login_aliases_updated_at on public.client_login_aliases;
create trigger trg_client_login_aliases_updated_at
before update on public.client_login_aliases
for each row execute function private.touch_updated_at();

drop trigger if exists trg_app_texts_updated_at on public.app_texts;
create trigger trg_app_texts_updated_at
before update on public.app_texts
for each row execute function private.touch_updated_at();

create or replace function private.audit_alias_and_text_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs(table_name, record_id, action, user_id, old_data, new_data)
  values (
    tg_table_name,
    coalesce(new.id::text, old.id::text),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_client_login_aliases on public.client_login_aliases;
create trigger trg_audit_client_login_aliases
after insert or update or delete on public.client_login_aliases
for each row execute function private.audit_alias_and_text_changes();

drop trigger if exists trg_audit_app_texts on public.app_texts;
create trigger trg_audit_app_texts
after insert or update or delete on public.app_texts
for each row execute function private.audit_alias_and_text_changes();

alter table public.client_login_aliases enable row level security;
alter table public.app_texts enable row level security;
alter table public.tasks enable row level security;

revoke all on public.client_login_aliases from anon;
revoke all on public.app_texts from anon;
revoke all on public.tasks from anon;
grant select, insert, update, delete on public.client_login_aliases to authenticated;
grant select on public.app_texts to anon, authenticated;
grant insert, update, delete on public.app_texts to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

drop policy if exists client_aliases_select_sales on public.client_login_aliases;
drop policy if exists client_aliases_insert_sales on public.client_login_aliases;
drop policy if exists client_aliases_update_sales on public.client_login_aliases;
drop policy if exists client_aliases_delete_admin on public.client_login_aliases;

create policy client_aliases_select_sales
  on public.client_login_aliases for select
  to authenticated
  using (private.can_edit_leads());

create policy client_aliases_insert_sales
  on public.client_login_aliases for insert
  to authenticated
  with check (private.can_edit_leads());

create policy client_aliases_update_sales
  on public.client_login_aliases for update
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy client_aliases_delete_admin
  on public.client_login_aliases for delete
  to authenticated
  using (private.is_internal_admin());

drop policy if exists app_texts_select_public_or_internal on public.app_texts;
drop policy if exists app_texts_insert_admin on public.app_texts;
drop policy if exists app_texts_update_admin on public.app_texts;
drop policy if exists app_texts_delete_admin on public.app_texts;

create policy app_texts_select_public_or_internal
  on public.app_texts for select
  using (is_public = true or private.is_internal_user());

create policy app_texts_insert_admin
  on public.app_texts for insert
  to authenticated
  with check (private.is_internal_admin());

create policy app_texts_update_admin
  on public.app_texts for update
  to authenticated
  using (private.is_internal_admin())
  with check (private.is_internal_admin());

create policy app_texts_delete_admin
  on public.app_texts for delete
  to authenticated
  using (private.is_internal_admin());

drop policy if exists clients_select_client_portal_self on public.clients;
create policy clients_select_client_portal_self
  on public.clients for select
  to authenticated
  using (client_portal_enabled = true and private.is_client_user(id));

drop policy if exists tasks_select_internal on public.tasks;
drop policy if exists tasks_select_client_visible on public.tasks;
drop policy if exists tasks_insert_internal on public.tasks;
drop policy if exists tasks_update_internal on public.tasks;
drop policy if exists tasks_delete_internal on public.tasks;

create policy tasks_select_internal
  on public.tasks for select
  to authenticated
  using (private.is_internal_user());

create policy tasks_select_client_visible
  on public.tasks for select
  to authenticated
  using (visible_to_client = true and private.is_client_user(client_id));

create policy tasks_insert_internal
  on public.tasks for insert
  to authenticated
  with check (private.can_edit_leads());

create policy tasks_update_internal
  on public.tasks for update
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy tasks_delete_internal
  on public.tasks for delete
  to authenticated
  using (private.can_edit_leads());

create or replace view public.client_profile_view
with (security_barrier = true)
as
select
  c.id,
  c.name,
  c.sector,
  c.city,
  c.website,
  c.instagram_url,
  c.facebook_url,
  c.whatsapp_url,
  c.logo_url,
  c.status,
  c.public_leaderboard_name,
  c.show_in_leaderboard,
  c.client_portal_enabled,
  c.portal_status
from public.clients c
where c.client_portal_enabled = true
  and private.can_view_client(c.id);

create or replace view public.client_score_public_view
with (security_barrier = true)
as
select
  client_id,
  score,
  level,
  level_name,
  communication_score,
  approval_speed_score,
  ease_of_work_score,
  growth_potential_score,
  perceived_satisfaction_score,
  visible_label,
  updated_at
from public.client_scores
where private.can_view_client(client_id);

create or replace view public.client_tasks_public_view
with (security_barrier = true)
as
select
  id,
  client_id,
  title,
  due_date,
  status,
  visible_to_client
from public.tasks
where visible_to_client = true
  and private.can_view_client(client_id);

grant select on public.client_profile_view to authenticated;
grant select on public.client_score_public_view to authenticated;
grant select on public.client_tasks_public_view to authenticated;

insert into public.app_texts(app, key, value, description, category, is_public)
values
  ('leads', 'login.title', 'Acceso interno', 'Título del login interno de Leads', 'auth', true),
  ('leads', 'login.subtitle', 'Solo usuarios autorizados de Firekworks pueden ver oportunidades, contactos y pipeline.', 'Subtítulo del login interno', 'auth', true),
  ('leads', 'dashboard.title', 'Radar de comercios', 'Título principal de Leads', 'dashboard', false),
  ('leads', 'dashboard.subtitle', 'Prioridad, temperatura, hueco visual y siguiente acción en una sola vista.', 'Subtítulo principal de Leads', 'dashboard', false),
  ('stats', 'login.title', 'Acceso cliente', 'Título del login de Stats', 'auth', true),
  ('stats', 'login.subtitle', 'Entra con tu usuario de cliente para ver resultados, campañas y próximos pasos.', 'Subtítulo del login de Stats', 'auth', true),
  ('stats', 'client.dashboard.title', 'Resumen de resultados', 'Título del dashboard cliente', 'client', true),
  ('stats', 'admin.dashboard.title', 'Panel Firekworks Stats', 'Título del dashboard admin', 'admin', false),
  ('radar', 'login.title', 'Acceso Radar', 'Título público/controlado de Radar', 'auth', true),
  ('web', 'homepage.cta', 'Hablemos de captación local', 'CTA editable de Firekworks Web', 'marketing', true)
on conflict (app, key) do update set
  value = excluded.value,
  description = excluded.description,
  category = excluded.category,
  is_public = excluded.is_public,
  updated_at = now();
