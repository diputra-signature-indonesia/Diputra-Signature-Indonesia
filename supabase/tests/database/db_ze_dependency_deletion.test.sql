-- Self-contained, rolled back fixtures; never deletes real local/Production data.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('f6500000-0000-4000-8000-000000000001','authenticated','authenticated','delete-admin@example.test',now(),now()),
 ('f6500000-0000-4000-8000-000000000002','authenticated','authenticated','delete-staff@example.test',now(),now()),
 ('f6500000-0000-4000-8000-000000000003','authenticated','authenticated','delete-inactive@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
 ('f6500000-0000-4000-8000-000000000001','delete-admin@example.test','Deletion Admin','admin',true),
 ('f6500000-0000-4000-8000-000000000002','delete-staff@example.test','Deletion Staff','staff',true),
 ('f6500000-0000-4000-8000-000000000003','delete-inactive@example.test','Deletion Inactive','admin',false);
insert into public.clients(id,client_type,name,created_by,updated_by) values
 ('f6500000-0000-4000-8000-000000000004','COMPANY','Deletion Client','f6500000-0000-4000-8000-000000000001','f6500000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6500000-0000-4000-8000-000000000001',true);
select set_config('test.del_category',public.save_internal_service_category_state(null,null,'DEL_CATEGORY','Deletion Category',true)::text,true);
select set_config('test.del_workflow',public.save_workflow_template(null,null,'DEL_WORKFLOW','Deletion Workflow',null,'[{"name":"First"}]',true)::text,true);
select set_config('test.del_service',public.save_categorized_internal_service(null,null,current_setting('test.del_category')::uuid,'SERVICE','Deletion Service',null,current_setting('test.del_workflow')::uuid,true)::text,true);
select set_config('test.del_priority',public.save_priority(null,null,'DEL_PRIORITY','Deletion Priority','#111111',80,true)::text,true);
select set_config('test.del_job_status',public.save_job_status(null,null,'DEL_STATUS','Deletion Status','#111111',80,true)::text,true);
select set_config('test.del_task_status',public.save_task_status(null,null,'DEL_TASK','Deletion Task Status','#111111',80,true)::text,true);
select set_config('test.del_title',public.save_job_title(null,null,'DEL_TITLE','Deletion Title',80,true)::text,true);

select extensions.is(public.remove_master_data('internal-service-categories',current_setting('test.del_category')::uuid,1),'deactivated','used category deactivates rather than refusing removal');
select extensions.is(public.search_admin_lookup('internal_categories','Deletion Category'),'[]'::jsonb,'inactive category excluded from new selections');
select extensions.is(jsonb_array_length(public.search_admin_lookup('internal_category_filters','Deletion Category')),1,'inactive categories remain available in historical catalogue filters');
select extensions.is(jsonb_array_length(public.search_admin_lookup('internal_categories','',current_setting('test.del_category')::uuid)),1,'existing selected inactive category resolves');
select extensions.throws_ok($$select public.save_categorized_internal_service(null,null,current_setting('test.del_category')::uuid,'FORBIDDEN','New forbidden service')$$,'55000','Category is inactive.','new service cannot use an inactive category');
select extensions.lives_ok($$select public.save_internal_service_category_state(current_setting('test.del_category')::uuid,2,'DEL_CATEGORY','Deletion Category',true)$$,'used category can be reactivated without changing its name/prefix');
select extensions.throws_ok($$select public.save_internal_service_category_state(current_setting('test.del_category')::uuid,3,'CHANGED','Deletion Category',true)$$,'23503',null,'used category prefix stays locked');

select set_config('test.del_job',public.create_job(p_client_id=>'f6500000-0000-4000-8000-000000000004',p_title=>'Deletion Job',p_internal_service_id=>current_setting('test.del_service')::uuid,p_priority_id=>'21000000-0000-4000-8000-000000000001',p_pic_id=>'f6500000-0000-4000-8000-000000000001')::text,true);
select set_config('test.del_task',public.create_task(p_job_id=>current_setting('test.del_job')::uuid,p_title=>'Deletion Task',p_assignee_id=>'f6500000-0000-4000-8000-000000000002',p_priority_id=>current_setting('test.del_priority')::uuid)::text,true);
select set_config('test.del_sop',public.save_sop(current_setting('test.del_service')::uuid,'Deletion SOP',null)::text,true);
select set_config('test.del_folder',public.save_job_drive_folder(current_setting('test.del_job')::uuid,'fake-shared-drive','fake-job-folder','Deletion Job','https://drive.google.com/drive/folders/fake-job-folder')::text,true);
select public.save_job_document_metadata(current_setting('test.del_job')::uuid,current_setting('test.del_folder')::uuid,'fake-job-file',null,'test.pdf','application/pdf',128,'https://drive.google.com/file/d/fake-job-file/view');
select set_config('test.del_sop_folder',public.save_sop_drive_folder(current_setting('test.del_sop')::uuid,'fake-shared-drive','fake-sop-folder','Deletion SOP','https://drive.google.com/drive/folders/fake-sop-folder')::text,true);
select public.save_sop_drive_file_metadata(current_setting('test.del_sop')::uuid,current_setting('test.del_sop_folder')::uuid,'FLOW','Deletion Flow','flow.pdf','application/pdf',128,0,'fake-sop-file',null,'https://drive.google.com/file/d/fake-sop-file/view');
reset role;
update public.jobs set status_id=current_setting('test.del_job_status')::uuid where id=current_setting('test.del_job')::uuid;
insert into public.job_task_statuses(job_id,task_status_id,column_order,created_by,updated_by)
values(current_setting('test.del_job')::uuid,current_setting('test.del_task_status')::uuid,80,'f6500000-0000-4000-8000-000000000001','f6500000-0000-4000-8000-000000000001');
update public.team_members set job_title_id=current_setting('test.del_title')::uuid,is_visible=false where profile_id='f6500000-0000-4000-8000-000000000002';
insert into public.review_requests(id,token_hash,client_id,job_id,used_at,created_by) values
 ('f6500000-0000-4000-8000-000000000005',repeat('a',64),'f6500000-0000-4000-8000-000000000004',current_setting('test.del_job')::uuid,now(),'f6500000-0000-4000-8000-000000000001'),
 ('f6500000-0000-4000-8000-000000000006',repeat('b',64),'f6500000-0000-4000-8000-000000000004',current_setting('test.del_job')::uuid,null,'f6500000-0000-4000-8000-000000000001');
insert into public.reviews(id,review_request_id,name,message,client_id,job_id) values
 ('f6500000-0000-4000-8000-000000000007','f6500000-0000-4000-8000-000000000005','Retained reviewer','Retained review body','f6500000-0000-4000-8000-000000000004',current_setting('test.del_job')::uuid);
set local role authenticated;
select extensions.is(public.remove_master_data('priorities',current_setting('test.del_priority')::uuid,1),'deactivated','task-only priority usage blocks hard deletion');
select extensions.is(public.remove_master_data('job-statuses',current_setting('test.del_job_status')::uuid,1),'deactivated','used custom Job status deactivates');
select extensions.is(public.remove_master_data('task-statuses',current_setting('test.del_task_status')::uuid,1),'deactivated','unused board column still references global Task status');
select extensions.is(public.remove_master_data('job-titles',current_setting('test.del_title')::uuid,1),'deactivated','hidden team member still references title');
select extensions.is(public.remove_master_data('workflow-templates',current_setting('test.del_workflow')::uuid,1),'deactivated','workflow used by service/Job/history deactivates');
select extensions.is(public.prepare_internal_service_deletion(current_setting('test.del_service')::uuid,1)->>'result','deactivated','service referenced by Job deactivates; SOP stays');
select extensions.is((public.search_internal_services('Deletion Service')->'rows'->0->>'reference_count')::integer,1,'SOP is not an external service reference');
select extensions.is((public.admin_master_page('priorities','Deletion Priority')->'rows'->0->>'referenceCount')::integer,1,'bounded master projection includes task usage');
select extensions.ok((public.admin_master_page('workflow-templates','Deletion Workflow',1,true)->'rows'->0->>'referenceCount')::integer>=3,'template counts service, Job and historical step references');
select extensions.throws_ok($$select public.remove_master_data('job-statuses',(select id from public.job_statuses where code='NOT_STARTED'),1)$$,'55000','System data must remain active.','system status cannot be deleted even when unused');
select extensions.throws_ok($$select public.prepare_job_deletion(current_setting('test.del_job')::uuid,99,'Deletion Job')$$,'40001',null,'stale delete cannot reserve or mutate Drive');
select extensions.throws_ok($$select public.prepare_job_deletion(current_setting('test.del_job')::uuid,1,'Deletion Client')$$,'22023',null,'client name is not a permanent-delete confirmation');
select extensions.is((public.job_deletion_impact(current_setting('test.del_job')::uuid,1)->>'tasks')::integer,1,'impact counts actual task');
select extensions.is((public.job_deletion_impact(current_setting('test.del_job')::uuid,1)->>'reviews')::integer,1,'impact distinguishes retained reviews');
select set_config('test.del_job_manifest',public.prepare_job_deletion(current_setting('test.del_job')::uuid,1,'Deletion Job')::text,true);
select extensions.is(public.prepare_job_deletion(current_setting('test.del_job')::uuid,1,'Deletion Job')->>'token',current_setting('test.del_job_manifest')::jsonb->>'token','retry preserves durable deletion token');
select extensions.is(current_setting('test.del_job_manifest')::jsonb->'files'->0->>'id','fake-job-file','reservation returns trusted mapped Drive file');
select extensions.ok((public.job_deletion_impact(current_setting('test.del_job')::uuid,1)->>'pending')::boolean,'pending state is visible to delete modal');
select extensions.throws_ok($$select public.create_task(p_job_id=>current_setting('test.del_job')::uuid,p_title=>'Forbidden')$$,'55000',null,'new tasks blocked during external cleanup');
select extensions.throws_ok($$select public.trash_job(current_setting('test.del_job')::uuid,1,'Deletion Job')$$,'55000',null,'pending direct delete cannot be converted to Trash');
select extensions.ok(not has_function_privilege('authenticated','public.finish_job_deletion(uuid,uuid,uuid)','EXECUTE'),'browser cannot finalize before Drive cleanup');
select set_config('request.jwt.claim.sub','f6500000-0000-4000-8000-000000000002',true);
select extensions.throws_ok($$select public.job_deletion_impact(current_setting('test.del_job')::uuid,1)$$,'42501',null,'staff cannot load deletion impact');
select extensions.throws_ok($$select public.prepare_job_deletion(current_setting('test.del_job')::uuid,1,'Deletion Job')$$,'42501',null,'staff cannot prepare deletion');
select extensions.throws_ok($$select public.remove_master_data('priorities',current_setting('test.del_priority')::uuid,2)$$,'42501',null,'staff cannot remove master data');
select set_config('request.jwt.claim.sub','f6500000-0000-4000-8000-000000000003',true);
select extensions.throws_ok($$select public.prepare_internal_service_deletion(current_setting('test.del_service')::uuid,2)$$,'42501',null,'inactive admin denied');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select extensions.throws_ok($$select public.finish_job_deletion(current_setting('test.del_job')::uuid,'f6500000-0000-4000-8000-000000000099','f6500000-0000-4000-8000-000000000001')$$,'40001',null,'wrong finalization token denied');
select extensions.throws_ok($$select public.finish_job_deletion(current_setting('test.del_job')::uuid,(current_setting('test.del_job_manifest')::jsonb->>'token')::uuid,'f6500000-0000-4000-8000-000000000001')$$,'55000','External cleanup is incomplete.','cannot finalize while external targets remain');
select extensions.throws_ok($$select public.ack_deleted_drive_target('job',current_setting('test.del_job')::uuid,'f6500000-0000-4000-8000-000000000099','fake-job-file',false)$$,'40001',null,'wrong token cannot checkpoint deleted file');
select extensions.throws_ok($$select public.ack_deleted_drive_target('job',current_setting('test.del_job')::uuid,(current_setting('test.del_job_manifest')::jsonb->>'token')::uuid,'fake-job-folder',true)$$,'23503',null,'folder checkpoint requires child file checkpoints first');
select public.ack_deleted_drive_target('job',current_setting('test.del_job')::uuid,(current_setting('test.del_job_manifest')::jsonb->>'token')::uuid,'fake-job-file',false);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6500000-0000-4000-8000-000000000001',true);
select extensions.is(jsonb_array_length(public.prepare_job_deletion(current_setting('test.del_job')::uuid,1,'Deletion Job')->'files'),0,'retry manifest excludes files already cleaned');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select public.ack_deleted_drive_target('job',current_setting('test.del_job')::uuid,(current_setting('test.del_job_manifest')::jsonb->>'token')::uuid,'fake-job-folder',true);
select extensions.lives_ok($$select public.finish_job_deletion(current_setting('test.del_job')::uuid,(current_setting('test.del_job_manifest')::jsonb->>'token')::uuid,'f6500000-0000-4000-8000-000000000001')$$,'active Job can hard delete without Trash after server cleanup');
select extensions.is((select count(*)::integer from public.jobs where id=current_setting('test.del_job')::uuid),0,'Job gone');
select extensions.is((select count(*)::integer from public.tasks where job_id=current_setting('test.del_job')::uuid)+(select count(*)::integer from public.job_activity_logs where job_id=current_setting('test.del_job')::uuid)+(select count(*)::integer from public.job_documents where job_id=current_setting('test.del_job')::uuid)+(select count(*)::integer from public.job_contributors where job_id=current_setting('test.del_job')::uuid),0,'task/log/document/contributor graph removed');
select extensions.ok((select job_id is null and message='Retained review body' and client_id='f6500000-0000-4000-8000-000000000004' from public.reviews where id='f6500000-0000-4000-8000-000000000007'),'review and client association preserved');
select extensions.ok((select job_id is null and revoked_at is not null from public.review_requests where id='f6500000-0000-4000-8000-000000000006'),'unused review link revoked and detached');
select extensions.ok((select job_id is null and revoked_at is null and used_at is not null from public.review_requests where id='f6500000-0000-4000-8000-000000000005'),'used review request retained without artificial revocation');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6500000-0000-4000-8000-000000000001',true);
select extensions.is(public.remove_master_data('priorities',current_setting('test.del_priority')::uuid,2),'deleted','previously inactive priority can now hard delete');
select extensions.is(public.remove_master_data('job-statuses',current_setting('test.del_job_status')::uuid,2),'deleted','previously inactive custom Job status can now hard delete');
select extensions.is(public.remove_master_data('task-statuses',current_setting('test.del_task_status')::uuid,2),'deleted','previously inactive custom Task status can now hard delete');
select set_config('test.del_service_manifest',public.prepare_internal_service_deletion(current_setting('test.del_service')::uuid,2)::text,true);
select extensions.is(current_setting('test.del_service_manifest')::jsonb->>'result','prepared','SOP no longer blocks unused service hard delete');
select extensions.is(current_setting('test.del_service_manifest')::jsonb->'files'->0->>'id','fake-sop-file','service reservation includes SOP file');
select extensions.is(public.prepare_internal_service_deletion(current_setting('test.del_service')::uuid,2)->>'token',current_setting('test.del_service_manifest')::jsonb->>'token','service cleanup reservation is retry-safe');
select extensions.throws_ok($$select public.save_sop(current_setting('test.del_service')::uuid,'Forbidden',(select version from public.sops where id=current_setting('test.del_sop')::uuid))$$,'55000',null,'SOP edits blocked during service cleanup');
select extensions.throws_ok($$select public.create_job(p_client_id=>'f6500000-0000-4000-8000-000000000004',p_title=>'Forbidden',p_internal_service_id=>current_setting('test.del_service')::uuid,p_priority_id=>'21000000-0000-4000-8000-000000000001')$$,'23503',null,'new Job cannot reference deletion-pending service');
reset role;
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select extensions.throws_ok($$select public.finish_internal_service_deletion(current_setting('test.del_service')::uuid,(current_setting('test.del_service_manifest')::jsonb->>'token')::uuid,'f6500000-0000-4000-8000-000000000001')$$,'55000','External cleanup is incomplete.','SOP finalization requires external cleanup');
select public.ack_deleted_drive_target('sop',current_setting('test.del_service')::uuid,(current_setting('test.del_service_manifest')::jsonb->>'token')::uuid,'fake-sop-file',false);
select public.ack_deleted_drive_target('sop',current_setting('test.del_service')::uuid,(current_setting('test.del_service_manifest')::jsonb->>'token')::uuid,'fake-sop-folder',true);
select extensions.lives_ok($$select public.finish_internal_service_deletion(current_setting('test.del_service')::uuid,(current_setting('test.del_service_manifest')::jsonb->>'token')::uuid,'f6500000-0000-4000-8000-000000000001')$$,'server can finalize owned SOP/service deletion');
select extensions.is((select count(*)::integer from public.internal_services where id=current_setting('test.del_service')::uuid)+(select count(*)::integer from public.sops where id=current_setting('test.del_sop')::uuid)+(select count(*)::integer from public.sop_files where sop_id=current_setting('test.del_sop')::uuid)+(select count(*)::integer from public.sop_drive_folders where sop_id=current_setting('test.del_sop')::uuid),0,'service and owned SOP graph gone');
reset role;
update public.team_members set job_title_id=null where profile_id='f6500000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select extensions.is(public.remove_master_data('job-titles',current_setting('test.del_title')::uuid,2),'deleted','title hard deletes once hidden member no longer uses it');
select extensions.is(public.remove_master_data('workflow-templates',current_setting('test.del_workflow')::uuid,2),'deleted','template and owned steps hard delete once all external references gone');
select extensions.is(public.remove_master_data('internal-service-categories',current_setting('test.del_category')::uuid,3),'deleted','category hard deletes once last internal service gone');
reset role;
select extensions.is((select count(*)::integer from public.clients where id='f6500000-0000-4000-8000-000000000004'),1,'client retained');
select extensions.is((select count(*)::integer from public.profiles where id in ('f6500000-0000-4000-8000-000000000001','f6500000-0000-4000-8000-000000000002')),2,'user accounts retained');
select extensions.ok(not has_function_privilege('anon','public.prepare_job_deletion(uuid,integer,text)','EXECUTE'),'anonymous prepare denied');
select extensions.ok(not has_function_privilege('authenticated','public.finish_internal_service_deletion(uuid,uuid,uuid)','EXECUTE'),'browser cannot bypass SOP file cleanup');
select extensions.finish();
rollback;
