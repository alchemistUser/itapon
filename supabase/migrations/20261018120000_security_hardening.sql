-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Security hardening (Phase 22). Findings from the RLS audit (docs/security.md):
--   S1 (high)   any institution admin could edit the global Bin Guide content for everyone.
--   S2 (high)   an admin could point devices.kiosk_user_id at any user, which tags that
--               person's future scans with the admin's institution so the admin can read them.
--   S3 (medium) a stolen kiosk session could read and delete the kiosk's whole scan history.

-- S1: content is project-team only (migrations / seed / service role).
drop policy "Admins manage bins" on public.waste_categories;
drop policy "Admins manage items" on public.waste_items;
revoke insert, update, delete on public.waste_categories, public.waste_items from anon, authenticated;

-- S2: devices are created only through admin_register_kiosk (checks the account by email).
-- Admins may rename, move or reorder a kiosk, or remove it; never relink it.
revoke insert, update on public.devices from anon, authenticated;
grant update (label, location_note, bin_order) on public.devices to authenticated;
alter table public.devices
  add constraint devices_bin_order_valid check (
    cardinality(bin_order) = 4
    and bin_order @> array['biodegradable', 'recyclable', 'residual', 'hazardous']
  );
alter table public.devices
  add constraint devices_label_length check (char_length(label) between 1 and 60),
  add constraint devices_location_length check (location_note is null or char_length(location_note) <= 120);

-- S3: kiosk accounts are insert-only for scans.
create or replace function private.is_kiosk()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.my_role() = 'kiosk'
$$;

-- Ownership check that doesn't depend on being able to read the scan (kiosks can't).
create or replace function private.owns_scan(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.scan_sessions where id = p_session and user_id = (select auth.uid())
  )
$$;

create or replace function private.owns_detection(p_detection uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.scan_detections d
    join public.scan_sessions s on s.id = d.session_id
    where d.id = p_detection and s.user_id = (select auth.uid())
  )
$$;
grant execute on function private.is_kiosk(), private.owns_scan(uuid), private.owns_detection(uuid)
  to authenticated;

drop policy "Users read own scans" on public.scan_sessions;
create policy "Users read own scans" on public.scan_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) and not (select private.is_kiosk()));

drop policy "Users delete own scans" on public.scan_sessions;
create policy "Users delete own scans" on public.scan_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()) and not (select private.is_kiosk()));

drop policy "Users insert detections into own scans" on public.scan_detections;
create policy "Users insert detections into own scans" on public.scan_detections
  for insert to authenticated
  with check (private.owns_scan(session_id));

drop policy "Users insert own feedback" on public.feedback;
create policy "Users insert own feedback" on public.feedback
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not (select private.is_kiosk())
    and review_status = 'pending' and reviewed_by is null
    and (detection_id is null or private.owns_detection(detection_id))
  );

-- Every public table must keep RLS on (checked by supabase/tests/rls-roles.sql).
