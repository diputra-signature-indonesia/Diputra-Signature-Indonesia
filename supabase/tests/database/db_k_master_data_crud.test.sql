begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(41);

insert into auth.users(id, aud, role, email, created_at, updated_at)
values
  ('94000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'master-admin@example.test', now(), now()),
  ('94000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'master-staff@example.test', now(), now()),
  ('94000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'master-inactive@example.test', now(), now()),
  ('94000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'master-deleted@example.test', now(), now());

insert into public.profiles(id, email, display_name, role, is_active)
values
  ('94000000-0000-4000-8000-000000000001', 'master-admin@example.test', 'Master Admin', 'admin', true),
  ('94000000-0000-4000-8000-000000000002', 'master-staff@example.test', 'Master Staff', 'staff', true),
  ('94000000-0000-4000-8000-000000000003', 'master-inactive@example.test', 'Master Inactive', 'admin', false),
  ('94000000-0000-4000-8000-000000000004', 'master-deleted@example.test', 'Master Deleted', 'admin', false);

update public.profiles
set deleted_at = now()
where id = '94000000-0000-4000-8000-000000000004';

insert into public.services_categories(id, slug, title, type, is_published)
values ('94000000-0000-4000-8000-000000000005', 'master-private-category', 'Master Private Category', 'primary', false);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000002', true);

select extensions.throws_ok(
  $$ select public.save_job_status(null, null, 'STAFF_FORGED', 'Forged', '#111111', 60, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a Job status through the RPC'
);

select extensions.throws_ok(
  $$ select public.set_master_data_active('PRIORITY', '21000000-0000-4000-8000-000000000001', 1, false) $$,
  '42501',
  'Admin access required.',
  'staff cannot change Master Data lifecycle through the RPC'
);

select extensions.throws_ok(
  $$ update public.job_statuses set name = 'Forged' where code = 'NOT_STARTED' $$,
  '42501',
  null,
  'authenticated users cannot bypass RPCs with direct table updates'
);

select extensions.throws_ok(
  $$ select public.save_priority(null, null, 'STAFF_PRIORITY', 'Forged', '#111111', 60, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a Priority through the RPC'
);

select extensions.throws_ok(
  $$ select public.save_task_status(null, null, 'STAFF_TASK', 'Forged', '#111111', 60, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a Task status through the RPC'
);

select extensions.throws_ok(
  $$ select public.save_internal_service(null, null, 'STAFF_SERVICE', 'Forged', null, null, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create an Internal Service through the RPC'
);

select extensions.throws_ok(
  $$ select public.save_workflow_template(null, null, 'STAFF_FLOW', 'Forged', null, '[{"name":"FIRST"}]'::jsonb, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a Workflow through the RPC'
);

select extensions.is(
  (select count(*)::integer from public.services_categories where id = '94000000-0000-4000-8000-000000000005'),
  0,
  'staff cannot read unpublished landing-page Service Categories'
);

select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from public.services_categories where id = '94000000-0000-4000-8000-000000000005'),
  1,
  'admin can read unpublished landing-page Service Categories'
);

select extensions.results_eq(
  $$
    update public.services_categories
    set title = 'Must Stay Read Only'
    where id = '94000000-0000-4000-8000-000000000005'
    returning title
  $$,
  array[]::text[],
  'Service Categories remain read-only from the Master Data database role'
);
select set_config(
  'test.master_job_status_id',
  public.save_job_status(null, null, 'WAITING_VENDOR', 'Waiting Vendor', '#7C3AED', 60, true)::text,
  true
);

select extensions.is(
  (select code from public.job_statuses where id = current_setting('test.master_job_status_id')::uuid),
  'WAITING_VENDOR',
  'admin can create a custom Job status'
);

select extensions.is(
  (select is_system from public.job_statuses where id = current_setting('test.master_job_status_id')::uuid),
  false,
  'new Job statuses are never promoted to system records by client input'
);

select extensions.is(
  public.set_master_data_active('JOB_STATUS', current_setting('test.master_job_status_id')::uuid, 1, false),
  2,
  'deactivation uses optimistic locking and increments the version'
);

select extensions.is(
  (select is_active from public.job_statuses where id = current_setting('test.master_job_status_id')::uuid),
  false,
  'custom Job status is soft-deactivated instead of deleted'
);

select extensions.throws_ok(
  $$ select public.set_master_data_active('JOB_STATUS', '22000000-0000-4000-8000-000000000001', 1, false) $$,
  '55000',
  'System Job statuses must remain active.',
  'system Job statuses cannot be deactivated'
);

select set_config(
  'test.master_priority_id',
  public.save_priority(null, null, 'master_priority', 'Master Priority', '#AABBCC', 70, true)::text,
  true
);

select extensions.is(
  (select code from public.priorities where id = current_setting('test.master_priority_id')::uuid),
  'MASTER_PRIORITY',
  'Priority codes are normalized before storage'
);

select extensions.is(
  (select created_by from public.priorities where id = current_setting('test.master_priority_id')::uuid),
  '94000000-0000-4000-8000-000000000001'::uuid,
  'Priority actor is taken from auth.uid instead of client input'
);

select extensions.lives_ok(
  $$ select public.save_priority(current_setting('test.master_priority_id')::uuid, 1, 'IGNORED_CODE', 'Master Priority Updated', '#112233', 71, true) $$,
  'admin can update a custom Priority with the current version'
);

select extensions.is(
  (select code from public.priorities where id = current_setting('test.master_priority_id')::uuid),
  'MASTER_PRIORITY',
  'Priority code remains immutable during updates'
);

select extensions.is(
  (select version from public.priorities where id = current_setting('test.master_priority_id')::uuid),
  2,
  'Priority update increments its optimistic-lock version'
);

select extensions.throws_ok(
  $$ select public.save_priority(current_setting('test.master_priority_id')::uuid, 1, 'MASTER_PRIORITY', 'Stale', '#112233', 71, true) $$,
  '40001',
  'Stale priority version.',
  'stale Priority updates are rejected'
);

select extensions.throws_ok(
  $$ select public.set_master_data_active('PRIORITY', '21000000-0000-4000-8000-000000000001', 1, false) $$,
  '55000',
  'System priorities must remain active.',
  'system Priorities cannot be deactivated'
);

select set_config(
  'test.master_task_status_id',
  public.save_task_status(null, null, 'WAITING_REVIEW', 'Waiting Review', '#2563EB', 60, true)::text,
  true
);

select extensions.is(
  (select is_system from public.task_statuses where id = current_setting('test.master_task_status_id')::uuid),
  false,
  'admin can create a custom Task status'
);

select extensions.is(
  public.set_master_data_active('TASK_STATUS', current_setting('test.master_task_status_id')::uuid, 1, false),
  2,
  'custom Task status deactivation increments its version'
);

select extensions.is(
  (select is_active from public.task_statuses where id = current_setting('test.master_task_status_id')::uuid),
  false,
  'custom Task status is retained as inactive data'
);

select extensions.throws_ok(
  $$ select public.set_master_data_active('TASK_STATUS', '23000000-0000-4000-8000-000000000001', 1, false) $$,
  '55000',
  'System Task statuses must remain active.',
  'system Task statuses cannot be deactivated'
);

select set_config(
  'test.master_workflow_id',
  public.save_workflow_template(
    null,
    null,
    'MASTER_TEST_FLOW',
    'Master Test Flow',
    'Created by pgTAP',
    '[{"name":"FIRST","description":null},{"name":"SECOND","description":null}]'::jsonb,
    false
  )::text,
  true
);

select extensions.is(
  (select is_active from public.workflow_templates where id = current_setting('test.master_workflow_id')::uuid),
  false,
  'workflow create stores its requested lifecycle atomically'
);

select extensions.is(
  (select count(*)::integer from public.workflow_template_steps where workflow_template_id = current_setting('test.master_workflow_id')::uuid),
  2,
  'workflow create stores all ordered steps in the same transaction'
);

select extensions.lives_ok(
  $$
    select public.save_workflow_template(
      current_setting('test.master_workflow_id')::uuid,
      1,
      'MASTER_TEST_FLOW',
      'Master Test Flow Updated',
      null,
      '[{"name":"SECOND","description":null},{"name":"FIRST","description":null}]'::jsonb,
      true
    )
  $$,
  'unused workflow content and order can be updated atomically'
);

select extensions.is(
  (
    select string_agg(name, ',' order by position)
    from public.workflow_template_steps
    where workflow_template_id = current_setting('test.master_workflow_id')::uuid
  ),
  'SECOND,FIRST',
  'workflow step order follows the submitted order'
);

select extensions.throws_ok(
  $$
    select public.save_workflow_template(
      current_setting('test.master_workflow_id')::uuid,
      2,
      'CHANGED_CODE',
      'Master Test Flow Updated',
      null,
      '[{"name":"SECOND","description":null},{"name":"FIRST","description":null}]'::jsonb,
      true
    )
  $$,
  '22023',
  'Workflow code is permanent.',
  'workflow code cannot be changed after creation'
);

select extensions.throws_ok(
  $$
    select public.save_workflow_template(
      current_setting('test.master_workflow_id')::uuid,
      1,
      'MASTER_TEST_FLOW',
      'Stale Workflow',
      null,
      '[{"name":"SECOND","description":null},{"name":"FIRST","description":null}]'::jsonb,
      true
    )
  $$,
  '40001',
  'Stale workflow version.',
  'stale Workflow updates are rejected'
);

select set_config(
  'test.master_service_id',
  public.save_internal_service(
    null,
    null,
    'MASTER_SERVICE',
    'Master Service',
    'Internal-only service',
    current_setting('test.master_workflow_id')::uuid,
    true
  )::text,
  true
);

select extensions.is(
  (select workflow_template_id from public.internal_services where id = current_setting('test.master_service_id')::uuid),
  current_setting('test.master_workflow_id')::uuid,
  'Internal Service stores its Workflow assignment independently from public Service Categories'
);

select extensions.throws_ok(
  $$ select public.save_internal_service(null, null, 'INVALID_FLOW_SERVICE', 'Invalid Flow', null, gen_random_uuid(), true) $$,
  '23503',
  'Active workflow not found.',
  'Internal Service rejects an unknown Workflow assignment'
);

select extensions.throws_ok(
  $$ select public.set_master_data_active('WORKFLOW_TEMPLATE', current_setting('test.master_workflow_id')::uuid, 2, false) $$,
  '23503',
  'Reassign active services before deactivating this workflow.',
  'an active Internal Service prevents Workflow deactivation'
);

select extensions.is(
  public.set_master_data_active('INTERNAL_SERVICE', current_setting('test.master_service_id')::uuid, 1, false),
  2,
  'Internal Service deactivation is a versioned soft lifecycle change'
);

select extensions.is(
  public.set_master_data_active('WORKFLOW_TEMPLATE', current_setting('test.master_workflow_id')::uuid, 2, false),
  3,
  'Workflow can be deactivated after active Service dependencies are removed'
);

select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000003', true);
select extensions.throws_ok(
  $$ select public.save_priority(null, null, 'INACTIVE_ADMIN', 'Inactive Admin', '#111111', 80, true) $$,
  '42501',
  'Admin access required.',
  'inactive admin profile cannot mutate Master Data'
);

select set_config('request.jwt.claim.sub', '94000000-0000-4000-8000-000000000004', true);
select extensions.throws_ok(
  $$ select public.save_priority(null, null, 'DELETED_ADMIN', 'Deleted Admin', '#111111', 80, true) $$,
  '42501',
  'Admin access required.',
  'soft-deleted admin profile cannot mutate Master Data'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.save_job_status(uuid,integer,text,text,text,integer,boolean)',
    'EXECUTE'
  ),
  'anonymous users cannot execute the Job status mutation RPC'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.save_workflow_template(uuid,integer,text,text,text,jsonb,boolean)',
    'EXECUTE'
  ),
  'authenticated role can reach the workflow RPC before database role validation'
);

select * from extensions.finish();

rollback;
