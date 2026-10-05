-- All fixture writes are rolled back. No Production or existing local data is changed.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
insert into auth.users(id,aud,role,email,created_at,updated_at) values
 ('f6300000-0000-4000-8000-000000000001','authenticated','authenticated','bounded-admin@example.test',now(),now()),
 ('f6300000-0000-4000-8000-000000000002','authenticated','authenticated','bounded-staff@example.test',now(),now()),
 ('f6300000-0000-4000-8000-000000000003','authenticated','authenticated','bounded-inactive@example.test',now(),now());
insert into public.profiles(id,email,display_name,role,is_active) values
 ('f6300000-0000-4000-8000-000000000001','bounded-admin@example.test','BPR Admin','admin',true),
 ('f6300000-0000-4000-8000-000000000002','bounded-staff@example.test','BPR Staff','staff',true),
 ('f6300000-0000-4000-8000-000000000003','bounded-inactive@example.test','BPR Inactive','staff',false);
insert into public.internal_services(id,workflow_template_id,code,name,is_active) values
 ('f6300000-0000-4000-8000-000000000004','24000000-0000-4000-8000-000000000001','BPR_SERVICE','BPR Service',true);
insert into public.clients(id,client_type,name,created_by,updated_by) values
 ('f6300000-0000-4000-8000-000000000005','COMPANY','BPR Client','f6300000-0000-4000-8000-000000000001','f6300000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6300000-0000-4000-8000-000000000001',true);
select set_config('test.bpr_job',public.create_job(p_client_id=>'f6300000-0000-4000-8000-000000000005',p_title=>'BPR JOB 0000',p_internal_service_id=>'f6300000-0000-4000-8000-000000000004',p_priority_id=>'21000000-0000-4000-8000-000000000001')::text,true);
reset role;
-- Clone only a fixture job, without pagination/draining any real data.
insert into public.jobs
select (jsonb_populate_record(null::public.jobs,to_jsonb(j)||jsonb_build_object('id',md5('bpr-job-'||g)::uuid,'title','BPR JOB '||lpad(g::text,4,'0'),'created_at',now()-g*interval '1 minute'))).*
from public.jobs j cross join generate_series(1,1075) g where j.id=current_setting('test.bpr_job')::uuid;
insert into public.internal_services(id,workflow_template_id,code,name,is_active)
select md5('bpr-service-'||g)::uuid,'24000000-0000-4000-8000-000000000001','BPR_SERVICE_'||g,'BPR Catalogue '||lpad(g::text,4,'0'),true from generate_series(1,1075) g;
insert into auth.users(id,aud,role,email,created_at,updated_at)
select md5('bpr-user-'||g)::uuid,'authenticated','authenticated','bpr-user-'||g||'@example.test',now(),now() from generate_series(1,25) g;
insert into public.profiles(id,email,display_name,role,is_active)
select md5('bpr-user-'||g)::uuid,'bpr-user-'||g||'@example.test','BPR User '||lpad(g::text,2,'0'),'staff',true from generate_series(1,25) g;
set local role authenticated;
select set_config('request.jwt.claim.sub','f6300000-0000-4000-8000-000000000001',true);
select extensions.is((public.search_admin_jobs('{"query":"BPR JOB","status":"ALL"}')->>'total')::integer,1076,'Jobs total is not capped at 1000');
select extensions.is(jsonb_array_length(public.search_admin_jobs('{"query":"BPR JOB","status":"ALL"}')->'rows'),10,'Jobs return ten joined rows');
select extensions.is((public.search_admin_jobs('{"query":"BPR JOB 1070","status":"ALL"}')->>'total')::integer,1,'Search finds a Job beyond first 1000');
select extensions.is(public.search_admin_jobs('{"query":"BPR JOB 1070","status":"ALL"}')->'rows'->0->>'client_name','BPR Client','Client label is joined without per-row requests');
select extensions.is((public.search_admin_jobs('{"query":"BPR JOB","status":"ALL"}',108)->>'page')::integer,108,'Can request Job page beyond initial result cap');
select extensions.is(jsonb_array_length(public.search_admin_jobs('{"query":"BPR JOB","status":"ALL"}',108)->'rows'),6,'Final Job page has accurate row count');
select extensions.is((public.search_admin_jobs(jsonb_build_object('query','BPR JOB','excludeJobId',current_setting('test.bpr_job'),'status','ALL'),1,null,'f6300000-0000-4000-8000-000000000005')->>'total')::integer,1075,'Related jobs exclude current Job in SQL and total');
select extensions.is((public.search_admin_jobs('{}',1,current_setting('test.bpr_job')::uuid)->>'total')::integer,1,'Single-job scope does not fetch company jobs');
select extensions.is(jsonb_array_length(public.search_admin_lookup('services','BPR Catalogue')),10,'Lookup choices are bounded');
select extensions.is(public.search_admin_lookup('services','',md5('bpr-service-1070')::uuid)->0->>'label','BPR Catalogue 1070','Selected ID resolves beyond first choices');
select extensions.is(jsonb_array_length(public.search_admin_lookup('jobs','BPR JOB',null,'f6300000-0000-4000-8000-000000000005')),10,'Review job options are client-scoped and bounded');
select extensions.is((public.search_sop_services('BPR Catalogue 1070')->>'total')::integer,1,'SOP search covers full catalogue');
select extensions.is(jsonb_array_length(public.search_sop_services('BPR Catalogue')->'services'),10,'SOP catalogue returns ten rows');
select extensions.is((public.search_managed_profiles('BPR User')->>'total')::integer,25,'User search total includes all matches');
select extensions.is(jsonb_array_length(public.search_managed_profiles('BPR User')->'profiles'),10,'User page is bounded');
select extensions.is(jsonb_array_length(public.search_managed_profiles('BPR User',3)->'profiles'),5,'User final page is complete');
select extensions.is((public.admin_master_counts()->>'internal-services')::integer,(select count(*)::integer from public.internal_services),'Master badges use full SQL count');
select extensions.is((public.admin_master_page('workflow-templates','',1)->>'total')::integer,(select count(*)::integer from public.workflow_templates where is_active),'Master workflow count respects Trash view');
select extensions.ok(jsonb_array_length(public.admin_master_page('priorities')->'rows')<=10,'Master rows are bounded');
select extensions.lives_ok($$select public.admin_blog_categories()$$,'Blog categories SQL distinct executes');
select extensions.ok(jsonb_array_length(public.admin_public_service_page()->'categories')<=10,'Client Service categories are bounded');
select extensions.ok(jsonb_array_length(public.admin_public_service_page()->'details')=0,'Client Service details are not downloaded before opening modal');
-- A selected job receives 21 tasks, including a row beyond its initial task page.
select public.create_task(p_job_id=>current_setting('test.bpr_job')::uuid,p_title=>'BPR Task '||lpad(g::text,2,'0'),p_assignee_id=>'f6300000-0000-4000-8000-000000000002',p_priority_id=>'21000000-0000-4000-8000-000000000001',p_due_date=>(now() at time zone 'Asia/Makassar')::date) from generate_series(1,21) g;
select set_config('request.jwt.claim.sub','f6300000-0000-4000-8000-000000000002',true);
select extensions.is((public.search_my_tasks('{"query":"BPR JOB 0000"}')->>'taskTotal')::integer,21,'My Tasks total is selected-job scoped and complete');
select extensions.is(jsonb_array_length(public.search_my_tasks('{"query":"BPR JOB 0000"}')->'tasks'),10,'My Tasks selected page returns ten tasks');
select extensions.is(jsonb_array_length(public.search_my_tasks('{"query":"BPR JOB 0000"}',1,current_setting('test.bpr_job')::uuid,3)->'tasks'),1,'My Tasks final page is complete');
select extensions.is((public.search_my_tasks('{"query":"BPR Task 21"}')->>'taskTotal')::integer,1,'Task search includes tasks outside first page');
select extensions.is((select sum((s->>'count')::integer)::integer from jsonb_array_elements(public.search_my_tasks('{"query":"BPR JOB 0000"}')->'statuses') s),21,'Status badges aggregate entire selected job');
select extensions.is((public.search_my_tasks('{"query":"BPR JOB 0000"}')->'tasks'->0->>'assignee_name'),'BPR Staff','Assignee name is joined in task page');
select extensions.is((public.search_admin_dashboard('{"internalService":"f6300000-0000-4000-8000-000000000004"}')->'counts'->>'active')::integer,21,'Dashboard computes metrics in SQL, not from ten visible tasks');
select extensions.ok(jsonb_array_length(public.search_admin_dashboard('{"internalService":"f6300000-0000-4000-8000-000000000004"}')->'attention')<=10,'Dashboard raw attention list is bounded');
select extensions.is((public.search_admin_dashboard('{"internalService":"f6300000-0000-4000-8000-000000000004"}')->'internalServices'->0->>'value')::integer,21,'Dashboard service aggregate is accurate');
select extensions.throws_ok($$select public.search_managed_profiles()$$,'42501','Active admin access required.','Staff cannot read User Management projection');
select extensions.throws_ok($$select public.admin_public_service_page()$$,'42501','Active admin access required.','Staff cannot read private Client Service admin data');
select set_config('request.jwt.claim.sub','f6300000-0000-4000-8000-000000000003',true);
select extensions.throws_ok($$select public.search_admin_jobs()$$,'42501','Active staff access required.','Inactive staff cannot query jobs');
select extensions.throws_ok($$select public.admin_master_counts()$$,'42501','Active staff access required.','Inactive staff cannot query Master Data');
reset role;
select extensions.ok(not has_function_privilege('anon','public.search_admin_jobs(jsonb,integer,uuid,uuid,boolean)','EXECUTE'),'Anonymous cannot execute Jobs read RPC');
select extensions.ok(not has_function_privilege('anon','public.search_my_tasks(jsonb,integer,uuid,integer,uuid)','EXECUTE'),'Anonymous cannot execute My Tasks read RPC');
select extensions.ok(not has_function_privilege('anon','public.search_admin_dashboard(jsonb)','EXECUTE'),'Anonymous cannot execute Dashboard read RPC');
select extensions.ok(not has_function_privilege('anon','public.admin_master_page(text,text,integer,boolean)','EXECUTE'),'Anonymous cannot execute Master Data read RPC');
select extensions.ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='jobs_internal_service_idx'),'Service-reference counts have an index');

reset role;
-- Content lists also have independent, complete pagination at every level.
insert into public.services_categories
select (jsonb_populate_record(null::public.services_categories,to_jsonb(c)||jsonb_build_object('id',md5('bpr-category-'||g)::uuid,'slug','bpr-category-'||g,'title','BPR Public '||lpad(g::text,2,'0'),'sort_order',g))).*
from (select * from public.services_categories where deleted_at is null order by id limit 1) c cross join generate_series(1,21) g;
insert into public.services_items
select (jsonb_populate_record(null::public.services_items,to_jsonb(i)||jsonb_build_object('id',md5('bpr-item-'||g)::uuid,'category_id',md5('bpr-category-1')::uuid,'slug','bpr-item-'||g,'title','BPR Item '||lpad(g::text,2,'0'),'sort_order',g))).*
from (select * from public.services_items where deleted_at is null order by id limit 1) i cross join generate_series(1,21) g;
insert into public.services_item_details
select (jsonb_populate_record(null::public.services_item_details,to_jsonb(d)||jsonb_build_object('id',md5('bpr-detail-'||g)::uuid,'service_item_id',md5('bpr-item-1')::uuid,'title','BPR Detail '||lpad(g::text,2,'0'),'sort_order',g))).*
from (select * from public.services_item_details where deleted_at is null order by id limit 1) d cross join generate_series(1,21) g;
set local role authenticated;
select set_config('request.jwt.claim.sub','f6300000-0000-4000-8000-000000000001',true);
select extensions.is((public.admin_public_service_page(p_query=>'BPR Public')->>'categoryTotal')::integer,21,'Public Service category total includes every match');
select extensions.is(jsonb_array_length(public.admin_public_service_page(p_query=>'BPR Public',p_category_page=>3)->'categories'),1,'Public Service category page three contains last match');
select extensions.is((public.admin_public_service_page(p_category=>md5('bpr-category-1')::uuid)->>'itemTotal')::integer,21,'Sub-service count is full selected-category total');
select extensions.is(jsonb_array_length(public.admin_public_service_page(p_category=>md5('bpr-category-1')::uuid,p_item_page=>3)->'selected'->'items'),1,'Sub-service pagination includes final item');
select extensions.is((public.admin_public_service_page(p_category=>md5('bpr-category-1')::uuid,p_item=>md5('bpr-item-1')::uuid)->>'detailTotal')::integer,21,'Nested detail count includes all rows');
select extensions.is(jsonb_array_length(public.admin_public_service_page(p_category=>md5('bpr-category-1')::uuid,p_item=>md5('bpr-item-1')::uuid,p_detail_page=>3)->'details'),1,'Nested detail pagination includes final row');
select extensions.is((public.admin_public_service_page(p_category=>md5('bpr-category-1')::uuid,p_item=>md5('bpr-item-1')::uuid,p_detail_page=>1)->>'nextDetailOrder')::integer,31,'Add Detail order uses full scope max rather than visible page');
select extensions.lives_ok($$select public.search_admin_lookup('job_titles')$$,'Lazy Job Title lookup executes');
select extensions.lives_ok($$select public.search_admin_lookup('internal_categories')$$,'Lazy internal category lookup executes');
select extensions.lives_ok($$select public.search_admin_lookup('workflows')$$,'Lazy workflow lookup executes');
select extensions.is((public.search_admin_jobs('{"query":"BPR JOB","jobQuery":"BPR JOB 1070","status":"ALL"}')->>'total')::integer,1,'Both My Tasks search fields are combined, not overridden');
select extensions.is((public.search_admin_jobs('{"query":"BPR Task","jobQuery":"BPR JOB 0000","status":"ALL"}',1,null,null,true)->>'total')::integer,1,'Task query and Job List query combine correctly');
select extensions.lives_ok($$select public.search_job_remarks(current_setting('test.bpr_job')::uuid)$$,'Joined remark page executes for selected Job');

-- Pagination retains configured display ranks, not alphabetical names.
select extensions.is(
  (select jsonb_agg(r->>'id' order by n) from jsonb_array_elements(public.admin_master_page('job-titles')->'rows') with ordinality e(r,n)),
  (select jsonb_agg(id::text order by sort_order,name,id) from (select * from public.job_titles order by sort_order,name,id limit 10) t),
  'Master Job Title page preserves configured display order');
select * from extensions.finish();
rollback;
