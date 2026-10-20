-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Admin analytics & evaluation (ROADMAP-v2 Phase 34).
--   * "Not found" searches: anonymous log of library searches with no result, so the team
--     sees which items to write next (content backlog). No user id; personal-looking text
--     (emails, long numbers) is refused.
--   * Knowledge test (pre/post) for the evaluation: 12 fixed "which bin?" questions, scored on
--     the server, stored under a participant code (P07), never a name.
--   * Points statistics for institution admins: by mission, active and returning players.

-- ---------------------------------------------------------------- "not found" searches

create table public.library_search_misses (
  id bigint generated always as identity primary key,
  query text not null check (char_length(query) between 2 and 60),
  created_at timestamptz not null default now()
);
create index library_search_misses_created_idx on public.library_search_misses (created_at desc);
alter table public.library_search_misses enable row level security;
revoke all on public.library_search_misses from anon, authenticated;  -- functions only

create or replace function public.log_search_miss(p_query text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  q text := lower(regexp_replace(trim(coalesce(p_query, '')), '\s+', ' ', 'g'));
begin
  if char_length(q) < 2 or char_length(q) > 60
     or q ~ '@' or q ~ '[0-9]{7,}' or q ~ 'https?://' then
    return; -- too short or long, or looks like personal data / a link: not stored
  end if;
  -- at most one copy of the same query per minute (keeps a stuck client from flooding)
  if exists (select 1 from public.library_search_misses m
             where m.query = q and m.created_at > now() - interval '1 minute') then
    return;
  end if;
  insert into public.library_search_misses (query) values (q);
end
$$;
revoke execute on function public.log_search_miss(text) from public;
grant execute on function public.log_search_miss(text) to anon, authenticated;

-- Top queries with no result (all users; the queries carry no identity). Admins only.
create or replace function public.admin_search_misses(p_from date, p_to date)
returns table (query text, searches bigint, last_seen timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.query, count(*), max(m.created_at)
  from public.library_search_misses m
  where (select private.is_admin())
    and (m.created_at at time zone 'Asia/Manila')::date between p_from and p_to
  group by m.query
  order by count(*) desc, max(m.created_at) desc
  limit 100
$$;
revoke execute on function public.admin_search_misses(date, date) from public, anon;
grant execute on function public.admin_search_misses(date, date) to authenticated;

-- ---------------------------------------------------------------- knowledge test

-- The 12 items, in order (same for pre and post so scores compare; spread over bins and the
-- usual mistakes: styrofoam, mug, carton, tissue, wrapper).
create or replace function private.knowledge_items()
returns table (n integer, slug text)
language sql immutable set search_path = '' as $$
  select * from (values
    (1, 'plastic-bottle'), (2, 'styrofoam'), (3, 'ceramic-mug'), (4, 'aa-battery'),
    (5, 'banana-peel'), (6, 'tetra-pack'), (7, 'glass-jar'), (8, 'cfl-bulb'),
    (9, 'used-tissue'), (10, 'snack-wrapper'), (11, 'aluminum-can'), (12, 'expired-medicine')
  ) t(n, slug)
$$;

create or replace function public.knowledge_test_items()
returns table (n integer, slug text, name_en text, name_fil text)
language sql stable security definer set search_path = '' as $$
  select k.n, k.slug, i.name_en, i.name_fil
  from private.knowledge_items() k join public.library_items i on i.slug = k.slug
  order by k.n
$$;
revoke execute on function public.knowledge_test_items() from public;
grant execute on function public.knowledge_test_items() to anon, authenticated;

create table public.knowledge_tests (
  id bigint generated always as identity primary key,
  participant_code text not null check (participant_code ~ '^P[0-9]{2,3}$'),
  form text not null check (form in ('pre', 'post')),
  score integer not null check (score between 0 and 12),
  total integer not null default 12,
  answers jsonb not null,  -- {"plastic-bottle": "recyclable", ...}
  institution_id uuid references public.institutions (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (participant_code, form, institution_id)
);
alter table public.knowledge_tests enable row level security;
create policy "Admins read institution tests" on public.knowledge_tests
  for select to authenticated using (
    (select private.is_admin()) and institution_id = (select private.my_institution())
  );
revoke insert, update, delete on public.knowledge_tests from anon, authenticated;

-- Scores on the server and stores the result under the participant code and the institution
-- of whoever runs the session (the facilitator's device). Returns the score only.
create or replace function public.submit_knowledge_test(p_code text, p_form text, p_answers jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  s integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if p_code !~ '^P[0-9]{2,3}$' or p_form not in ('pre', 'post') or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Use a participant code like P07, and pre or post' using errcode = '22023';
  end if;
  perform private.rate_guard('knowledge', 60, interval '1 hour');
  insert into private.attempts (user_id, kind) values ((select auth.uid()), 'knowledge');
  select count(*) into s
  from private.knowledge_items() k join public.library_items i on i.slug = k.slug
  where p_answers ->> k.slug = i.bin;
  begin
    insert into public.knowledge_tests (participant_code, form, score, answers, institution_id)
    values (p_code, p_form, s,
            (select coalesce(jsonb_object_agg(k.slug, p_answers -> k.slug), '{}')
             from private.knowledge_items() k where p_answers ? k.slug),
            (select private.my_institution()));
  exception when unique_violation then
    raise exception '% already has a % test here', p_code, p_form using errcode = '23505';
  end;
  return s;
end
$$;
revoke execute on function public.submit_knowledge_test(text, text, jsonb) from public, anon;
grant execute on function public.submit_knowledge_test(text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------- points statistics

-- For the admin's institution between two Manila dates: awards and points per mission,
-- players per day, active players, and how many of the previous period's players came back.
create or replace function public.admin_points_stats(p_from date, p_to date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  inst uuid := (select private.my_institution());
  days integer := p_to - p_from + 1;
  result jsonb;
begin
  if not (select private.is_admin()) or inst is null then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  with ev as (
    select e.user_id, e.mission_code, e.points, e.kind,
           (e.created_at at time zone 'Asia/Manila')::date as day
    from public.point_events e
    join public.profiles p on p.id = e.user_id and p.institution_id = inst
  ), cur as (select * from ev where day between p_from and p_to),
  prev as (select * from ev where day between p_from - days and p_from - 1)
  select jsonb_build_object(
    'by_mission', coalesce((select jsonb_agg(jsonb_build_object('code', mission_code, 'awards', n, 'points', pts) order by n desc)
                            from (select mission_code, count(*) n, sum(points) pts from cur
                                  where kind = 'award' group by mission_code) x), '[]'),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'players', n) order by day)
                       from (select day, count(distinct user_id) n from cur where kind = 'award' group by day) x), '[]'),
    'players', (select count(distinct user_id) from cur where kind = 'award'),
    'points', (select coalesce(sum(points), 0) from cur),
    'previous_players', (select count(distinct user_id) from prev where kind = 'award'),
    'returning_players', (select count(distinct c.user_id) from cur c
                          where c.kind = 'award' and exists (select 1 from prev p where p.user_id = c.user_id and p.kind = 'award')),
    'reversals', (select count(*) from cur where kind = 'reversal')
  ) into result;
  return result;
end
$$;
revoke execute on function public.admin_points_stats(date, date) from public, anon;
grant execute on function public.admin_points_stats(date, date) to authenticated;
