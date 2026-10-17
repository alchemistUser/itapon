-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Removes everything demo_institution.sql created and returns the demo admin to a normal user.
do $$
declare
  inst uuid := 'de300000-0000-4000-8000-000000000001';
begin
  update public.profiles set role = 'user', institution_id = null where institution_id = inst;
  delete from public.scan_sessions where institution_id = inst;  -- detections cascade
  delete from public.institutions where id = inst;                -- devices cascade
end $$;
