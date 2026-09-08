begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(29);

insert into auth.users (id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  (
    '81000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'access-super@example.test',
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '81000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'access-pending@example.test',
    '{"full_name":"Pending Person","avatar_url":"https://example.test/pending.png"}'::jsonb,
    now(),
    now()
  ),
  (
    '81000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'access-staff@example.test',
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '81000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    'access-rejected@example.test',
    '{"name":"Rejected Person","picture":"https://example.test/rejected.png"}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, email, role, is_active)
values
  ('81000000-0000-4000-8000-000000000001', 'access-super@example.test', 'super_admin', true),
  ('81000000-0000-4000-8000-000000000003', 'access-staff@example.test', 'staff', true);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select extensions.is(
  public.ensure_admin_access_request(),
  'pending'::public.admin_access_request_status,
  'a user without a profile creates a pending request'
);

select extensions.is(
  public.ensure_admin_access_request(),
  'pending'::public.admin_access_request_status,
  'repeating request creation remains pending'
);

select extensions.is(
  (select count(*)::integer from public.admin_access_requests),
  1,
  'idempotent request creation keeps one row per user'
);

select extensions.is(
  (select email from public.admin_access_requests where user_id = auth.uid()),
  'access-pending@example.test',
  'request email is copied from auth.users'
);

select extensions.is(
  (select full_name from public.admin_access_requests where user_id = auth.uid()),
  'Pending Person',
  'request name is copied from Auth metadata'
);

select extensions.is(
  (select avatar_url from public.admin_access_requests where user_id = auth.uid()),
  'https://example.test/pending.png',
  'request avatar is copied from Auth metadata'
);

select extensions.is(
  (select count(*)::integer from public.profiles where id = auth.uid()),
  0,
  'creating a request does not create a profile'
);

select extensions.is(
  (select count(*)::integer from public.review_requests),
  0,
  'a pending user cannot read admin workflow data'
);

select extensions.throws_ok(
  $$
    insert into public.admin_access_requests (user_id, email)
    values ('81000000-0000-4000-8000-000000000004', 'forged@example.test')
  $$,
  '42501',
  null,
  'a normal user cannot insert a request for another user'
);

select extensions.throws_ok(
  $$
    update public.admin_access_requests
    set status = 'approved'
    where user_id = '81000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'a normal user cannot update request status directly'
);

select extensions.throws_ok(
  $$
    update public.profiles
    set is_active = true
    where id = '81000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'a normal user cannot activate its own profile directly'
);

select extensions.throws_ok(
  $$
    select public.approve_admin_access_request(
      '81000000-0000-4000-8000-000000000002',
      'admin'::public.role
    )
  $$,
  '42501',
  'Only an active super admin can approve access requests.',
  'a normal user cannot approve itself'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);

select extensions.is(
  (select count(*)::integer from public.admin_access_requests),
  0,
  'staff cannot read another user request'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select extensions.ok(public.is_active_super_admin(), 'active super admin capability is recognized');

select extensions.ok(
  exists (
    select 1
    from public.admin_access_requests
    where user_id = '81000000-0000-4000-8000-000000000002'
      and status = 'pending'
  ),
  'super admin can read pending requests'
);

select extensions.lives_ok(
  $$
    select public.approve_admin_access_request(
      '81000000-0000-4000-8000-000000000002',
      'admin'::public.role
    )
  $$,
  'super admin can approve with a selected role'
);

select extensions.is(
  (select role from public.profiles where id = '81000000-0000-4000-8000-000000000002'),
  'admin'::public.role,
  'approval assigns the selected role'
);

select extensions.is(
  (select is_active from public.profiles where id = '81000000-0000-4000-8000-000000000002'),
  true,
  'approval activates the profile'
);

select extensions.is(
  (select email from public.profiles where id = '81000000-0000-4000-8000-000000000002'),
  'access-pending@example.test',
  'approval creates the profile for the Auth UUID'
);

select extensions.is(
  (select status from public.admin_access_requests where user_id = '81000000-0000-4000-8000-000000000002'),
  'approved'::public.admin_access_request_status,
  'approval marks the request approved'
);

select extensions.is(
  (select reviewed_by from public.admin_access_requests where user_id = '81000000-0000-4000-8000-000000000002'),
  '81000000-0000-4000-8000-000000000001'::uuid,
  'approval records auth.uid as reviewer'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);

select extensions.is(
  public.current_role(),
  'admin',
  'the approved user receives its active role on the next authenticated session'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select extensions.throws_ok(
  $$
    select public.approve_admin_access_request(
      '81000000-0000-4000-8000-000000000002',
      'staff'::public.role
    )
  $$,
  'P0001',
  'Access request has already been reviewed.',
  'a second approval is rejected after the locked status check'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);
select public.ensure_admin_access_request();
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select extensions.lives_ok(
  $$
    select public.reject_admin_access_request(
      '81000000-0000-4000-8000-000000000004',
      'Akses belum diperlukan.'
    )
  $$,
  'super admin can reject a pending request'
);

select extensions.is(
  (select status from public.admin_access_requests where user_id = '81000000-0000-4000-8000-000000000004'),
  'rejected'::public.admin_access_request_status,
  'rejection marks the request rejected'
);

select extensions.is(
  (select rejection_reason from public.admin_access_requests where user_id = '81000000-0000-4000-8000-000000000004'),
  'Akses belum diperlukan.',
  'rejection stores the optional reason'
);

select extensions.is(
  (select count(*)::integer from public.profiles where id = '81000000-0000-4000-8000-000000000004'),
  0,
  'rejection does not create a profile'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000004', true);

select extensions.is(
  public.ensure_admin_access_request(),
  'rejected'::public.admin_access_request_status,
  'a rejected user login remains rejected without creating a duplicate request'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from public.profiles where id = '81000000-0000-4000-8000-000000000001' and role = 'super_admin' and is_active),
  1,
  'the bootstrap super admin profile remains active'
);

reset role;

select extensions.finish();

rollback;
