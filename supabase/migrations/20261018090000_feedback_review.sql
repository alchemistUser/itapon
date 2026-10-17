-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Feedback loop (Phase 20): review status, institution-scoped admin access, review RPC.
-- Admins only see feedback (and shared photos) from scans in their own institution.
-- Feedback from personal phones is reviewed by the project team with the service role
-- (services/ml-api/scripts/export_feedback.py), never by institution admins.

alter table public.feedback
  add column review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  add column reviewed_class_key text references public.waste_items (class_key) on update cascade,
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz;
create index feedback_review_idx on public.feedback (review_status, created_at desc);

comment on column public.feedback.reviewed_class_key is
  'Label confirmed by a reviewer. null on an approved row = "not a waste item / none of the list".';

-- Feedback only on your own scans' detections.
drop policy "Users insert own feedback" on public.feedback;
create policy "Users insert own feedback" on public.feedback
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and review_status = 'pending' and reviewed_by is null
    and (
      detection_id is null
      or exists (
        select 1 from public.scan_detections d
        join public.scan_sessions s on s.id = d.session_id
        where d.id = detection_id and s.user_id = (select auth.uid())
      )
    )
  );

-- Which institution a feedback row belongs to (via its detection's scan).
create or replace function private.feedback_institution(p_detection uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.institution_id
  from public.scan_detections d join public.scan_sessions s on s.id = d.session_id
  where d.id = p_detection
$$;

-- Can the caller (an admin) see this shared photo?
create or replace function private.admin_can_read_image(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() and exists (
    select 1 from public.feedback f
    where f.image_path = p_path
      and private.feedback_institution(f.detection_id) = private.my_institution()
  )
$$;
grant execute on function private.feedback_institution(uuid), private.admin_can_read_image(text)
  to authenticated;

drop policy "Admins read feedback" on public.feedback;
create policy "Admins read institution feedback" on public.feedback
  for select to authenticated
  using (
    (select private.is_admin())
    and private.feedback_institution(detection_id) = (select private.my_institution())
  );

drop policy "Users read own training images" on storage.objects;
create policy "Users read own training images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'training-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or private.admin_can_read_image(name)
    )
  );

-- Approve (optionally relabel) or reject one feedback row of the admin's institution.
create or replace function public.admin_review_feedback(
  p_id uuid,
  p_status text,
  p_class_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only institution admins can review feedback' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'rejected', 'pending') then
    raise exception 'Unknown review status %', p_status using errcode = '22023';
  end if;
  update public.feedback f
     set review_status = p_status,
         reviewed_class_key = case when p_status = 'approved' then p_class_key end,
         reviewed_by = case when p_status = 'pending' then null else (select auth.uid()) end,
         reviewed_at = case when p_status = 'pending' then null else now() end
   where f.id = p_id
     and private.feedback_institution(f.detection_id) = private.my_institution();
  if not found then
    raise exception 'Feedback not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke execute on function public.admin_review_feedback(uuid, text, text) from public, anon;
grant execute on function public.admin_review_feedback(uuid, text, text) to authenticated;
