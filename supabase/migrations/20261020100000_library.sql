-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Disposal & suggestion library (ROADMAP-v2 Phase 28; design in docs/library/).
-- Content is authored as CSV in supabase/content/library/ and loaded by the generated
-- supabase/seed_library.sql (scripts/build_library.py). Clients only ever READ published rows;
-- institution admins may add local rules and drop-off points for their own institution.

-- Rule sources every entry cites (docs/library/sources.md).
create table public.library_sources (
  id text primary key check (id ~ '^S-[A-Z0-9-]+$'),
  title text not null,
  url text,
  level text not null check (level in ('P', 'S', 'I')),  -- primary / secondary / international
  verified boolean not null default false
);

-- Material groups (parent_code null) and subgroups.
create table public.library_materials (
  code text primary key check (code ~ '^[A-Z]{3}(-[A-Z0-9]+)?$'),
  parent_code text references public.library_materials (code),
  name_en text not null,
  name_fil text not null,
  description_en text,
  description_fil text,
  resin_code smallint check (resin_code between 1 and 7),
  default_bin text references public.waste_categories (key),
  sort_order smallint not null default 0
);

create table public.library_destinations (
  code text primary key check (code ~ '^[a-z]+$'),
  name_en text not null,
  name_fil text not null,
  sort_order smallint not null default 0
);

create table public.library_items (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null,
  name_fil text not null,
  aliases text[] not null default '{}',
  material_code text not null references public.library_materials (code),
  resin_code smallint check (resin_code between 1 and 7),
  bin text not null references public.waste_categories (key),
  summary_en text not null check (char_length(summary_en) <= 140),
  summary_fil text check (char_length(summary_fil) <= 160),
  prep_en jsonb not null default '[]' check (jsonb_typeof(prep_en) = 'array'),   -- [{title, detail}]
  prep_fil jsonb not null default '[]' check (jsonb_typeof(prep_fil) = 'array'),
  note_en text,          -- "watch out" caveat (dirty vs clean, etc.)
  note_fil text,
  dont_en text[] not null default '{}',
  dont_fil text[] not null default '{}',
  hazard_en text,
  hazard_fil text,
  value text check (value in ('buys', 'accepts', 'none')),
  reuse_en text[] not null default '{}',
  reuse_fil text[] not null default '{}',
  reduce_en text[] not null default '{}',
  reduce_fil text[] not null default '{}',
  fact_en text,
  fact_fil text,
  related text[] not null default '{}',
  detectable_class_key text references public.waste_items (class_key) on update cascade,
  sources text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  reviewed_by text[] not null default '{}',
  reviewed_at date,
  updated_at timestamptz not null default now(),
  constraint library_items_published_reviewed
    check (status = 'draft' or (cardinality(reviewed_by) >= 1 and reviewed_at is not null))
);
create index library_items_material_idx on public.library_items (material_code);
create index library_items_class_idx on public.library_items (detectable_class_key);

create table public.library_item_destinations (
  item_slug text not null references public.library_items (slug) on delete cascade on update cascade,
  destination_code text not null references public.library_destinations (code),
  rank smallint not null,
  primary key (item_slug, destination_code)
);

-- Local differences: an LGU ('QC') or one institution, about one item or a whole material.
create table public.library_local_rules (
  id uuid primary key default gen_random_uuid(),
  lgu text check (lgu ~ '^[A-Z]{2,6}$'),
  institution_id uuid references public.institutions (id) on delete cascade,
  item_slug text references public.library_items (slug) on delete cascade on update cascade,
  material_code text references public.library_materials (code),
  note_en text not null check (char_length(note_en) <= 280),
  note_fil text check (char_length(note_fil) <= 320),
  sources text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  created_at timestamptz not null default now(),
  constraint library_local_rules_scope check ((lgu is null) <> (institution_id is null)),
  constraint library_local_rules_target check ((item_slug is null) <> (material_code is null))
);
create index library_local_rules_item_idx on public.library_local_rules (item_slug);

create table public.library_dropoff_points (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  destination_code text not null references public.library_destinations (code),
  address text check (char_length(address) <= 240),
  map_url text check (map_url is null or map_url ~ '^https://'),
  hours text check (char_length(hours) <= 120),
  lgu text check (lgu ~ '^[A-Z]{2,6}$'),
  institution_id uuid references public.institutions (id) on delete cascade,
  notes text check (char_length(notes) <= 280),
  sources text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  verified_at date,
  created_at timestamptz not null default now(),
  constraint library_dropoff_scope check ((lgu is null) <> (institution_id is null))
);

-- ---------------------------------------------------------------- RLS
alter table public.library_sources enable row level security;
alter table public.library_materials enable row level security;
alter table public.library_destinations enable row level security;
alter table public.library_items enable row level security;
alter table public.library_item_destinations enable row level security;
alter table public.library_local_rules enable row level security;
alter table public.library_dropoff_points enable row level security;

-- Reference data and published content: readable by everyone (also offline-bundled).
create policy "Anyone reads sources" on public.library_sources
  for select to anon, authenticated using (true);
create policy "Anyone reads materials" on public.library_materials
  for select to anon, authenticated using (true);
create policy "Anyone reads destinations" on public.library_destinations
  for select to anon, authenticated using (true);
create policy "Anyone reads published items" on public.library_items
  for select to anon, authenticated using (status = 'published');
create policy "Anyone reads destinations of published items" on public.library_item_destinations
  for select to anon, authenticated
  using (exists (select 1 from public.library_items i where i.slug = item_slug and i.status = 'published'));

-- Local rules / drop-off points: published LGU-wide rows for everyone; institution rows for
-- that institution's members; institution admins manage their own (never LGU-wide rows).
create policy "Read published local rules" on public.library_local_rules
  for select to anon, authenticated
  using (
    status = 'published'
    and (lgu is not null or institution_id = (select private.my_institution()))
  );
create policy "Admins read own institution local rules" on public.library_local_rules
  for select to authenticated
  using ((select private.is_admin()) and institution_id = (select private.my_institution()));
create policy "Admins manage own institution local rules" on public.library_local_rules
  for all to authenticated
  using ((select private.is_admin()) and institution_id = (select private.my_institution()))
  with check (
    (select private.is_admin()) and lgu is null
    and institution_id = (select private.my_institution())
  );

create policy "Read published drop-off points" on public.library_dropoff_points
  for select to anon, authenticated
  using (
    status = 'published'
    and (lgu is not null or institution_id = (select private.my_institution()))
  );
create policy "Admins read own institution drop-off points" on public.library_dropoff_points
  for select to authenticated
  using ((select private.is_admin()) and institution_id = (select private.my_institution()));
create policy "Admins manage own institution drop-off points" on public.library_dropoff_points
  for all to authenticated
  using ((select private.is_admin()) and institution_id = (select private.my_institution()))
  with check (
    (select private.is_admin()) and lgu is null
    and institution_id = (select private.my_institution())
  );

-- Global content is project-team only (finding S1): no client writes.
revoke insert, update, delete on public.library_sources, public.library_materials,
  public.library_destinations, public.library_items, public.library_item_destinations
  from anon, authenticated;
revoke insert, update, delete on public.library_local_rules, public.library_dropoff_points from anon;
