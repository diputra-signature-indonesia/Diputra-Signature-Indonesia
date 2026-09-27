begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('9a000000-0000-4000-8000-000000000001','authenticated','authenticated','contributors-admin@example.test',now(),now()),
  ('9a000000-0000-4000-8000-000000000002','authenticated','authenticated','contributors-pic@example.test',now(),now()),
  ('9a000000-0000-4000-8000-000000000003','authenticated','authenticated','contributors-staff@example.test',now(),now()),
  ('9a000000-0000-4000-8000-000000000004','authenticated','authenticated','contributors-manual@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('9a000000-0000-4000-8000-000000000001','contributors-admin@example.test','Contributors Admin','super_admin',true),
  ('9a000000-0000-4000-8000-000000000002','contributors-pic@example.test','Contributors PIC','staff',true),
  ('9a000000-0000-4000-8000-000000000003','contributors-staff@example.test','Contributors Staff','staff',true),
  ('9a000000-0000-4000-8000-000000000004','contributors-manual@example.test','Contributors Manual','staff',true);

insert into public.internal_services(id,workflow_template_id,code,name,is_active)
values('9b000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000001','CONTRIBUTORS_SERVICE','Contributors Service',true);

insert into public.clients(id,client_type,name,created_by,updated_by)
values('9b000000-0000-4000-8000-000000000002','COMPANY','Contributors Client','9a000000-0000-4000-8000-000000000001','9a000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','9a000000-0000-4000-8000-000000000001',true);

select extensions.has_table('public','job_contributors','durable Job contributors table exists');
select extensions.has_function('public','add_job_contributor',array['uuid','uuid'],'manual contributor add RPC exists');
select extensions.has_function('public','remove_job_contributor',array['uuid','uuid'],'manual contributor remove RPC exists');

select set_config(
  'test.contributors_job_id',
  public.create_job(
    p_client_id=>'9b000000-0000-4000-8000-000000000002',
    p_title=>'Contributor Job',
    p_internal_service_id=>'9b000000-0000-4000-8000-000000000001',
    p_priority_id=>'21000000-0000-4000-8000-000000000001',
    p_pic_id=>'9a000000-0000-4000-8000-000000000002'
  )::text,
  true
);

select extensions.ok(
  exists(select 1 from public.job_contributors where job_id=current_setting('test.contributors_job_id')::uuid and profile_id='9a000000-0000-4000-8000-000000000002'),
  'PIC is automatically a durable contributor'
);

select set_config(
  'test.contributors_task_id',
  public.create_task(
    p_job_id=>current_setting('test.contributors_job_id')::uuid,
    p_title=>'Assigned Task',
    p_assignee_id=>'9a000000-0000-4000-8000-000000000003'
  )::text,
  true
);

select extensions.ok(
  exists(select 1 from public.job_contributors where job_id=current_setting('test.contributors_job_id')::uuid and profile_id='9a000000-0000-4000-8000-000000000003'),
  'first Task assignment automatically adds the assignee as contributor'
);

select extensions.lives_ok(
  $$ select public.delete_task(current_setting('test.contributors_task_id')::uuid,1) $$,
  'assigned Task can be removed'
);
select extensions.ok(
  exists(select 1 from public.job_contributors where job_id=current_setting('test.contributors_job_id')::uuid and profile_id='9a000000-0000-4000-8000-000000000003'),
  'contributor membership remains after the Task no longer exists'
);

select extensions.lives_ok(
  $$ select public.add_job_contributor(current_setting('test.contributors_job_id')::uuid,'9a000000-0000-4000-8000-000000000004') $$,
  'Job manager can add a contributor manually'
);
select extensions.lives_ok(
  $$ select public.remove_job_contributor(current_setting('test.contributors_job_id')::uuid,'9a000000-0000-4000-8000-000000000004') $$,
  'Job manager can remove an unassigned contributor'
);
select extensions.throws_ok(
  $$ select public.remove_job_contributor(current_setting('test.contributors_job_id')::uuid,'9a000000-0000-4000-8000-000000000002') $$,
  '55000','The Job PIC cannot be removed from contributors.','PIC cannot be removed from contributors'
);
select extensions.throws_ok(
  $$ insert into public.job_contributors(job_id,profile_id,added_by) values(current_setting('test.contributors_job_id')::uuid,'9a000000-0000-4000-8000-000000000004','9a000000-0000-4000-8000-000000000001') $$,
  '42501',null,'direct contributor writes are denied'
);

reset role;
select extensions.finish();
rollback;
