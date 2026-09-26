begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users(id, aud, role, email, created_at, updated_at)
values
  ('95000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'add-job-staff@example.test', now(), now()),
  ('95000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'add-job-inactive@example.test', now(), now());
insert into public.profiles(id, email, display_name, role, is_active)
values
  ('95000000-0000-4000-8000-000000000001', 'add-job-staff@example.test', 'Add Job Staff', 'staff', true),
  ('95000000-0000-4000-8000-000000000002', 'add-job-inactive@example.test', 'Add Job Inactive', 'staff', false);
insert into public.clients(id, client_type, name, created_by, updated_by)
values ('95000000-0000-4000-8000-000000000003', 'COMPANY', 'Selectable Client',
  '95000000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001');
insert into public.internal_services(id, workflow_template_id, code, name, is_active)
values ('95000000-0000-4000-8000-000000000004', '24000000-0000-4000-8000-000000000001', 'ADD_JOB_SERVICE', 'Add Job Service', true);

select extensions.is(
  has_function_privilege('anon', 'public.list_active_clients_for_job()', 'EXECUTE'),
  false, 'anonymous users cannot list Client names for Job creation'
);
select extensions.is(
  has_function_privilege('anon', 'public.create_job_with_client(text,text,text,uuid,uuid,uuid,text,date,date)', 'EXECUTE'),
  false, 'anonymous users cannot create a Client with a Job'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from public.list_active_clients_for_job() where name = 'Selectable Client'),
  1, 'staff can select a Client even before it has a Job'
);
select extensions.is(
  (select count(*)::integer from public.clients where id = '95000000-0000-4000-8000-000000000003'),
  0, 'Client detail RLS remains restricted for an unrelated Client'
);

select set_config('test.add_job_id', public.create_job_with_client(
  'COMPANY', 'New Client In Form', 'New Job In Form',
  '95000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000002'
)::text, true);
select extensions.is(
  (select c.name from public.jobs j join public.clients c on c.id = j.client_id where j.id = current_setting('test.add_job_id')::uuid),
  'New Client In Form', 'new Client and Job are created together'
);
select extensions.is(
  (select pic_id from public.jobs where id = current_setting('test.add_job_id')::uuid),
  '95000000-0000-4000-8000-000000000001'::uuid, 'staff cannot assign another PIC'
);
select extensions.is(
  (select count(*)::integer from public.job_steps where job_id = current_setting('test.add_job_id')::uuid),
  5, 'new Job receives its Service workflow snapshot'
);
select extensions.is(
  (select title from public.job_overview where id = current_setting('test.add_job_id')::uuid),
  'New Job In Form', 'new Job is readable through the All Jobs overview'
);
select extensions.is(
  (select progress_percentage from public.job_overview where id = current_setting('test.add_job_id')::uuid),
  0, 'new Job starts with zero percent progress in the overview'
);

select extensions.throws_ok(
  $$ select public.create_job_with_client('COMPANY', 'Rolled Back Client', 'Bad Job',
    '95000000-0000-4000-8000-000000000004', '95000000-0000-4000-8000-000000000099') $$,
  '23503', 'Active priority not found.', 'invalid Job rolls back Client creation'
);
select extensions.is(
  (select count(*)::integer from public.list_active_clients_for_job() where name = 'Rolled Back Client'),
  0, 'failed Job left no Client behind'
);

select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-000000000002', true);
select extensions.is(
  (select count(*)::integer from public.list_active_clients_for_job()),
  0, 'inactive staff cannot list Client names'
);
select extensions.throws_ok(
  $$ select public.create_job_with_client('COMPANY', 'Inactive Client', 'Denied Job',
    '95000000-0000-4000-8000-000000000004', '21000000-0000-4000-8000-000000000001') $$,
  '42501', 'Active staff access required.', 'inactive staff cannot create a Client with a Job'
);

select * from extensions.finish();
rollback;
