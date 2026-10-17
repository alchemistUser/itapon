-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Lets the monthly Retention workflow (service role) purge old client errors (Phase 24).
grant execute on function public.purge_client_errors(integer) to service_role;
