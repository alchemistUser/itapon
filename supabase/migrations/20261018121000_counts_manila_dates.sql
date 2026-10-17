-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Fix (found by the Phase 22 test run): the RPC date defaults used current_date (UTC), so
-- between 00:00 and 08:00 Philippine time "today" was still yesterday and new scans were
-- left out. Defaults now use the Manila date, like the rest of the analytics.

drop function public.daily_counts_by_category(date, date);
drop function public.top_items(date, date, integer);

create function public.daily_counts_by_category(
  p_from date default ((now() at time zone 'Asia/Manila')::date - 30),
  p_to date default (now() at time zone 'Asia/Manila')::date
)
returns table (day date, category_key text, detections bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select (s.created_at at time zone 'Asia/Manila')::date as day,
         d.category_key,
         count(*) as detections
  from public.scan_detections d
  join public.scan_sessions s on s.id = d.session_id
  where (s.created_at at time zone 'Asia/Manila')::date between p_from and p_to
  group by 1, 2
  order by 1, 2
$$;

create function public.top_items(
  p_from date default ((now() at time zone 'Asia/Manila')::date - 30),
  p_to date default (now() at time zone 'Asia/Manila')::date,
  p_limit integer default 10
)
returns table (class_key text, display_name text, category_key text, detections bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.class_key, i.display_name, d.category_key, count(*) as detections
  from public.scan_detections d
  join public.scan_sessions s on s.id = d.session_id
  join public.waste_items i on i.class_key = d.class_key
  where (s.created_at at time zone 'Asia/Manila')::date between p_from and p_to
  group by 1, 2, 3
  order by detections desc, d.class_key
  limit least(greatest(p_limit, 1), 50)
$$;

revoke execute on function public.daily_counts_by_category(date, date),
  public.top_items(date, date, integer) from public, anon;
grant execute on function public.daily_counts_by_category(date, date),
  public.top_items(date, date, integer) to authenticated;
