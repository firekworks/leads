alter table public.leads
  add column if not exists is_disqualified boolean not null default false,
  add column if not exists disqualified_reason text not null default '',
  add column if not exists disqualified_category text not null default '',
  add column if not exists validation_status text not null default 'pendiente',
  add column if not exists instagram_status text not null default 'pendiente',
  add column if not exists enrichment_status text not null default 'pendiente',
  add column if not exists last_enriched_at timestamptz;

update public.leads
set is_disqualified = coalesce(is_disqualified, false) or coalesce(is_invalid, false),
    disqualified_reason = case
      when coalesce(disqualified_reason, '') = '' then coalesce(invalid_reason, '')
      else disqualified_reason
    end,
    validation_status = case
      when coalesce(is_disqualified, false) or coalesce(is_invalid, false) then 'descartado'
      when validation_status in ('', 'pendiente') then 'pendiente'
      else validation_status
    end,
    instagram_status = case
      when coalesce(instagram_url, '') <> '' then 'encontrado'
      when followers_bucket = 'Sin cuenta' then 'sin_cuenta'
      else coalesce(nullif(instagram_status, ''), 'pendiente')
    end,
    enrichment_status = case
      when last_refreshed_at is not null and enrichment_status in ('', 'pendiente') then 'parcial'
      else coalesce(nullif(enrichment_status, ''), 'pendiente')
    end,
    last_enriched_at = coalesce(last_enriched_at, last_refreshed_at)
where true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_validation_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_validation_status_check
      check (validation_status in ('pendiente', 'validado', 'descartado', 'duplicado', 'revisar'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_instagram_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_instagram_status_check
      check (instagram_status in ('pendiente', 'encontrado', 'sin_cuenta', 'manual', 'revisar'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'leads_enrichment_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_enrichment_status_check
      check (enrichment_status in ('pendiente', 'parcial', 'completo', 'error'));
  end if;
end $$;

create or replace function public.sync_lead_cleanup_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_disqualified := coalesce(new.is_disqualified, false) or coalesce(new.is_invalid, false);
  new.is_invalid := coalesce(new.is_invalid, false) or coalesce(new.is_disqualified, false);

  if coalesce(new.disqualified_reason, '') = '' and coalesce(new.invalid_reason, '') <> '' then
    new.disqualified_reason := new.invalid_reason;
  end if;

  if coalesce(new.invalid_reason, '') = '' and coalesce(new.disqualified_reason, '') <> '' then
    new.invalid_reason := new.disqualified_reason;
  end if;

  if coalesce(new.instagram_url, '') <> '' and coalesce(new.instagram_status, 'pendiente') = 'pendiente' then
    new.instagram_status := 'encontrado';
  end if;

  if coalesce(new.followers_bucket, '') = 'Sin cuenta' and coalesce(new.instagram_status, 'pendiente') = 'pendiente' then
    new.instagram_status := 'sin_cuenta';
  end if;

  if new.last_enriched_at is null and new.last_refreshed_at is not null then
    new.last_enriched_at := new.last_refreshed_at;
  end if;

  if new.is_disqualified and coalesce(new.validation_status, 'pendiente') in ('pendiente', 'validado') then
    new.validation_status := 'descartado';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_lead_cleanup_fields on public.leads;
create trigger trg_sync_lead_cleanup_fields
before insert or update on public.leads
for each row
execute function public.sync_lead_cleanup_fields();

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
    old.is_invalid is distinct from new.is_invalid or
    old.is_disqualified is distinct from new.is_disqualified or
    old.disqualified_reason is distinct from new.disqualified_reason or
    old.disqualified_category is distinct from new.disqualified_category or
    old.validation_status is distinct from new.validation_status or
    old.instagram_status is distinct from new.instagram_status or
    old.enrichment_status is distinct from new.enrichment_status
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
        'is_invalid', old.is_invalid,
        'is_disqualified', old.is_disqualified,
        'disqualified_reason', old.disqualified_reason,
        'disqualified_category', old.disqualified_category,
        'validation_status', old.validation_status,
        'instagram_status', old.instagram_status,
        'enrichment_status', old.enrichment_status
      ),
      jsonb_build_object(
        'status', new.status,
        'priority', new.priority,
        'assigned_to', new.assigned_to,
        'client_id', new.client_id,
        'is_invalid', new.is_invalid,
        'is_disqualified', new.is_disqualified,
        'disqualified_reason', new.disqualified_reason,
        'disqualified_category', new.disqualified_category,
        'validation_status', new.validation_status,
        'instagram_status', new.instagram_status,
        'enrichment_status', new.enrichment_status
      )
    );
  end if;

  return new;
end;
$$;

create index if not exists leads_is_disqualified_idx on public.leads(is_disqualified);
create index if not exists leads_validation_status_idx on public.leads(validation_status);
create index if not exists leads_instagram_status_idx on public.leads(instagram_status);
create index if not exists leads_enrichment_status_idx on public.leads(enrichment_status);
create index if not exists leads_city_active_score_idx
  on public.leads(city, score_total desc)
  where coalesce(is_disqualified, false) = false;
