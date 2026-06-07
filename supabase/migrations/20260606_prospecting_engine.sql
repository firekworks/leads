create extension if not exists pgcrypto;

alter table public.leads
  add column if not exists google_maps_uri text default '',
  add column if not exists website_url text default '',
  add column if not exists email text default '',
  add column if not exists business_status text default '',
  add column if not exists primary_type text default '',
  add column if not exists pipeline_stage text default '',
  add column if not exists temperature_label text default '',
  add column if not exists score_confidence text default 'media',
  add column if not exists is_public_entity boolean not null default false,
  add column if not exists discard_reason text default '',
  add column if not exists linked_stats_client_id uuid;

create table if not exists public.lead_scan_jobs (
  id uuid primary key default gen_random_uuid(),
  city text not null default '',
  sector text not null default '',
  radius integer not null default 5000,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  total_found integer not null default 0,
  total_saved integer not null default 0,
  total_discarded integer not null default 0,
  estimated_cost text not null default '0€',
  error text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.lead_enrichment_sources (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  source text not null,
  source_url text not null default '',
  data_type text not null default '',
  confidence numeric not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_score_breakdowns (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  score_total integer not null default 0,
  score_demand integer not null default 0,
  score_money integer not null default 0,
  score_digital_gap integer not null default 0,
  score_contactability integer not null default 0,
  score_route_priority integer not null default 0,
  positive_factors jsonb not null default '[]'::jsonb,
  negative_factors jsonb not null default '[]'::jsonb,
  explanation text not null default '',
  confidence text not null default 'media',
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_assets (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null,
  title text not null default '',
  content text not null default '',
  preview_data jsonb not null default '{}'::jsonb,
  preview_url text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.lead_actions (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null default 'seguimiento',
  status text not null default 'pendiente',
  notes text not null default '',
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Ruta comercial',
  city text not null default '',
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table if not exists public.lead_route_items (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.lead_routes(id) on delete cascade,
  lead_id text not null references public.leads(id) on delete cascade,
  position integer not null default 1,
  visited_at timestamptz,
  notes text not null default '',
  unique (route_id, lead_id)
);

create index if not exists lead_scan_jobs_city_sector_idx on public.lead_scan_jobs(city, sector, created_at desc);
create index if not exists lead_enrichment_sources_lead_idx on public.lead_enrichment_sources(lead_id, created_at desc);
create index if not exists lead_score_breakdowns_lead_idx on public.lead_score_breakdowns(lead_id, created_at desc);
create index if not exists lead_assets_lead_type_idx on public.lead_assets(lead_id, type, created_at desc);
create index if not exists lead_actions_lead_status_idx on public.lead_actions(lead_id, status, scheduled_at);
create index if not exists lead_route_items_route_idx on public.lead_route_items(route_id, position);

alter table public.lead_scan_jobs enable row level security;
alter table public.lead_enrichment_sources enable row level security;
alter table public.lead_score_breakdowns enable row level security;
alter table public.lead_assets enable row level security;
alter table public.lead_actions enable row level security;
alter table public.lead_routes enable row level security;
alter table public.lead_route_items enable row level security;

revoke all on public.lead_scan_jobs from anon;
revoke all on public.lead_enrichment_sources from anon;
revoke all on public.lead_score_breakdowns from anon;
revoke all on public.lead_assets from anon;
revoke all on public.lead_actions from anon;
revoke all on public.lead_routes from anon;
revoke all on public.lead_route_items from anon;

grant select, insert, update on public.lead_scan_jobs to authenticated;
grant select, insert, update on public.lead_enrichment_sources to authenticated;
grant select, insert, update on public.lead_score_breakdowns to authenticated;
grant select, insert, update on public.lead_assets to authenticated;
grant select, insert, update on public.lead_actions to authenticated;
grant select, insert, update on public.lead_routes to authenticated;
grant select, insert, update on public.lead_route_items to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_scan_jobs' and policyname = 'lead_scan_jobs_internal') then
    create policy lead_scan_jobs_internal on public.lead_scan_jobs
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_enrichment_sources' and policyname = 'lead_enrichment_sources_internal') then
    create policy lead_enrichment_sources_internal on public.lead_enrichment_sources
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_score_breakdowns' and policyname = 'lead_score_breakdowns_internal') then
    create policy lead_score_breakdowns_internal on public.lead_score_breakdowns
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_assets' and policyname = 'lead_assets_internal') then
    create policy lead_assets_internal on public.lead_assets
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_actions' and policyname = 'lead_actions_internal') then
    create policy lead_actions_internal on public.lead_actions
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_routes' and policyname = 'lead_routes_internal') then
    create policy lead_routes_internal on public.lead_routes
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'lead_route_items' and policyname = 'lead_route_items_internal') then
    create policy lead_route_items_internal on public.lead_route_items
      for all to authenticated
      using (private.is_internal_user())
      with check (private.can_edit_leads());
  end if;
end $$;
