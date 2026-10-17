-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Production monitoring (Phase 24): a first-party, insert-only log of browser errors.
-- No third-party tracker and no personal data. Only the error text, page path, build and
-- a coarse browser label are stored. Only the project team (service role / SQL) can read it.
-- Rows older than 90 days are removed by public.purge_client_errors() (Retention workflow).

create table public.client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  build text not null check (char_length(build) <= 64),
  path text not null check (char_length(path) <= 200),
  kind text not null check (kind in ('error', 'unhandledrejection', 'detector', 'react')),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 2000),
  browser text check (char_length(browser) <= 80)
);
create index client_errors_created_idx on public.client_errors (created_at desc);

alter table public.client_errors enable row level security;

-- Anyone (also before anonymous sign-in) may report; nobody but the team can read.
create policy "Anyone can report an error" on public.client_errors
  for insert to anon, authenticated
  with check (created_at > now() - interval '1 minute');
revoke select, update, delete on public.client_errors from anon, authenticated;
grant insert (build, path, kind, message, stack, browser) on public.client_errors to anon, authenticated;

create or replace function public.purge_client_errors(p_days integer default 90)
returns bigint
language sql
security definer
set search_path = ''
as $$
  with d as (
    delete from public.client_errors
    where created_at < now() - make_interval(days => greatest(p_days, 7))
    returning 1
  )
  select count(*) from d
$$;
revoke execute on function public.purge_client_errors(integer) from public, anon, authenticated;
