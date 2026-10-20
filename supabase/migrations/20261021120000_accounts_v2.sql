-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Accounts v2 (ROADMAP-v2 Phase 31; privacy review: docs/accounts/privacy-review.md).
--   * profile: handle (unique, validated, 30-day change cooldown), preset avatar, public toggle
--   * birth year in an OWNER-ONLY table (admins can read institution profiles, so it can't
--     live on profiles); conservative age rule; minors can't be public (D22)
--   * consent records (kind, version, date)
--   * institution join codes: one standing, rotatable code per institution (D23); join/leave;
--     admins remove members
--   * export my data, delete my account
--   * per-account rate limits for join attempts and handle checks
-- Nothing here is readable by other users except what admins could already see.

-- ---------------------------------------------------------------- rate limits

create table private.attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
create index attempts_lookup_idx on private.attempts (user_id, kind, at desc);

-- Raises when this user already made `max_n` attempts of `kind` within `win`.
create or replace function private.rate_guard(kind text, max_n integer, win interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from private.attempts a
      where a.user_id = (select auth.uid()) and a.kind = rate_guard.kind and a.at > now() - win)
     >= max_n then
    raise exception 'Too many attempts. Try again in an hour.' using errcode = '54000';
  end if;
  delete from private.attempts a where a.at < now() - interval '1 day';
end
$$;

-- ---------------------------------------------------------------- handles & profile

-- Reserved handles (exact) and blocked words (anywhere in the handle). The team extends the
-- blocked list (privacy review §7); these are the obvious ones.
create table private.handle_words (
  word text primary key check (word ~ '^[a-z0-9_]+$'),
  kind text not null check (kind in ('reserved', 'blocked'))
);
insert into private.handle_words (word, kind) values
  ('admin', 'reserved'), ('administrator', 'reserved'), ('itapon', 'reserved'),
  ('itapon_team', 'reserved'), ('support', 'reserved'), ('help', 'reserved'),
  ('moderator', 'reserved'), ('mod', 'reserved'), ('staff', 'reserved'), ('tip', 'reserved'),
  ('tipqc', 'reserved'), ('official', 'reserved'), ('system', 'reserved'), ('root', 'reserved'),
  ('null', 'reserved'), ('undefined', 'reserved'), ('kiosk', 'reserved'), ('enro', 'reserved'),
  ('denr', 'reserved'), ('emb', 'reserved'), ('qc', 'reserved'), ('quezoncity', 'reserved'),
  ('fuck', 'blocked'), ('shit', 'blocked'), ('bitch', 'blocked'), ('putangina', 'blocked'),
  ('tangina', 'blocked'), ('puta', 'blocked'), ('gago', 'blocked'), ('tanga', 'blocked'),
  ('bobo', 'blocked'), ('ulol', 'blocked'), ('tarantado', 'blocked'), ('pakyu', 'blocked'),
  ('kupal', 'blocked'), ('pokpok', 'blocked'), ('nigger', 'blocked'), ('nigga', 'blocked');

-- Why a handle can't be used, or null if it's fine (format + word lists; not uniqueness).
create or replace function private.handle_problem(h text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when h is null or h !~ '^[a-z0-9_]{3,20}$'
      then 'Use 3 to 20 lowercase letters, numbers or _'
    when exists (select 1 from private.handle_words w where w.kind = 'reserved' and w.word = h)
      then 'That handle is reserved'
    when exists (select 1 from private.handle_words w
                 where w.kind = 'blocked' and position(w.word in replace(h, '_', '')) > 0)
      then 'Please choose another handle'
  end
$$;

-- Conservative age rule (privacy review §4): adult only from 1 January of birth year + 19;
-- no birth year counts as under 18.
create or replace function private.is_minor(birth_year smallint)
returns boolean
language sql
stable
set search_path = ''
as $$
  select birth_year is null
      or extract(year from now() at time zone 'Asia/Manila')::int - birth_year < 19
$$;

alter table public.profiles
  add column handle text check (handle ~ '^[a-z0-9_]{3,20}$'),
  add column handle_changed_at timestamptz,
  add column avatar text check (avatar ~ '^[a-z]+-[0-9]{1,2}$'),
  add column is_public boolean not null default false,
  add column institution_joined_at timestamptz;
create unique index profiles_handle_key on public.profiles (handle);

-- Owner-only: never reached by the admin policy on profiles.
create table public.profile_private (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  birth_year smallint check (birth_year between 1900 and 2100),
  birth_year_edits smallint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;
create policy "Users read own private profile" on public.profile_private
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users add own private profile" on public.profile_private
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Users update own private profile" on public.profile_private
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.profile_private from anon, authenticated;
grant select on public.profile_private to authenticated;
grant insert (birth_year), update (birth_year) on public.profile_private to authenticated;

create or replace function private.profile_private_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  this_year int := extract(year from now() at time zone 'Asia/Manila')::int;
begin
  new.updated_at := now();
  if new.birth_year is not null and (new.birth_year > this_year or new.birth_year < this_year - 120) then
    raise exception 'Please enter a real birth year' using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    new.birth_year_edits := old.birth_year_edits;
    if old.birth_year is not null and new.birth_year is distinct from old.birth_year then
      if old.birth_year_edits >= 1 then
        raise exception 'Birth year was already corrected once. Ask the iTapon team to change it.'
          using errcode = '42501';
      end if;
      new.birth_year_edits := old.birth_year_edits + 1;
    end if;
  else
    new.birth_year_edits := 0;
  end if;
  -- an account that is (now) under 18 is never public
  if private.is_minor(new.birth_year) then
    update public.profiles set is_public = false where id = new.user_id and is_public;
  end if;
  return new;
end
$$;
create trigger profile_private_guard
  before insert or update on public.profile_private
  for each row execute function private.profile_private_guard();

create or replace function private.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  problem text;
begin
  if new.handle is distinct from old.handle then
    if new.handle is not null then
      problem := private.handle_problem(new.handle);
      if problem is not null then
        raise exception '%', problem using errcode = '22023';
      end if;
    end if;
    if old.handle is not null and old.handle_changed_at > now() - interval '30 days' then
      raise exception 'You can change your handle once every 30 days' using errcode = '42501';
    end if;
    new.handle_changed_at := now();
  else
    new.handle_changed_at := old.handle_changed_at;
  end if;
  if new.is_public and not old.is_public and private.is_minor(
    (select p.birth_year from public.profile_private p where p.user_id = new.id)
  ) then
    raise exception 'Profiles of people under 18 stay private' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function private.profiles_guard();

grant update (handle, avatar, is_public) on public.profiles to authenticated;

-- Is this handle free and allowed? (true/false only; 60 checks per hour)
create or replace function public.handle_available(p_handle text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h text := lower(trim(p_handle));
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  perform private.rate_guard('handle_check', 60, interval '1 hour');
  insert into private.attempts (user_id, kind) values (uid, 'handle_check');
  return private.handle_problem(h) is null
     and not exists (select 1 from public.profiles p where p.handle = h and p.id <> uid);
end
$$;
revoke execute on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;

-- ---------------------------------------------------------------- consent records

create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('privacy_notice', 'guardian_notice')),
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),  -- notice date
  accepted_at timestamptz not null default now()
);
create index consents_user_idx on public.consents (user_id, accepted_at desc);
alter table public.consents enable row level security;
create policy "Users read own consents" on public.consents
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users record own consent" on public.consents
  for insert to authenticated
  with check (user_id = (select auth.uid()) and accepted_at > now() - interval '1 minute');
revoke all on public.consents from anon, authenticated;
grant select on public.consents to authenticated;
grant insert (kind, version) on public.consents to authenticated;

-- ---------------------------------------------------------------- institution join codes

-- 8 characters from a 32-character alphabet without 0/O and 1/I (cryptographic randomness).
create or replace function private.new_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := extensions.gen_random_bytes(8);
  c text := '';
begin
  for i in 0..7 loop
    c := c || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return c;
end
$$;

alter table public.institutions
  add column join_code text unique check (join_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  add column join_code_rotated_at timestamptz;
update public.institutions set join_code = private.new_join_code(), join_code_rotated_at = now()
where join_code is null;
alter table public.institutions alter column join_code set default private.new_join_code();
-- Members can read their own institution's row (existing policy), code included: harmless,
-- they could share it anyway; admins rotate it if it leaks.

create or replace function public.join_institution(p_code text)
returns table (institution_id uuid, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  inst public.institutions;
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if exists (select 1 from public.devices d where d.kiosk_user_id = uid) then
    raise exception 'Kiosk accounts belong to their institution already' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin') then
    raise exception 'Admins can''t switch institutions here. Ask the iTapon team.'
      using errcode = '42501';
  end if;
  perform private.rate_guard('join_fail', 10, interval '1 hour');
  select * into inst from public.institutions i
  where i.join_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    insert into private.attempts (user_id, kind) values (uid, 'join_fail');
    return; -- no rows: wrong code (the attempt is kept, so guessing is limited)
  end if;
  update public.profiles p
  set institution_id = inst.id,
      institution_joined_at = case when p.institution_id = inst.id then p.institution_joined_at else now() end
  where p.id = uid;
  return query select inst.id, inst.name;
end
$$;

create or replace function public.leave_institution()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if exists (select 1 from public.devices d where d.kiosk_user_id = uid)
     or exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin') then
    raise exception 'Admins and kiosks can''t leave here. Ask the iTapon team.' using errcode = '42501';
  end if;
  update public.profiles set institution_id = null, institution_joined_at = null where id = uid;
end
$$;

create or replace function public.admin_rotate_join_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text;
begin
  if not (select private.is_admin()) or (select private.my_institution()) is null then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  loop
    c := private.new_join_code();
    exit when not exists (select 1 from public.institutions where join_code = c);
  end loop;
  update public.institutions set join_code = c, join_code_rotated_at = now()
  where id = (select private.my_institution());
  return c;
end
$$;

create or replace function public.admin_remove_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if exists (select 1 from public.devices d where d.kiosk_user_id = p_user) then
    raise exception 'Remove kiosks under Devices' using errcode = '42501';
  end if;
  update public.profiles
  set institution_id = null, institution_joined_at = null
  where id = p_user
    and role <> 'admin'
    and institution_id = (select private.my_institution());
  if not found then
    raise exception 'Not a member of your institution' using errcode = '22023';
  end if;
end
$$;

revoke execute on function public.join_institution(text), public.leave_institution(),
  public.admin_rotate_join_code(), public.admin_remove_member(uuid) from public, anon;
grant execute on function public.join_institution(text), public.leave_institution(),
  public.admin_rotate_join_code(), public.admin_remove_member(uuid) to authenticated;

-- ---------------------------------------------------------------- export & delete

-- Everything the database holds about the caller (RA 10173 portability). Runs with the
-- caller's rights, so RLS decides what's included.
create or replace function public.export_my_data()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'user_id', (select auth.uid()),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = (select auth.uid())),
    'private', (select jsonb_build_object('birth_year', x.birth_year)
                from public.profile_private x where x.user_id = (select auth.uid())),
    'institution', (select jsonb_build_object('name', i.name)
                    from public.profiles p join public.institutions i on i.id = p.institution_id
                    where p.id = (select auth.uid())),
    'consents', coalesce((select jsonb_agg(jsonb_build_object(
                  'kind', c.kind, 'version', c.version, 'accepted_at', c.accepted_at)
                  order by c.accepted_at)
                from public.consents c where c.user_id = (select auth.uid())), '[]'),
    'scans', coalesce((select jsonb_agg(jsonb_build_object(
                  'id', s.id, 'created_at', s.created_at, 'source', s.source,
                  'model_version', s.model_version,
                  'detections', (select coalesce(jsonb_agg(jsonb_build_object(
                      'class_key', d.class_key, 'bin', d.category_key,
                      'confidence', d.confidence, 'is_primary', d.is_primary)), '[]')
                    from public.scan_detections d where d.session_id = s.id))
                  order by s.created_at)
                from public.scan_sessions s where s.user_id = (select auth.uid())), '[]'),
    'feedback', coalesce((select jsonb_agg(jsonb_build_object(
                  'created_at', f.created_at, 'is_correct', f.is_correct,
                  'corrected_class_key', f.corrected_class_key,
                  'shared_photo', f.image_path is not null)
                  order by f.created_at)
                from public.feedback f where f.user_id = (select auth.uid())), '[]')
  )
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- Deletes the caller's sign-in identity and, by cascade, profile, private profile, consents,
-- scans and feedback. Shared photo files are removed by the app first (storage API), as for
-- delete-my-data. Kiosks and admins can't delete themselves here.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign-in required' using errcode = '42501';
  end if;
  if exists (select 1 from public.devices d where d.kiosk_user_id = uid)
     or exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin') then
    raise exception 'Admin and kiosk accounts are removed by the iTapon team' using errcode = '42501';
  end if;
  delete from public.feedback where user_id = uid;
  delete from public.scan_sessions where user_id = uid;
  delete from auth.users where id = uid;
end
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
