begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('9a000000-0000-4000-8000-000000000001','authenticated','authenticated','trash-admin@example.test',now(),now()),
  ('9a000000-0000-4000-8000-000000000002','authenticated','authenticated','trash-staff@example.test',now(),now());

insert into public.profiles(id,email,display_name,role,is_active)
values
  ('9a000000-0000-4000-8000-000000000001','trash-admin@example.test','Trash Admin','admin',true),
  ('9a000000-0000-4000-8000-000000000002','trash-staff@example.test','Trash Staff','staff',true);

insert into public.internal_services(id,workflow_template_id,code,name,is_active)
values('9a000000-0000-4000-8000-000000000003','24000000-0000-4000-8000-000000000001','TRASH_TEST_SERVICE','Trash Test Service',true);

insert into public.clients(id,client_type,name,created_by,updated_by)
values('9a000000-0000-4000-8000-000000000004','COMPANY','Trash Test Client','9a000000-0000-4000-8000-000000000001','9a000000-0000-4000-8000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','9a000000-0000-4000-8000-000000000001',true);
select set_config('test.trash_job', public.create_job(
  p_client_id=>'9a000000-0000-4000-8000-000000000004',
  p_title=>'Trash Lifecycle Job',
  p_internal_service_id=>'9a000000-0000-4000-8000-000000000003',
  p_priority_id=>'21000000-0000-4000-8000-000000000001'
)::text,true);
select set_config('test.trash_folder', public.save_job_drive_folder(
  current_setting('test.trash_job')::uuid,
  'shared-drive-test', 'folder-test', 'Trash Lifecycle Job',
  'https://drive.google.com/drive/folders/folder-test'
)::text,true);
select public.save_job_document_metadata(
  current_setting('test.trash_job')::uuid,
  current_setting('test.trash_folder')::uuid,
  'file-test', null, 'trash-test.pdf', 'application/pdf', 128,
  'https://drive.google.com/file/d/file-test/view'
);

select extensions.throws_ok(
  $$ select public.trash_job(current_setting('test.trash_job')::uuid,(select version from public.jobs where id=current_setting('test.trash_job')::uuid),'wrong') $$,
  '22023','Confirmation must exactly match the Job title or client name.','Trash requires exact title or client confirmation'
);
select extensions.lives_ok(
  $$ select public.trash_job(current_setting('test.trash_job')::uuid,(select version from public.jobs where id=current_setting('test.trash_job')::uuid),'Trash Lifecycle Job') $$,
  'admin can move a Job to Trash'
);
select extensions.ok((select archived_at is not null from public.jobs where id=current_setting('test.trash_job')::uuid),'Job is soft deleted');
select extensions.ok((select archived_at is not null from public.job_drive_folders where job_id=current_setting('test.trash_job')::uuid),'Drive folder metadata is archived');
select extensions.ok((select archived_at is not null and sync_status='TRASHED' from public.job_documents where job_id=current_setting('test.trash_job')::uuid),'document metadata is archived as trashed');

select set_config('request.jwt.claim.sub','9a000000-0000-4000-8000-000000000002',true);
select extensions.is((select count(*)::integer from public.jobs where id=current_setting('test.trash_job')::uuid),0,'staff cannot read an archived Job');

select set_config('request.jwt.claim.sub','9a000000-0000-4000-8000-000000000001',true);
select extensions.lives_ok(
  $$ select public.restore_job(current_setting('test.trash_job')::uuid,(select version from public.jobs where id=current_setting('test.trash_job')::uuid)) $$,
  'admin can restore a Job'
);
select extensions.ok((select archived_at is null from public.jobs where id=current_setting('test.trash_job')::uuid),'Job is active after restore');
select extensions.ok(
  (select f.archived_at is null and d.archived_at is null and d.sync_status='READY'
   from public.job_drive_folders f join public.job_documents d on d.job_drive_folder_id=f.id
   where f.job_id=current_setting('test.trash_job')::uuid),
  'Drive folder and document metadata are restored'
);
select extensions.lives_ok(
  $$ select public.trash_job(current_setting('test.trash_job')::uuid,(select version from public.jobs where id=current_setting('test.trash_job')::uuid),'Trash Test Client') $$,
  'client name is also accepted as exact confirmation'
);
select extensions.throws_ok(
  $$ select public.delete_job_permanently(current_setting('test.trash_job')::uuid,(select version from public.jobs where id=current_setting('test.trash_job')::uuid),'wrong') $$,
  '22023','Confirmation must exactly match the Job title.','permanent deletion requires exact title'
);
select set_config('test.trash_manifest',public.prepare_job_deletion(current_setting('test.trash_job')::uuid,(select version from public.jobs where id=current_setting('test.trash_job')::uuid),'Trash Lifecycle Job')::text,true);
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.ack_deleted_drive_target('job',current_setting('test.trash_job')::uuid,(current_setting('test.trash_manifest')::jsonb->>'token')::uuid,'file-test',false);
select public.ack_deleted_drive_target('job',current_setting('test.trash_job')::uuid,(current_setting('test.trash_manifest')::jsonb->>'token')::uuid,'folder-test',true);
select extensions.lives_ok(
  $$ select public.finish_job_deletion(current_setting('test.trash_job')::uuid,(current_setting('test.trash_manifest')::jsonb->>'token')::uuid,'9a000000-0000-4000-8000-000000000001') $$,
  'server finalizes deletion after mapped Drive resources are cleaned'
);
select extensions.is(
  (select count(*)::integer from public.jobs where id=current_setting('test.trash_job')::uuid)
  +(select count(*)::integer from public.job_drive_folders where job_id=current_setting('test.trash_job')::uuid)
  +(select count(*)::integer from public.job_documents where job_id=current_setting('test.trash_job')::uuid),
  0,
  'hard delete removes the Job and Drive metadata graph'
);
select extensions.ok(not has_function_privilege('authenticated','public.archive_job(uuid,integer)','EXECUTE'),'legacy archive RPC is no longer callable by authenticated users');
select extensions.ok(not has_function_privilege('authenticated','public.purge_expired_job(uuid)','EXECUTE'),'30-day purge RPC is restricted from authenticated users');

select * from extensions.finish();
rollback;
