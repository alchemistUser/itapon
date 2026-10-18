-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Pilot (Phase 25): pair kiosks without email, and measure kiosk uptime.
--
-- Pairing: an unregistered kiosk browser (anonymous session) asks for a 6-digit code that
-- is shown on its screen for 15 minutes. An institution admin types the code on /admin,
-- which turns that session into the kiosk account. The code proves the admin can see the
-- device, so no email (and no custom SMTP) is needed.
--
-- Heartbeat: a running kiosk marks one 5-minute bucket at a time. Admins of the kiosk's
-- institution read them as online hours per kiosk.

create table public.kiosk_pairings (
  code text primary key check (code ~ '^[0-9]{6}$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes'
);
alter table public.kiosk_pairings enable row level security;
revoke all on public.kiosk_pairings from anon, authenticated;  -- RPCs only

create table public.kiosk_heartbeats (
  device_id uuid not null references public.devices (id) on delete cascade,
  bucket timestamptz not null,  -- start of a 5-minute window
  primary key (device_id, bucket)
);
alter table public.kiosk_heartbeats enable row level security;
revoke insert, update, delete on public.kiosk_heartbeats from anon, authenticated;
create policy "Admins read institution heartbeats" on public.kiosk_heartbeats
  for select to authenticated
  using (
    (select private.is_admin())
    and exists (
      select 1 from public.devices d
      where d.id = device_id and d.institution_id = (select private.my_institution())
    )
  );

-- Kiosk side: get (or refresh) a pairing code for this browser's session.
create or replace function public.kiosk_request_pairing()
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c text;
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if exists (select 1 from public.devices where kiosk_user_id = uid) then
    raise exception 'This browser is already a registered kiosk' using errcode = '23505';
  end if;
  if exists (select 1 from public.profiles where id = uid and role = 'admin') then
    raise exception 'Use a separate browser profile for the kiosk, not an admin account'
      using errcode = '22023';
  end if;
  delete from public.kiosk_pairings p where p.user_id = uid or p.expires_at < now();
  loop
    c := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.kiosk_pairings p where p.code = c);
  end loop;
  insert into public.kiosk_pairings (code, user_id) values (c, uid);
  return query select p.code, p.expires_at from public.kiosk_pairings p where p.code = c;
end;
$$;
revoke execute on function public.kiosk_request_pairing() from public, anon;
grant execute on function public.kiosk_request_pairing() to authenticated;

-- Admin side: register the kiosk that shows this code.
create or replace function public.admin_register_kiosk_code(
  p_code text,
  p_label text,
  p_location text default null,
  p_bin_order text[] default '{biodegradable,recyclable,residual,hazardous}'
)
returns public.devices
language plpgsql
security definer
set search_path = ''
as $$
declare
  inst uuid := private.my_institution();
  kiosk_id uuid;
  result public.devices;
begin
  if not private.is_admin() or inst is null then
    raise exception 'Only institution admins can register kiosks' using errcode = '42501';
  end if;
  if coalesce(trim(p_label), '') = '' then
    raise exception 'Give the kiosk a name' using errcode = '22023';
  end if;
  if p_bin_order is null
     or cardinality(p_bin_order) <> 4
     or not (p_bin_order @> array['biodegradable','recyclable','residual','hazardous']) then
    raise exception 'Bin order must list each of the 4 bins once' using errcode = '22023';
  end if;

  select p.user_id into kiosk_id
    from public.kiosk_pairings p
   where p.code = trim(p_code) and p.expires_at > now();
  if kiosk_id is null then
    raise exception 'Code not found or expired. Get a new one on the kiosk.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where id = kiosk_id and role = 'admin') then
    raise exception 'That session is an admin; use a separate kiosk browser' using errcode = '22023';
  end if;

  update public.profiles set role = 'kiosk', institution_id = inst where id = kiosk_id;
  insert into public.devices (institution_id, kiosk_user_id, label, location_note, bin_order)
  values (inst, kiosk_id, trim(p_label), nullif(trim(p_location), ''), p_bin_order)
  returning * into result;
  delete from public.kiosk_pairings where user_id = kiosk_id;
  return result;
end;
$$;
revoke execute on function public.admin_register_kiosk_code(text, text, text, text[]) from public, anon;
grant execute on function public.admin_register_kiosk_code(text, text, text, text[]) to authenticated;

-- Kiosk side: "I'm running" for the current 5-minute window (idempotent).
create or replace function public.kiosk_heartbeat()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.kiosk_heartbeats (device_id, bucket)
  select d.id,
         to_timestamp(floor(extract(epoch from now()) / 300) * 300)
  from public.devices d
  where d.kiosk_user_id = (select auth.uid())
  on conflict do nothing
$$;
revoke execute on function public.kiosk_heartbeat() from public, anon;
grant execute on function public.kiosk_heartbeat() to authenticated;

-- Admin dashboard: online time per kiosk between two Manila dates (RLS scopes the rows).
create or replace function public.kiosk_uptime(p_from date, p_to date)
returns table (device_id uuid, buckets bigint, days bigint, last_seen timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select h.device_id,
         count(*) as buckets,
         count(distinct (h.bucket at time zone 'Asia/Manila')::date) as days,
         max(h.bucket) + interval '5 minutes' as last_seen
  from public.kiosk_heartbeats h
  where (h.bucket at time zone 'Asia/Manila')::date between p_from and p_to
  group by h.device_id
$$;
revoke execute on function public.kiosk_uptime(date, date) from public, anon;
grant execute on function public.kiosk_uptime(date, date) to authenticated;
