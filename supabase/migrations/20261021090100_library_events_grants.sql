-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Clients may only write item_slug, event and source (v2 Phase 30). Supabase's default
-- privileges grant table-wide INSERT, which made the column grant a no-op; the trigger
-- already overwrote institution_id and created_at, but the grant should say so too.
revoke insert on public.library_events from anon, authenticated;
grant insert (item_slug, event, source) on public.library_events to anon, authenticated;
