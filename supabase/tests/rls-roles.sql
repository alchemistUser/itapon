-- SPDX-License-Identifier: AGPL-3.0-or-later
-- RLS role matrix (Phase 22): anon, two users, kiosk and two admins of different
-- institutions, against every table. Runs in ONE transaction that is rolled back, so it's
-- safe against the dev project:
--
--   npx supabase db query --linked -f supabase/tests/rls-roles.sql
--
-- Prints one row per check; any ok = false is a failure (the CI step fails on it).

begin;

create temp table rls_results (check_name text primary key, ok boolean not null) on commit drop;
grant all on rls_results to anon, authenticated;

-- ---------------------------------------------------------------- fixtures (as owner)
insert into auth.users (id, instance_id, aud, role, email, is_anonymous, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, false, '{}', '{}', now(), now()
from (values
  ('00000000-0000-4000-8000-00000000a001', 'rls-user1@test.invalid'),
  ('00000000-0000-4000-8000-00000000a002', 'rls-user2@test.invalid'),
  ('00000000-0000-4000-8000-00000000a003', 'rls-kiosk@test.invalid'),
  ('00000000-0000-4000-8000-00000000a004', 'rls-adminA@test.invalid'),
  ('00000000-0000-4000-8000-00000000a005', 'rls-adminB@test.invalid')
) as t(id, email);

insert into public.institutions (id, name) values
  ('00000000-0000-4000-8000-0000000000b1', 'RLS test A'),
  ('00000000-0000-4000-8000-0000000000b2', 'RLS test B');
update public.profiles set role = 'kiosk', institution_id = '00000000-0000-4000-8000-0000000000b1'
  where id = '00000000-0000-4000-8000-00000000a003';
update public.profiles set role = 'admin', institution_id = '00000000-0000-4000-8000-0000000000b1'
  where id = '00000000-0000-4000-8000-00000000a004';
update public.profiles set role = 'admin', institution_id = '00000000-0000-4000-8000-0000000000b2'
  where id = '00000000-0000-4000-8000-00000000a005';
insert into public.devices (id, institution_id, kiosk_user_id, label)
  values ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1',
          '00000000-0000-4000-8000-00000000a003', 'RLS kiosk');

-- one scan each for user1 (personal) and the kiosk (tagged with institution A by the trigger)
insert into public.scan_sessions (id, user_id, model_version) values
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-00000000a001', 'rls'),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-00000000a003', 'rls');
insert into public.scan_detections (id, session_id, class_key, category_key, confidence, bbox, is_primary) values
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000d1', 'battery', 'x', 0.5, '{}', true),
  ('00000000-0000-4000-8000-0000000000e3', '00000000-0000-4000-8000-0000000000d3', 'paper_bag', 'x', 0.5, '{}', true);

-- RLS must be on for every table in public
insert into rls_results
select 'rls enabled on ' || c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';

insert into rls_results values ('kiosk scan tagged with institution A by trigger',
  (select institution_id = '00000000-0000-4000-8000-0000000000b1' and source = 'kiosk'
     from public.scan_sessions where id = '00000000-0000-4000-8000-0000000000d3'));

-- ---------------------------------------------------------------- helpers
create function pg_temp.act_as(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

-- Runs a write; ok when it changed nothing or was refused by a privilege, RLS or validation
-- rule. Any other error (e.g. a typo in a check) is re-raised so it can't pass by accident.
create function pg_temp.refused(sql text) returns boolean language plpgsql as $$
declare n int;
begin
  execute sql;
  get diagnostics n = row_count;
  return n = 0;
exception when insufficient_privilege or check_violation or invalid_parameter_value then
  return true;
end $$;
grant execute on function pg_temp.act_as(text), pg_temp.refused(text) to anon, authenticated;

-- ---------------------------------------------------------------- anon (not signed in)
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
insert into rls_results values
  ('anon reads items', (select count(*) > 0 from public.waste_items)),
  ('anon sees no scans', (select count(*) = 0 from public.scan_sessions)),
  ('anon sees no profiles', (select count(*) = 0 from public.profiles)),
  ('anon sees no devices', (select count(*) = 0 from public.devices)),
  ('anon sees no feedback', (select count(*) = 0 from public.feedback)),
  ('anon cannot insert scans', pg_temp.refused($q$insert into public.scan_sessions (user_id, model_version) values ('00000000-0000-4000-8000-00000000a001', 'x')$q$)),
  ('anon cannot edit items', pg_temp.refused($q$update public.waste_items set display_name = 'x' where class_key = 'battery'$q$));
reset role;

-- ---------------------------------------------------------------- user 2 (stranger)
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-00000000a002');
insert into rls_results values
  ('user sees nobody else''s scans', (select count(*) = 0 from public.scan_sessions)),
  ('user sees nobody else''s detections', (select count(*) = 0 from public.scan_detections)),
  ('user sees only own profile', (select count(*) = 1 from public.profiles)),
  ('user sees no institutions', (select count(*) = 0 from public.institutions)),
  ('user sees no devices', (select count(*) = 0 from public.devices)),
  ('user cannot add detections to user1 scan', pg_temp.refused($q$insert into public.scan_detections (session_id, class_key, category_key, confidence, bbox) values ('00000000-0000-4000-8000-0000000000d1', 'battery', 'x', 0.5, '{}')$q$)),
  ('user cannot delete user1 scan', pg_temp.refused($q$delete from public.scan_sessions where id = '00000000-0000-4000-8000-0000000000d1'$q$)),
  ('user cannot scan as user1', pg_temp.refused($q$insert into public.scan_sessions (user_id, model_version) values ('00000000-0000-4000-8000-00000000a001', 'x')$q$)),
  ('user cannot give feedback on user1 detection', pg_temp.refused($q$insert into public.feedback (user_id, detection_id, is_correct) values ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-0000000000e1', true)$q$)),
  ('user cannot make self admin', pg_temp.refused($q$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000a002'$q$)),
  ('user cannot join an institution', pg_temp.refused($q$update public.profiles set institution_id = '00000000-0000-4000-8000-0000000000b1' where id = '00000000-0000-4000-8000-00000000a002'$q$)),
  ('user cannot edit content', pg_temp.refused($q$update public.waste_items set display_name = 'x' where class_key = 'battery'$q$)),
  ('user cannot create a device', pg_temp.refused($q$insert into public.devices (institution_id, label) values ('00000000-0000-4000-8000-0000000000b1', 'x')$q$)),
  ('user cannot call admin RPCs', pg_temp.refused($q$select public.admin_register_kiosk('rls-user1@test.invalid', 'x')$q$));
reset role;

-- ---------------------------------------------------------------- user 1 (owner)
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-00000000a001');
insert into rls_results values
  ('owner sees own scan', (select count(*) = 1 from public.scan_sessions)),
  ('owner sees own detection', (select count(*) = 1 from public.scan_detections)),
  ('owner can update prefs', not pg_temp.refused($q$update public.profiles set prefs = '{"tts_auto": true}' where id = '00000000-0000-4000-8000-00000000a001'$q$)),
  ('owner can give feedback', not pg_temp.refused($q$insert into public.feedback (user_id, detection_id, is_correct) values ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000e1', false)$q$)),
  ('owner cannot pre-approve feedback', pg_temp.refused($q$insert into public.feedback (user_id, detection_id, is_correct, review_status) values ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-0000000000e1', true, 'approved')$q$)),
  ('owner cannot edit a scan (append-only)', pg_temp.refused($q$update public.scan_sessions set model_version = 'x' where id = '00000000-0000-4000-8000-0000000000d1'$q$));
reset role;

-- ---------------------------------------------------------------- kiosk (stolen-token case)
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-00000000a003');
insert into rls_results values
  ('kiosk reads own device', (select count(*) = 1 from public.devices)),
  ('kiosk cannot read scans (insert-only)', (select count(*) = 0 from public.scan_sessions)),
  ('kiosk can log a scan', not pg_temp.refused($q$insert into public.scan_sessions (id, user_id, model_version) values ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-00000000a003', 'rls')$q$)),
  ('kiosk can log detections for it', not pg_temp.refused($q$insert into public.scan_detections (session_id, class_key, category_key, confidence, bbox) values ('00000000-0000-4000-8000-0000000000d4', 'battery', 'x', 0.5, '{}')$q$)),
  ('kiosk cannot delete scans', pg_temp.refused($q$delete from public.scan_sessions where user_id = '00000000-0000-4000-8000-00000000a003'$q$)),
  ('kiosk delete_my_data deletes nothing', (select scans_deleted = 0 from public.delete_my_data())),
  ('kiosk cannot edit its device', pg_temp.refused($q$update public.devices set label = 'pwned' where id = '00000000-0000-4000-8000-0000000000c1'$q$)),
  ('kiosk cannot read institution profiles', (select count(*) = 1 from public.profiles));
reset role;

-- ---------------------------------------------------------------- admin of institution A
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-00000000a004');
insert into rls_results values
  ('admin A reads institution kiosk scan', (select count(*) = 1 from public.scan_sessions where id = '00000000-0000-4000-8000-0000000000d3')),
  ('admin A cannot read personal scans', (select count(*) = 0 from public.scan_sessions where id = '00000000-0000-4000-8000-0000000000d1')),
  ('admin A cannot read personal feedback', (select count(*) = 0 from public.feedback)),
  ('admin A can rename own kiosk', not pg_temp.refused($q$update public.devices set label = 'Canteen' where id = '00000000-0000-4000-8000-0000000000c1'$q$)),
  ('admin A cannot relink a kiosk to another user (S2)', pg_temp.refused($q$update public.devices set kiosk_user_id = '00000000-0000-4000-8000-00000000a001' where id = '00000000-0000-4000-8000-0000000000c1'$q$)),
  ('admin A cannot insert devices directly (S2)', pg_temp.refused($q$insert into public.devices (institution_id, kiosk_user_id, label) values ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000a002', 'x')$q$)),
  ('admin A cannot save an invalid bin order', pg_temp.refused($q$update public.devices set bin_order = '{residual}' where id = '00000000-0000-4000-8000-0000000000c1'$q$)),
  ('admin A cannot edit global content (S1)', pg_temp.refused($q$update public.waste_items set display_name = 'x' where class_key = 'battery'$q$)),
  ('admin A cannot promote users', pg_temp.refused($q$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-00000000a003'$q$)),
  ('admin A cannot register an admin as kiosk', pg_temp.refused($q$select public.admin_register_kiosk('rls-adminB@test.invalid', 'x')$q$));
reset role;

-- ---------------------------------------------------------------- admin of institution B
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-00000000a005');
insert into rls_results values
  ('admin B cannot read institution A scans', (select count(*) = 0 from public.scan_sessions)),
  ('admin B cannot read institution A devices', (select count(*) = 0 from public.devices)),
  ('admin B cannot read institution A', (select count(*) = 1 from public.institutions)),
  ('admin B cannot edit institution A kiosk', pg_temp.refused($q$update public.devices set label = 'x' where id = '00000000-0000-4000-8000-0000000000c1'$q$)),
  ('admin B cannot delete institution A kiosk', pg_temp.refused($q$delete from public.devices where id = '00000000-0000-4000-8000-0000000000c1'$q$));
reset role;

select check_name, ok from rls_results order by ok, check_name;
rollback;
