-- All fixture mutations, including soft delete and restore, are rolled back.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);
insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('f6200000-0000-4000-8000-000000000001','authenticated','authenticated','job-action-admin@example.test',now(),now()),
 ('f6200000-0000-4000-8000-000000000002','authenticated','authenticated','job-action-staff@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
 ('f6200000-0000-4000-8000-000000000001','job-action-admin@example.test','Action Admin','admin',true),
 ('f6200000-0000-4000-8000-000000000002','job-action-staff@example.test','Action Staff','staff',true);
insert into public.internal_services(id,workflow_template_id,code,name,is_active) values
 ('f6200000-0000-4000-8000-000000000003','24000000-0000-4000-8000-000000000001','ALL_JOB_ACTION_TEST','Action Service',true);
insert into public.clients(id,client_type,name,created_by,updated_by) values
 ('f6200000-0000-4000-8000-000000000004','COMPANY','Action Client','f6200000-0000-4000-8000-000000000001','f6200000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6200000-0000-4000-8000-000000000001',true);
select set_config('test.aj_job',public.create_job(p_client_id=>'f6200000-0000-4000-8000-000000000004',p_title=>'Action Job',p_internal_service_id=>'f6200000-0000-4000-8000-000000000003',p_priority_id=>'21000000-0000-4000-8000-000000000001')::text,true);
select set_config('test.aj_folder',public.save_job_drive_folder(current_setting('test.aj_job')::uuid,'test-drive','test-folder','Job Folder','https://drive.google.com/drive/folders/test-folder')::text,true);
select set_config('test.aj_document',public.save_job_document_metadata(current_setting('test.aj_job')::uuid,current_setting('test.aj_folder')::uuid,'test-file',null,'file.pdf','application/pdf',100,'https://drive.google.com/file/d/test-file/view')::text,true);

select extensions.lives_ok($$select public.update_job(p_job_id=>current_setting('test.aj_job')::uuid,p_expected_version=>1,p_client_id=>'f6200000-0000-4000-8000-000000000004',p_title=>'Edited Job',p_internal_service_id=>'f6200000-0000-4000-8000-000000000003',p_priority_id=>'21000000-0000-4000-8000-000000000001',p_description=>'Edited description')$$,'admin can save Edit Job');
select extensions.is((select title from public.jobs where id=current_setting('test.aj_job')::uuid),'Edited Job','edit persists');
select extensions.lives_ok($$select public.change_job_status(current_setting('test.aj_job')::uuid,2,'ON_HOLD','Waiting for client')$$,'admin can save Change Status with a reason');
select extensions.is((select status_reason from public.jobs where id=current_setting('test.aj_job')::uuid),'Waiting for client','status reason persists');
select extensions.throws_ok($$select public.trash_job(current_setting('test.aj_job')::uuid,3,'wrong title')$$,'22023','Confirmation must exactly match the Job title or client name.','wrong typed confirmation does not delete');
select extensions.ok((select archived_at is null from public.jobs where id=current_setting('test.aj_job')::uuid),'failed delete leaves active job intact');
select set_config('request.jwt.claim.sub','f6200000-0000-4000-8000-000000000002',true);
select extensions.throws_ok($$select public.trash_job(current_setting('test.aj_job')::uuid,3,'Edited Job')$$,'42501','Only an active admin can move a Job to Trash.','staff cannot delete job');
select set_config('request.jwt.claim.sub','f6200000-0000-4000-8000-000000000001',true);
select extensions.lives_ok($$select public.trash_job(current_setting('test.aj_job')::uuid,3,'Edited Job')$$,'admin can soft delete with exact title');
select extensions.ok((select archived_at is not null from public.jobs where id=current_setting('test.aj_job')::uuid),'job enters Trash without hard deletion');
select extensions.ok((select archived_at is not null from public.job_drive_folders where id=current_setting('test.aj_folder')::uuid),'Drive folder mapping is archived');
select extensions.is((select sync_status from public.job_documents where id=current_setting('test.aj_document')::uuid),'TRASHED','document mapping enters Trash');
select extensions.lives_ok($$select public.restore_job(current_setting('test.aj_job')::uuid,4)$$,'admin can restore trashed Job');
select extensions.ok((select archived_at is null from public.jobs where id=current_setting('test.aj_job')::uuid),'restored Job is active again');
select extensions.ok((select archived_at is null from public.job_drive_folders where id=current_setting('test.aj_folder')::uuid),'folder mapping is restored');
select extensions.is((select sync_status from public.job_documents where id=current_setting('test.aj_document')::uuid),'READY','document mapping is restored');
select * from extensions.finish();
rollback;
