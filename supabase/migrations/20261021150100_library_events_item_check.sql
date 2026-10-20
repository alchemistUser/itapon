-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Fix for 20261021150000: the policy looked the item up under the visitor's RLS, which hides
-- unreviewed items, so their use still couldn't be counted. Check existence with a definer
-- helper instead (returns only true/false).
create or replace function private.library_item_exists(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.library_items i where i.slug = p_slug)
$$;
grant execute on function private.library_item_exists(text) to anon, authenticated;

drop policy "Anyone can count library use" on public.library_events;
create policy "Anyone can count library use" on public.library_events
  for insert to anon, authenticated
  with check (private.library_item_exists(item_slug));
