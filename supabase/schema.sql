create table if not exists public.leads (
  id text primary key,
  user_id uuid null default null,
  name text not null,
  sector text not null,
  city text not null,
  address text default '',
  phone text default '',
  website text default '',
  description text default '',
  owner_name text default '',
  instagram_url text default '',
  facebook_url text default '',
  whatsapp_url text default '',
  logo_url text default '',
  followers_bucket text not null default 'Pendiente'
    check (followers_bucket in ('Pendiente', 'Sin cuenta', '< 1.000', '1.000 - 5.000', '+5.000')),
  content_use text not null default 'Pendiente'
    check (content_use in ('Pendiente', 'Sin uso', 'Flojo', 'Activo', 'Muy trabajado')),
  website_title text default '',
  google_maps_url text default '',
  rating numeric default 0,
  reviews integer default 0,
  google_photos integer default 0,
  place_id text default '',
  source text not null default 'manual'
    check (source in ('manual', 'google_places', 'importado', 'web')),
  is_invalid boolean not null default false,
  invalid_reason text default '',
  last_seen_at timestamptz,
  last_refreshed_at timestamptz,
  review_owner_candidates jsonb not null default '[]'::jsonb,
  status text not null default 'Detectado'
    check (status in ('Descartado', 'Detectado', 'Validado', 'Interesado', 'Visita/Reunión', 'Negociación', 'Cliente', 'Desinteresado')),
  priority text not null default 'Media',
  potential integer default 0,
  last_contact text default 'Sin contacto',
  next_action text default '',
  pain text default '',
  diagnosis text default '',
  score integer default 0,
  signals jsonb not null default '{"web": false, "instagram": false, "facebook": false, "whatsapp": false, "photos": false, "googleProfile": false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.leads to anon, authenticated, service_role;

drop index if exists leads_place_id_idx;
create index leads_place_id_idx on public.leads (place_id) where place_id <> '';
create index if not exists leads_city_status_idx on public.leads (city, status);
create index if not exists leads_score_idx on public.leads (score desc);
create index if not exists leads_invalid_idx on public.leads (is_invalid);

drop policy if exists "leads_select_own" on public.leads;
create policy "leads_select_own"
  on public.leads for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "leads_insert_own" on public.leads;
create policy "leads_insert_own"
  on public.leads for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "leads_update_own" on public.leads;
create policy "leads_update_own"
  on public.leads for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "leads_delete_own" on public.leads;
create policy "leads_delete_own"
  on public.leads for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "leads_select_shared" on public.leads;
create policy "leads_select_shared"
  on public.leads for select
  to anon, authenticated
  using (user_id is null);

drop policy if exists "leads_insert_shared" on public.leads;
create policy "leads_insert_shared"
  on public.leads for insert
  to anon, authenticated
  with check (user_id is null);

drop policy if exists "leads_update_shared" on public.leads;
create policy "leads_update_shared"
  on public.leads for update
  to anon, authenticated
  using (user_id is null)
  with check (user_id is null);

drop policy if exists "leads_delete_shared" on public.leads;
create policy "leads_delete_shared"
  on public.leads for delete
  to anon, authenticated
  using (user_id is null);
