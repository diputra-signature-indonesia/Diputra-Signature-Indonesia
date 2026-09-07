begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(32);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'db-a-staff@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'db-a-inactive@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'db-a-admin@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'db-a-no-profile@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000105', 'authenticated', 'authenticated', 'db-a-default-inactive@example.test', now(), now());

insert into public.profiles (id, email, role, is_active)
values
  ('00000000-0000-4000-8000-000000000101', 'db-a-staff@example.test', 'staff', true),
  ('00000000-0000-4000-8000-000000000102', 'db-a-inactive@example.test', 'staff', false),
  ('00000000-0000-4000-8000-000000000103', 'db-a-admin@example.test', 'admin', true);

insert into public.profiles (id, email, role)
values ('00000000-0000-4000-8000-000000000105', 'db-a-default-inactive@example.test', 'staff');

select extensions.is(
  (select is_active from public.profiles where id = '00000000-0000-4000-8000-000000000105'),
  false,
  'new profiles are inactive unless explicitly activated'
);

select extensions.throws_ok(
  $$
    insert into public.profiles (id, email)
    values ('00000000-0000-4000-8000-000000000104', 'db-a-no-profile@example.test')
  $$,
  '23502',
  null,
  'new profiles require an explicit role'
);

insert into public.blog_posts (id, slug, title, status)
values
  ('10000000-0000-4000-8000-000000000101', 'db-a-test-draft', 'DB-A draft', 'draft'),
  ('10000000-0000-4000-8000-000000000102', 'db-a-test-published', 'DB-A published', 'published');

insert into public.review_requests (id, token_hash, client_name, created_at)
values ('20000000-0000-4000-8000-000000000101', 'db-a-test-token', 'DB-A client', now());

insert into public.reviews (id, name, message, is_published, created_at)
values
  ('30000000-0000-4000-8000-000000000101', 'DB-A hidden', 'Hidden review', false, now()),
  ('30000000-0000-4000-8000-000000000102', 'DB-A public', 'Public review', true, now());

insert into public.contact_messages (id, name, email, phone, message, status)
values (
  '40000000-0000-4000-8000-000000000101',
  'DB-A contact',
  'db-a-contact@example.test',
  '+62 812 3456 7890',
  'Contact message',
  'new'
);

insert into public.team_members (id, full_name, job_title, is_visible)
values ('50000000-0000-4000-8000-000000000101', 'DB-A member', 'Tester', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000101', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select extensions.is(public.current_role(), 'staff', 'active staff resolves from profiles');
select extensions.ok(public.is_staff_role(), 'active staff has staff capability');
select extensions.ok(not public.is_admin_role(), 'active staff does not have admin capability');

select extensions.results_eq(
  $$
    with changed as (
      update public.profiles
      set role = 'admin'
      where id = '00000000-0000-4000-8000-000000000101'
      returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'staff cannot update their own authorization fields'
);

select extensions.results_eq(
  $$ select count(*)::bigint from public.blog_posts where slug like 'db-a-test-%' $$,
  array[2::bigint],
  'staff can read published and non-published blog posts'
);

select extensions.lives_ok(
  $$
    insert into public.blog_posts (id, slug, title, status)
    values ('10000000-0000-4000-8000-000000000103', 'db-a-test-staff-draft', 'Staff draft', 'draft')
  $$,
  'staff can insert a draft blog post'
);

select extensions.lives_ok(
  $$ update public.blog_posts set title = 'Staff edited draft' where slug = 'db-a-test-draft' $$,
  'staff can update a draft blog post'
);

select extensions.throws_ok(
  $$ update public.blog_posts set status = 'published' where slug = 'db-a-test-draft' $$,
  '42501',
  null,
  'staff cannot publish a draft blog post'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from public.blog_posts where slug = 'db-a-test-draft' returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete blog posts'
);

select extensions.results_eq(
  $$ select count(*)::bigint from public.review_requests where token_hash = 'db-a-test-token' $$,
  array[1::bigint],
  'staff can read review requests'
);

select extensions.lives_ok(
  $$ update public.review_requests set revoked_at = now() where token_hash = 'db-a-test-token' $$,
  'staff can update review requests'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from public.review_requests where token_hash = 'db-a-test-token' returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete review requests'
);

select extensions.results_eq(
  $$ select count(*)::bigint from public.reviews where id in ('30000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000102') $$,
  array[2::bigint],
  'staff can read public and internal reviews'
);

select extensions.lives_ok(
  $$ update public.reviews set is_published = true where id = '30000000-0000-4000-8000-000000000101' $$,
  'staff can moderate reviews'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from public.reviews where id = '30000000-0000-4000-8000-000000000101' returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete reviews'
);

select extensions.results_eq(
  $$ select count(*)::bigint from public.contact_messages where id = '40000000-0000-4000-8000-000000000101' $$,
  array[1::bigint],
  'staff can read contact messages'
);

select extensions.results_eq(
  $$
    with removed as (
      delete from public.contact_messages where id = '40000000-0000-4000-8000-000000000101' returning 1
    )
    select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete contact messages'
);

select extensions.results_eq(
  $$
    with changed as (
      update public.team_members set job_title = 'Changed' where id = '50000000-0000-4000-8000-000000000101' returning 1
    )
    select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'staff cannot manage team members'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000102', true);

select extensions.is(public.current_role(), '', 'inactive staff has no current internal role');
select extensions.ok(not public.is_staff_role(), 'inactive staff has no staff capability');
select extensions.results_eq(
  $$ select count(*)::bigint from public.blog_posts where slug like 'db-a-test-%' $$,
  array[1::bigint],
  'inactive staff only sees the published test blog post'
);
select extensions.results_eq(
  $$ select count(*)::bigint from public.review_requests where token_hash = 'db-a-test-token' $$,
  array[0::bigint],
  'inactive staff cannot read review requests'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000104', true);

select extensions.results_eq(
  $$ select count(*)::bigint from public.blog_posts where slug like 'db-a-test-%' $$,
  array[1::bigint],
  'authenticated users without profiles only see published blog posts'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000103', true);

select extensions.ok(public.is_admin_role(), 'active admin has admin capability');
select extensions.lives_ok(
  $$
    insert into public.blog_posts (id, slug, title, status)
    values ('10000000-0000-4000-8000-000000000104', 'db-a-test-admin-published', 'Admin published', 'published')
  $$,
  'admin can insert a published blog post'
);
select extensions.lives_ok(
  $$ delete from public.blog_posts where slug = 'db-a-test-staff-draft' $$,
  'admin can delete blog posts'
);
select extensions.lives_ok(
  $$ delete from public.reviews where id = '30000000-0000-4000-8000-000000000101' $$,
  'admin can delete reviews'
);
select extensions.lives_ok(
  $$ delete from public.review_requests where token_hash = 'db-a-test-token' $$,
  'admin can delete review requests'
);
select extensions.lives_ok(
  $$ delete from public.contact_messages where id = '40000000-0000-4000-8000-000000000101' $$,
  'admin can delete contact messages'
);
select extensions.lives_ok(
  $$ update public.team_members set job_title = 'Admin changed' where id = '50000000-0000-4000-8000-000000000101' $$,
  'admin can manage team members'
);

reset role;

select extensions.finish();

rollback;
