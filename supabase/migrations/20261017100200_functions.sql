-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Server-side integrity + RPCs (ROADMAP Phase 10 tasks 6, Phase 16 "delete my data").
-- RPCs are SECURITY INVOKER, so RLS still decides which rows a caller sees.

-- A detection's bin comes from the item table, not from the client.
create or replace function private.detection_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select category_key into new.category_key
  from public.waste_items where class_key = new.class_key;
  if new.category_key is null then
    raise exception 'Unknown class_key %', new.class_key using errcode = '23503';
  end if;
  return new;
end;
$$;

create trigger scan_detections_category
  before insert on public.scan_detections
  for each row execute function private.detection_category();

-- Daily detection counts per bin (admin dashboard, Phase 19; users get their own).
create or replace function public.daily_counts_by_category(
  p_from date default (current_date - 30),
  p_to date default current_date
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

-- Most scanned items in a date range.
create or replace function public.top_items(
  p_from date default (current_date - 30),
  p_to date default current_date,
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

-- "Delete my data" (Phase 16, RA 10173). Detections cascade from sessions.
-- Uploaded feedback images are removed by the client through the Storage API.
create or replace function public.delete_my_data()
returns table (scans_deleted bigint, feedback_deleted bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n_scans bigint;
  n_feedback bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from public.feedback where user_id = (select auth.uid());
  get diagnostics n_feedback = row_count;
  delete from public.scan_sessions where user_id = (select auth.uid());
  get diagnostics n_scans = row_count;
  return query select n_scans, n_feedback;
end;
$$;

revoke execute on function public.daily_counts_by_category(date, date),
  public.top_items(date, date, integer),
  public.delete_my_data() from public, anon;
grant execute on function public.daily_counts_by_category(date, date),
  public.top_items(date, date, integer),
  public.delete_my_data() to authenticated;
