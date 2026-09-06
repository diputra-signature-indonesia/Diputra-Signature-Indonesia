begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(46);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000201', 'authenticated', 'authenticated', 'db-b-admin@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000202', 'authenticated', 'authenticated', 'db-b-staff@example.test', now(), now()),
  ('00000000-0000-4000-8000-000000000203', 'authenticated', 'authenticated', 'db-b-inactive@example.test', now(), now());

insert into public.profiles (id, email, role, is_active)
values
  ('00000000-0000-4000-8000-000000000201', 'db-b-admin@example.test', 'admin', true),
  ('00000000-0000-4000-8000-000000000202', 'db-b-staff@example.test', 'staff', true),
  ('00000000-0000-4000-8000-000000000203', 'db-b-inactive@example.test', 'admin', false);

insert into public.blog_posts (id, slug, title, status, updated_at)
values
  ('10000000-0000-4000-8000-000000000201', 'db-b-publish-rpc', 'DB-B publish RPC', 'pending', '2020-01-01 00:00:00+00'),
  ('10000000-0000-4000-8000-000000000202', 'db-b-timestamp', 'DB-B timestamp', 'draft', '2020-01-01 00:00:00+00');

insert into public.review_requests (id, token_hash, client_name, expires_at, used_at, revoked_at)
values
  (
    '20000000-0000-4000-8000-000000000201',
    encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'),
    'DB-B valid',
    now() + interval '1 day',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000202',
    encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex'),
    'DB-B expired',
    now() - interval '1 day',
    null,
    null
  ),
  (
    '20000000-0000-4000-8000-000000000203',
    encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex'),
    'DB-B used',
    now() + interval '1 day',
    now(),
    null
  ),
  (
    '20000000-0000-4000-8000-000000000204',
    encode(extensions.digest(repeat('d', 64), 'sha256'), 'hex'),
    'DB-B revoked',
    now() + interval '1 day',
    null,
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000205',
    encode(extensions.digest(repeat('1', 64), 'sha256'), 'hex'),
    'DB-B optional email',
    now() + interval '1 day',
    null,
    null
  );

select extensions.is(
  (
    select array_to_string(p.proconfig, ',')
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'check_review_request_status'
  ),
  'search_path=""',
  'review status RPC has an empty fixed search_path'
);

select extensions.is(
  (
    select array_to_string(p.proconfig, ',')
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_review'
  ),
  'search_path=""',
  'submit review RPC has an empty fixed search_path'
);

select extensions.is(
  (
    select array_to_string(p.proconfig, ',')
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_blog_post_published'
  ),
  'search_path=""',
  'blog publish RPC has an empty fixed search_path'
);

select extensions.is(
  (
    select array_to_string(p.proconfig, ',')
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ),
  'search_path=""',
  'updated-at trigger helper has an empty fixed search_path'
);

select extensions.is(
  (
    select array_to_string(p.proconfig, ',')
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_published_at'
  ),
  'search_path=""',
  'published-at trigger helper has an empty fixed search_path'
);

select extensions.ok(has_function_privilege('anon', 'public.check_review_request_status(text)', 'EXECUTE'), 'anon can check a review token');
select extensions.ok(has_function_privilege('authenticated', 'public.check_review_request_status(text)', 'EXECUTE'), 'authenticated can check a review token');
select extensions.ok(has_function_privilege('service_role', 'public.check_review_request_status(text)', 'EXECUTE'), 'service role can check a review token');
select extensions.ok(has_function_privilege('anon', 'public.submit_review(text,text,text,text)', 'EXECUTE'), 'anon can submit a tokenized review');
select extensions.ok(has_function_privilege('authenticated', 'public.submit_review(text,text,text,text)', 'EXECUTE'), 'authenticated can submit a tokenized review');
select extensions.ok(has_function_privilege('service_role', 'public.submit_review(text,text,text,text)', 'EXECUTE'), 'service role can submit a tokenized review');
select extensions.ok(not has_function_privilege('anon', 'public.set_blog_post_published(uuid,boolean)', 'EXECUTE'), 'anon cannot call blog publish RPC');
select extensions.ok(has_function_privilege('authenticated', 'public.set_blog_post_published(uuid,boolean)', 'EXECUTE'), 'authenticated can reach the role-protected blog publish RPC');
select extensions.ok(has_function_privilege('service_role', 'public.set_blog_post_published(uuid,boolean)', 'EXECUTE'), 'service role can reach the role-protected blog publish RPC');
select extensions.ok(not has_function_privilege('anon', 'public.set_updated_at()', 'EXECUTE'), 'anon cannot execute updated-at trigger helper');
select extensions.ok(not has_function_privilege('authenticated', 'public.set_updated_at()', 'EXECUTE'), 'authenticated cannot execute updated-at trigger helper');
select extensions.ok(not has_function_privilege('anon', 'public.set_published_at()', 'EXECUTE'), 'anon cannot execute published-at trigger helper');
select extensions.ok(not has_function_privilege('authenticated', 'public.set_published_at()', 'EXECUTE'), 'authenticated cannot execute published-at trigger helper');

select extensions.is(public.check_review_request_status(repeat('a', 64)), 'valid', 'valid token is accepted');
select extensions.is(public.check_review_request_status(repeat('b', 64)), 'expired', 'expired token is reported');
select extensions.is(public.check_review_request_status(repeat('c', 64)), 'used', 'used token is reported');
select extensions.is(public.check_review_request_status(repeat('d', 64)), 'invalid', 'revoked token is not disclosed');
select extensions.is(public.check_review_request_status('not-a-token'), 'invalid', 'malformed token is rejected');

select extensions.throws_ok(
  $$ select public.submit_review('not-a-token', 'Valid name', '', 'Valid message') $$,
  '22023',
  'review_invalid_token',
  'submit rejects a malformed token with a domain error'
);

select extensions.throws_ok(
  $$ select public.submit_review(repeat('a', 64), ' ', '', 'Valid message') $$,
  '22023',
  'review_name_required',
  'blank review name returns a domain error'
);

select extensions.throws_ok(
  $$ select public.submit_review(repeat('a', 64), repeat('n', 101), '', 'Valid message') $$,
  '22023',
  'review_name_too_long',
  'long review name returns a domain error'
);

select extensions.throws_ok(
  $$ select public.submit_review(repeat('a', 64), 'Valid name', 'invalid-email', 'Valid message') $$,
  '22023',
  'review_email_invalid',
  'invalid optional email returns a domain error'
);

select extensions.throws_ok(
  $$ select public.submit_review(repeat('a', 64), 'Valid name', '', ' ') $$,
  '22023',
  'review_message_required',
  'blank review message returns a domain error'
);

select extensions.throws_ok(
  $$ select public.submit_review(repeat('a', 64), 'Valid name', '', repeat('m', 2001)) $$,
  '22023',
  'review_message_too_long',
  'long review message returns a domain error'
);

select extensions.lives_ok(
  $$ select public.submit_review(repeat('a', 64), '  Valid name  ', '  valid@example.test  ', '  Valid message  ') $$,
  'valid review submission succeeds'
);

select extensions.is(
  (select r.name from public.reviews as r where r.review_request_id = '20000000-0000-4000-8000-000000000201'),
  'Valid name',
  'review name is trimmed before storage'
);

select extensions.is(
  (select r.email from public.reviews as r where r.review_request_id = '20000000-0000-4000-8000-000000000201'),
  'valid@example.test',
  'review email is trimmed before storage'
);

select extensions.is(
  (select r.message from public.reviews as r where r.review_request_id = '20000000-0000-4000-8000-000000000201'),
  'Valid message',
  'review message is trimmed before storage'
);

select extensions.isnt(
  (select rr.used_at from public.review_requests as rr where rr.id = '20000000-0000-4000-8000-000000000201'),
  null::timestamptz,
  'successful submission consumes the token'
);

select extensions.throws_ok(
  $$ select public.submit_review(repeat('a', 64), 'Second name', '', 'Second message') $$,
  'P0001',
  'review_request_unavailable',
  'used token cannot create a second review'
);

select extensions.lives_ok(
  $$ select public.submit_review(repeat('1', 64), 'Optional email', '  ', 'Email may be omitted') $$,
  'valid review submission accepts an omitted email'
);

select extensions.is(
  (select r.email from public.reviews as r where r.review_request_id = '20000000-0000-4000-8000-000000000205'),
  null::text,
  'blank optional email is stored as null'
);

update public.blog_posts
set title = 'DB-B timestamp changed'
where id = '10000000-0000-4000-8000-000000000202';

select extensions.ok(
  (select bp.updated_at > '2020-01-01 00:00:00+00'::timestamptz from public.blog_posts as bp where bp.id = '10000000-0000-4000-8000-000000000202'),
  'blog update trigger advances updated_at'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000201', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select public.set_blog_post_published('10000000-0000-4000-8000-000000000201', true);

select extensions.is(
  (select bp.status::text from public.blog_posts as bp where bp.id = '10000000-0000-4000-8000-000000000201'),
  'published',
  'active admin publishes through compatibility RPC'
);

select extensions.isnt(
  (select bp.published_at from public.blog_posts as bp where bp.id = '10000000-0000-4000-8000-000000000201'),
  null::date,
  'publishing still sets published_at'
);

select extensions.ok(
  (select bp.updated_at > '2020-01-01 00:00:00+00'::timestamptz from public.blog_posts as bp where bp.id = '10000000-0000-4000-8000-000000000201'),
  'publishing through the RPC advances updated_at'
);

select public.set_blog_post_published('10000000-0000-4000-8000-000000000201', false);

select extensions.is(
  (select bp.status::text from public.blog_posts as bp where bp.id = '10000000-0000-4000-8000-000000000201'),
  'draft',
  'active admin unpublishes to draft through compatibility RPC'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000202', true);

select extensions.throws_ok(
  $$ select public.set_blog_post_published('10000000-0000-4000-8000-000000000201', true) $$,
  '42501',
  'blog_publish_forbidden',
  'active staff cannot call the admin publish RPC'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000203', true);

select extensions.throws_ok(
  $$ select public.set_blog_post_published('10000000-0000-4000-8000-000000000201', true) $$,
  '42501',
  'blog_publish_forbidden',
  'inactive admin cannot call the publish RPC'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000201', true);

select extensions.throws_ok(
  $$ select public.set_blog_post_published('10000000-0000-4000-8000-000000009999', true) $$,
  'P0002',
  'blog_post_not_found',
  'publish RPC reports an unknown blog id'
);

reset role;

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as t
    join pg_catalog.pg_class as c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'blog_posts'
      and t.tgname = 'blog_posts_update_at'
      and not t.tgisinternal
  ),
  'blog updated-at trigger exists'
);

select * from extensions.finish();

rollback;
