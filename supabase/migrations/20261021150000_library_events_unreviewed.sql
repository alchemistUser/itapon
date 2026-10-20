-- SPDX-License-Identifier: AGPL-3.0-or-later
-- D25 (prototype demo): unreviewed library entries are shown in the app, labelled "Not reviewed
-- yet", so their use is counted too. Any existing item may be counted (the foreign key already
-- rejects unknown slugs); reading stays published-only.
drop policy "Anyone can count library use" on public.library_events;
create policy "Anyone can count library use" on public.library_events
  for insert to anon, authenticated
  with check (exists (select 1 from public.library_items i where i.slug = item_slug));
