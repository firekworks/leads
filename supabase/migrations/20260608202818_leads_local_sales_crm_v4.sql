alter table public.leads
  add column if not exists score_demand integer default 0,
  add column if not exists score_payment_capacity integer default 0,
  add column if not exists score_digital_gap integer default 0,
  add column if not exists score_fit integer default 0,
  add column if not exists score_visitability integer default 0,
  add column if not exists score_penalties integer default 0,
  add column if not exists score_confidence numeric default 0,
  add column if not exists score_updated_at timestamptz,
  add column if not exists pitch_presencial_30s text default '',
  add column if not exists first_visit_goal text default '',
  add column if not exists ad_budget_estimate integer default 0;

alter table public.lead_routes
  add column if not exists scheduled_at timestamptz,
  add column if not exists google_maps_url text not null default '';

alter table public.lead_proposals
  add column if not exists problem_detected text not null default '',
  add column if not exists opportunity_detected text not null default '',
  add column if not exists recommended_plan text not null default '',
  add column if not exists monthly_price_estimate integer not null default 0,
  add column if not exists ad_budget_estimate integer not null default 0,
  add column if not exists first_visit_goal text not null default '',
  add column if not exists pitch_presencial_30s text not null default '',
  add column if not exists objection_response text not null default '',
  add column if not exists next_action text not null default '',
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

create table if not exists public.lead_socials (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  network text not null,
  url text not null default '',
  followers_bucket text not null default 'Pendiente',
  content_use text not null default 'Pendiente',
  source text not null default 'manual',
  confidence numeric not null default 0,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, network)
);

create table if not exists public.lead_enrichment (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  source_url text not null default '',
  confidence numeric not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.lead_routes(id) on delete cascade,
  lead_id text not null references public.leads(id) on delete cascade,
  position integer not null default 1,
  visited_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (route_id, lead_id)
);

create index if not exists leads_firekworks_score_idx on public.leads(score_total desc, score_demand desc, score_payment_capacity desc);
create index if not exists leads_visitability_idx on public.leads(score_visitability desc) where score_visitability is not null;
create index if not exists lead_socials_lead_idx on public.lead_socials(lead_id, network);
create index if not exists lead_enrichment_lead_idx on public.lead_enrichment(lead_id, created_at desc);
create index if not exists lead_proposals_lead_idx on public.lead_proposals(lead_id, created_at desc);
create index if not exists lead_route_stops_route_idx on public.lead_route_stops(route_id, position);

alter table public.lead_socials enable row level security;
alter table public.lead_enrichment enable row level security;
alter table public.lead_proposals enable row level security;
alter table public.lead_route_stops enable row level security;

revoke all on public.lead_socials from anon;
revoke all on public.lead_enrichment from anon;
revoke all on public.lead_proposals from anon;
revoke all on public.lead_route_stops from anon;

grant select, insert, update, delete on public.lead_socials to authenticated, service_role;
grant select, insert, update, delete on public.lead_enrichment to authenticated, service_role;
grant select, insert, update, delete on public.lead_proposals to authenticated, service_role;
grant select, insert, update, delete on public.lead_route_stops to authenticated, service_role;

drop policy if exists lead_socials_internal_select on public.lead_socials;
drop policy if exists lead_socials_internal_write on public.lead_socials;
drop policy if exists lead_enrichment_internal_select on public.lead_enrichment;
drop policy if exists lead_enrichment_internal_write on public.lead_enrichment;
drop policy if exists lead_proposals_internal_select on public.lead_proposals;
drop policy if exists lead_proposals_internal_write on public.lead_proposals;
drop policy if exists lead_route_stops_internal_select on public.lead_route_stops;
drop policy if exists lead_route_stops_internal_write on public.lead_route_stops;

create policy lead_socials_internal_select
  on public.lead_socials for select
  to authenticated
  using (private.is_internal_user());

create policy lead_socials_internal_write
  on public.lead_socials for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy lead_enrichment_internal_select
  on public.lead_enrichment for select
  to authenticated
  using (private.is_internal_user());

create policy lead_enrichment_internal_write
  on public.lead_enrichment for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy lead_proposals_internal_select
  on public.lead_proposals for select
  to authenticated
  using (private.is_internal_user());

create policy lead_proposals_internal_write
  on public.lead_proposals for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());

create policy lead_route_stops_internal_select
  on public.lead_route_stops for select
  to authenticated
  using (private.is_internal_user());

create policy lead_route_stops_internal_write
  on public.lead_route_stops for all
  to authenticated
  using (private.can_edit_leads())
  with check (private.can_edit_leads());
