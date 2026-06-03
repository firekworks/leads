-- Firekworks Leads V3 - esquema base para Supabase
-- Ejecutar en Supabase SQL Editor cuando queráis pasar de localStorage a base de datos real.

create table if not exists leads (
  id text primary key,
  name text not null,
  sector text not null,
  city text not null,
  address text default '',
  phone text default '',
  website text default '',
  google_maps_url text default '',
  google_place_id text,
  rating numeric default 0,
  reviews integer default 0,
  photos integer default 0,
  channels jsonb not null default '{"google":"weak","whatsapp":"none","instagram":"none","facebook":"none","website":"none"}',
  status text not null default 'Detectado',
  temperature text not null default 'Frío',
  score integer not null default 0,
  monthly_potential integer default 490,
  pain text default '',
  diagnosis text default '',
  recommended_action text default '',
  next_action text default '',
  next_action_date date,
  notes text default '',
  last_contact date,
  last_checked date,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lead_timeline (
  id uuid primary key default gen_random_uuid(),
  lead_id text references leads(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text default '',
  created_at timestamptz default now()
);

create index if not exists leads_city_idx on leads(city);
create index if not exists leads_sector_idx on leads(sector);
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_score_idx on leads(score desc);
