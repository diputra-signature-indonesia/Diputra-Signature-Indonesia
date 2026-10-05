-- Isolated fixtures; the transaction is rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
insert into auth.users(id,aud,role,email,raw_user_meta_data,created_at,updated_at)
select ('f6400000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
  'authenticated','authenticated','account-'||n||'@example.test','{"full_name":"OAuth Name"}'::jsonb,now(),now()
from generate_series(1,5) n;
insert into public.profiles(id,email,display_name,role,is_active,deleted_at)
values
 ('f6400000-0000-4000-8000-000000000001','account-1@example.test','Original Admin','admin',true,null),
 ('f6400000-0000-4000-8000-000000000002','account-2@example.test','Original Staff','staff',true,null),
 ('f6400000-0000-4000-8000-000000000003','account-3@example.test','Original Super','super_admin',true,null),
 ('f6400000-0000-4000-8000-000000000004','account-4@example.test','Inactive','staff',false,null),
 ('f6400000-0000-4000-8000-000000000005','account-5@example.test','Deleted','admin',true,now());
update public.team_members set full_name='Public Team Name',short_bio='Public bio',is_visible=false
where profile_id='f6400000-0000-4000-8000-000000000001';
select extensions.ok(not has_function_privilege('anon','public.get_own_account_details()','EXECUTE'),'anonymous cannot read account details');
select extensions.ok(not has_function_privilege('anon','public.set_own_display_name(text)','EXECUTE'),'anonymous cannot update own name');
select extensions.ok(not has_table_privilege('authenticated','public.profiles','UPDATE'),'no broad profile UPDATE grant is introduced');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6400000-0000-4000-8000-000000000001',true);
select extensions.is(public.get_own_account_details()->>'email','account-1@example.test','only the caller account is read');
select extensions.is(public.get_own_account_details()->'publicProfile'->>'fullName','Public Team Name','hidden own public profile is readable');
select extensions.is(public.set_own_display_name('  Custom Admin  '),'Custom Admin','admin can save a trimmed own display name');
select extensions.is(public.get_own_account_details()->>'role','admin','role is unchanged');
select extensions.is(public.get_own_account_details()->>'email','account-1@example.test','email is unchanged');
select extensions.is(public.get_own_account_details()->'publicProfile'->>'fullName','Public Team Name','public name is unchanged by admin display name');
select extensions.is(public.get_own_account_details()->'publicProfile'->>'shortBio','Public bio','public biography is unchanged');
select extensions.is(public.get_own_account_details()->'publicProfile'->>'isVisible','false','public visibility is unchanged');
select extensions.lives_ok($$ select public.sync_own_profile_identity() $$,'identity sync still works');
select extensions.is(public.get_own_account_details()->>'displayName','Custom Admin','identity sync does not overwrite a custom name');
select extensions.throws_ok($$ select public.set_own_display_name('  ') $$,'22023','Display name must contain 1 to 160 characters without control characters.','blank name is rejected');
select extensions.throws_ok($$ select public.set_own_display_name(repeat('a',161)) $$,'22023','Display name must contain 1 to 160 characters without control characters.','overlong name is rejected');
select extensions.throws_ok($$ select public.set_own_display_name(E'Bad\nName') $$,'22023','Display name must contain 1 to 160 characters without control characters.','control characters are rejected');
select extensions.throws_ok($$ select public.set_own_display_name(null) $$,'22023','Display name must contain 1 to 160 characters without control characters.','null name is rejected');
select set_config('request.jwt.claim.sub','f6400000-0000-4000-8000-000000000002',true);
select extensions.is(public.get_own_account_details()->>'displayName','Original Staff','another profile remains unchanged');
select extensions.is(public.set_own_display_name('Custom Staff'),'Custom Staff','staff can edit their own display name');
select set_config('request.jwt.claim.sub','f6400000-0000-4000-8000-000000000003',true);
select extensions.is(public.set_own_display_name('Custom Super'),'Custom Super','super admin can edit their own display name');
select set_config('request.jwt.claim.sub','f6400000-0000-4000-8000-000000000004',true);
select extensions.throws_ok($$ select public.set_own_display_name('No') $$,'42501','Active account required.','inactive user cannot update own name');
select extensions.throws_ok($$ select public.get_own_account_details() $$,'42501','Active account required.','inactive user cannot read account details');
select set_config('request.jwt.claim.sub','f6400000-0000-4000-8000-000000000005',true);
select extensions.throws_ok($$ select public.set_own_display_name('No') $$,'42501','Active account required.','deleted user cannot update own name');
select extensions.throws_ok($$ select public.get_own_account_details() $$,'42501','Active account required.','deleted user cannot read account details');
select * from extensions.finish();
rollback;
