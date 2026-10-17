-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Offline scan-log queue (Phase 21): queued scans are sent later with the time they were
-- made. Accept a client created_at only within the last 7 days and never in the future.

create or replace function private.clamp_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := least(greatest(coalesce(new.created_at, now()), now() - interval '7 days'), now());
  return new;
end;
$$;

create trigger scan_sessions_clamp_created_at
  before insert on public.scan_sessions
  for each row execute function private.clamp_created_at();

create trigger scan_detections_clamp_created_at
  before insert on public.scan_detections
  for each row execute function private.clamp_created_at();
