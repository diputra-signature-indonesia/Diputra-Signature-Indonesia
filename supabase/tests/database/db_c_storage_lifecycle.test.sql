begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(29);

select extensions.is(
  (select name from storage.buckets where id = 'images'),
  'images',
  'images bucket is created by migration'
);

select extensions.is(
  (select public from storage.buckets where id = 'images'),
  true,
  'images bucket remains public'
);

select extensions.is(
  (select file_size_limit from storage.buckets where id = 'images'),
  5242880::bigint,
  'images bucket limits each upload to 5 MiB'
);

select extensions.is(
  (
    select array_to_string(allowed_mime_types, ',')
    from storage.buckets
    where id = 'images'
  ),
  'image/jpeg,image/png,image/webp',
  'images bucket only accepts JPEG, PNG, and WebP'
);

select extensions.is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'Allow authenticated%images/blog%'
  ),
  0::bigint,
  'broad baseline blog image policies are removed'
);

select extensions.is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Active staff upload immutable blog images',
        'Active staff read owned blog images',
        'Active staff delete unreferenced owned blog images',
        'Active admins read all blog images',
        'Active admins delete all blog images'
      )
  ),
  5::bigint,
  'five scoped DB-C policies are installed'
);

select extensions.is(
  (
    select count(*)::bigint
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'UPDATE'
      and coalesce(qual, '') || coalesce(with_check, '') like '%images%'
  ),
  0::bigint,
  'no UPDATE policy permits image overwrite'
);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'db-c-staff@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated', 'db-c-other@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000303', 'authenticated', 'authenticated', 'db-c-inactive@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000304', 'authenticated', 'authenticated', 'db-c-admin@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000305', 'authenticated', 'authenticated', 'db-c-no-profile@example.test', now(), now());

insert into public.profiles (id, email, role, is_active)
values
  ('00000000-0000-4000-8000-000000000301', 'db-c-staff@example.test', 'staff', true),
  ('00000000-0000-4000-8000-000000000302', 'db-c-other@example.test', 'staff', true),
  ('00000000-0000-4000-8000-000000000303', 'db-c-inactive@example.test', 'staff', false),
  ('00000000-0000-4000-8000-000000000304', 'db-c-admin@example.test', 'admin', true);

insert into storage.objects (id, bucket_id, name, owner_id, metadata)
values
  (
    '60000000-0000-4000-8000-000000000302',
    'images',
    'blog/legacy-other-owner.png',
    '00000000-0000-4000-8000-000000000302',
    '{"mimetype":"image/png","size":68}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000303',
    'images',
    'blog_cover/30000000-0000-4000-8000-000000000303.webp',
    '00000000-0000-4000-8000-000000000301',
    '{"mimetype":"image/webp","size":68}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000304',
    'images',
    'blog/30000000-0000-4000-8000-000000000304.png',
    '00000000-0000-4000-8000-000000000301',
    '{"mimetype":"image/png","size":68}'::jsonb
  ),
  (
    '60000000-0000-4000-8000-000000000305',
    'images',
    'blog_cover/30000000-0000-4000-8000-000000000305.jpg',
    '00000000-0000-4000-8000-000000000301',
    '{"mimetype":"image/jpeg","size":68}'::jsonb
  );

insert into public.blog_posts (id, slug, title, status, featured_image, og_image, content_md)
values
  (
    '70000000-0000-4000-8000-000000000301',
    'db-c-featured-reference',
    'DB-C featured reference',
    'draft',
    'http://127.0.0.1:54321/storage/v1/object/public/images/blog_cover/30000000-0000-4000-8000-000000000303.webp',
    null,
    '<p>No inline image</p>'
  ),
  (
    '70000000-0000-4000-8000-000000000302',
    'db-c-content-reference',
    'DB-C content reference',
    'draft',
    null,
    null,
    '<img src="http://127.0.0.1:54321/storage/v1/object/public/images/blog/30000000-0000-4000-8000-000000000304.png">'
  ),
  (
    '70000000-0000-4000-8000-000000000303',
    'db-c-og-reference',
    'DB-C OG reference',
    'draft',
    null,
    'http://127.0.0.1:54321/storage/v1/object/public/images/blog_cover/30000000-0000-4000-8000-000000000305.jpg',
    '<p>No inline image</p>'
  );

select set_config('storage.allow_delete_query', 'true', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000301', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.lives_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (
      '60000000-0000-4000-8000-000000000301',
      'images',
      'blog/30000000-0000-4000-8000-000000000301.png',
      '00000000-0000-4000-8000-000000000301',
      '{"mimetype":"image/png","size":68}'::jsonb
    )
  $$,
  'active staff can insert an immutable editor image path'
);

select extensions.lives_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id, metadata)
    values (
      '60000000-0000-4000-8000-000000000306',
      'images',
      'blog_cover/30000000-0000-4000-8000-000000000306.jpg',
      '00000000-0000-4000-8000-000000000301',
      '{"mimetype":"image/jpeg","size":68}'::jsonb
    )
  $$,
  'active staff can insert an immutable cover image path'
);

select extensions.throws_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id)
    values (
      '60000000-0000-4000-8000-000000000307',
      'images',
      'team/30000000-0000-4000-8000-000000000307.png',
      '00000000-0000-4000-8000-000000000301'
    )
  $$,
  '42501',
  null,
  'staff cannot upload outside the two blog folders'
);

select extensions.throws_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id)
    values (
      '60000000-0000-4000-8000-000000000308',
      'images',
      'blog/nested/30000000-0000-4000-8000-000000000308.png',
      '00000000-0000-4000-8000-000000000301'
    )
  $$,
  '42501',
  null,
  'staff cannot upload a nested path'
);

select extensions.throws_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id)
    values (
      '60000000-0000-4000-8000-000000000309',
      'images',
      'blog/30000000-0000-4000-8000-000000000309.gif',
      '00000000-0000-4000-8000-000000000301'
    )
  $$,
  '42501',
  null,
  'staff cannot insert a disallowed filename extension'
);

select extensions.throws_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id)
    values (
      '60000000-0000-4000-8000-000000000310',
      'images',
      'blog/30000000-0000-4000-8000-000000000310.png',
      '00000000-0000-4000-8000-000000000302'
    )
  $$,
  '42501',
  null,
  'staff cannot spoof object ownership'
);

select extensions.results_eq(
  $$
    with changed as (
      update storage.objects
      set name = 'blog/30000000-0000-4000-8000-000000000311.png'
      where id = '60000000-0000-4000-8000-000000000301'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'staff cannot overwrite or move an existing object'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from storage.objects
    where id = '60000000-0000-4000-8000-000000000301'
  $$,
  array[1::bigint],
  'staff can read metadata for an owned blog object'
);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from storage.objects
    where id = '60000000-0000-4000-8000-000000000302'
  $$,
  array[0::bigint],
  'staff cannot read another owner blog object metadata'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000303'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete an owned featured image still referenced by a blog'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000304'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete an owned inline image still referenced by a blog'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000305'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete an owned OG image still referenced by a blog'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000301'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[1::bigint],
  'staff can delete an owned unreferenced editor image'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000306'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[1::bigint],
  'staff can delete an owned unreferenced cover image'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000302'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete another owner object'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000303', true);

select extensions.throws_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id)
    values (
      '60000000-0000-4000-8000-000000000312',
      'images',
      'blog/30000000-0000-4000-8000-000000000312.png',
      '00000000-0000-4000-8000-000000000303'
    )
  $$,
  '42501',
  null,
  'inactive staff cannot upload'
);

select extensions.results_eq(
  $$ select count(*)::bigint from storage.objects where bucket_id = 'images' $$,
  array[0::bigint],
  'inactive staff cannot read blog image metadata'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000305', true);

select extensions.throws_ok(
  $$
    insert into storage.objects (id, bucket_id, name, owner_id)
    values (
      '60000000-0000-4000-8000-000000000313',
      'images',
      'blog/30000000-0000-4000-8000-000000000313.png',
      '00000000-0000-4000-8000-000000000305'
    )
  $$,
  '42501',
  null,
  'authenticated user without profile cannot upload'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000304', true);

select extensions.results_eq(
  $$
    select count(*)::bigint
    from storage.objects
    where id = '60000000-0000-4000-8000-000000000302'
  $$,
  array[1::bigint],
  'admin can read another owner legacy blog object metadata'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000302'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[1::bigint],
  'admin can delete another owner legacy blog object'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects
      where id = '60000000-0000-4000-8000-000000000303'
      returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[1::bigint],
  'admin can delete blog media even while referenced'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

select extensions.results_eq(
  $$ select count(*)::bigint from storage.objects where bucket_id = 'images' $$,
  array[0::bigint],
  'anon cannot list public bucket object metadata'
);

reset role;

select extensions.finish();

rollback;
