-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Feature flags for the v2 release (ROADMAP-v2 Phase 35).
--   * feature_flags: project-wide switches, changed only by the team (SQL / dashboard). The
--     rollback plan turns `points` off first (docs/release.md).
--   * institutions.points_enabled: an institution's admins can pause points for their members.
--     On by default for the prototype demo (D27).
-- The library has no flag: it is on for everyone.

create table public.feature_flags (
  key text primary key check (key ~ '^[a-z_]+$'),
  enabled boolean not null,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;
create policy "Anyone reads feature flags" on public.feature_flags for select to anon, authenticated using (true);
revoke insert, update, delete on public.feature_flags from anon, authenticated;
insert into public.feature_flags (key, enabled, note)
values ('points', true, 'Missions, claims and leaderboards. Turn off first when rolling back v2.');

alter table public.institutions add column points_enabled boolean not null default true;

-- Points are on for this user: the project switch, and their institution's (if any).
create or replace function private.points_on(p_user uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select f.enabled from public.feature_flags f where f.key = 'points'), false)
     and coalesce((select i.points_enabled from public.profiles p
                   join public.institutions i on i.id = p.institution_id
                   where p.id = p_user), true)
$$;

-- For the app: is points on for me, and if not, why.
create or replace function public.points_status()
returns table (enabled boolean, reason text)
language sql stable security definer set search_path = '' as $$
  select private.points_on((select auth.uid())),
         case
           when not coalesce((select f.enabled from public.feature_flags f where f.key = 'points'), false) then 'paused'
           when not private.points_on((select auth.uid())) then 'institution'
         end
$$;
revoke execute on function public.points_status() from public;
grant execute on function public.points_status() to anon, authenticated;

create or replace function public.admin_set_points_enabled(p_enabled boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_admin()) or (select private.my_institution()) is null then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.institutions set points_enabled = p_enabled where id = (select private.my_institution());
end
$$;
revoke execute on function public.admin_set_points_enabled(boolean) from public, anon;
grant execute on function public.admin_set_points_enabled(boolean) to authenticated;

-- Claims and leaderboards respect the flags (same functions as before plus the check).
create or replace function public.claim_mission(p_code text)
returns table (points integer, total bigint)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  m public.missions;
  key text;
  cap integer;
  earned bigint;
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if coalesce((select u.is_anonymous from auth.users u where u.id = uid), true) then
    raise exception 'Create an account to earn points. Your progress is kept.' using errcode = '42501';
  end if;
  if not private.points_on(uid) then
    raise exception 'Points are paused right now' using errcode = '42501';
  end if;
  perform private.rate_guard('claim', 60, interval '1 hour');
  insert into private.attempts (user_id, kind) values (uid, 'claim');
  select * into m from public.missions where code = p_code;
  if not found then
    raise exception 'Unknown mission' using errcode = '22023';
  end if;
  key := case m.period when 'daily' then private.day_key() else private.week_key() end;
  if p_code not in (select private.active_missions(m.period, key)) then
    raise exception 'That isn''t one of this period''s missions' using errcode = '22023';
  end if;
  if m.code in ('scan_kinds', 'all_bins') and private.scan_burst_today(uid) then
    raise exception 'Scan missions are paused today: too many scans in a short time' using errcode = '22023';
  end if;
  if private.mission_progress(uid, m.code) < m.target then
    raise exception 'Not finished yet' using errcode = '22023';
  end if;
  cap := case m.period when 'daily' then 30 else 150 end;
  select coalesce(sum(e.points), 0) into earned from public.point_events e
  join public.missions x on x.code = e.mission_code and x.period = m.period
  where e.user_id = uid and e.kind = 'award' and e.period_key = key;
  if earned + m.points > cap then
    raise exception 'You''ve reached the points cap for this period' using errcode = '22023';
  end if;
  begin
    insert into public.point_events (user_id, kind, mission_code, period_key, points)
    values (uid, 'award', m.code, key, m.points);
  exception when unique_violation then
    raise exception 'Already claimed' using errcode = '23505';
  end;
  return query select m.points, (select coalesce(sum(e.points), 0) from public.point_events e where e.user_id = uid);
end
$$;

create or replace function public.institution_leaderboard(p_period text)
returns table (rank bigint, handle text, avatar text, points bigint, is_me boolean)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  inst uuid := (select private.my_institution());
  since timestamptz;
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if inst is null or not private.points_on(uid) then
    return; -- no institution, or points paused for it: no board
  end if;
  since := case p_period
    when 'week' then private.week_start()
    when 'month' then date_trunc('month', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'
    else null end;
  if since is null then
    raise exception 'Use week or month' using errcode = '22023';
  end if;
  return query
  with board as (
    select p.id, p.handle, p.avatar, coalesce(sum(e.points), 0)::bigint as pts
    from public.profiles p
    left join public.point_events e on e.user_id = p.id and e.created_at >= since
    where p.institution_id = inst and private.leaderboard_eligible(p)
    group by p.id, p.handle, p.avatar
  ), ranked as (
    select b.*, rank() over (order by b.pts desc) as r from board b where b.pts > 0
  )
  select r.r, r.handle, r.avatar, r.pts, r.id = uid
  from ranked r
  where r.r <= 10 or r.id = uid
  order by r.r, r.handle;
end
$$;
