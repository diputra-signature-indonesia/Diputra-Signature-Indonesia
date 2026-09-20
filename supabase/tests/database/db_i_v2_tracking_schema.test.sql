begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(61);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('91000000-0000-4000-8000-000000000001','authenticated','authenticated','v2-super@example.test',now(),now()),
  ('91000000-0000-4000-8000-000000000002','authenticated','authenticated','v2-pic@example.test',now(),now()),
  ('91000000-0000-4000-8000-000000000003','authenticated','authenticated','v2-staff@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('91000000-0000-4000-8000-000000000001','v2-super@example.test','V2 Super','super_admin',true),
  ('91000000-0000-4000-8000-000000000002','v2-pic@example.test','V2 PIC','staff',true),
  ('91000000-0000-4000-8000-000000000003','v2-staff@example.test','V2 Staff','staff',true);

insert into public.internal_service_categories(id,code,name,is_active)
values('92000000-0000-4000-8000-000000000001','V2_TEST','V2 Test',true);

insert into public.internal_services(id,category_id,workflow_template_id,code,name,is_active)
values
  ('92000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000001','V2_GENERAL','V2 General',true),
  ('92000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','24000000-0000-4000-8000-000000000002','V2_VISA','V2 Visa',true);

insert into public.clients(id,client_type,name,created_by,updated_by)
values('92000000-0000-4000-8000-000000000004','COMPANY','V2 Client','91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001');

select extensions.is((select count(*)::integer from public.priorities where is_system),3,'three system priorities are seeded');
select extensions.is((select count(*)::integer from public.job_statuses where is_system),5,'five Job statuses are seeded');
select extensions.is((select count(*)::integer from public.task_statuses where is_system),5,'five Task statuses are seeded independently');
select extensions.is((select count(*)::integer from public.workflow_templates where code in('GENERAL','VISA')),2,'two initial workflows are seeded');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);

select set_config(
  'test.v2_job_id',
  public.create_job(
    p_client_id=>'92000000-0000-4000-8000-000000000004',
    p_title=>'V2 Job',
    p_internal_service_id=>'92000000-0000-4000-8000-000000000002',
    p_priority_id=>'21000000-0000-4000-8000-000000000001',
    p_pic_id=>'91000000-0000-4000-8000-000000000003'
  )::text,
  true
);

select extensions.is((select pic_id from public.jobs where id=current_setting('test.v2_job_id')::uuid),'91000000-0000-4000-8000-000000000002'::uuid,'staff creator is forced to become PIC');
select extensions.is((select count(*)::integer from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null),5,'Job snapshots all five General workflow steps');
select extensions.is((select count(*)::integer from public.job_task_statuses where job_id=current_setting('test.v2_job_id')::uuid),3,'new Job receives three default Task columns');
select extensions.is((select s.code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=current_setting('test.v2_job_id')::uuid),'NOT_STARTED','new Job starts as NOT_STARTED');

select extensions.throws_ok(
  $$ update public.jobs set title='forged' where id=current_setting('test.v2_job_id')::uuid $$,
  '42501',null,'direct Job writes are denied'
);

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select set_config(
  'test.v2_task_id',
  public.create_task(
    p_job_id=>current_setting('test.v2_job_id')::uuid,
    p_title=>null,
    p_description=>null,
    p_assignee_id=>'91000000-0000-4000-8000-000000000001'
  )::text,
  true
);

select extensions.is((select assignee_id from public.tasks where id=current_setting('test.v2_task_id')::uuid),'91000000-0000-4000-8000-000000000003'::uuid,'staff-created Task is assigned to that staff');
select extensions.is((select title from public.tasks where id=current_setting('test.v2_task_id')::uuid),'Untitled Task','empty Task content receives a safe fallback title');
select extensions.lives_ok(
  $$ select public.update_task(current_setting('test.v2_task_id')::uuid,1,'Self managed task',null,null,null,null) $$,
  'current assignee can update their Task'
);

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select extensions.lives_ok(
  $$ select public.update_task(current_setting('test.v2_task_id')::uuid,2,'PIC reassigned task',null,'91000000-0000-4000-8000-000000000002',null,null) $$,
  'Job PIC can reassign any Task in their Job'
);

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select extensions.throws_ok(
  $$ select public.update_task(current_setting('test.v2_task_id')::uuid,3,'former assignee edit',null,null,null,null) $$,
  '42501','Task management is not allowed.','former assignee loses Task mutation access'
);

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select extensions.throws_ok(
  $$ select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=2),1) $$,
  '55000','Only the current step can be completed.','a future step cannot be completed out of order'
);
select extensions.lives_ok(
  $$ select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=1),1) $$,
  'current step can be completed'
);
select extensions.is((select s.code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=current_setting('test.v2_job_id')::uuid),'NOT_STARTED','non-final step does not change Job status');
select extensions.lives_ok(
  $$
    select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=2),1);
    select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=3),1);
    select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=4),1);
  $$,
  'workflow advances linearly to the final step'
);
select extensions.lives_ok(
  $$ select public.change_job_status(current_setting('test.v2_job_id')::uuid,1,'OBSTACLE','Waiting for client') $$,
  'PIC can set OBSTACLE with a reason'
);
select extensions.throws_ok(
  $$ select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=5),1) $$,
  '55000','Resolve the Job hold/obstacle before completing the final step.','final step is locked during OBSTACLE'
);
select extensions.lives_ok(
  $$ select public.change_job_status(current_setting('test.v2_job_id')::uuid,2,'IN_PROGRESS',null) $$,
  'PIC can resolve override status back to IN_PROGRESS'
);
select extensions.lives_ok(
  $$ select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=5),1) $$,
  'final step completes after obstacle resolution'
);
select extensions.is((select s.code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=current_setting('test.v2_job_id')::uuid),'COMPLETED','only final-step completion closes the Job');
select extensions.ok((select started_at is not null from public.jobs where id=current_setting('test.v2_job_id')::uuid),'completed Job always records a started_at timestamp');
select extensions.throws_ok(
  $$ select public.change_job_status(current_setting('test.v2_job_id')::uuid,4,'IN_PROGRESS',null) $$,
  '55000','Use reopen_job for a completed Job.','manual status RPC cannot bypass reopen on a completed Job'
);
select extensions.throws_ok(
  $$
    select public.configure_job_task_statuses(
      current_setting('test.v2_job_id')::uuid,
      (select jsonb_agg(jsonb_build_object('task_status_id',task_status_id) order by column_order) from public.job_task_statuses where job_id=current_setting('test.v2_job_id')::uuid)
    )
  $$,
  '55000','Reopen the completed Job before configuring its board.','completed Job board is read-only'
);
select extensions.throws_ok(
  $$ select public.update_task(current_setting('test.v2_task_id')::uuid,3,'completed edit',null,null,null,null) $$,
  '55000','Job is read-only.','Task mutation is blocked while Job is completed'
);
select extensions.throws_ok(
  $$ select public.reopen_job(current_setting('test.v2_job_id')::uuid,4,'') $$,
  '22023','Reopen reason is required.','reopen requires a reason'
);
select extensions.lives_ok(
  $$ select public.reopen_job(current_setting('test.v2_job_id')::uuid,4,'Additional client correction') $$,
  'PIC can reopen a completed Job with a reason'
);
select extensions.is((select s.code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=current_setting('test.v2_job_id')::uuid),'IN_PROGRESS','reopened Job becomes IN_PROGRESS');
select extensions.is((select is_completed from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=5),false,'reopen resets only the final step');

select set_config('test.v2_update_id',public.create_job_update(current_setting('test.v2_job_id')::uuid,'Manual progress','2026-09-19',null)::text,true);
select extensions.lives_ok(
  $$ select public.delete_job_update(current_setting('test.v2_update_id')::uuid,1) $$,
  'PIC can hard-delete a Remark through RPC'
);
select extensions.is((select count(*)::integer from public.job_updates where id=current_setting('test.v2_update_id')::uuid),0,'Remark row is physically deleted');
select extensions.ok(exists(select 1 from public.list_job_activity(current_setting('test.v2_job_id')::uuid,100,null) where action='JOB_UPDATE_DELETED' and old_values->>'message'='Manual progress'),'Remark deletion retains an activity snapshot');

select extensions.lives_ok(
  $$ select public.update_job(current_setting('test.v2_job_id')::uuid,5,'92000000-0000-4000-8000-000000000004','V2 Job','92000000-0000-4000-8000-000000000003','21000000-0000-4000-8000-000000000001',null,null,null,null) $$,
  'changing Service restarts the Job workflow'
);
select extensions.is((select count(*)::integer from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null),3,'Visa workflow produces three new active steps');
select extensions.is((select count(*)::integer from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is not null),5,'old workflow steps remain as replaced history');
select extensions.is((select s.code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=current_setting('test.v2_job_id')::uuid),'IN_PROGRESS','workflow restart preserves Job status');

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select extensions.lives_ok(
  $$ select public.save_internal_service('92000000-0000-4000-8000-000000000003',1,'92000000-0000-4000-8000-000000000001','IGNORED','V2 Visa',null,'24000000-0000-4000-8000-000000000001',0,true) $$,
  'admin can reassign the Service workflow for future Jobs'
);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select extensions.lives_ok(
  $$ select public.update_job(current_setting('test.v2_job_id')::uuid,6,'92000000-0000-4000-8000-000000000004','V2 Job renamed','92000000-0000-4000-8000-000000000003','21000000-0000-4000-8000-000000000001',null,null,null,null) $$,
  'ordinary Job edit succeeds after its Service Master Data assignment changes'
);
select extensions.is((select workflow_template_id from public.jobs where id=current_setting('test.v2_job_id')::uuid),'24000000-0000-4000-8000-000000000002'::uuid,'ordinary edit retains the Job workflow snapshot');
select extensions.is((select count(*)::integer from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null),3,'ordinary edit does not restart workflow from changed Master Data');
select extensions.lives_ok(
  $$ select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=1),1) $$,
  'first step in restarted workflow can be completed'
);
select extensions.lives_ok(
  $$ select public.revert_last_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=1),2) $$,
  'only the latest completed step can be reverted'
);
select extensions.lives_ok(
  $$ select public.complete_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=1),3) $$,
  'reverted current step can be completed again'
);
select extensions.lives_ok(
  $$ select public.archive_job(current_setting('test.v2_job_id')::uuid,7) $$,
  'PIC can archive their active Job'
);
select extensions.throws_ok(
  $$ select public.change_job_status(current_setting('test.v2_job_id')::uuid,8,'ON_HOLD','archived') $$,
  '55000','Archived Job is read-only.','archived Job status cannot change'
);
select extensions.throws_ok(
  $$
    select public.configure_job_task_statuses(
      current_setting('test.v2_job_id')::uuid,
      (select jsonb_agg(jsonb_build_object('task_status_id',task_status_id) order by column_order) from public.job_task_statuses where job_id=current_setting('test.v2_job_id')::uuid)
    )
  $$,
  '55000','Archived Job is read-only.','archived Job board cannot change'
);
select extensions.throws_ok(
  $$ select public.update_job(current_setting('test.v2_job_id')::uuid,8,'92000000-0000-4000-8000-000000000004','forged archived edit','92000000-0000-4000-8000-000000000003','21000000-0000-4000-8000-000000000001',null,null,null,null) $$,
  '55000','Archived Job is read-only.','archived Job details cannot change'
);
select extensions.throws_ok(
  $$ select public.revert_last_job_step((select id from public.job_steps where job_id=current_setting('test.v2_job_id')::uuid and replaced_at is null and position=1),4) $$,
  '55000','Archived Job is read-only.','archived Job workflow cannot be reverted'
);

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select extensions.throws_ok(
  $$ select public.update_unused_workflow_template('24000000-0000-4000-8000-000000000002',1,'Changed',null,'[{"name":"ONLY"}]'::jsonb) $$,
  '55000','A workflow used by a Job is immutable.','a used workflow template is immutable'
);
select extensions.throws_ok(
  $$ select count(*) from public.job_activity_logs $$,
  '42501',null,'raw activity table is not exposed to browser roles'
);
select extensions.ok((select count(*)>0 from public.list_job_activity(current_setting('test.v2_job_id')::uuid,100,null)),'active staff reads activity through the projection RPC');

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select set_config('test.v2_sop_id',public.save_sop('92000000-0000-4000-8000-000000000003','Visa SOP',null)::text,true);
select extensions.ok(current_setting('test.v2_sop_id')::uuid is not null,'admin can create the single SOP for a Service');
select extensions.lives_ok(
  $$ select public.save_sop_price_items(current_setting('test.v2_sop_id')::uuid,1,'[{"item_name":"Service Fee","amount":1500000}]'::jsonb) $$,
  'admin can save the SOP Price List'
);
select extensions.is((select currency from public.sop_price_items where sop_id=current_setting('test.v2_sop_id')::uuid),'IDR','SOP Price List is IDR-only');
select extensions.throws_ok(
  $$ select * from public.prepare_sop_file_upload(current_setting('test.v2_sop_id')::uuid,'REQUIREMENT','Too large','large.pdf','application/pdf',10485761,0) $$,
  '22023','File must be 10 MiB or smaller.','SOP file reservation enforces the 10 MiB limit'
);

select extensions.lives_ok(
  $$ select public.soft_delete_profile('91000000-0000-4000-8000-000000000003') $$,
  'super admin can soft-delete a profile without deleting history'
);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select extensions.ok(not public.is_staff_role(),'soft-deleted profile loses staff capability');
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select extensions.lives_ok(
  $$ select public.restore_profile('91000000-0000-4000-8000-000000000003') $$,
  'super admin can restore a soft-deleted profile'
);
select extensions.is((select is_active from public.profiles where id='91000000-0000-4000-8000-000000000003'),false,'restored profile remains inactive until separately activated');

reset role;
select extensions.finish();
rollback;
