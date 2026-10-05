begin;

-- SOP file bytes now live in Google Shared Drive. PostgreSQL keeps only the
-- folder mapping, display metadata, audit actors, and soft-delete state.

create table public.sop_drive_folders (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid not null unique references public.sops(id) on delete restrict,
  google_drive_id text not null,
  google_folder_id text not null unique,
  folder_name text not null,
  web_view_url text not null,
  connection_status text not null default 'READY',
  last_synced_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint sop_drive_folders_drive_id_not_blank check (char_length(btrim(google_drive_id)) between 1 and 255),
  constraint sop_drive_folders_folder_id_not_blank check (char_length(btrim(google_folder_id)) between 1 and 255),
  constraint sop_drive_folders_name_not_blank check (char_length(btrim(folder_name)) between 1 and 240),
  constraint sop_drive_folders_google_url check (web_view_url ~* '^https://drive\.google\.com/'),
  constraint sop_drive_folders_connection_status check (connection_status in ('READY', 'ERROR', 'DISCONNECTED')),
  constraint sop_drive_folders_sop_id_id_key unique (sop_id, id)
);

create trigger sop_drive_folders_set_updated_at
before update on public.sop_drive_folders
for each row execute function public.set_updated_at();

alter table public.sop_drive_folders enable row level security;
revoke all privileges on table public.sop_drive_folders from anon, authenticated;
grant select on table public.sop_drive_folders to authenticated;
grant all privileges on table public.sop_drive_folders to service_role;

create policy "Active staff read SOP Drive folders"
on public.sop_drive_folders
for select to authenticated
using (public.is_staff_role());

alter table public.sop_files
  add column sop_drive_folder_id uuid,
  add column storage_provider text not null default 'SUPABASE',
  add column google_file_id text,
  add column google_resource_key text,
  add column web_view_url text,
  add column last_synced_at timestamptz;

alter table public.sop_files alter column bucket_id drop not null;
alter table public.sop_files alter column storage_path drop not null;
alter table public.sop_files drop constraint sop_files_bucket_check;

alter table public.sop_files
  add constraint sop_files_drive_folder_fkey
    foreign key (sop_id, sop_drive_folder_id)
    references public.sop_drive_folders(sop_id, id) on delete restrict,
  add constraint sop_files_storage_provider_check
    check (storage_provider in ('SUPABASE', 'GOOGLE_DRIVE')),
  add constraint sop_files_storage_target_check
    check (
      (
        storage_provider = 'SUPABASE'
        and bucket_id = 'sop-documents'
        and storage_path is not null
        and sop_drive_folder_id is null
        and google_file_id is null
        and web_view_url is null
      )
      or
      (
        storage_provider = 'GOOGLE_DRIVE'
        and bucket_id is null
        and storage_path is null
        and sop_drive_folder_id is not null
        and nullif(btrim(google_file_id), '') is not null
        and web_view_url ~* '^https://(drive|docs)\.google\.com/'
      )
    );

create unique index sop_files_google_file_id_key
  on public.sop_files(google_file_id)
  where google_file_id is not null;

create index sop_drive_folders_sop_idx on public.sop_drive_folders(sop_id);

-- Disable every browser write/read policy for the retired SOP Storage bucket.
-- Existing objects are intentionally not destroyed by a schema migration.
drop policy if exists "V2 admins upload reserved SOP documents" on storage.objects;
drop policy if exists "V2 staff read ready SOP documents" on storage.objects;
drop policy if exists "V2 admins delete retired SOP documents" on storage.objects;
drop policy if exists "V2 admins read managed SOP documents" on storage.objects;

drop function if exists public.prepare_sop_file_upload(uuid,text,text,text,text,bigint,integer);
drop function if exists public.finalize_sop_file_upload(uuid,integer);
drop function if exists public.fail_sop_file_upload(uuid,integer);
drop function if exists public.mark_sop_file_deleted(uuid,integer);

create or replace function public.save_sop_drive_folder(
  p_sop_id uuid,
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
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.sops where id = p_sop_id) then
    raise exception 'SOP not found.' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_google_drive_id), '') is null
    or nullif(btrim(p_google_folder_id), '') is null
    or nullif(btrim(p_folder_name), '') is null
    or p_web_view_url !~* '^https://drive\.google\.com/' then
    raise exception 'Google Drive folder metadata is invalid.' using errcode = '22023';
  end if;

  insert into public.sop_drive_folders (
    sop_id, google_drive_id, google_folder_id, folder_name, web_view_url,
    connection_status, last_synced_at, created_by, updated_by
  ) values (
    p_sop_id, btrim(p_google_drive_id), btrim(p_google_folder_id),
    left(btrim(p_folder_name), 240), p_web_view_url,
    'READY', now(), v_actor, v_actor
  )
  on conflict (sop_id) do update set
    google_drive_id = excluded.google_drive_id,
    google_folder_id = excluded.google_folder_id,
    folder_name = excluded.folder_name,
    web_view_url = excluded.web_view_url,
    connection_status = 'READY',
    last_synced_at = now(),
    updated_by = v_actor,
    version = public.sop_drive_folders.version + 1
  returning id into v_folder_id;

  return v_folder_id;
end;
$$;

create or replace function public.save_sop_drive_file_metadata(
  p_sop_id uuid,
  p_sop_drive_folder_id uuid,
  p_file_type text,
  p_title text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_sort_order integer,
  p_google_file_id text,
  p_google_resource_key text,
  p_web_view_url text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_type text := upper(btrim(p_file_type));
  v_file_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.sop_drive_folders
    where id = p_sop_drive_folder_id and sop_id = p_sop_id and connection_status = 'READY'
  ) then
    raise exception 'SOP Drive folder not found.' using errcode = 'P0002';
  end if;
  if v_type not in ('FLOW', 'REQUIREMENT')
    or nullif(btrim(p_title), '') is null
    or char_length(btrim(p_title)) > 240
    or nullif(btrim(p_original_filename), '') is null
    or char_length(btrim(p_original_filename)) > 255
    or p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 10485760
    or p_sort_order is null or p_sort_order < 0
    or nullif(btrim(p_google_file_id), '') is null
    or p_web_view_url !~* '^https://(drive|docs)\.google\.com/' then
    raise exception 'SOP Drive file metadata is invalid.' using errcode = '22023';
  end if;
  if v_type = 'FLOW' and p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Unsupported Flow file type.' using errcode = '22023';
  end if;
  if v_type = 'REQUIREMENT' and p_mime_type <> 'application/pdf' then
    raise exception 'Requirement files must be PDF.' using errcode = '22023';
  end if;

  -- Retire the previous Flow before inserting its replacement so the existing
  -- one-active-Flow unique index remains authoritative.
  if v_type = 'FLOW' then
    update public.sop_files set
      deleted_at = now(),
      deleted_by = v_actor,
      updated_by = v_actor,
      version = version + 1
    where sop_id = p_sop_id
      and file_type = 'FLOW'
      and upload_status = 'READY'
      and deleted_at is null
      and google_file_id is distinct from btrim(p_google_file_id);
  end if;

  select id into v_file_id
  from public.sop_files
  where google_file_id = btrim(p_google_file_id)
  for update;

  if v_file_id is null then
    insert into public.sop_files (
      sop_id, sop_drive_folder_id, storage_provider, file_type, title,
      original_filename, bucket_id, storage_path, mime_type, size_bytes,
      sort_order, upload_status, uploaded_at, google_file_id,
      google_resource_key, web_view_url, last_synced_at, created_by, updated_by
    ) values (
      p_sop_id, p_sop_drive_folder_id, 'GOOGLE_DRIVE', v_type, btrim(p_title),
      btrim(p_original_filename), null, null, p_mime_type, p_size_bytes,
      p_sort_order, 'READY', now(), btrim(p_google_file_id),
      nullif(btrim(p_google_resource_key), ''), p_web_view_url, now(), v_actor, v_actor
    ) returning id into v_file_id;
  else
    update public.sop_files set
      sop_id = p_sop_id,
      sop_drive_folder_id = p_sop_drive_folder_id,
      storage_provider = 'GOOGLE_DRIVE',
      file_type = v_type,
      title = btrim(p_title),
      original_filename = btrim(p_original_filename),
      bucket_id = null,
      storage_path = null,
      mime_type = p_mime_type,
      size_bytes = p_size_bytes,
      sort_order = p_sort_order,
      upload_status = 'READY',
      uploaded_at = now(),
      google_resource_key = nullif(btrim(p_google_resource_key), ''),
      web_view_url = p_web_view_url,
      last_synced_at = now(),
      deleted_at = null,
      deleted_by = null,
      updated_by = v_actor,
      version = version + 1
    where id = v_file_id;
  end if;

  return v_file_id;
end;
$$;

create or replace function public.archive_sop_file(
  p_file_id uuid,
  p_expected_version integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_sop_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.sop_files set
    deleted_at = now(),
    deleted_by = v_actor,
    updated_by = v_actor,
    last_synced_at = case when storage_provider = 'GOOGLE_DRIVE' then now() else last_synced_at end,
    version = version + 1
  where id = p_file_id
    and version = p_expected_version
    and deleted_at is null
  returning sop_id into v_sop_id;

  if not found then
    raise exception 'SOP file not found, deleted, or stale.' using errcode = '40001';
  end if;

  return v_sop_id;
end;
$$;

revoke all on function public.save_sop_drive_folder(uuid,text,text,text,text) from public, anon;
revoke all on function public.save_sop_drive_file_metadata(uuid,uuid,text,text,text,text,bigint,integer,text,text,text) from public, anon;
revoke all on function public.archive_sop_file(uuid,integer) from public, anon;

grant execute on function public.save_sop_drive_folder(uuid,text,text,text,text) to authenticated;
grant execute on function public.save_sop_drive_file_metadata(uuid,uuid,text,text,text,text,bigint,integer,text,text,text) to authenticated;
grant execute on function public.archive_sop_file(uuid,integer) to authenticated;

comment on table public.sop_drive_folders is
  'One Google Shared Drive folder mapping per SOP. Google Drive owns file bytes and folder access.';
comment on column public.sop_files.storage_provider is
  'SUPABASE identifies pre-migration legacy files; every new SOP upload uses GOOGLE_DRIVE.';

commit;
