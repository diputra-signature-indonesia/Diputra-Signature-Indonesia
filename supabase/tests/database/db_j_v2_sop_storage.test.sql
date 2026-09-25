begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(24);

select extensions.has_table('public', 'sop_drive_folders', 'SOP Drive folder mapping exists');
select extensions.has_column('public', 'sop_files', 'storage_provider', 'SOP files identify their storage provider');
select extensions.has_column('public', 'sop_files', 'google_file_id', 'SOP files store Google file IDs');
select extensions.has_column('public', 'sop_files', 'web_view_url', 'SOP files store Google browser URLs');
select extensions.is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and coalesce(qual, '') || coalesce(with_check, '') like '%sop-documents%'),
  0,
  'the retired SOP Storage bucket has no browser policies'
);
select extensions.is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('prepare_sop_file_upload', 'finalize_sop_file_upload', 'fail_sop_file_upload', 'mark_sop_file_deleted')),
  0,
  'legacy Supabase Storage RPCs are removed'
);

insert into auth.users(id,aud,role,email,created_at,updated_at)
values
  ('93000000-0000-4000-8000-000000000001','authenticated','authenticated','v2-drive-admin@example.test',now(),now()),
  ('93000000-0000-4000-8000-000000000002','authenticated','authenticated','v2-drive-staff@example.test',now(),now());
insert into public.profiles(id,email,role,is_active)
values
  ('93000000-0000-4000-8000-000000000001','v2-drive-admin@example.test','admin',true),
  ('93000000-0000-4000-8000-000000000002','v2-drive-staff@example.test','staff',true);
insert into public.internal_services(id,workflow_template_id,code,name)
values('93100000-0000-4000-8000-000000000002','24000000-0000-4000-8000-000000000001','V2_DRIVE_SERVICE','V2 Drive Service');

set local role authenticated;
select set_config('request.jwt.claim.role','authenticated',true);
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select set_config('test.sop_id',public.save_sop('93100000-0000-4000-8000-000000000002','Drive test',null)::text,true);
select extensions.ok(current_setting('test.sop_id')::uuid is not null,'admin creates an SOP');

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000002',true);
select extensions.throws_ok(
  format(
    'select public.save_sop_drive_folder(%L::uuid,%L,%L,%L,%L)',
    current_setting('test.sop_id'), 'shared-drive', 'staff-folder', 'Forbidden', 'https://drive.google.com/drive/folders/staff-folder'
  ),
  '42501','Admin access required.','staff cannot save an SOP Drive folder'
);

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select set_config(
  'test.folder_id',
  public.save_sop_drive_folder(
    current_setting('test.sop_id')::uuid,
    'shared-drive',
    'sop-folder',
    'V2 Drive Service',
    'https://drive.google.com/drive/folders/sop-folder'
  )::text,
  true
);
select extensions.ok(current_setting('test.folder_id')::uuid is not null,'admin saves an SOP Drive folder mapping');
select extensions.is(
  (select connection_status from public.sop_drive_folders where id = current_setting('test.folder_id')::uuid),
  'READY',
  'saved SOP Drive folder is ready'
);

select set_config(
  'test.flow_1',
  public.save_sop_drive_file_metadata(
    current_setting('test.sop_id')::uuid,
    current_setting('test.folder_id')::uuid,
    'FLOW','Flow one','flow-one.pdf','application/pdf',68,0,
    'google-flow-one','resource-one','https://drive.google.com/file/d/google-flow-one/view'
  )::text,
  true
);
select extensions.is(
  (select storage_provider from public.sop_files where id = current_setting('test.flow_1')::uuid),
  'GOOGLE_DRIVE',
  'new SOP file metadata uses Google Drive'
);
select extensions.is(
  (select upload_status from public.sop_files where id = current_setting('test.flow_1')::uuid),
  'READY',
  'verified Drive metadata is immediately ready'
);
select extensions.ok(
  (select bucket_id is null and storage_path is null from public.sop_files where id = current_setting('test.flow_1')::uuid),
  'Google Drive files do not retain Supabase Storage locations'
);

select extensions.throws_ok(
  format(
    'select public.save_sop_drive_file_metadata(%L::uuid,%L::uuid,%L,%L,%L,%L,%s,%s,%L,%L,%L)',
    current_setting('test.sop_id'), current_setting('test.folder_id'),
    'REQUIREMENT','Image','image.png','image/png',68,0,
    'google-image','resource-image','https://drive.google.com/file/d/google-image/view'
  ),
  '22023','Requirement files must be PDF.','requirement files remain PDF-only'
);
select extensions.throws_ok(
  format(
    'select public.save_sop_drive_file_metadata(%L::uuid,%L::uuid,%L,%L,%L,%L,%s,%s,%L,%L,%L)',
    current_setting('test.sop_id'), current_setting('test.folder_id'),
    'FLOW','Large','large.pdf','application/pdf',10485761,0,
    'google-large','resource-large','https://drive.google.com/file/d/google-large/view'
  ),
  '22023','SOP Drive file metadata is invalid.','Drive metadata enforces the 10 MiB limit'
);

select set_config(
  'test.flow_2',
  public.save_sop_drive_file_metadata(
    current_setting('test.sop_id')::uuid,
    current_setting('test.folder_id')::uuid,
    'FLOW','Flow two','flow-two.pdf','application/pdf',72,0,
    'google-flow-two','resource-two','https://drive.google.com/file/d/google-flow-two/view'
  )::text,
  true
);
select extensions.ok(
  (select deleted_at is not null from public.sop_files where id = current_setting('test.flow_1')::uuid),
  'saving a replacement retires the previous Flow metadata'
);
select extensions.is(
  (select count(*)::integer from public.sop_files where sop_id = current_setting('test.sop_id')::uuid and file_type = 'FLOW' and upload_status = 'READY' and deleted_at is null),
  1,
  'only one active Flow remains'
);

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000002',true);
select extensions.is(
  (select count(*)::integer from public.sop_drive_folders where sop_id = current_setting('test.sop_id')::uuid),
  1,
  'active staff can read SOP Drive folder metadata'
);
select extensions.is(
  (select count(*)::integer from public.sop_files where id = current_setting('test.flow_2')::uuid),
  1,
  'active staff can read active SOP file metadata'
);
select extensions.throws_ok(
  format('select public.archive_sop_file(%L::uuid,%s)', current_setting('test.flow_2'), 1),
  '42501','Admin access required.','staff cannot archive an SOP file'
);

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select extensions.lives_ok(
  format('select public.archive_sop_file(%L::uuid,%s)', current_setting('test.flow_2'), 1),
  'admin archives an SOP file through the guarded RPC'
);
select extensions.ok(
  (select deleted_at is not null and deleted_by = '93000000-0000-4000-8000-000000000001'::uuid from public.sop_files where id = current_setting('test.flow_2')::uuid),
  'archived SOP metadata records the actor'
);

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
select extensions.throws_ok(
  'select count(*) from public.sop_drive_folders',
  '42501','permission denied for table sop_drive_folders','anonymous users cannot list SOP Drive folders'
);
select extensions.throws_ok(
  'select count(*) from public.sop_files',
  '42501','permission denied for table sop_files','anonymous users cannot list SOP file metadata'
);

reset role;
select extensions.finish();
rollback;
