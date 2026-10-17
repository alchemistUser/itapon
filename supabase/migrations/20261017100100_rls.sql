-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Row Level Security (ROADMAP Phase 10, task 2). Anonymous guests are signed-in
-- users too (role `authenticated`, is_anonymous claim), so "own rows" covers them.

-- ---------------------------------------------------------------------------
-- Helpers (security definer: read profiles without recursing into its RLS)
-- ---------------------------------------------------------------------------

create or replace function private.my_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())), 'user')
$$;

create or replace function private.my_institution()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select institution_id from public.profiles where id = (select auth.uid())
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.my_role() = 'admin'
$$;

grant usage on schema private to anon, authenticated;
grant execute on function private.my_role(), private.my_institution(), private.is_admin()
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Content: public read, admin write
-- ---------------------------------------------------------------------------

alter table public.waste_categories enable row level security;
alter table public.waste_items enable row level security;

create policy "Anyone can read bins" on public.waste_categories
  for select to anon, authenticated using (true);
create policy "Admins manage bins" on public.waste_categories
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "Anyone can read items" on public.waste_items
  for select to anon, authenticated using (true);
create policy "Admins manage items" on public.waste_items
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Institutions, profiles, devices
-- ---------------------------------------------------------------------------

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.devices enable row level security;

create policy "Members read their institution" on public.institutions
  for select to authenticated
  using (id = (select private.my_institution()));

create policy "Users read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy "Admins read institution profiles" on public.profiles
  for select to authenticated
  using ((select private.is_admin()) and institution_id = (select private.my_institution()));
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Users may edit only their display name and preferences, never role/institution.
revoke update on public.profiles from anon, authenticated;
grant update (display_name, prefs) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;  -- created by trigger

create policy "Kiosk reads own device" on public.devices
  for select to authenticated
  using (kiosk_user_id = (select auth.uid()));
create policy "Admins manage institution devices" on public.devices
  for all to authenticated
  using ((select private.is_admin()) and institution_id = (select private.my_institution()))
  with check ((select private.is_admin()) and institution_id = (select private.my_institution()));

-- ---------------------------------------------------------------------------
-- Scans
-- ---------------------------------------------------------------------------

alter table public.scan_sessions enable row level security;
alter table public.scan_detections enable row level security;

create policy "Users insert own scans" on public.scan_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users read own scans" on public.scan_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Admins read institution scans" on public.scan_sessions
  for select to authenticated
  using (
    (select private.is_admin())
    and institution_id is not null
    and institution_id = (select private.my_institution())
  );
create policy "Users delete own scans" on public.scan_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Scans are an append-only log: no updates by clients.
revoke update on public.scan_sessions, public.scan_detections from anon, authenticated;

create policy "Users insert detections into own scans" on public.scan_detections
  for insert to authenticated
  with check (
    exists (
      select 1 from public.scan_sessions s
      where s.id = session_id and s.user_id = (select auth.uid())
    )
  );
-- Visible whenever the parent session is visible (own, or admin's institution).
create policy "Read detections of visible scans" on public.scan_detections
  for select to authenticated
  using (exists (select 1 from public.scan_sessions s where s.id = session_id));

-- ---------------------------------------------------------------------------
-- Feedback (Phase 20)
-- ---------------------------------------------------------------------------

alter table public.feedback enable row level security;

create policy "Users insert own feedback" on public.feedback
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Users read own feedback" on public.feedback
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Admins read feedback" on public.feedback
  for select to authenticated
  using ((select private.is_admin()));
create policy "Users delete own feedback" on public.feedback
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke update on public.feedback from anon, authenticated;

-- Anonymous visitors (not signed in at all) only ever read content tables.
revoke insert, update, delete on all tables in schema public from anon;
