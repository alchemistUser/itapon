-- SPDX-License-Identifier: AGPL-3.0-or-later
-- DEMO DATA ONLY (Phase 19). Creates a clearly labelled sample institution with three
-- kiosks and ~30 days of synthetic scans, and makes one existing account its admin, so
-- the /admin dashboard can be shown before real kiosks have run. Never run in production.
-- Remove everything with demo_cleanup.sql.
--
-- Usage (dev project): put your account's user id below, then
--   npx supabase db query --linked -f supabase/demo/demo_institution.sql

do $$
declare
  admin_id uuid := '00000000-0000-0000-0000-000000000000';  -- <- your auth user id
  inst uuid := 'de300000-0000-4000-8000-000000000001';
  devs uuid[] := array[
    'de300000-0000-4000-8000-0000000000d1',
    'de300000-0000-4000-8000-0000000000d2',
    'de300000-0000-4000-8000-0000000000d3']::uuid[];
  items text[] := array(select class_key from public.waste_items order by md5(class_key));
  n int := cardinality(items);
  day date;
  s uuid;
  k int;
  hr int;
  per_day int;
  dow int;
begin
  if not exists (select 1 from auth.users where id = admin_id) then
    raise exception 'Set admin_id to an existing auth user id first';
  end if;
  perform setseed(0.406);

  insert into public.institutions (id, name, location)
  values (inst, 'DEMO — Sample Campus (synthetic data)', 'Quezon City');

  insert into public.devices (id, institution_id, label, location_note, bin_order) values
    (devs[1], inst, 'Canteen kiosk', 'Ground floor canteen', '{biodegradable,recyclable,residual,hazardous}'),
    (devs[2], inst, 'Library kiosk', '2nd floor, by the stairs', '{recyclable,residual,biodegradable,hazardous}'),
    (devs[3], inst, 'Lobby kiosk', 'Main entrance', '{biodegradable,recyclable,residual,hazardous}');

  for day in select generate_series(
      (now() at time zone 'Asia/Manila')::date - 29,
      (now() at time zone 'Asia/Manila')::date, interval '1 day')::date loop
    dow := extract(isodow from day);
    per_day := case when dow >= 6 then 8 + floor(random() * 10) else 35 + floor(random() * 30) end;
    for k in 1..per_day loop
      -- school-day peaks: morning arrival, lunch, afternoon break
      hr := (array[7,8,9,10,11,11,12,12,12,13,13,14,15,16,16,17,18])[1 + floor(random() * 17)];
      insert into public.scan_sessions (user_id, model_version, source, latency_ms, inference_backend)
      values (admin_id, 'demo', 'kiosk', 120 + floor(random() * 200), 'wasm')
      returning id into s;
      -- the insert trigger derives device/institution from the user; set the demo ones here
      update public.scan_sessions set
        device_id = devs[1 + floor(random() * random() * 3)::int],
        institution_id = inst,
        source = 'kiosk',
        created_at = ((day + make_interval(hours => hr, mins => floor(random() * 60)::int))
                      at time zone 'Asia/Manila')
      where id = s;
      insert into public.scan_detections (session_id, class_key, category_key, confidence, bbox, is_primary)
      values (s, items[1 + floor(n * power(random(), 1.8))::int], 'residual',
              0.25 + random() * 0.6, '{"x1":0.2,"y1":0.2,"x2":0.8,"y2":0.8}', true);
      if random() < 0.25 then
        insert into public.scan_detections (session_id, class_key, category_key, confidence, bbox, is_primary)
        values (s, items[1 + floor(n * random())::int], 'residual',
                0.2 + random() * 0.4, '{"x1":0.1,"y1":0.5,"x2":0.4,"y2":0.9}', false);
      end if;
    end loop;
  end loop;
  -- detections inherit the scan's time
  update public.scan_detections d set created_at = ss.created_at
    from public.scan_sessions ss where ss.id = d.session_id and ss.institution_id = inst;

  update public.profiles set role = 'admin', institution_id = inst where id = admin_id;
end $$;
