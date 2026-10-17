-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Private bucket for consented feedback photos (ROADMAP Phase 10 task 4, Phase 20).
-- Object paths: <user_id>/<uuid>.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('training-images', 'training-images', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users upload own training images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'training-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users read own training images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'training-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.is_admin())
    )
  );

create policy "Users delete own training images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'training-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
