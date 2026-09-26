begin;

-- Existing legacy team photos remain public. New application-managed files
-- use profiles/{profile_id}/{uuid}.{ext} so replacement cleanup is scoped.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'team_profile',
  'team_profile',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

drop policy if exists "Active admins upload managed team photos" on storage.objects;
drop policy if exists "Active admins read managed team photos" on storage.objects;
drop policy if exists "Active admins delete managed team photos" on storage.objects;

create policy "Active admins upload managed team photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'team_profile'
  and public.is_admin_role()
  and owner_id = auth.uid()::text
  and name ~ '^profiles/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

-- Storage remove() requires SELECT metadata access before DELETE.
create policy "Active admins read managed team photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'team_profile'
  and public.is_admin_role()
  and name like 'profiles/%'
);

create policy "Active admins delete managed team photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'team_profile'
  and public.is_admin_role()
  and name like 'profiles/%'
);

commit;
