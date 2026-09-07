begin;

-- DB-C: make the public blog image bucket reproducible and enforce the same
-- upload contract in every environment. Existing objects are not rewritten.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'images',
  'images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  updated_at = now();

-- Remove the broad baseline policies. Public object delivery is handled by
-- the public bucket flag; metadata access and mutations remain protected by
-- RLS on storage.objects.
drop policy if exists "Allow authenticated delete images/blog 1ffg0oo_0" on storage.objects;
drop policy if exists "Allow authenticated delete images/blog 1ffg0oo_1" on storage.objects;
drop policy if exists "Allow authenticated update images/blog 1ffg0oo_0" on storage.objects;
drop policy if exists "Allow authenticated update images/blog 1ffg0oo_1" on storage.objects;
drop policy if exists "Allow authenticated upload to images/blog 1ffg0oo_0" on storage.objects;
drop policy if exists "Public read images 1ffg0oo_0" on storage.objects;

-- Keep these drops so a restored or partially-applied local environment can
-- safely converge before the policies are recreated.
drop policy if exists "Active staff upload immutable blog images" on storage.objects;
drop policy if exists "Active staff read owned blog images" on storage.objects;
drop policy if exists "Active staff delete unreferenced owned blog images" on storage.objects;
drop policy if exists "Active admins read all blog images" on storage.objects;
drop policy if exists "Active admins delete all blog images" on storage.objects;

-- New uploads must use one approved folder and one UUID filename. The MIME
-- and 5 MiB limits are enforced by the bucket configuration above.
create policy "Active staff upload immutable blog images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'images'
  and public.is_staff_role()
  and owner_id = auth.uid()::text
  and name ~ '^(blog|blog_cover)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
);

-- Storage remove() needs both SELECT and DELETE. Staff only see their own
-- blog media metadata; admins can operate legacy objects in the same folders.
create policy "Active staff read owned blog images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'images'
  and public.is_staff_role()
  and owner_id = auth.uid()::text
  and (name like 'blog/%' or name like 'blog_cover/%')
);

create policy "Active admins read all blog images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'images'
  and public.is_admin_role()
  and (name like 'blog/%' or name like 'blog_cover/%')
);

create policy "Active staff delete unreferenced owned blog images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and public.is_staff_role()
  and owner_id = auth.uid()::text
  and (name like 'blog/%' or name like 'blog_cover/%')
  and not exists (
    select 1
    from public.blog_posts as post
    where position(
      '/storage/v1/object/public/images/' || storage.objects.name
      in coalesce(post.featured_image, '')
    ) > 0
    or position(
      '/storage/v1/object/public/images/' || storage.objects.name
      in coalesce(post.og_image, '')
    ) > 0
    or position(
      '/storage/v1/object/public/images/' || storage.objects.name
      in coalesce(post.content_md, '')
    ) > 0
  )
);

create policy "Active admins delete all blog images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'images'
  and public.is_admin_role()
  and (name like 'blog/%' or name like 'blog_cover/%')
);

-- No UPDATE policy is created. Replacing an image must always create a new
-- UUID URL with upsert disabled, so long-lived browser caches stay correct.

commit;
