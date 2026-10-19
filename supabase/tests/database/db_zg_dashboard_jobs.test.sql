-- Isolated local fixtures; all data changes roll back at the end.
begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();
insert into auth.users(id,aud,role,email,created_at,updated_at)
select ('f6700000-0000-4000-8000-'||lpad(g::text,12,'0'))::uuid,'authenticated','authenticated','dashboard-'||g||'@example.test',now(),now() from generate_series(1,4) g;
insert into public.profiles(id,email,display_name,role,is_active) values
 ('f6700000-0000-4000-8000-000000000001','dashboard-1@example.test','Dashboard Owner','admin',true),
 ('f6700000-0000-4000-8000-000000000002','dashboard-2@example.test','Dashboard Assignee','staff',true),
 ('f6700000-0000-4000-8000-000000000003','dashboard-3@example.test',null,'staff',true),
 ('f6700000-0000-4000-8000-000000000004','dashboard-4@example.test','Dashboard Inactive','staff',false);
insert into public.clients(id,client_type,name,created_by,updated_by) values
 ('f6700000-0000-4000-8000-000000000005','COMPANY','Dashboard Test Client','f6700000-0000-4000-8000-000000000001','f6700000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','f6700000-0000-4000-8000-000000000001',true);
select set_config('test.dash_workflow',public.save_workflow_template(null,null,'DASH_TEST','Dashboard Test Workflow',null,'[{"name":"First"},{"name":"Second"}]',true)::text,true);
select set_config('test.dash_service',public.save_internal_service(null,null,'DASH_TEST','Dashboard Test Service',null,current_setting('test.dash_workflow')::uuid,true)::text,true);
select set_config('test.dash_cancelled',public.save_job_status(null,null,'CANCELLED','Cancelled','#64748B',90,true)::text,true);
select set_config('test.dash_jobs',jsonb_agg(public.create_job(
  p_client_id=>'f6700000-0000-4000-8000-000000000005',p_title=>'Dashboard Job '||g,
  p_internal_service_id=>current_setting('test.dash_service')::uuid,
  p_priority_id=>'21000000-0000-4000-8000-000000000001',
  p_pic_id=>case when g=5 then null when g=6 then 'f6700000-0000-4000-8000-000000000002'::uuid else 'f6700000-0000-4000-8000-000000000001'::uuid end
) order by g)::text,true) from generate_series(0,8) g;
select public.create_task(p_job_id=>(current_setting('test.dash_jobs')::jsonb->>1)::uuid,p_title=>'Dashboard Task '||g,
  p_assignee_id=>'f6700000-0000-4000-8000-000000000002',p_due_date=>(now() at time zone 'Asia/Makassar')::date-30) from generate_series(1,12) g;
select public.create_task(p_job_id=>(current_setting('test.dash_jobs')::jsonb->>1)::uuid,p_title=>'Dashboard Deleted Task',p_assignee_id=>'f6700000-0000-4000-8000-000000000002');
select public.create_task(p_job_id=>(current_setting('test.dash_jobs')::jsonb->>1)::uuid,p_title=>'Dashboard Unassigned Task');
select public.create_task(p_job_id=>(current_setting('test.dash_jobs')::jsonb->>2)::uuid,p_title=>'Dashboard Fallback Task',p_assignee_id=>'f6700000-0000-4000-8000-000000000003');
select public.create_task(p_job_id=>(current_setting('test.dash_jobs')::jsonb->>6)::uuid,p_title=>'Dashboard Owner Task',p_assignee_id=>'f6700000-0000-4000-8000-000000000001');
select public.create_task(p_job_id=>(current_setting('test.dash_jobs')::jsonb->>4)::uuid,p_title=>'Dashboard Trash Task',p_assignee_id=>'f6700000-0000-4000-8000-000000000002');
reset role;
-- The default Task board has only three columns; add the optional hold column.
insert into public.job_task_statuses(job_id,task_status_id,column_order,created_by,updated_by)
values((current_setting('test.dash_jobs')::jsonb->>1)::uuid,'23000000-0000-4000-8000-000000000003',40,
  'f6700000-0000-4000-8000-000000000001','f6700000-0000-4000-8000-000000000001');
update public.tasks t set job_task_status_id=cs.id
from public.job_task_statuses cs join public.task_statuses ts on ts.id=cs.task_status_id
where t.job_id=(current_setting('test.dash_jobs')::jsonb->>1)::uuid and cs.job_id=t.job_id
  and ts.code=case t.title when 'Dashboard Task 1' then 'IN_PROGRESS' when 'Dashboard Task 2' then 'ON_HOLD' when 'Dashboard Task 3' then 'COMPLETED' end;
update public.tasks set deleted_at=now(),deleted_by='f6700000-0000-4000-8000-000000000001'
where job_id=(current_setting('test.dash_jobs')::jsonb->>1)::uuid and title='Dashboard Deleted Task';
update public.jobs j set
  status_id=case e.n when 1 then '22000000-0000-4000-8000-000000000002'::uuid
    when 2 then '22000000-0000-4000-8000-000000000003'::uuid
    when 3 then '22000000-0000-4000-8000-000000000005'::uuid
    when 6 then '22000000-0000-4000-8000-000000000004'::uuid
    when 7 then current_setting('test.dash_cancelled')::uuid else '22000000-0000-4000-8000-000000000001'::uuid end,
  estimated_end_date=(now() at time zone 'Asia/Makassar')::date+case e.n when 0 then 3 when 1 then 0 when 2 then -1 when 3 then -1 when 4 then -1 when 5 then null when 6 then 15 when 7 then -1 when 8 then 8 end,
  archived_at=case when e.n=4 then now() end,
  archived_by=case when e.n=4 then 'f6700000-0000-4000-8000-000000000001'::uuid end
from (select value::uuid as id,ordinality-1 as n from jsonb_array_elements_text(current_setting('test.dash_jobs')::jsonb) with ordinality) e
where j.id=e.id;
update public.job_steps set is_completed=true,completed_at=now(),completed_by='f6700000-0000-4000-8000-000000000001'
where job_id=(current_setting('test.dash_jobs')::jsonb->>1)::uuid and position=1;

set local role authenticated;
select set_config('request.jwt.claim.sub','f6700000-0000-4000-8000-000000000002',true);
select set_config('test.dash_filters',jsonb_build_object('internalService',current_setting('test.dash_service'))::text,true);
select set_config('test.dash_result',public.search_admin_dashboard(current_setting('test.dash_filters')::jsonb)::text,true);
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'active')::integer,6,'Active card counts Jobs, including Jobs with no Tasks');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'not_started')::integer,3,'Not started card uses Job status');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'in_progress')::integer,1,'Many Tasks do not multiply the Job in-progress count');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'delayed')::integer,2,'On hold and obstacle Jobs are delayed');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'completed')::integer,1,'Completed card uses Job status');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'near_deadline')::integer,1,'Job estimated end date sets next-seven-days count');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'due_today')::integer,1,'Job estimated end date sets due-today count');
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'overdue')::integer,1,'Completed, cancelled and Trash Jobs excluded from deadline alerts');
select extensions.is((current_setting('test.dash_result')::jsonb->'internalServices'->0->>'value')::integer,8,'Diagram includes completed/cancelled Jobs but excludes Trash');
select extensions.is(jsonb_array_length(current_setting('test.dash_result')::jsonb->'attention'),4,'Attention lists distinct Jobs, not their Tasks');
select extensions.ok(exists(select 1 from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'attention') a where a->>'title'='Dashboard Job 0'),'A Job with no Tasks can require attention');
select extensions.ok(not exists(select 1 from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'attention') a where a->>'title' in ('Dashboard Job 3','Dashboard Job 4','Dashboard Job 7','Dashboard Job 8')),'Completed, Trash, cancelled and far-future normal Jobs not in attention');
select extensions.is((select (a->>'progress')::integer from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'attention') a where a->>'title'='Dashboard Job 1'),50,'Attention progress derives from Job workflow steps');
select extensions.is((select a->>'pic_name' from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'attention') a where a->>'title'='Dashboard Job 1'),'Dashboard Owner','Attention PIC is the Job owner, not the Task assignee');
select extensions.ok(not exists(select 1 from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'attention') a where a->>'id' is distinct from a->>'job_id' or a->>'pic_name' is distinct from a->>'assignee_name'),'Legacy attention aliases remain compatible during app deployment');
select extensions.is((select (a->>'notStarted')::integer from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='f6700000-0000-4000-8000-000000000002'),9,'Task workload excludes completed, deleted and Trash-parent Tasks');
select extensions.is((select (a->>'inProgress')::integer from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='f6700000-0000-4000-8000-000000000002'),1,'Task workload uses Task in-progress status');
select extensions.is((select (a->>'delayed')::integer from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='f6700000-0000-4000-8000-000000000002'),1,'Task workload uses Task hold status');
select extensions.is((select a->>'name' from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='f6700000-0000-4000-8000-000000000002'),'Dashboard Assignee','Workload displays profile display name');
select extensions.is((select a->>'name' from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='f6700000-0000-4000-8000-000000000003'),'dashboard-3@example.test','Missing display name falls back to email');
select extensions.is((select a->>'name' from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='UNASSIGNED'),'Belum ditugaskan','Unassigned Task workload stays visible');
select extensions.ok(exists(select 1 from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'statuses') s where s->>'value'='22000000-0000-4000-8000-000000000002'),'Filter options use Job status IDs');
select extensions.ok(not exists(select 1 from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'statuses') s where s->>'value'='23000000-0000-4000-8000-000000000002'),'Task status IDs are not used in the Job filter');

select set_config('test.dash_result',public.search_admin_dashboard(current_setting('test.dash_filters')::jsonb||'{"pic":"f6700000-0000-4000-8000-000000000001"}')::text,true);
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'active')::integer,5,'PIC filters Job panels by owner');
select extensions.is((current_setting('test.dash_result')::jsonb->'internalServices'->0->>'value')::integer,7,'Owner filter still includes owned completed/cancelled Jobs in diagram');
select extensions.is(jsonb_array_length(current_setting('test.dash_result')::jsonb->'taskLoads'),1,'PIC filters workload by Task assignee');
select extensions.is((current_setting('test.dash_result')::jsonb->'taskLoads'->0->>'notStarted')::integer,1,'Assigned Task remains even when its Job is owned by another user');
select set_config('test.dash_result',public.search_admin_dashboard(current_setting('test.dash_filters')::jsonb||'{"status":"22000000-0000-4000-8000-000000000002"}')::text,true);
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'active')::integer,1,'Status filter selects Jobs by Job status');
select extensions.is((select sum((a->>'notStarted')::integer)::integer from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a),10,'Workload follows parent Job status without changing Task status groups');
select set_config('test.dash_result',public.search_admin_dashboard(current_setting('test.dash_filters')::jsonb||jsonb_build_object('dateFrom',(now() at time zone 'Asia/Makassar')::date,'dateTo',(now() at time zone 'Asia/Makassar')::date+7))::text,true);
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'active')::integer,2,'Date range filters Job estimated end date');
select extensions.is((select (a->>'notStarted')::integer from jsonb_array_elements(current_setting('test.dash_result')::jsonb->'taskLoads') a where a->>'id'='f6700000-0000-4000-8000-000000000002'),9,'Task due date does not override parent Job date range');
select set_config('test.dash_result',public.search_admin_dashboard(current_setting('test.dash_filters')::jsonb||'{"pic":"UNASSIGNED"}')::text,true);
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'active')::integer,0,'Unassigned filter does not match Jobs with a mandatory PIC');
select extensions.is((current_setting('test.dash_result')::jsonb->'taskLoads'->0->>'notStarted')::integer,1,'Unassigned workload filter uses null Task assignee');
select set_config('test.dash_result',public.search_admin_dashboard(current_setting('test.dash_filters')::jsonb||'{"client":"f6700000-0000-4000-8000-999999999999"}')::text,true);
select extensions.is((current_setting('test.dash_result')::jsonb->'counts'->>'active')::integer,0,'Empty scope returns zero counters');
select extensions.is(current_setting('test.dash_result')::jsonb->'attention','[]'::jsonb,'Empty scope returns empty attention rows');
select extensions.is(current_setting('test.dash_result')::jsonb->'taskLoads','[]'::jsonb,'Client filter also restricts Task workload');
select extensions.throws_ok($$select public.search_admin_dashboard('[]')$$,'22023','Invalid filters.','Non-object filters are rejected');
select extensions.throws_ok($$select public.search_admin_dashboard(null)$$,'22023','Invalid filters.','SQL null filters are rejected');
select set_config('request.jwt.claim.sub','f6700000-0000-4000-8000-000000000004',true);
select extensions.throws_ok($$select public.search_admin_dashboard()$$,'42501','Active staff access required.','Inactive staff cannot read dashboard');
reset role;
select extensions.ok(not has_function_privilege('anon','public.search_admin_dashboard(jsonb)','EXECUTE'),'Anonymous execution stays denied');
select extensions.ok(has_function_privilege('authenticated','public.search_admin_dashboard(jsonb)','EXECUTE'),'Authenticated execution is preserved');
select extensions.is((select provolatile::text from pg_proc where oid='public.search_admin_dashboard(jsonb)'::regprocedure),'s','Dashboard RPC remains STABLE/read-only');
select * from extensions.finish();
rollback;
