begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

select extensions.has_table('public','job_drive_folders','Job Drive folder mapping table exists');
select extensions.has_table('public','job_documents','Job document metadata table exists');

select extensions.has_column('public','job_drive_folders','google_drive_id','folder mapping stores the Shared Drive id');
select extensions.has_column('public','job_drive_folders','google_folder_id','folder mapping stores the Google folder id');
select extensions.has_column('public','job_documents','google_file_id','document stores the Google file id');
select extensions.has_column('public','job_documents','google_resource_key','document can retain a Google resource key');
select extensions.has_column('public','job_documents','web_view_url','document stores the canonical Google view URL');

select extensions.ok(
  (select relrowsecurity from pg_class where oid='public.job_drive_folders'::regclass),
  'RLS is enabled for Job Drive folders'
);
select extensions.ok(
  (select relrowsecurity from pg_class where oid='public.job_documents'::regclass),
  'RLS is enabled for Job documents'
);

select extensions.is(
  (select count(*)::integer from pg_policies where schemaname='public' and tablename='job_drive_folders' and cmd='SELECT'),
  1,
  'Job Drive folders expose one authenticated read policy'
);
select extensions.is(
  (select count(*)::integer from pg_policies where schemaname='public' and tablename='job_documents' and cmd='SELECT'),
  1,
  'Job documents expose one authenticated read policy'
);
select extensions.is(
  (select count(*)::integer from pg_policies where schemaname='public' and tablename in ('job_drive_folders','job_documents') and cmd <> 'SELECT'),
  0,
  'no authenticated mutation policy exists before the Drive API integration'
);

select extensions.ok(
  has_table_privilege('authenticated','public.job_drive_folders','SELECT'),
  'authenticated users can select folder metadata'
);
select extensions.ok(
  has_table_privilege('authenticated','public.job_documents','SELECT'),
  'authenticated users can select document metadata'
);
select extensions.ok(
  not has_table_privilege('authenticated','public.job_drive_folders','INSERT,UPDATE,DELETE'),
  'authenticated users cannot mutate folder metadata directly'
);
select extensions.ok(
  not has_table_privilege('authenticated','public.job_documents','INSERT,UPDATE,DELETE'),
  'authenticated users cannot mutate document metadata directly'
);

select extensions.ok(
  exists (
    select 1
    from pg_constraint
    where conrelid='public.job_drive_folders'::regclass
      and conname='job_drive_folders_job_id_id_key'
      and contype='u'
  ),
  'folder mappings provide the composite key used by documents'
);
select extensions.ok(
  exists (
    select 1
    from pg_constraint
    where conrelid='public.job_documents'::regclass
      and conname='job_documents_folder_fkey'
      and contype='f'
      and pg_get_constraintdef(oid) like 'FOREIGN KEY (job_id, job_drive_folder_id)%'
  ),
  'documents cannot reference a folder belonging to another Job'
);
select extensions.ok(
  exists (
    select 1
    from pg_indexes
    where schemaname='public'
      and tablename='job_documents'
      and indexname='job_documents_active_file_key'
      and indexdef like '%WHERE (archived_at IS NULL)%'
  ),
  'active Google files are unique per Job'
);

select extensions.ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.job_drive_folders'::regclass
      and conname='job_drive_folders_connection_status'
      and contype='c'
  ),
  'folder connection states are constrained'
);
select extensions.ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.job_documents'::regclass
      and conname='job_documents_sync_status'
      and contype='c'
  ),
  'document synchronization states are constrained'
);
select extensions.ok(
  exists (
    select 1 from pg_constraint
    where conrelid='public.job_documents'::regclass
      and conname='job_documents_google_url'
      and contype='c'
  ),
  'document browser links are restricted to Google domains'
);

select extensions.finish();
rollback;
