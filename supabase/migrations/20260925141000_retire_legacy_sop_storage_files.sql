begin;

-- The product has explicitly moved SOP binaries to Google Drive. Retire any
-- pre-existing Supabase Storage metadata so it is no longer presented by the
-- application. Physical bucket cleanup remains an explicit Storage API/admin
-- operation because direct SQL deletion from storage tables is unsupported.
update public.sop_files set
  upload_status = 'FAILED',
  uploaded_at = null,
  updated_at = now(),
  version = version + 1
where storage_provider = 'SUPABASE'
  and upload_status = 'READY'
  and deleted_at is null;

commit;
