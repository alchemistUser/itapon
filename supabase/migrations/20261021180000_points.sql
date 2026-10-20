-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Points engine (ROADMAP-v2 Phase 32, D26; rules: docs/points.md).
-- Daily and weekly missions computed on the server from what the server already knows (the
-- user's scans, library activity, quiz answers). Clients never write points: they call
-- claim_mission(), which checks the mission is active, complete, unclaimed and within caps.
-- Every point is a row in point_events (awards and reversals; nothing is updated or deleted
-- except by account deletion).

-- ---------------------------------------------------------------- periods (Manila time)

create or replace function private.day_key() returns text
language sql stable set search_path = '' as $$
  select to_char(now() at time zone 'Asia/Manila', 'YYYY-MM-DD')
$$;
create or replace function private.week_key() returns text
language sql stable set search_path = '' as $$
  select to_char(now() at time zone 'Asia/Manila', 'IYYY-"W"IW')
$$;
create or replace function private.day_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('day', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'
$$;
create or replace function private.week_start() returns timestamptz
language sql stable set search_path = '' as $$
  select date_trunc('week', now() at time zone 'Asia/Manila') at time zone 'Asia/Manila'
$$;

-- ---------------------------------------------------------------- missions catalogue

create table public.missions (
  code text primary key check (code ~ '^[a-z_]+$'),
  period text not null check (period in ('daily', 'weekly')),
  title_en text not null,
  title_fil text not null,
  target integer not null check (target > 0),
  points integer not null check (points > 0),
  sort_order integer not null default 0
);
alter table public.missions enable row level security;
create policy "Anyone reads missions" on public.missions for select to anon, authenticated using (true);
revoke insert, update, delete on public.missions from anon, authenticated;

insert into public.missions (code, period, title_en, title_fil, target, points, sort_order) values
  ('scan_kinds', 'daily', 'Scan 3 different kinds of items', 'Mag-scan ng 3 magkakaibang uri ng gamit', 3, 10, 10),
  ('read_entry', 'daily', 'Read a library entry you haven''t read before', 'Magbasa ng bagong entry sa library', 1, 10, 20),
  ('daily_quiz', 'daily', 'Answer today''s quiz question correctly', 'Sagutin nang tama ang tanong ngayong araw', 1, 10, 30),
  ('use_chooser', 'daily', 'Use "Which one is yours?" after a scan', 'Gamitin ang "Alin ang sa iyo?" pagkatapos mag-scan', 1, 10, 40),
  ('plan_idea', 'daily', 'Mark a reuse or reduce idea "I''ll do this"', 'Pumili ng ideya at pindutin ang "Gagawin ko ito"', 1, 10, 50),
  ('all_bins', 'weekly', 'Scan items for all 4 bins', 'Mag-scan ng gamit para sa lahat ng 4 na basurahan', 4, 50, 110),
  ('five_dailies', 'weekly', 'Complete 5 daily missions', 'Tapusin ang 5 pang-araw-araw na misyon', 5, 50, 120),
  ('group_quiz', 'weekly', 'Pass a 5-question quiz on one material group', 'Pumasa sa 5-tanong na quiz sa isang uri ng materyal', 1, 50, 130),
  ('three_groups', 'weekly', 'Read entries from 3 different material groups', 'Magbasa mula sa 3 magkakaibang uri ng materyal', 3, 50, 140),
  ('two_done', 'weekly', 'Mark 2 ideas "Done it"', 'Markahan ang 2 ideya na "Nagawa ko na"', 2, 50, 150);

-- The same 3 missions per period for everyone, picked from the period key (no rerolls).
create or replace function private.active_missions(p_period text, p_key text)
returns setof text
language sql stable set search_path = '' as $$
  select m.code from public.missions m
  where m.period = p_period
  order by md5(m.code || p_key)
  limit 3
$$;

-- ---------------------------------------------------------------- ledger

create table public.point_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('award', 'reversal')),
  mission_code text references public.missions (code),
  period_key text,
  points integer not null,
  reverses bigint references public.point_events (id) on delete cascade,
  reason text check (char_length(reason) <= 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint point_event_shape check (
    (kind = 'award' and mission_code is not null and period_key is not null and points > 0 and reverses is null)
    or (kind = 'reversal' and reverses is not null and points < 0 and reason is not null)
  )
);
create unique index point_events_award_once on public.point_events (user_id, mission_code, period_key)
  where kind = 'award';
create unique index point_events_reverse_once on public.point_events (reverses) where kind = 'reversal';
create index point_events_user_idx on public.point_events (user_id, created_at desc);
alter table public.point_events enable row level security;
create policy "Users read own points" on public.point_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Admins read institution points" on public.point_events
  for select to authenticated using (
    (select private.is_admin())
    and exists (select 1 from public.profiles p
                where p.id = user_id and p.institution_id = (select private.my_institution()))
  );
revoke insert, update, delete on public.point_events from anon, authenticated;

-- ---------------------------------------------------------------- activity & quizzes

create table public.mission_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('read_entry', 'chooser', 'idea_plan', 'idea_done')),
  item_slug text not null references public.library_items (slug) on delete cascade,
  detail text check (char_length(detail) <= 200),
  created_at timestamptz not null default now()
);
create index mission_activity_user_idx on public.mission_activity (user_id, kind, created_at desc);
alter table public.mission_activity enable row level security;
create policy "Users read own activity" on public.mission_activity
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.mission_activity from anon, authenticated;

create table public.quiz_answers (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_key text not null check (quiz_key ~ '^(daily:[0-9]{4}-[0-9]{2}-[0-9]{2}|group:[A-Z]{3}:[0-9]{4}-W[0-9]{2})$'),
  item_slug text not null references public.library_items (slug) on delete cascade,
  answer text not null check (answer in ('biodegradable', 'recyclable', 'residual', 'hazardous')),
  correct boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, quiz_key, item_slug)
);
alter table public.quiz_answers enable row level security;
create policy "Users read own answers" on public.quiz_answers
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.quiz_answers from anon, authenticated;

create table public.point_flags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('scan_burst')),
  day_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, day_key)
);
alter table public.point_flags enable row level security;
create policy "Admins read institution flags" on public.point_flags
  for select to authenticated using (
    (select private.is_admin())
    and exists (select 1 from public.profiles p
                where p.id = user_id and p.institution_id = (select private.my_institution()))
  );
revoke insert, update, delete on public.point_flags from anon, authenticated;

-- ---------------------------------------------------------------- progress

-- The user's scans that count: main item at least 35% sure, at least 5 s after the previous
-- scan, at most 30 per hour. (Scan results come from the device, so a determined cheater can
-- fake them; the mission caps bound what that can earn.)
create or replace function private.counted_scans(p_user uuid, p_since timestamptz)
returns table (created_at timestamptz, class_key text, bin text)
language sql stable security definer set search_path = '' as $$
  with s as (
    select s.created_at, d.class_key, d.category_key as bin,
           s.created_at - lag(s.created_at) over (order by s.created_at) as gap
    from public.scan_sessions s
    join public.scan_detections d on d.session_id = s.id and d.is_primary
    where s.user_id = p_user and s.created_at >= p_since and d.confidence >= 0.35
  ), spaced as (
    select *, row_number() over (partition by date_trunc('hour', s.created_at) order by s.created_at) as n
    from s where gap is null or gap >= interval '5 seconds'
  )
  select spaced.created_at, spaced.class_key, spaced.bin from spaced where n <= 30
$$;

-- 10 or more scans within one minute today: flag (admins see it) and block scan missions.
create or replace function private.scan_burst_today(p_user uuid)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  burst boolean;
begin
  select exists (
    select 1 from (
      select count(*) over (order by s.created_at range between interval '59 seconds' preceding and current row) as c
      from public.scan_sessions s
      where s.user_id = p_user and s.created_at >= private.day_start()
    ) x where x.c >= 10
  ) into burst;
  if burst then
    insert into public.point_flags (user_id, reason, day_key)
    values (p_user, 'scan_burst', private.day_key())
    on conflict do nothing;
  end if;
  return burst or exists (select 1 from public.point_flags f
                          where f.user_id = p_user and f.reason = 'scan_burst' and f.day_key = private.day_key());
end
$$;

create or replace function private.mission_progress(p_user uuid, p_code text)
returns integer
language sql stable security definer set search_path = '' as $$
  select case p_code
    when 'scan_kinds' then (select count(distinct c.class_key) from private.counted_scans(p_user, private.day_start()) c)
    when 'all_bins' then (select count(distinct c.bin) from private.counted_scans(p_user, private.week_start()) c)
    when 'read_entry' then (
      select count(distinct a.item_slug) from public.mission_activity a
      where a.user_id = p_user and a.kind = 'read_entry' and a.created_at >= private.day_start()
        and not exists (select 1 from public.mission_activity b
                        where b.user_id = p_user and b.kind = 'read_entry'
                          and b.item_slug = a.item_slug and b.created_at < private.day_start()))
    when 'use_chooser' then (
      select count(*) from public.mission_activity a
      where a.user_id = p_user and a.kind = 'chooser' and a.created_at >= private.day_start())
    when 'plan_idea' then (
      select count(*) from public.mission_activity a
      where a.user_id = p_user and a.kind = 'idea_plan' and a.created_at >= private.day_start())
    when 'two_done' then (
      select count(distinct a.item_slug || '|' || coalesce(a.detail, '')) from public.mission_activity a
      where a.user_id = p_user and a.kind = 'idea_done' and a.created_at >= private.week_start())
    when 'three_groups' then (
      select count(distinct split_part(i.material_code, '-', 1)) from public.mission_activity a
      join public.library_items i on i.slug = a.item_slug
      where a.user_id = p_user and a.kind = 'read_entry' and a.created_at >= private.week_start())
    when 'daily_quiz' then (
      select count(*) from public.quiz_answers q
      where q.user_id = p_user and q.quiz_key = 'daily:' || private.day_key() and q.correct)
    when 'group_quiz' then (
      select count(*) from (
        select q.quiz_key from public.quiz_answers q
        where q.user_id = p_user and q.quiz_key like 'group:%:' || private.week_key()
        group by q.quiz_key having count(*) filter (where q.correct) >= 4) passed)
    when 'five_dailies' then (
      select count(*) from public.point_events e
      join public.missions m on m.code = e.mission_code and m.period = 'daily'
      where e.user_id = p_user and e.kind = 'award' and e.created_at >= private.week_start()
        and not exists (select 1 from public.point_events r where r.reverses = e.id))
    else 0
  end::integer
$$;

-- ---------------------------------------------------------------- public functions

-- Today's and this week's missions with the caller's progress.
create or replace function public.mission_status()
returns table (code text, period text, period_key text, title_en text, title_fil text,
               target integer, points integer, progress integer, claimed boolean, blocked boolean)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  burst boolean;
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  burst := private.scan_burst_today(uid);
  return query
  select m.code, m.period, k.key, m.title_en, m.title_fil, m.target, m.points,
         least(private.mission_progress(uid, m.code), m.target),
         exists (select 1 from public.point_events e
                 where e.user_id = uid and e.kind = 'award' and e.mission_code = m.code and e.period_key = k.key),
         (burst and m.code in ('scan_kinds', 'all_bins'))
  from (values ('daily', private.day_key()), ('weekly', private.week_key())) as k(period, key)
  join public.missions m on m.period = k.period
  where m.code in (select private.active_missions(k.period, k.key))
  order by m.sort_order;
end
$$;

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

create or replace function public.my_points()
returns table (total bigint, today bigint, this_week bigint)
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(e.points), 0),
         coalesce(sum(e.points) filter (where e.created_at >= private.day_start()), 0),
         coalesce(sum(e.points) filter (where e.created_at >= private.week_start()), 0)
  from public.point_events e where e.user_id = (select auth.uid())
$$;

-- Library activity that missions count (reading, chooser, ideas). Checks the item (and idea)
-- exists; at most one row per kind, item and idea per day; 300 calls per hour.
create or replace function public.record_activity(p_kind text, p_slug text, p_detail text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  it public.library_items;
begin
  if uid is null then
    return; -- not signed in: nothing to count
  end if;
  if p_kind not in ('read_entry', 'chooser', 'idea_plan', 'idea_done') then
    raise exception 'Unknown activity' using errcode = '22023';
  end if;
  perform private.rate_guard('activity', 300, interval '1 hour');
  insert into private.attempts (user_id, kind) values (uid, 'activity');
  select * into it from public.library_items where slug = p_slug;
  if not found then
    raise exception 'Unknown item' using errcode = '22023';
  end if;
  if p_kind in ('idea_plan', 'idea_done') and not (p_detail = any (it.reuse_en || it.reduce_en)) then
    raise exception 'Unknown idea' using errcode = '22023';
  end if;
  insert into public.mission_activity (user_id, kind, item_slug, detail)
  select uid, p_kind, p_slug, case when p_kind like 'idea_%' then p_detail end
  where not exists (
    select 1 from public.mission_activity a
    where a.user_id = uid and a.kind = p_kind and a.item_slug = p_slug
      and a.detail is not distinct from (case when p_kind like 'idea_%' then p_detail end)
      and a.created_at >= private.day_start());
end
$$;

-- Today's question (same for everyone). The answer is revealed only after answering.
create or replace function public.daily_quiz()
returns table (quiz_key text, item_slug text, name_en text, name_fil text,
               my_answer text, correct boolean, right_bin text)
language sql stable security definer set search_path = '' as $$
  select 'daily:' || private.day_key(), i.slug, i.name_en, i.name_fil, q.answer, q.correct,
         case when q.answer is not null then i.bin end
  from (select * from public.library_items order by md5(slug || private.day_key()) limit 1) i
  left join public.quiz_answers q
    on q.user_id = (select auth.uid()) and q.quiz_key = 'daily:' || private.day_key() and q.item_slug = i.slug
$$;

-- This week's 5 questions on one material group, picked per person (so answers can't be copied).
create or replace function private.group_quiz_items(p_user uuid, p_group text)
returns setof text
language sql stable security definer set search_path = '' as $$
  select i.slug from public.library_items i
  where split_part(i.material_code, '-', 1) = p_group
  order by md5(i.slug || private.week_key() || p_user::text)
  limit 5
$$;

create or replace function public.group_quiz(p_group text)
returns table (quiz_key text, item_slug text, name_en text, name_fil text,
               my_answer text, correct boolean, right_bin text)
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  g text := upper(p_group);
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  return query
  select 'group:' || g || ':' || private.week_key(), i.slug, i.name_en, i.name_fil, q.answer, q.correct,
         case when q.answer is not null then i.bin end
  from public.library_items i
  left join public.quiz_answers q
    on q.user_id = uid and q.quiz_key = 'group:' || g || ':' || private.week_key() and q.item_slug = i.slug
  where i.slug in (select private.group_quiz_items(uid, g))
  order by md5(i.slug || private.week_key() || uid::text);
end
$$;

create or replace function public.answer_quiz(p_key text, p_slug text, p_answer text)
returns table (correct boolean, right_bin text)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  right_answer text;
  ok boolean;
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  perform private.rate_guard('activity', 300, interval '1 hour');
  insert into private.attempts (user_id, kind) values (uid, 'activity');
  if p_key = 'daily:' || private.day_key() then
    ok := p_slug = (select d.item_slug from public.daily_quiz() d);
  elsif p_key ~ '^group:[A-Z]{3}:' and split_part(p_key, ':', 3) = private.week_key() then
    ok := p_slug in (select private.group_quiz_items(uid, split_part(p_key, ':', 2)));
  else
    ok := false;
  end if;
  if not ok then
    raise exception 'That question isn''t open right now' using errcode = '22023';
  end if;
  select i.bin into right_answer from public.library_items i where i.slug = p_slug;
  begin
    insert into public.quiz_answers (user_id, quiz_key, item_slug, answer, correct)
    values (uid, p_key, p_slug, p_answer, p_answer = right_answer);
  exception when unique_violation then
    raise exception 'Already answered' using errcode = '23505';
  end;
  return query select p_answer = right_answer, right_answer;
end
$$;

-- Institution admins: reverse a member's award with a reason (the award stays; a reversal is
-- added, so every point remains traceable).
create or replace function public.admin_reverse_points(p_event bigint, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  e public.point_events;
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if char_length(coalesce(trim(p_reason), '')) < 3 then
    raise exception 'Give a short reason' using errcode = '22023';
  end if;
  select * into e from public.point_events pe
  where pe.id = p_event and pe.kind = 'award'
    and exists (select 1 from public.profiles p
                where p.id = pe.user_id and p.institution_id = (select private.my_institution()));
  if not found then
    raise exception 'Not an award of a member of your institution' using errcode = '22023';
  end if;
  begin
    insert into public.point_events (user_id, kind, points, reverses, reason, created_by)
    values (e.user_id, 'reversal', -e.points, e.id, left(trim(p_reason), 200), (select auth.uid()));
  exception when unique_violation then
    raise exception 'Already reversed' using errcode = '23505';
  end;
end
$$;

revoke execute on function public.mission_status(), public.claim_mission(text), public.my_points(),
  public.record_activity(text, text, text), public.daily_quiz(), public.group_quiz(text),
  public.answer_quiz(text, text, text), public.admin_reverse_points(bigint, text) from public, anon;
grant execute on function public.mission_status(), public.claim_mission(text), public.my_points(),
  public.record_activity(text, text, text), public.daily_quiz(), public.group_quiz(text),
  public.answer_quiz(text, text, text), public.admin_reverse_points(bigint, text) to authenticated;
