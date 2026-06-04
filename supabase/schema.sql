create table if not exists public.leads (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
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
    check (content_use in ('Pendiente', 'Sin redes', 'Abandonado', 'Básico', 'Activo', 'Fuerte')),
  website_title text default '',
  google_maps_url text default '',
  rating numeric default 0,
  reviews integer default 0,
  google_photos integer default 0,
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

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.leads to authenticated;

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
