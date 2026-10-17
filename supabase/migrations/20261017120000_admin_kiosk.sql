-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Admin kiosk registration (Phase 19). Admins can't read auth.users, so linking a kiosk
-- account by email needs a SECURITY DEFINER function. It only ever acts on the caller's
-- own institution and only for admins.

create or replace function public.admin_register_kiosk(
  p_email text,
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

  select id into kiosk_id
    from auth.users
   where lower(email) = lower(trim(p_email)) and not coalesce(is_anonymous, false);
  if kiosk_id is null then
    raise exception 'No iTapon account with that email. Sign in once on the kiosk first.'
      using errcode = 'P0002';
  end if;
  if exists (select 1 from public.profiles where id = kiosk_id and role = 'admin') then
    raise exception 'That account is an admin; use a separate kiosk account' using errcode = '22023';
  end if;
  if exists (select 1 from public.devices where kiosk_user_id = kiosk_id) then
    raise exception 'That account is already linked to a kiosk' using errcode = '23505';
  end if;

  update public.profiles set role = 'kiosk', institution_id = inst where id = kiosk_id;

  insert into public.devices (institution_id, kiosk_user_id, label, location_note, bin_order)
  values (inst, kiosk_id, trim(p_label), nullif(trim(p_location), ''), p_bin_order)
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.admin_register_kiosk(text, text, text, text[]) from public, anon;
grant execute on function public.admin_register_kiosk(text, text, text, text[]) to authenticated;
