-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Levels, streaks, badges and opt-in leaderboards (ROADMAP-v2 Phase 33, D26; docs/points.md).
-- Everything is computed from the points ledger and activity on the server. Leaderboards show
-- only the handle, avatar and points of public, adult members of the caller's own institution.

-- ---------------------------------------------------------------- levels & streaks

-- Lifetime points → level 1–10 (same table as src/lib/progress.ts).
create or replace function private.level_for(p_points bigint)
returns integer
language sql immutable set search_path = '' as $$
  select count(*)::integer from unnest(array[0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000]) t
  where p_points >= t
$$;

-- Days in a row (Manila) with at least one award; one missed day per streak is forgiven.
create or replace function private.current_streak(p_user uuid)
returns integer
language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
  d date;
  prev date := null;
  n integer := 0;
  grace boolean := false;
begin
  for d in
    select distinct (e.created_at at time zone 'Asia/Manila')::date as day
    from public.point_events e
    where e.user_id = p_user and e.kind = 'award'
    order by day desc
  loop
    if prev is null then
      if today - d > 2 then
        return 0;
      end if;
      grace := today - d = 2;
      n := 1;
    elsif prev - d = 1 then
      n := n + 1;
    elsif prev - d = 2 and not grace then
      grace := true;
      n := n + 1;
    else
      exit;
    end if;
    prev := d;
  end loop;
  return n;
end
$$;

create or replace function public.my_progress()
returns table (total bigint, level integer, streak integer)
language sql stable security definer set search_path = '' as $$
  with t as (
    select coalesce(sum(e.points), 0) as total from public.point_events e where e.user_id = (select auth.uid())
  )
  select t.total, private.level_for(t.total), private.current_streak((select auth.uid())) from t
$$;

-- ---------------------------------------------------------------- badges

create table public.badges (
  code text primary key check (code ~ '^[a-z_0-9]+$'),
  title_en text not null,
  title_fil text not null,
  how_en text not null,
  how_fil text not null,
  sort_order integer not null default 0
);
alter table public.badges enable row level security;
create policy "Anyone reads badges" on public.badges for select to anon, authenticated using (true);
revoke insert, update, delete on public.badges from anon, authenticated;

insert into public.badges (code, title_en, title_fil, how_en, how_fil, sort_order) values
  ('first_points', 'First points', 'Unang puntos', 'Claim any mission', 'Mag-claim ng kahit anong misyon', 10),
  ('streak_3', '3-day streak', '3 araw na sunod-sunod', 'Claim missions 3 days in a row', 'Mag-claim ng misyon 3 araw nang sunod-sunod', 20),
  ('streak_7', '7-day streak', '7 araw na sunod-sunod', 'Claim missions 7 days in a row', 'Mag-claim ng misyon 7 araw nang sunod-sunod', 30),
  ('bin_master', 'Bin master', 'Eksperto sa basurahan', 'Scan items for all 4 bins in a week', 'Mag-scan para sa lahat ng 4 na basurahan sa isang linggo', 40),
  ('full_week', 'Full week', 'Buong linggo', 'Claim all 3 weekly missions in one week', 'Kunin ang lahat ng 3 lingguhang misyon', 50),
  ('quiz_whiz', 'Quiz whiz', 'Magaling sa quiz', 'Answer 10 daily questions correctly', 'Sagutin nang tama ang 10 tanong araw-araw', 60),
  ('plastics_expert', 'Plastics expert', 'Eksperto sa plastik', 'Pass the Plastics material quiz', 'Pumasa sa quiz tungkol sa plastik', 70),
  ('hazard_handler', 'Hazard handler', 'Tagapag-ingat sa mapanganib', 'Read about batteries, lighting and household hazardous waste', 'Magbasa tungkol sa baterya, ilaw at mapanganib na basura', 80),
  ('all_materials', 'All 16 materials', 'Lahat ng 16 na materyal', 'Read an entry in every material group', 'Magbasa ng entry sa bawat uri ng materyal', 90),
  ('idea_doer', 'Idea doer', 'Gumagawa ng ideya', 'Mark 10 different ideas "Done it"', 'Markahan ang 10 ideya na "Nagawa ko na"', 100),
  ('level_5', 'Recycler', 'Recycler', 'Reach level 5', 'Umabot sa level 5', 110);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_code text not null references public.badges (code),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_code)
);
alter table public.user_badges enable row level security;
create policy "Users read own badges" on public.user_badges
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.user_badges from anon, authenticated;

-- Checks every badge for the caller, keeps new ones, and returns their codes. Guests earn
-- nothing (no points), but their badges appear once they create an account and claim.
create or replace function public.refresh_badges()
returns setof text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  total bigint;
  streak integer;
  earned text[] := '{}';
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  select coalesce(sum(points), 0) into total from public.point_events where user_id = uid;
  streak := private.current_streak(uid);

  if exists (select 1 from public.point_events where user_id = uid and kind = 'award') then
    earned := earned || 'first_points';
  end if;
  if streak >= 3 then earned := earned || 'streak_3'; end if;
  if streak >= 7 then earned := earned || 'streak_7'; end if;
  if exists (select 1 from public.point_events where user_id = uid and kind = 'award' and mission_code = 'all_bins') then
    earned := earned || 'bin_master';
  end if;
  if exists (select 1 from public.point_events e join public.missions m on m.code = e.mission_code
             where e.user_id = uid and e.kind = 'award' and m.period = 'weekly'
             group by e.period_key having count(*) >= 3) then
    earned := earned || 'full_week';
  end if;
  if (select count(*) from public.quiz_answers where user_id = uid and quiz_key like 'daily:%' and correct) >= 10 then
    earned := earned || 'quiz_whiz';
  end if;
  if exists (select 1 from public.quiz_answers where user_id = uid and quiz_key like 'group:PLA:%'
             group by quiz_key having count(*) filter (where correct) >= 4) then
    earned := earned || 'plastics_expert';
  end if;
  if (select count(distinct split_part(i.material_code, '-', 1)) from public.mission_activity a
      join public.library_items i on i.slug = a.item_slug
      where a.user_id = uid and a.kind = 'read_entry'
        and split_part(i.material_code, '-', 1) in ('BAT', 'LIG', 'HHW')) = 3 then
    earned := earned || 'hazard_handler';
  end if;
  if (select count(distinct split_part(i.material_code, '-', 1)) from public.mission_activity a
      join public.library_items i on i.slug = a.item_slug
      where a.user_id = uid and a.kind = 'read_entry')
     >= (select count(*) from public.library_materials where parent_code is null) then
    earned := earned || 'all_materials';
  end if;
  if (select count(distinct item_slug || '|' || coalesce(detail, '')) from public.mission_activity
      where user_id = uid and kind = 'idea_done') >= 10 then
    earned := earned || 'idea_doer';
  end if;
  if total >= 500 then earned := earned || 'level_5'; end if;

  -- Only accounts that can hold points keep badges.
  if coalesce((select u.is_anonymous from auth.users u where u.id = uid), true) then
    return;
  end if;
  return query
  insert into public.user_badges (user_id, badge_code)
  select uid, b from unnest(earned) b
  on conflict do nothing
  returning badge_code;
end
$$;

-- ---------------------------------------------------------------- leaderboards

alter table public.profiles add column leaderboard_hidden boolean not null default false;
-- (not in the column grants: only admins change it, through the function below)

-- Who may appear (docs/points.md): public (adults only), a handle, a member of the
-- institution, an account at least 3 days old, not hidden by an admin, not a kiosk.
create or replace function private.leaderboard_eligible(p public.profiles)
returns boolean
language sql stable security definer set search_path = '' as $$
  select p.is_public and p.handle is not null and p.institution_id is not null
     and not p.leaderboard_hidden and p.role <> 'kiosk'
     and not private.is_minor((select x.birth_year from public.profile_private x where x.user_id = p.id))
     and exists (select 1 from auth.users u
                 where u.id = p.id and not u.is_anonymous and u.created_at <= now() - interval '3 days')
$$;

-- Top 10 of the caller's institution for this week or month, plus the caller's own row
-- (rank null when they don't appear). Handle, avatar and points only.
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
  if inst is null then
    return;
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

create or replace function public.admin_set_leaderboard_hidden(p_user uuid, p_hidden boolean)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.profiles set leaderboard_hidden = p_hidden
  where id = p_user and institution_id = (select private.my_institution());
  if not found then
    raise exception 'Not a member of your institution' using errcode = '22023';
  end if;
end
$$;

revoke execute on function public.my_progress(), public.refresh_badges(),
  public.institution_leaderboard(text), public.admin_set_leaderboard_hidden(uuid, boolean)
  from public, anon;
grant execute on function public.my_progress(), public.refresh_badges(),
  public.institution_leaderboard(text), public.admin_set_leaderboard_hidden(uuid, boolean)
  to authenticated;
