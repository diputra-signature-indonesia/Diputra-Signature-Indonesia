begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('99000000-0000-4000-8000-000000000001','authenticated','authenticated','recovery-super@example.test',now(),now()),
  ('99000000-0000-4000-8000-000000000002','authenticated','authenticated','recovery-user@example.test',now(),now()),
  ('99000000-0000-4000-8000-000000000003','authenticated','authenticated','rejected-user@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('99000000-0000-4000-8000-000000000001','recovery-super@example.test','Recovery Super','super_admin',true),
  ('99000000-0000-4000-8000-000000000002','recovery-user@example.test','Recovery User','staff',true);

insert into public.admin_access_requests(
  user_id,email,full_name,status,requested_at,reviewed_at,reviewed_by,rejection_reason
) values (
  '99000000-0000-4000-8000-000000000003','rejected-user@example.test','Rejected User','rejected',
  now() - interval '2 days',now() - interval '1 day','99000000-0000-4000-8000-000000000001','Incorrect rejection'
);

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);

select extensions.has_function('public','list_rejected_admin_access_requests',array['text','integer'],'rejected request list RPC exists');
select extensions.has_function('public','delete_rejected_admin_access_request',array['uuid'],'rejected request delete RPC exists');
select extensions.is((select count(*)::integer from public.list_rejected_admin_access_requests(null,10) where user_id='99000000-0000-4000-8000-000000000003'),1,'super admin can list the rejected fixture alongside existing requests');
select extensions.is((select count(*)::integer from public.list_rejected_admin_access_requests('Rejected User',10)),1,'rejected request search matches display name');

select extensions.lives_ok(
  $$ select public.soft_delete_profile('99000000-0000-4000-8000-000000000002') $$,
  'super admin can move a user profile to trash'
);
select extensions.lives_ok(
  $$ select public.restore_profile('99000000-0000-4000-8000-000000000002') $$,
  'super admin can restore a trashed user profile'
);
select extensions.is((select is_active from public.profiles where id='99000000-0000-4000-8000-000000000002'),false,'restored profile remains inactive until explicitly activated');

select extensions.lives_ok(
  $$ select public.delete_rejected_admin_access_request('99000000-0000-4000-8000-000000000003') $$,
  'super admin can delete the rejected request so the same Auth user can request again'
);
select extensions.is(
  (select count(*)::integer from public.admin_access_requests where user_id='99000000-0000-4000-8000-000000000003'),
  0,
  'deleting a rejection removes only its access request record'
);

select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000003',true);
select extensions.is(
  public.ensure_admin_access_request(),
  'pending'::public.admin_access_request_status,
  'the same Auth user creates a new pending request on the next login'
);

reset role;
select extensions.finish();
rollback;
