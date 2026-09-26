begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(11);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('97000000-0000-4000-8000-000000000001','authenticated','authenticated','users-super@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000002','authenticated','authenticated','users-admin@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000003','authenticated','authenticated','users-staff@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000011','authenticated','authenticated','request-01@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000012','authenticated','authenticated','request-02@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000013','authenticated','authenticated','request-03@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000014','authenticated','authenticated','request-04@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000015','authenticated','authenticated','request-05@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000016','authenticated','authenticated','request-06@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000017','authenticated','authenticated','request-07@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000018','authenticated','authenticated','request-08@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000019','authenticated','authenticated','request-09@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000020','authenticated','authenticated','request-10@example.test',now(),now()),
  ('97000000-0000-4000-8000-000000000021','authenticated','authenticated','request-11@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('97000000-0000-4000-8000-000000000001','users-super@example.test','Users Super','super_admin',true),
  ('97000000-0000-4000-8000-000000000002','users-admin@example.test','Users Admin','admin',true),
  ('97000000-0000-4000-8000-000000000003','users-staff@example.test','Users Staff','staff',true);

insert into public.admin_access_requests(user_id,email,full_name,status,requested_at)
select
  user_id,
  'request-' || lpad(request_number::text,2,'0') || '@example.test',
  'Request Person ' || lpad(request_number::text,2,'0'),
  'pending'::public.admin_access_request_status,
  now() + make_interval(secs => request_number)
from generate_series(1,11) as request_number
cross join lateral (
  select ('97000000-0000-4000-8000-' || lpad((request_number + 10)::text,12,'0'))::uuid as user_id
) as request_user;

select extensions.has_function('public','set_profile_role',array['uuid','role'],'profile role mutation RPC exists');
select extensions.has_function('public','list_pending_admin_access_requests',array['text','integer'],'pending request query RPC exists');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000003',true);

select extensions.is(
  (select count(*)::integer from public.list_pending_admin_access_requests(null,10)),
  0,
  'staff cannot list pending access requests'
);
select extensions.throws_ok(
  $$ select public.set_profile_role('97000000-0000-4000-8000-000000000002','staff'::public.role) $$,
  '42501','Only an active super admin can change profile roles.','staff cannot change profile roles'
);

select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);

select extensions.is(
  (select count(*)::integer from public.list_pending_admin_access_requests(null,10)),
  0,
  'ordinary admin cannot list pending access requests'
);
select extensions.throws_ok(
  $$ select public.set_profile_role('97000000-0000-4000-8000-000000000003','admin'::public.role) $$,
  '42501','Only an active super admin can change profile roles.','ordinary admin cannot change profile roles'
);

select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);

select extensions.is(
  (select count(*)::integer from public.list_pending_admin_access_requests(null,10)),
  10,
  'super admin query is capped at ten requests'
);
select extensions.is(
  (select count(*)::integer from public.list_pending_admin_access_requests('Person 11',10)),
  1,
  'super admin can search pending requests by name'
);
select extensions.lives_ok(
  $$ select public.set_profile_role('97000000-0000-4000-8000-000000000003','admin'::public.role) $$,
  'super admin can change another profile role'
);
select extensions.is(
  (select role from public.profiles where id='97000000-0000-4000-8000-000000000003'),
  'admin'::public.role,
  'selected role is persisted'
);
select extensions.throws_ok(
  $$ select public.set_profile_role('97000000-0000-4000-8000-000000000001','staff'::public.role) $$,
  '22023','A super admin cannot change their own role.','super admin cannot demote their current profile'
);

reset role;
select extensions.finish();
rollback;
