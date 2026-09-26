begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(21);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('98000000-0000-4000-8000-000000000001','authenticated','authenticated','review-staff@example.test',now(),now()),
  ('98000000-0000-4000-8000-000000000002','authenticated','authenticated','review-admin@example.test',now(),now()),
  ('98000000-0000-4000-8000-000000000003','authenticated','authenticated','review-inactive@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('98000000-0000-4000-8000-000000000001','review-staff@example.test','Review Staff','staff',true),
  ('98000000-0000-4000-8000-000000000002','review-admin@example.test','Review Admin','admin',true),
  ('98000000-0000-4000-8000-000000000003','review-inactive@example.test','Review Inactive','staff',false);

select extensions.has_function('public','create_review_request',array['uuid','text','text','uuid','integer'],'review request RPC exists');
select extensions.has_function('public','moderate_review',array['uuid','review_moderation_status','boolean'],'review moderation RPC exists');
select extensions.has_function('public','revoke_review_request',array['uuid'],'review revoke RPC exists');
select extensions.has_function('public','archive_review',array['uuid'],'review archive RPC exists');
select extensions.has_function('public','archive_review_request',array['uuid'],'review request archive RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000001',true);

select extensions.results_eq(
  $$ with changed as (update public.reviews set message='tampered' returning 1) select count(*)::bigint from changed $$,
  array[0::bigint],
  'staff cannot change review contents directly'
);
select extensions.throws_ok(
  $$ insert into public.review_requests(token_hash,client_name) values(repeat('a',64),'Unsafe') $$,
  '42501',null,
  'staff cannot insert predictable review tokens directly'
);

create temporary table generated_review_request as
select * from public.create_review_request(null,'Legacy Client','legacy@example.test',null,14);

create temporary table generated_review_request_archive as
select * from public.create_review_request(null,'Archived Legacy Client',null,null,14);

select extensions.is((select char_length(token) from generated_review_request),64,'RPC returns a 64-character token once');
select extensions.is(
  (select rr.client_name from public.review_requests rr join generated_review_request g on rr.id=g.request_id),
  'Legacy Client',
  'manual legacy client is stored'
);
select extensions.is(
  (select rr.created_by from public.review_requests rr join generated_review_request g on rr.id=g.request_id),
  '98000000-0000-4000-8000-000000000001'::uuid,
  'request actor comes from auth uid'
);

select extensions.lives_ok(
  $$ select public.submit_review((select token from generated_review_request),'Reviewer','reviewer@example.test','A useful review') $$,
  'generated token submits one review'
);
select extensions.throws_ok(
  $$ select public.submit_review((select token from generated_review_request),'Reviewer 2','','Replay') $$,
  'P0001','review_request_unavailable','used token cannot be replayed'
);

select extensions.lives_ok(
  $$ select public.moderate_review((select r.id from public.reviews r join generated_review_request g on r.review_request_id=g.request_id),'PUBLISHED',true) $$,
  'staff can publish and feature through RPC'
);
select extensions.is(
  (select status from public.reviews r join generated_review_request g on r.review_request_id=g.request_id),
  'PUBLISHED'::public.review_moderation_status,
  'moderation status is persisted'
);
select extensions.ok(
  (select is_published and is_featured from public.reviews r join generated_review_request g on r.review_request_id=g.request_id),
  'legacy public flags remain synchronized'
);
select extensions.throws_ok(
  $$ select public.archive_review((select r.id from public.reviews r join generated_review_request g on r.review_request_id=g.request_id)) $$,
  '42501','Admin access required.','staff cannot archive reviews'
);

select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000002',true);
select extensions.lives_ok(
  $$ select public.archive_review((select r.id from public.reviews r join generated_review_request g on r.review_request_id=g.request_id)) $$,
  'admin can archive reviews'
);
select extensions.is(
  (select status from public.reviews r join generated_review_request g on r.review_request_id=g.request_id),
  'ARCHIVED'::public.review_moderation_status,
  'archived review keeps an explicit lifecycle status'
);
select extensions.lives_ok(
  $$ select public.archive_review_request((select request_id from generated_review_request_archive)) $$,
  'admin can archive unused review links'
);
select extensions.is(
  (select public.check_review_request_status((select token from generated_review_request_archive))),
  'invalid',
  'archived review links are invalid for public submission'
);

select set_config('request.jwt.claim.sub','98000000-0000-4000-8000-000000000003',true);
select extensions.throws_ok(
  $$ select * from public.create_review_request(null,'Blocked Client',null,null,7) $$,
  '42501','Active staff access required.','inactive staff cannot generate review links'
);

reset role;
select extensions.finish();
rollback;
