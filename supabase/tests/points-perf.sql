-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Load check for the points functions (ROADMAP-v2 Phase 34, task 5): one institution with
-- 300 public adult players, each with 20 scans this week, 10 library entries read and a week
-- of points, then the busiest calls timed as a member and as the admin. Runs in ONE
-- transaction that is rolled back, so it's safe against the shared project:
--
--   npx supabase db query --linked -o json -f supabase/tests/points-perf.sql
--
-- Prints one row per call: milliseconds per call, averaged over the repeats.

begin;

create temp table perf (what text, calls int, ms_per_call numeric) on commit drop;
grant all on perf to authenticated;
create temp table perf_users (id uuid primary key, n int) on commit drop;

insert into public.institutions (id, name)
values ('00000000-0000-4000-8000-00000000f001', 'Perf test institution');

insert into perf_users
select ('00000000-0000-4000-9000-' || lpad(g::text, 12, '0'))::uuid, g from generate_series(1, 300) g;

insert into auth.users (id, instance_id, aud, role, email, is_anonymous, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       'perf' || n || '@test.invalid', false, '{}', '{}', now() - interval '10 days', now()
from perf_users;

insert into public.profile_private (user_id, birth_year) select id, 1995 from perf_users;
update public.profiles p
set institution_id = '00000000-0000-4000-8000-00000000f001', handle = 'perf_' || u.n, is_public = true,
    role = case when u.n = 1 then 'admin'::public.app_role else 'user'::public.app_role end
from perf_users u where p.id = u.id;

insert into public.scan_sessions (user_id, model_version, created_at)
select u.id, 'perf', now() - (k * interval '7 hours') from perf_users u, generate_series(1, 20) k;
insert into public.scan_detections (session_id, class_key, category_key, confidence, bbox, is_primary)
select s.id, (array['banana_peel', 'plastic_bottle', 'straw', 'battery'])[1 + abs(hashtext(s.id::text)) % 4],
       'x', 0.9, '{}', true
from public.scan_sessions s where s.model_version = 'perf';

insert into public.mission_activity (user_id, kind, item_slug, created_at)
select u.id, 'read_entry', i.slug, now() - interval '1 day'
from perf_users u cross join (select slug from public.library_items order by slug limit 10) i;

insert into public.point_events (user_id, kind, mission_code, period_key, points, created_at)
select u.id, 'award', m, 'perf-' || d, 10, now() - d * interval '1 day'
from perf_users u, generate_series(0, 6) d, unnest(array['read_entry', 'scan_kinds', 'use_chooser']) m;

-- ---------------------------------------------------------------- a member (player 150)
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-9000-000000000150', 'role', 'authenticated')::text, true);
do $$
declare
  t0 timestamptz;
  i int;
begin
  t0 := clock_timestamp();
  for i in 1..20 loop perform * from public.mission_status(); end loop;
  insert into perf values ('mission_status', 20, round(extract(epoch from clock_timestamp() - t0) * 1000 / 20, 1));

  t0 := clock_timestamp();
  for i in 1..20 loop perform * from public.my_progress(); end loop;
  insert into perf values ('my_progress', 20, round(extract(epoch from clock_timestamp() - t0) * 1000 / 20, 1));

  t0 := clock_timestamp();
  for i in 1..10 loop perform * from public.refresh_badges(); end loop;
  insert into perf values ('refresh_badges', 10, round(extract(epoch from clock_timestamp() - t0) * 1000 / 10, 1));

  t0 := clock_timestamp();
  for i in 1..10 loop perform * from public.institution_leaderboard('week'); end loop;
  insert into perf values ('institution_leaderboard(week), 300 players', 10, round(extract(epoch from clock_timestamp() - t0) * 1000 / 10, 1));

  t0 := clock_timestamp();
  for i in 1..10 loop perform * from public.institution_leaderboard('month'); end loop;
  insert into perf values ('institution_leaderboard(month), 300 players', 10, round(extract(epoch from clock_timestamp() - t0) * 1000 / 10, 1));
end
$$;
reset role;

-- ---------------------------------------------------------------- the admin (player 1)
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-9000-000000000001', 'role', 'authenticated')::text, true);
do $$
declare
  t0 timestamptz;
  i int;
begin
  t0 := clock_timestamp();
  for i in 1..10 loop perform public.admin_points_stats(current_date - 6, current_date); end loop;
  insert into perf values ('admin_points_stats (7 days, 300 players)', 10, round(extract(epoch from clock_timestamp() - t0) * 1000 / 10, 1));
end
$$;
reset role;

select what, calls, ms_per_call from perf order by what;
rollback;
