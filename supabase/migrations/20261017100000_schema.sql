-- SPDX-License-Identifier: AGPL-3.0-or-later
-- iTapon schema (ROADMAP Phase 10). Content tables + users/orgs + scan events.
-- Every scan belongs to a user (anonymous, registered or kiosk account), so RLS
-- can be "own rows" plus "admins see their institution".

-- Helpers that must not be callable through the Data API live in `private`.
create schema if not exists private;

create type public.app_role as enum ('user', 'admin', 'kiosk');
create type public.scan_source as enum ('mobile', 'kiosk', 'desktop');

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Content: bins and items (docs/spec.md §2–4). Editable by admins, readable by all.
-- ---------------------------------------------------------------------------

create table public.waste_categories (
  key text primary key
    check (key in ('biodegradable', 'recyclable', 'residual', 'hazardous')),
  name text not null,
  bin_label text not null,                 -- "Blue Bin"
  bin_color text not null check (bin_color ~ '^#[0-9A-Fa-f]{6}$'),
  description text not null,
  examples text not null,                  -- Bin Guide card subtitle
  ra9003_term text not null,
  icon text not null default 'recycle',
  sort_order smallint not null unique
);
comment on table public.waste_categories is 'The four bins (RA 9003). Display order: sort_order.';

create table public.waste_items (
  id uuid primary key default gen_random_uuid(),
  class_key text not null unique check (class_key ~ '^[a-z0-9_]+$'),
  display_name text not null,
  display_name_fil text,                   -- Filipino UI (Phase 17)
  category_key text not null references public.waste_categories (key) on update cascade,
  short_instruction text not null,
  reuse_tip text,
  prep_steps jsonb not null default '[]'
    check (jsonb_typeof(prep_steps) = 'array'),  -- [{"title": "...", "detail": "..."}]
  why_text text,
  contamination_note text,                 -- D9: dirty-vs-clean caveat
  search_aliases text[] not null default '{}',
  is_detectable boolean not null default false,  -- true = the model has this class
  rule_source text,                        -- e.g. "RA, FG" (spec §4)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.waste_items is
  'Item → bin mapping and copy (spec §4). The model returns class_key; the app looks it up here (D7).';
create index waste_items_category_idx on public.waste_items (category_key);
create trigger waste_items_updated_at before update on public.waste_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Users & organisations
-- ---------------------------------------------------------------------------

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role public.app_role not null default 'user',
  institution_id uuid references public.institutions (id) on delete set null,
  prefs jsonb not null default '{}'
    check (jsonb_typeof(prefs) = 'object'),  -- {"tts_auto": bool, "language": "en"|"fil", "text_size": ...}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_institution_idx on public.profiles (institution_id);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- Kiosks (Phase 18): each device signs in with its own kiosk account.
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  kiosk_user_id uuid unique references auth.users (id) on delete set null,
  label text not null,
  location_note text,
  bin_order text[] not null
    default '{biodegradable,recyclable,residual,hazardous}',  -- physical tile order
  created_at timestamptz not null default now()
);
create index devices_institution_idx on public.devices (institution_id);

-- Every new auth user (including anonymous) gets a profile.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Events: scans, detections, feedback
-- ---------------------------------------------------------------------------

create table public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  device_id uuid references public.devices (id) on delete set null,
  institution_id uuid references public.institutions (id) on delete set null,
  model_version text not null,
  source public.scan_source not null default 'mobile',
  latency_ms integer check (latency_ms >= 0),
  inference_backend text,                  -- "wasm" | "webgpu" | "api" (D12)
  created_at timestamptz not null default now()
);
create index scan_sessions_user_idx on public.scan_sessions (user_id, created_at desc);
create index scan_sessions_institution_idx on public.scan_sessions (institution_id, created_at desc);
create index scan_sessions_device_idx on public.scan_sessions (device_id);

create table public.scan_detections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scan_sessions (id) on delete cascade,
  class_key text not null references public.waste_items (class_key) on update cascade,
  category_key text not null references public.waste_categories (key) on update cascade,
  confidence real not null check (confidence between 0 and 1),
  bbox jsonb not null,                     -- {"x1","y1","x2","y2"} normalized 0–1
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index scan_detections_session_idx on public.scan_detections (session_id);
create index scan_detections_class_idx on public.scan_detections (class_key);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  detection_id uuid references public.scan_detections (id) on delete cascade,
  is_correct boolean not null,
  corrected_class_key text references public.waste_items (class_key) on update cascade,
  image_path text,                         -- storage path in training-images, only with consent
  consent boolean not null default false,
  model_version text,
  created_at timestamptz not null default now(),
  constraint feedback_image_needs_consent check (image_path is null or consent)
);
create index feedback_user_idx on public.feedback (user_id);
create index feedback_detection_idx on public.feedback (detection_id);

-- Fill institution/device context server-side so clients can't mislabel scans.
create or replace function private.scan_session_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dev public.devices%rowtype;
begin
  select * into dev from public.devices where kiosk_user_id = new.user_id;
  if found then
    new.device_id := dev.id;
    new.institution_id := dev.institution_id;
    new.source := 'kiosk';
  else
    new.device_id := null;
    new.institution_id := (select institution_id from public.profiles where id = new.user_id);
    if new.source = 'kiosk' then
      new.source := 'mobile';
    end if;
  end if;
  return new;
end;
$$;

create trigger scan_sessions_defaults
  before insert on public.scan_sessions
  for each row execute function private.scan_session_defaults();
