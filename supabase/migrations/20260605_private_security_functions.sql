create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;

create or replace function private.current_internal_role()
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

create or replace function private.is_internal_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select private.current_internal_role() in ('admin', 'sales', 'viewer')
$$;

create or replace function private.can_edit_leads()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select private.current_internal_role() in ('admin', 'sales')
$$;

create or replace function private.is_internal_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select private.current_internal_role() = 'admin'
$$;

create or replace function private.audit_important_lead_changes()
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
execute function private.audit_important_lead_changes();

drop policy if exists "internal_leads_select" on public.leads;
drop policy if exists "internal_leads_insert" on public.leads;
drop policy if exists "internal_leads_update" on public.leads;
drop policy if exists "internal_leads_delete" on public.leads;
drop policy if exists "profiles_select_internal" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "clients_select_internal" on public.clients;
drop policy if exists "clients_write_sales" on public.clients;
drop policy if exists "links_select_internal" on public.lead_to_client_links;
drop policy if exists "links_write_sales" on public.lead_to_client_links;
drop policy if exists "scores_select_internal" on public.lead_scores;
drop policy if exists "scores_write_sales" on public.lead_scores;
drop policy if exists "activities_select_internal" on public.lead_activities;
drop policy if exists "activities_write_sales" on public.lead_activities;
drop policy if exists "tasks_select_internal" on public.lead_tasks;
drop policy if exists "tasks_write_sales" on public.lead_tasks;
drop policy if exists "notes_select_internal" on public.lead_notes;
drop policy if exists "notes_write_sales" on public.lead_notes;
drop policy if exists "sources_select_internal" on public.lead_sources;
drop policy if exists "sources_write_sales" on public.lead_sources;
drop policy if exists "duplicates_select_internal" on public.lead_duplicates;
drop policy if exists "duplicates_write_sales" on public.lead_duplicates;
drop policy if exists "audit_select_admin" on public.audit_logs;
drop policy if exists "audit_insert_internal" on public.audit_logs;

create policy "internal_leads_select"
  on public.leads for select
  to authenticated
  using (private.is_internal_user());

create policy "internal_leads_insert"
  on public.leads for insert
  to authenticated
  with check (private.can_edit_leads());

create policy "internal_leads_update"
  on public.leads for update
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "internal_leads_delete"
  on public.leads for delete
  to authenticated
  using (private.is_internal_admin());

create policy "profiles_select_internal"
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid() or private.is_internal_admin());

create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (private.is_internal_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (private.is_internal_admin())
  with check (private.is_internal_admin());

create policy "clients_select_internal"
  on public.clients for select
  to authenticated
  using (private.is_internal_user());

create policy "clients_write_sales"
  on public.clients for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "links_select_internal"
  on public.lead_to_client_links for select
  to authenticated
  using (private.is_internal_user());

create policy "links_write_sales"
  on public.lead_to_client_links for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "scores_select_internal"
  on public.lead_scores for select
  to authenticated
  using (private.is_internal_user());

create policy "scores_write_sales"
  on public.lead_scores for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "activities_select_internal"
  on public.lead_activities for select
  to authenticated
  using (private.is_internal_user());

create policy "activities_write_sales"
  on public.lead_activities for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "tasks_select_internal"
  on public.lead_tasks for select
  to authenticated
  using (private.is_internal_user());

create policy "tasks_write_sales"
  on public.lead_tasks for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "notes_select_internal"
  on public.lead_notes for select
  to authenticated
  using (private.is_internal_user());

create policy "notes_write_sales"
  on public.lead_notes for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "sources_select_internal"
  on public.lead_sources for select
  to authenticated
  using (private.is_internal_user());

create policy "sources_write_sales"
  on public.lead_sources for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "duplicates_select_internal"
  on public.lead_duplicates for select
  to authenticated
  using (private.is_internal_user());

create policy "duplicates_write_sales"
  on public.lead_duplicates for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy "audit_select_admin"
  on public.audit_logs for select
  to authenticated
  using (private.is_internal_admin());

create policy "audit_insert_internal"
  on public.audit_logs for insert
  to authenticated
  with check (private.is_internal_user());

drop function if exists public.audit_important_lead_changes();
drop function if exists public.can_edit_leads();
drop function if exists public.current_internal_role();
drop function if exists public.is_internal_admin();
drop function if exists public.is_internal_user();
