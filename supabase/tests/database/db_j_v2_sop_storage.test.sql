begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(24);

select extensions.is((select public from storage.buckets where id='sop-documents'),false,'SOP bucket is private');
select extensions.is((select file_size_limit from storage.buckets where id='sop-documents'),10485760::bigint,'SOP bucket limit is 10 MiB');
select extensions.is(
  (select array_to_string(allowed_mime_types,',') from storage.buckets where id='sop-documents'),
  'application/pdf,image/jpeg,image/png,image/webp',
  'SOP bucket only accepts the approved PDF/image MIME types'
);
select extensions.is(
  (select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'V2 %SOP documents'),
  4,
  'four scoped SOP Storage policies are installed'
);
select extensions.is(
  (select count(*)::integer from pg_policies where schemaname='storage' and tablename='objects' and cmd='UPDATE' and coalesce(qual,'')||coalesce(with_check,'') like '%sop-documents%'),
  0,
  'SOP objects cannot be overwritten in place'
);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('93000000-0000-4000-8000-000000000001','authenticated','authenticated','v2-storage-admin@example.test',now(),now()),
  ('93000000-0000-4000-8000-000000000002','authenticated','authenticated','v2-storage-staff@example.test',now(),now());
insert into public.profiles(id,email,role,is_active)
values
  ('93000000-0000-4000-8000-000000000001','v2-storage-admin@example.test','admin',true),
  ('93000000-0000-4000-8000-000000000002','v2-storage-staff@example.test','staff',true);
insert into public.internal_services(id,workflow_template_id,code,name)
values('93100000-0000-4000-8000-000000000002','24000000-0000-4000-8000-000000000001','V2_STORAGE_SERVICE','V2 Storage Service');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select set_config('test.sop_id',public.save_sop('93100000-0000-4000-8000-000000000002','Storage test',null)::text,true);
select extensions.ok(current_setting('test.sop_id')::uuid is not null,'admin creates an SOP through RPC');

select
  set_config('test.sop_file_1',file_id::text,true),
  set_config('test.sop_path_1',storage_path,true)
from public.prepare_sop_file_upload(current_setting('test.sop_id')::uuid,'FLOW','Flow one','flow-one.pdf','application/pdf',68,0);

select extensions.is((select upload_status from public.sop_files where id=current_setting('test.sop_file_1')::uuid),'PENDING','prepare creates a PENDING reservation');
select extensions.lives_ok(
  $$
    insert into storage.objects(id,bucket_id,name,owner_id,metadata)
    values('93200000-0000-4000-8000-000000000001','sop-documents',current_setting('test.sop_path_1'),'93000000-0000-4000-8000-000000000001','{"mimetype":"application/pdf","size":68}'::jsonb)
  $$,
  'admin uploads only to their reserved Storage path'
);

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000002',true);
select extensions.is((select count(*)::integer from storage.objects where bucket_id='sop-documents'),0,'staff cannot read a PENDING object');
select extensions.throws_ok(
  $$ select * from public.prepare_sop_file_upload(current_setting('test.sop_id')::uuid,'REQUIREMENT','Forbidden','forbidden.pdf','application/pdf',68,0) $$,
  '42501','Admin access required.','staff cannot reserve an SOP upload'
);

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select extensions.lives_ok(
  $$ select public.finalize_sop_file_upload(current_setting('test.sop_file_1')::uuid,1) $$,
  'admin finalizes an uploaded object whose metadata matches'
);
select extensions.is((select upload_status from public.sop_files where id=current_setting('test.sop_file_1')::uuid),'READY','finalize makes the file READY');

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000002',true);
select extensions.is((select count(*)::integer from storage.objects where name=current_setting('test.sop_path_1')),1,'active staff can read READY SOP object metadata');
select extensions.results_eq(
  $$
    with changed as (
      update storage.objects set name='forged.pdf' where name=current_setting('test.sop_path_1') returning 1
    ) select count(*)::bigint from changed
  $$,
  array[0::bigint],
  'staff cannot overwrite or move an SOP object'
);
select set_config('storage.allow_delete_query','true',true);
select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects where name=current_setting('test.sop_path_1') returning 1
    ) select count(*)::bigint from removed
  $$,
  array[0::bigint],
  'staff cannot delete a READY SOP object'
);

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select
  set_config('test.sop_file_2',file_id::text,true),
  set_config('test.sop_path_2',storage_path,true)
from public.prepare_sop_file_upload(current_setting('test.sop_id')::uuid,'FLOW','Flow two','flow-two.pdf','application/pdf',72,0);
select extensions.lives_ok(
  $$
    insert into storage.objects(id,bucket_id,name,owner_id,metadata)
    values('93200000-0000-4000-8000-000000000002','sop-documents',current_setting('test.sop_path_2'),'93000000-0000-4000-8000-000000000001','{"mimetype":"application/pdf","size":72}'::jsonb)
  $$,
  'admin uploads a replacement Flow to a new immutable path'
);
select extensions.lives_ok(
  $$ select public.finalize_sop_file_upload(current_setting('test.sop_file_2')::uuid,1) $$,
  'replacement Flow finalizes atomically'
);
select extensions.ok((select deleted_at is not null from public.sop_files where id=current_setting('test.sop_file_1')::uuid),'previous Flow metadata is retired after replacement');
select extensions.is((select count(*)::integer from public.sop_files where sop_id=current_setting('test.sop_id')::uuid and file_type='FLOW' and upload_status='READY' and deleted_at is null),1,'only one active READY Flow remains');
select extensions.is((select count(*)::integer from storage.objects where name=current_setting('test.sop_path_1')),1,'admin can select retired object metadata required by remove()');

select extensions.results_eq(
  $$
    with removed as (
      delete from storage.objects where name=current_setting('test.sop_path_1') returning 1
    ) select count(*)::bigint from removed
  $$,
  array[1::bigint],
  'admin can remove an object after its metadata is retired'
);
select extensions.throws_ok(
  $$ select * from public.prepare_sop_file_upload(current_setting('test.sop_id')::uuid,'REQUIREMENT','Image requirement','image.png','image/png',68,0) $$,
  '22023','Requirement files must be PDF.','Requirement upload rejects images'
);
select extensions.throws_ok(
  $$ select * from public.prepare_sop_file_upload(current_setting('test.sop_id')::uuid,'FLOW','Large flow','large.pdf','application/pdf',10485761,0) $$,
  '22023','File must be 10 MiB or smaller.','prepare enforces the 10 MiB limit'
);

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
select extensions.is((select count(*)::integer from storage.objects where bucket_id='sop-documents'),0,'anonymous users cannot list private SOP objects');

reset role;
select extensions.finish();
rollback;
