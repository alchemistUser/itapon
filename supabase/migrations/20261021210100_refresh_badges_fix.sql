-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Fix for 20261021210000: text[] || 'literal' parses the literal as an array; append instead.
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
    earned := array_append(earned, 'first_points');
  end if;
  if streak >= 3 then earned := array_append(earned, 'streak_3'); end if;
  if streak >= 7 then earned := array_append(earned, 'streak_7'); end if;
  if exists (select 1 from public.point_events where user_id = uid and kind = 'award' and mission_code = 'all_bins') then
    earned := array_append(earned, 'bin_master');
  end if;
  if exists (select 1 from public.point_events e join public.missions m on m.code = e.mission_code
             where e.user_id = uid and e.kind = 'award' and m.period = 'weekly'
             group by e.period_key having count(*) >= 3) then
    earned := array_append(earned, 'full_week');
  end if;
  if (select count(*) from public.quiz_answers where user_id = uid and quiz_key like 'daily:%' and correct) >= 10 then
    earned := array_append(earned, 'quiz_whiz');
  end if;
  if exists (select 1 from public.quiz_answers where user_id = uid and quiz_key like 'group:PLA:%'
             group by quiz_key having count(*) filter (where correct) >= 4) then
    earned := array_append(earned, 'plastics_expert');
  end if;
  if (select count(distinct split_part(i.material_code, '-', 1)) from public.mission_activity a
      join public.library_items i on i.slug = a.item_slug
      where a.user_id = uid and a.kind = 'read_entry'
        and split_part(i.material_code, '-', 1) in ('BAT', 'LIG', 'HHW')) = 3 then
    earned := array_append(earned, 'hazard_handler');
  end if;
  if (select count(distinct split_part(i.material_code, '-', 1)) from public.mission_activity a
      join public.library_items i on i.slug = a.item_slug
      where a.user_id = uid and a.kind = 'read_entry')
     >= (select count(*) from public.library_materials where parent_code is null) then
    earned := array_append(earned, 'all_materials');
  end if;
  if (select count(distinct item_slug || '|' || coalesce(detail, '')) from public.mission_activity
      where user_id = uid and kind = 'idea_done') >= 10 then
    earned := array_append(earned, 'idea_doer');
  end if;
  if total >= 500 then earned := array_append(earned, 'level_5'); end if;

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
