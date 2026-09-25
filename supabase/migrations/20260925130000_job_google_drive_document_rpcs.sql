begin;

-- Google Drive owns file bytes and ACLs. These functions are the only
-- authenticated write paths for the metadata mirrored in PostgreSQL.

create or replace function public.save_job_drive_folder(
  p_job_id uuid,
  p_google_drive_id text,
  p_google_folder_id text,
  p_folder_name text,
  p_web_view_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_folder_id uuid;
begin
  if v_actor is null or not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;
  if nullif(btrim(p_google_drive_id), '') is null
    or nullif(btrim(p_google_folder_id), '') is null
    or nullif(btrim(p_folder_name), '') is null
    or p_web_view_url !~* '^https://drive\.google\.com/' then
    raise exception 'Google Drive folder metadata is invalid.' using errcode = '22023';
  end if;

  insert into public.job_drive_folders (
    job_id, google_drive_id, google_folder_id, folder_name, web_view_url,
    connection_status, last_synced_at, created_by, updated_by
  ) values (
    p_job_id, btrim(p_google_drive_id), btrim(p_google_folder_id),
    left(btrim(p_folder_name), 240), p_web_view_url,
    'READY', now(), v_actor, v_actor
  )
  on conflict (job_id) do update set
    google_drive_id = excluded.google_drive_id,
    google_folder_id = excluded.google_folder_id,
    folder_name = excluded.folder_name,
    web_view_url = excluded.web_view_url,
    connection_status = 'READY',
    last_synced_at = now(),
    archived_at = null,
    archived_by = null,
    updated_by = v_actor,
    version = public.job_drive_folders.version + 1
  returning id into v_folder_id;

  return v_folder_id;
end;
$$;

create or replace function public.save_job_document_metadata(
  p_job_id uuid,
  p_job_drive_folder_id uuid,
  p_google_file_id text,
  p_google_resource_key text,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_web_view_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_document_id uuid;
begin
  if v_actor is null or not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.job_drive_folders
    where id = p_job_drive_folder_id and job_id = p_job_id and archived_at is null
  ) then
    raise exception 'Job Drive folder was not found.' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_google_file_id), '') is null
    or nullif(btrim(p_file_name), '') is null
    or p_file_size_bytes is not null and p_file_size_bytes < 0
    or p_web_view_url !~* '^https://(drive|docs)\.google\.com/' then
    raise exception 'Google Drive file metadata is invalid.' using errcode = '22023';
  end if;

  select id into v_document_id
  from public.job_documents
  where job_id = p_job_id
    and google_file_id = btrim(p_google_file_id)
    and archived_at is null
  for update;

  if v_document_id is null then
    insert into public.job_documents (
      job_id, job_drive_folder_id, google_file_id, google_resource_key,
      file_name, mime_type, file_size_bytes, web_view_url,
      source, sync_status, uploaded_by, last_synced_at, created_by, updated_by
    ) values (
      p_job_id, p_job_drive_folder_id, btrim(p_google_file_id), nullif(btrim(p_google_resource_key), ''),
      left(btrim(p_file_name), 500), nullif(btrim(p_mime_type), ''), p_file_size_bytes, p_web_view_url,
      'GOOGLE_DRIVE_API', 'READY', v_actor, now(), v_actor, v_actor
    )
    returning id into v_document_id;
  else
    update public.job_documents set
      job_drive_folder_id = p_job_drive_folder_id,
      google_resource_key = nullif(btrim(p_google_resource_key), ''),
      file_name = left(btrim(p_file_name), 500),
      mime_type = nullif(btrim(p_mime_type), ''),
      file_size_bytes = p_file_size_bytes,
      web_view_url = p_web_view_url,
      sync_status = 'READY',
      last_synced_at = now(),
      updated_by = v_actor,
      version = version + 1
    where id = v_document_id;
  end if;

  return v_document_id;
end;
$$;

create or replace function public.archive_job_document(
  p_document_id uuid,
  p_expected_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job_id uuid;
begin
  select job_id into v_job_id
  from public.job_documents
  where id = p_document_id and archived_at is null;

  if v_job_id is null then
    raise exception 'Job document was not found.' using errcode = 'P0002';
  end if;
  if v_actor is null or not private.can_manage_job(v_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;

  update public.job_documents set
    sync_status = 'TRASHED',
    archived_at = now(),
    archived_by = v_actor,
    updated_by = v_actor,
    last_synced_at = now(),
    version = version + 1
  where id = p_document_id
    and archived_at is null
    and version = p_expected_version
  returning job_id into v_job_id;

  if not found then
    raise exception 'Job document changed before it could be archived.' using errcode = '40001';
  end if;

  return v_job_id;
end;
$$;

revoke all on function public.save_job_drive_folder(uuid,text,text,text,text) from public, anon;
revoke all on function public.save_job_document_metadata(uuid,uuid,text,text,text,text,bigint,text) from public, anon;
revoke all on function public.archive_job_document(uuid,integer) from public, anon;

grant execute on function public.save_job_drive_folder(uuid,text,text,text,text) to authenticated;
grant execute on function public.save_job_document_metadata(uuid,uuid,text,text,text,text,bigint,text) to authenticated;
grant execute on function public.archive_job_document(uuid,integer) to authenticated;

commit;
