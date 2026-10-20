-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Library usage counts (v2 Phase 30): "viewed", "chooser used", "I'll do this", "done it"
-- per library item. Insert-only and anonymous like the scan logs: no user, device or scan
-- id is stored. The institution is filled in by the server (never by the client) when the
-- visitor already belongs to one, so admins see their own institution's numbers.
-- Admins read totals through public.library_event_counts(); nobody reads raw rows.

create table public.library_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  item_slug text not null references public.library_items (slug) on delete cascade,
  event text not null check (event in ('view', 'chooser', 'idea_plan', 'idea_done')),
  source text not null check (source in ('scan', 'library', 'kiosk')),
  institution_id uuid references public.institutions (id) on delete set null
);
create index library_events_created_idx on public.library_events (created_at desc);
create index library_events_institution_idx on public.library_events (institution_id, created_at desc);

alter table public.library_events enable row level security;

create or replace function private.library_event_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_at := now();
  new.institution_id := private.my_institution(); -- null for guests
  return new;
end
$$;
create trigger library_events_defaults
  before insert on public.library_events
  for each row execute function private.library_event_defaults();

-- Counting only works for published items (the foreign key also rejects unknown slugs).
create policy "Anyone can count library use" on public.library_events
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.library_items i where i.slug = item_slug and i.status = 'published')
  );
revoke select, update, delete on public.library_events from anon, authenticated;
grant insert (item_slug, event, source) on public.library_events to anon, authenticated;

-- Totals per item and event between two Manila dates: the admin's institution and all users.
create or replace function public.library_event_counts(p_from date, p_to date)
returns table (item_slug text, event text, institution bigint, everyone bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.item_slug,
         e.event,
         count(*) filter (where e.institution_id = (select private.my_institution())) as institution,
         count(*) as everyone
  from public.library_events e
  where (select private.is_admin())
    and (e.created_at at time zone 'Asia/Manila')::date between p_from and p_to
  group by e.item_slug, e.event
$$;
revoke execute on function public.library_event_counts(date, date) from public, anon;
grant execute on function public.library_event_counts(date, date) to authenticated;
