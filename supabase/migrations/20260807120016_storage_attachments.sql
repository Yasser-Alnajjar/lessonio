-- Objects are stored at "{user_id}/{lesson_id}/{filename}" so ownership can
-- be checked from the path alone via storage.foldername(name), matching the
-- pattern src/actions/attachments.mutations.ts uses when it uploads (Phase 9).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  true, -- public read via signed/public URL; writes are still RLS-gated below
  52428800, -- 50 MB
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'
  ]
)
on conflict (id) do nothing;

-- No `alter table storage.objects enable row level security` here: hosted
-- Supabase projects already have it on and own the table as
-- `supabase_storage_admin`, so the migration role can't ALTER it (only
-- CREATE POLICY, which is what actually grants access). Local Docker stacks
-- also ship with it enabled by default, so nothing is lost by omitting it.

create policy "Anyone can view attachment files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments');

create policy "Users can upload attachments into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can update files in their own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'attachments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "Users can delete files in their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
