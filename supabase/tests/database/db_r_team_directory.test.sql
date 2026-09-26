begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(17);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('98000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'team-super@example.test', now(), now()),
  ('98000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'team-staff@example.test', now(), now()),
  ('98000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'team-old-associate@example.test', now(), now()),
  ('98000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'team-partner@example.test', now(), now()),
  ('98000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'team-new-associate@example.test', now(), now());

insert into public.profiles (id, email, display_name, role, is_active)
values
  ('98000000-0000-4000-8000-000000000001', 'team-super@example.test', 'Team Super', 'super_admin', true),
  ('98000000-0000-4000-8000-000000000002', 'team-staff@example.test', 'Team Staff', 'staff', true),
  ('98000000-0000-4000-8000-000000000003', 'team-old-associate@example.test', 'Old Associate', 'staff', true),
  ('98000000-0000-4000-8000-000000000004', 'team-partner@example.test', 'Managing Partner', 'staff', true),
  ('98000000-0000-4000-8000-000000000005', 'team-new-associate@example.test', 'New Associate', 'staff', true);

update public.team_members
set created_at = case profile_id
  when '98000000-0000-4000-8000-000000000003' then '2026-01-01 00:00:00+00'::timestamptz
  when '98000000-0000-4000-8000-000000000004' then '2026-02-01 00:00:00+00'::timestamptz
  when '98000000-0000-4000-8000-000000000005' then '2026-03-01 00:00:00+00'::timestamptz
  else created_at
end;

select extensions.is(
  (select count(*)::integer from public.team_members where profile_id between '98000000-0000-4000-8000-000000000001' and '98000000-0000-4000-8000-000000000005'),
  5,
  'profile creation provisions one team member per approved user'
);

select extensions.is(
  (select count(*)::integer from public.team_members where profile_id between '98000000-0000-4000-8000-000000000001' and '98000000-0000-4000-8000-000000000005' and is_visible),
  0,
  'provisioned team members are hidden by default'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000002', true);

select extensions.throws_ok(
  $$ select public.save_job_title(null, null, 'FORGED_TITLE', 'Forged Title', 10, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a Job title'
);

select extensions.throws_ok(
  $$ select public.save_team_member_profile('98000000-0000-4000-8000-000000000003', 'Forged', null, null, null, false) $$,
  '42501',
  'Admin access required.',
  'staff cannot edit another public team profile'
);

select set_config('request.jwt.claim.sub', '98000000-0000-4000-8000-000000000001', true);

select set_config('test.team_partner_title', public.save_job_title(null, null, 'TEST_MANAGING_PARTNER_98', 'Test Managing Partner 98', 1, true)::text, true);
select set_config('test.team_associate_title', public.save_job_title(null, null, 'TEST_ASSOCIATE_98', 'Test Associate 98', 5, true)::text, true);

select extensions.is(
  (select created_by from public.job_titles where id = current_setting('test.team_partner_title')::uuid),
  '98000000-0000-4000-8000-000000000001'::uuid,
  'Job title audit actor comes from auth.uid'
);

select extensions.lives_ok(
  $$ select public.save_team_member_profile('98000000-0000-4000-8000-000000000003', 'Old Associate', current_setting('test.team_associate_title')::uuid, null, 'Oldest associate', true) $$,
  'admin can publish a complete team profile'
);

select extensions.lives_ok(
  $$ select public.save_team_member_profile('98000000-0000-4000-8000-000000000004', 'Managing Partner', current_setting('test.team_partner_title')::uuid, null, null, true) $$,
  'admin can publish a managing partner'
);

select extensions.lives_ok(
  $$ select public.save_team_member_profile('98000000-0000-4000-8000-000000000005', 'New Associate', current_setting('test.team_associate_title')::uuid, null, null, true) $$,
  'admin can publish another associate'
);

select extensions.results_eq(
  $$ select full_name from public.list_visible_team_members() where full_name in ('Managing Partner', 'Old Associate', 'New Associate') $$,
  $$ values ('Managing Partner'::text), ('Old Associate'::text), ('New Associate'::text) $$,
  'public team is ordered by title order then oldest member date'
);

select extensions.throws_ok(
  $$ select public.set_master_data_active('JOB_TITLE', current_setting('test.team_partner_title')::uuid, 1, false) $$,
  '23503',
  'Hide or reassign published team members before deactivating this Job title.',
  'a title used by a visible team member cannot be deactivated'
);

select extensions.throws_ok(
  $$ insert into public.team_members (profile_id, full_name) values ('98000000-0000-4000-8000-000000000003', 'Duplicate') $$,
  '23505',
  null,
  'a profile cannot have two linked team member records'
);

select extensions.lives_ok(
  $$ select public.save_team_member_profile('98000000-0000-4000-8000-000000000002', 'Hidden Staff', null, null, null, false) $$,
  'an incomplete team profile can remain hidden'
);

select extensions.throws_ok(
  $$ select public.save_team_member_profile('98000000-0000-4000-8000-000000000002', 'Hidden Staff', null, null, null, true) $$,
  '23514',
  'A Job title is required before publishing a team member.',
  'publishing requires a Job title'
);

select extensions.lives_ok(
  $$ select public.soft_delete_profile('98000000-0000-4000-8000-000000000004') $$,
  'super admin can soft-delete a user with a public team profile'
);

select extensions.is(
  (select is_visible from public.team_members where profile_id = '98000000-0000-4000-8000-000000000004'),
  false,
  'soft deletion automatically hides the public team profile'
);

select extensions.is(
  public.set_master_data_active('JOB_TITLE', current_setting('test.team_partner_title')::uuid, 1, false),
  2,
  'a Job title can be deactivated after its public members are hidden'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select extensions.results_eq(
  $$ select full_name from public.list_visible_team_members() where full_name in ('Managing Partner', 'Old Associate', 'New Associate') $$,
  $$ values ('Old Associate'::text), ('New Associate'::text) $$,
  'anonymous visitors only receive visible members with active titles'
);

reset role;

select * from extensions.finish();

rollback;
