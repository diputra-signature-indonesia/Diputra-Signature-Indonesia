begin;

-- Supabase Storage remove() evaluates both SELECT and DELETE. Administrators
-- therefore need metadata visibility for every object that is backed by a
-- sop_files reservation, including retired/failed objects awaiting cleanup.
drop policy if exists "V2 admins read managed SOP documents" on storage.objects;
create policy "V2 admins read managed SOP documents"
on storage.objects for select to authenticated
using(
  bucket_id='sop-documents'
  and public.is_admin_role()
  and exists(
    select 1 from public.sop_files f
    where f.bucket_id=storage.objects.bucket_id
      and f.storage_path=storage.objects.name
  )
);

commit;
