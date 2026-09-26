begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('99000000-0000-4000-8000-000000000001','authenticated','authenticated','board-pic@example.test',now(),now()),
  ('99000000-0000-4000-8000-000000000004','authenticated','authenticated','board-other@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active)
values
  ('99000000-0000-4000-8000-000000000001','board-pic@example.test','Board PIC','staff',true),
  ('99000000-0000-4000-8000-000000000004','board-other@example.test','Other Staff','staff',true);
insert into public.internal_services(id,workflow_template_id,code,name,is_active)
values('99000000-0000-4000-8000-000000000002','24000000-0000-4000-8000-000000000001','BOARD_TEST_SERVICE','Board Test Service',true);
insert into public.clients(id,client_type,name,created_by,updated_by)
values('99000000-0000-4000-8000-000000000003','COMPANY','Board Test Client','99000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
select set_config('test.board_job',public.create_job(
  p_client_id=>'99000000-0000-4000-8000-000000000003',
  p_title=>'Board Test Job',
  p_internal_service_id=>'99000000-0000-4000-8000-000000000002',
  p_priority_id=>'21000000-0000-4000-8000-000000000001'
)::text,true);

select extensions.is((select count(*)::integer from public.job_task_statuses where job_id=current_setting('test.board_job')::uuid),3,'new Job starts with three Task columns');
select extensions.lives_ok($$
  select public.configure_job_task_statuses(current_setting('test.board_job')::uuid,jsonb_build_array(
    jsonb_build_object('task_status_id','23000000-0000-4000-8000-000000000001'),
    jsonb_build_object('task_status_id','23000000-0000-4000-8000-000000000002'),
    jsonb_build_object('task_status_id','23000000-0000-4000-8000-000000000003'),
    jsonb_build_object('task_status_id','23000000-0000-4000-8000-000000000005')
  ))
$$,'PIC can add a fourth status column');
select extensions.is((select count(*)::integer from public.job_task_statuses where job_id=current_setting('test.board_job')::uuid),4,'new status column persists');

select set_config('test.board_first',public.create_task(p_job_id=>current_setting('test.board_job')::uuid,p_title=>'First Task')::text,true);
select set_config('test.board_second',public.create_task(p_job_id=>current_setting('test.board_job')::uuid,p_title=>'Second Task')::text,true);
select extensions.lives_ok($$
  select public.place_task_on_board(current_setting('test.board_first')::uuid,1,
    (select id from public.job_task_statuses where job_id=current_setting('test.board_job')::uuid and task_status_id='23000000-0000-4000-8000-000000000001'),
    current_setting('test.board_second')::uuid)
$$,'PIC can reorder tasks in the same column');
select extensions.is((select string_agg(title,',' order by position) from public.tasks where job_id=current_setting('test.board_job')::uuid and job_task_status_id=(select id from public.job_task_statuses where job_id=current_setting('test.board_job')::uuid and task_status_id='23000000-0000-4000-8000-000000000001')),'First Task,Second Task','reordered Task is first');

select extensions.lives_ok($$
  select public.place_task_on_board(current_setting('test.board_second')::uuid,
    (select version from public.tasks where id=current_setting('test.board_second')::uuid),
    (select id from public.job_task_statuses where job_id=current_setting('test.board_job')::uuid and task_status_id='23000000-0000-4000-8000-000000000003'),null)
$$,'PIC can drag a Task to a different status column');
select extensions.is((select s.code from public.tasks t join public.job_task_statuses jts on jts.id=t.job_task_status_id join public.task_statuses s on s.id=jts.task_status_id where t.id=current_setting('test.board_second')::uuid),'ON_HOLD','cross-column move persists');

select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000004',true);
select extensions.throws_ok($$
  select public.place_task_on_board(current_setting('test.board_second')::uuid,
    (select version from public.tasks where id=current_setting('test.board_second')::uuid),
    (select id from public.job_task_statuses where job_id=current_setting('test.board_job')::uuid and task_status_id='23000000-0000-4000-8000-000000000001'),null)
$$,'42501','Task movement is not allowed.','unassigned staff cannot move another Task');

select * from extensions.finish();
rollback;
