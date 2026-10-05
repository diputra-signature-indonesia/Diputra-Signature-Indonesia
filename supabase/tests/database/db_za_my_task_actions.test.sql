-- Isolated fixtures: every write is rolled back, including activity logs.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('f6100000-0000-4000-8000-000000000001','authenticated','authenticated','my-task-pic@example.test',now(),now()),
 ('f6100000-0000-4000-8000-000000000002','authenticated','authenticated','my-task-assignee@example.test',now(),now()),
 ('f6100000-0000-4000-8000-000000000003','authenticated','authenticated','my-task-other@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
 ('f6100000-0000-4000-8000-000000000001','my-task-pic@example.test','My Task PIC','staff',true),
 ('f6100000-0000-4000-8000-000000000002','my-task-assignee@example.test','My Task Assignee','staff',true),
 ('f6100000-0000-4000-8000-000000000003','my-task-other@example.test','Other staff','staff',true);
insert into public.internal_services(id,workflow_template_id,code,name,is_active) values
 ('f6100000-0000-4000-8000-000000000004','24000000-0000-4000-8000-000000000001','MY_TASK_ACTION_TEST','My Task Test',true);
insert into public.clients(id,client_type,name,created_by,updated_by) values
 ('f6100000-0000-4000-8000-000000000005','COMPANY','My Task Client','f6100000-0000-4000-8000-000000000001','f6100000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);
select set_config('test.mt_job',public.create_job(
 p_client_id=>'f6100000-0000-4000-8000-000000000005',p_title=>'My Task Actions',
 p_internal_service_id=>'f6100000-0000-4000-8000-000000000004',p_priority_id=>'21000000-0000-4000-8000-000000000001')::text,true);
select set_config('test.mt_task',public.create_task(
 p_job_id=>current_setting('test.mt_job')::uuid,p_title=>'Task detail',p_description=>'Description remains intact',
 p_assignee_id=>'f6100000-0000-4000-8000-000000000002',p_priority_id=>'21000000-0000-4000-8000-000000000001',p_due_date=>'2026-10-20')::text,true);
select set_config('test.mt_status',(select id::text from public.job_task_statuses where job_id=current_setting('test.mt_job')::uuid and task_status_id='23000000-0000-4000-8000-000000000002'),true);

select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000002',true);
select extensions.is((select display_name from public.list_assignable_profiles() where id='f6100000-0000-4000-8000-000000000001'),'My Task PIC','staff can resolve names with the approved-user projection');
select extensions.lives_ok($$select public.place_task_on_board(current_setting('test.mt_task')::uuid,1,current_setting('test.mt_status')::uuid,null)$$,'assignee can change status with the same RPC as My Tasks');
select extensions.is((select job_task_status_id from public.tasks where id=current_setting('test.mt_task')::uuid),current_setting('test.mt_status')::uuid,'selected Job status column is saved');
select extensions.is((select version from public.tasks where id=current_setting('test.mt_task')::uuid),2,'status save increments optimistic version');
select extensions.is((select description from public.tasks where id=current_setting('test.mt_task')::uuid),'Description remains intact','status save preserves task details');
select extensions.is((select s.code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=current_setting('test.mt_job')::uuid),'NOT_STARTED','task status does not change Job status');
select extensions.ok(exists(select 1 from public.list_job_activity(current_setting('test.mt_job')::uuid,100,null) where action='TASK_MOVED' and task_id=current_setting('test.mt_task')::uuid),'status save appears in Job activity');
select extensions.throws_ok($$select public.place_task_on_board(current_setting('test.mt_task')::uuid,1,current_setting('test.mt_status')::uuid,null)$$,'40001','Stale Task version.','stale modal cannot overwrite a newer change');
select extensions.throws_ok($$select public.place_task_on_board(current_setting('test.mt_task')::uuid,2,'f6100000-0000-4000-8000-000000000099',null)$$,'23503','Target status is not configured for this Job.','arbitrary/global status IDs are rejected');

select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000003',true);
select extensions.throws_ok($$select public.place_task_on_board(current_setting('test.mt_task')::uuid,2,current_setting('test.mt_status')::uuid,null)$$,'42501','Task movement is not allowed.','unassigned staff cannot change another task');
select set_config('request.jwt.claim.sub','f6100000-0000-4000-8000-000000000001',true);
select extensions.lives_ok($$select public.place_task_on_board(current_setting('test.mt_task')::uuid,2,current_setting('test.mt_status')::uuid,null)$$,'PIC can change an assigned task');
select public.complete_job_step(id,version) from public.job_steps where job_id=current_setting('test.mt_job')::uuid and replaced_at is null order by position;
select extensions.throws_ok($$select public.place_task_on_board(current_setting('test.mt_task')::uuid,3,current_setting('test.mt_status')::uuid,null)$$,'55000','Job is read-only.','completed Job prevents status changes');
select * from extensions.finish();
rollback;
