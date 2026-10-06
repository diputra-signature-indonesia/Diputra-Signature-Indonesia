begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('f6600000-0000-4000-8000-000000000001','authenticated','authenticated','group-admin@example.test',now(),now()),
 ('f6600000-0000-4000-8000-000000000002','authenticated','authenticated','group-pic@example.test',now(),now()),
 ('f6600000-0000-4000-8000-000000000003','authenticated','authenticated','group-staff@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
 ('f6600000-0000-4000-8000-000000000001','group-admin@example.test','Group Admin','admin',true),
 ('f6600000-0000-4000-8000-000000000002','group-pic@example.test','Group PIC','staff',true),
 ('f6600000-0000-4000-8000-000000000003','group-staff@example.test','Other Staff','staff',true);
insert into public.clients(id,client_type,name,created_by,updated_by) values
 ('f6600000-0000-4000-8000-000000000004','COMPANY','Group Client','f6600000-0000-4000-8000-000000000001','f6600000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6600000-0000-4000-8000-000000000001',true);
select set_config('test.group_workflow',public.save_workflow_template(null,null,'GROUP_TEST','Group Test Workflow',null,'[{"name":"First"}]',true)::text,true);
select set_config('test.group_service',public.save_internal_service(null,null,'GROUP_TEST','Group Test Service',null,current_setting('test.group_workflow')::uuid,true)::text,true);
select set_config('test.group_job',public.create_job(p_client_id=>'f6600000-0000-4000-8000-000000000004',p_title=>'Group Test Job',p_internal_service_id=>current_setting('test.group_service')::uuid,p_priority_id=>'21000000-0000-4000-8000-000000000001',p_pic_id=>'f6600000-0000-4000-8000-000000000002')::text,true);
select set_config('test.group_job2',public.create_job(p_client_id=>'f6600000-0000-4000-8000-000000000004',p_title=>'Other Group Job',p_internal_service_id=>current_setting('test.group_service')::uuid,p_priority_id=>'21000000-0000-4000-8000-000000000001',p_pic_id=>'f6600000-0000-4000-8000-000000000002')::text,true);
select set_config('test.group_folder',public.save_job_drive_folder(current_setting('test.group_job')::uuid,'group-drive','group-root','Root','https://drive.google.com/drive/folders/group-root')::text,true);
select set_config('test.group_folder2',public.save_job_drive_folder(current_setting('test.group_job2')::uuid,'group-drive','group-root2','Root2','https://drive.google.com/drive/folders/group-root2')::text,true);
select extensions.has_table('public','job_document_groups','optional document group table exists');
select extensions.ok((select relrowsecurity from pg_class where oid='public.job_document_groups'::regclass),'group RLS enabled');
select extensions.ok(not has_table_privilege('authenticated','public.job_document_groups','INSERT,UPDATE,DELETE'),'browser has no direct group write privilege');
select extensions.ok(not has_function_privilege('anon','public.prepare_job_document_group(uuid,text,text,uuid)','EXECUTE'),'anonymous cannot create groups');
select extensions.ok(not has_function_privilege('authenticated','public.ack_deleted_drive_target(text,uuid,uuid,text,boolean)','EXECUTE'),'browser cannot acknowledge permanent Drive deletion');
select set_config('test.group_id',public.prepare_job_document_group(current_setting('test.group_job')::uuid,'Company documents','group-subfolder',gen_random_uuid())->>'id',true);
select extensions.is(public.prepare_job_document_group(current_setting('test.group_job')::uuid,'company documents','ignored-generated-id',gen_random_uuid())->>'id',current_setting('test.group_id'),'retry reuses pending case-insensitive group and Google ID');
select extensions.is((select google_folder_id from public.job_document_groups where id=current_setting('test.group_id')::uuid),'group-subfolder','pending retry preserves the original Google folder ID');
select extensions.throws_ok($$select public.save_grouped_job_document_metadata(current_setting('test.group_job')::uuid,current_setting('test.group_folder')::uuid,'blocked-file','','Pending','application/pdf',12,'https://drive.google.com/file/d/blocked/view',current_setting('test.group_id')::uuid)$$,'55000','Document group is not ready for uploads.','pending group blocks uploads');
select extensions.lives_ok($$select public.complete_job_document_group(current_setting('test.group_id')::uuid)$$,'complete group creation');
select extensions.lives_ok($$select public.complete_job_document_group(current_setting('test.group_id')::uuid)$$,'creation completion is idempotent');
select extensions.throws_ok($$select public.prepare_job_document_group(current_setting('test.group_job')::uuid,'Company documents','duplicate',gen_random_uuid())$$,'23505',null,'ready group name cannot be duplicated');
select extensions.throws_ok($$select public.prepare_job_document_group(current_setting('test.group_job')::uuid,'  ','bad',gen_random_uuid())$$,'22023',null,'blank folder names rejected');
select extensions.throws_ok($$select public.save_grouped_job_document_metadata(current_setting('test.group_job2')::uuid,current_setting('test.group_folder2')::uuid,'wrong-job','','Wrong Job','application/pdf',12,'https://drive.google.com/file/d/wrong/view',current_setting('test.group_id')::uuid)$$,'23503','Document group belongs to another Job.','group from another Job is rejected');
select set_config('request.jwt.claim.sub','f6600000-0000-4000-8000-000000000003',true);
select extensions.throws_ok($$select public.prepare_job_document_group(current_setting('test.group_job')::uuid,'Forbidden','bad',gen_random_uuid())$$,'42501',null,'non-PIC staff cannot create group');
select extensions.throws_ok($$select public.prepare_job_document_group_trash(current_setting('test.group_id')::uuid,2)$$,'42501',null,'non-PIC staff cannot delete group');
select extensions.lives_ok($$select public.search_job_documents(current_setting('test.group_job')::uuid)$$,'staff can read display metadata; Google still controls file access');
select set_config('request.jwt.claim.sub','f6600000-0000-4000-8000-000000000002',true);
select extensions.lives_ok($$select public.prepare_job_document_group(current_setting('test.group_job')::uuid,'PIC folder','pic-folder',gen_random_uuid())$$,'PIC can add a group');
do $$ declare i integer;g uuid; begin
  for i in 1..12 loop
    perform public.save_grouped_job_document_metadata(current_setting('test.group_job')::uuid,current_setting('test.group_folder')::uuid,'group-file-'||i,'','Grouped '||i,'application/pdf',12,'https://drive.google.com/file/d/group-file-'||i||'/view',current_setting('test.group_id')::uuid);
  end loop;
  for i in 1..11 loop
    perform public.save_grouped_job_document_metadata(current_setting('test.group_job')::uuid,current_setting('test.group_folder')::uuid,'root-file-'||i,'','Root '||i,'application/pdf',12,'https://drive.google.com/file/d/root-file-'||i||'/view');
    g:=(public.prepare_job_document_group(current_setting('test.group_job')::uuid,'Additional '||i,'additional-'||i,gen_random_uuid())->>'id')::uuid;
    perform public.complete_job_document_group(g);
  end loop;
end; $$;
select extensions.is((public.search_job_documents(current_setting('test.group_job')::uuid)->>'documentTotal')::integer,11,'root total includes only ungrouped documents');
select extensions.is(jsonb_array_length(public.search_job_documents(current_setting('test.group_job')::uuid)->'documents'),10,'root documents bounded to ten');
select extensions.is(jsonb_array_length(public.search_job_documents(current_setting('test.group_job')::uuid,null,2)->'documents'),1,'root second page covers records after ten');
select extensions.is((public.search_job_documents(current_setting('test.group_job')::uuid,current_setting('test.group_id')::uuid)->>'documentTotal')::integer,12,'group total counts only that group');
select extensions.is(jsonb_array_length(public.search_job_documents(current_setting('test.group_job')::uuid,current_setting('test.group_id')::uuid,2)->'documents'),2,'group second page includes remaining files');
select extensions.is(jsonb_array_length(public.search_job_documents(current_setting('test.group_job')::uuid)->'groups'),10,'group list bounded to ten');
select extensions.is(jsonb_array_length(public.search_job_documents(current_setting('test.group_job')::uuid,null,1,2)->'groups'),3,'group pagination includes all remaining folders');
select extensions.is((select (g->>'document_count')::integer from jsonb_array_elements((public.search_job_documents(current_setting('test.group_job')::uuid)->'groups')||(public.search_job_documents(current_setting('test.group_job')::uuid,null,1,2)->'groups')) g where g->>'id'=current_setting('test.group_id')),12,'accordion count aggregated independently of document page');
select extensions.throws_ok($$select public.search_job_documents(current_setting('test.group_job2')::uuid,current_setting('test.group_id')::uuid)$$,'P0002',null,'cross-Job group page is rejected');
select extensions.throws_ok($$select public.prepare_job_document_group_trash(current_setting('test.group_id')::uuid,99)$$,'40001',null,'stale delete does not reserve group');
select extensions.lives_ok($$select public.prepare_job_document_group_trash(current_setting('test.group_id')::uuid,2)$$,'group delete reservation succeeds');
select extensions.lives_ok($$select public.prepare_job_document_group_trash(current_setting('test.group_id')::uuid,2)$$,'retry reuses same delete version');
select extensions.throws_ok($$select public.save_grouped_job_document_metadata(current_setting('test.group_job')::uuid,current_setting('test.group_folder')::uuid,'during-delete','','Blocked','application/pdf',12,'https://drive.google.com/file/d/blocked/view',current_setting('test.group_id')::uuid)$$,'55000',null,'deleting group blocks new uploads');
select extensions.lives_ok($$select public.finish_job_document_group_trash(current_setting('test.group_id')::uuid,2)$$,'group archival hides its own documents');
select extensions.lives_ok($$select public.finish_job_document_group_trash(current_setting('test.group_id')::uuid,2)$$,'group trash completion is idempotent');
select extensions.is((select count(*)::integer from public.job_documents where group_id=current_setting('test.group_id')::uuid and archived_at is null),0,'all group files hidden after trash');
select extensions.is((public.search_job_documents(current_setting('test.group_job')::uuid)->>'documentTotal')::integer,11,'group deletion does not change root documents');
select extensions.is((public.search_job_documents(current_setting('test.group_job')::uuid)->>'groupTotal')::integer,12,'trashed group excluded from active list');
select set_config('request.jwt.claim.sub','f6600000-0000-4000-8000-000000000001',true);
select set_config('test.group_manifest',public.prepare_job_deletion(current_setting('test.group_job')::uuid,1,'Group Test Job')::text,true);
select extensions.is((public.job_deletion_impact(current_setting('test.group_job')::uuid,1)->>'groups')::integer,13,'Job impact includes active and trashed groups');
select extensions.is(jsonb_array_length(current_setting('test.group_manifest')::jsonb->'folders'),14,'Job cleanup includes root, active, pending and trashed groups');
select extensions.is(jsonb_array_length(current_setting('test.group_manifest')::jsonb->'files'),23,'Job cleanup includes both active and trashed grouped files');
select extensions.ok(exists(select 1 from jsonb_array_elements(current_setting('test.group_manifest')::jsonb->'files') f where f->>'folderId'='group-subfolder'),'grouped file cleanup uses its actual parent');
select extensions.is(current_setting('test.group_manifest')::jsonb->'folders'->13->>'id','group-root','child groups precede root cleanup');
select extensions.throws_ok($$select public.prepare_job_document_group(current_setting('test.group_job')::uuid,'After deletion','bad',gen_random_uuid())$$,'55000',null,'pending Job blocks folder creation');
select extensions.throws_ok($$select public.complete_job_document_group((select id from public.job_document_groups where folder_name='PIC folder' and job_id=current_setting('test.group_job')::uuid))$$,'55000',null,'pending Job blocks folder completion');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select extensions.throws_ok($$select public.ack_deleted_drive_target('job',current_setting('test.group_job')::uuid,(current_setting('test.group_manifest')::jsonb->>'token')::uuid,'group-root',true)$$,'23503',null,'cannot checkpoint root before files and groups');
do $$ declare f jsonb; begin
  for f in select value from jsonb_array_elements(current_setting('test.group_manifest')::jsonb->'files') loop
    perform public.ack_deleted_drive_target('job',current_setting('test.group_job')::uuid,(current_setting('test.group_manifest')::jsonb->>'token')::uuid,f->>'id',false);
  end loop;
end; $$;
select extensions.throws_ok($$select public.ack_deleted_drive_target('job',current_setting('test.group_job')::uuid,(current_setting('test.group_manifest')::jsonb->>'token')::uuid,'group-root',true)$$,'23503',null,'root still requires group checkpoints after file cleanup');
do $$ declare f jsonb; begin
  for f in select value from jsonb_array_elements(current_setting('test.group_manifest')::jsonb->'folders') loop
    perform public.ack_deleted_drive_target('job',current_setting('test.group_job')::uuid,(current_setting('test.group_manifest')::jsonb->>'token')::uuid,f->>'id',true);
  end loop;
end; $$;
select extensions.lives_ok($$select public.finish_job_deletion(current_setting('test.group_job')::uuid,(current_setting('test.group_manifest')::jsonb->>'token')::uuid,'f6600000-0000-4000-8000-000000000001')$$,'hard delete completes after nested cleanup');
select extensions.is((select count(*)::integer from public.job_document_groups where job_id=current_setting('test.group_job')::uuid),0,'no group metadata survives hard-deleted Job');
select extensions.is((select count(*)::integer from public.jobs where id=current_setting('test.group_job2')::uuid),1,'other Job preserved');
select extensions.finish();
rollback;
