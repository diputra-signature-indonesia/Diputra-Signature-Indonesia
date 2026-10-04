begin;

-- Google Drive is the source of truth for file bytes and permissions. These
-- tables only store the Job-to-Shared-Drive mapping and display metadata.

create table public.job_drive_folders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete restrict,
  google_drive_id text not null,
  google_folder_id text not null,
  folder_name text not null,
  web_view_url text not null,
  connection_status text not null default 'READY',
  last_synced_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_drive_folders_drive_id_not_blank check (char_length(btrim(google_drive_id)) between 1 and 255),
  constraint job_drive_folders_folder_id_not_blank check (char_length(btrim(google_folder_id)) between 1 and 255),
  constraint job_drive_folders_name_not_blank check (char_length(btrim(folder_name)) between 1 and 240),
  constraint job_drive_folders_google_url check (web_view_url ~* '^https://drive\.google\.com/'),
  constraint job_drive_folders_connection_status check (connection_status in ('PENDING', 'READY', 'ERROR', 'DISCONNECTED')),
  constraint job_drive_folders_archive_state check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  ),
  constraint job_drive_folders_job_id_id_key unique (job_id, id)
);

create table public.job_documents (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  job_drive_folder_id uuid not null,
  google_file_id text not null,
  google_resource_key text,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  web_view_url text not null,
  source text not null default 'GOOGLE_DRIVE_API',
  sync_status text not null default 'READY',
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  last_synced_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_documents_folder_fkey foreign key (job_id, job_drive_folder_id)
    references public.job_drive_folders(job_id, id) on delete restrict,
  constraint job_documents_file_id_not_blank check (char_length(btrim(google_file_id)) between 1 and 255),
  constraint job_documents_name_not_blank check (char_length(btrim(file_name)) between 1 and 500),
  constraint job_documents_google_url check (web_view_url ~* '^https://(drive|docs)\.google\.com/'),
  constraint job_documents_source check (source in ('MANUAL_LINK', 'GOOGLE_DRIVE_API')),
  constraint job_documents_sync_status check (sync_status in ('READY', 'MISSING', 'ERROR', 'TRASHED')),
  constraint job_documents_archive_state check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create unique index job_documents_active_file_key
  on public.job_documents (job_id, google_file_id)
  where archived_at is null;
create index job_documents_job_uploaded_idx
  on public.job_documents (job_id, uploaded_at desc, id)
  where archived_at is null;

create trigger job_drive_folders_set_updated_at
before update on public.job_drive_folders
for each row execute function public.set_updated_at();

create trigger job_documents_set_updated_at
before update on public.job_documents
for each row execute function public.set_updated_at();

alter table public.job_drive_folders enable row level security;
alter table public.job_documents enable row level security;

revoke all privileges on table public.job_drive_folders, public.job_documents from anon, authenticated;
grant all privileges on table public.job_drive_folders, public.job_documents to service_role;
grant select on table public.job_drive_folders, public.job_documents to authenticated;

create policy "Active staff read active Job Drive folders"
on public.job_drive_folders
for select to authenticated
using (public.is_staff_role() and archived_at is null);

create policy "Active staff read active Job documents"
on public.job_documents
for select to authenticated
using (public.is_staff_role() and archived_at is null);

comment on table public.job_drive_folders is
  'One Google Shared Drive folder mapping per Job. Google Drive remains the authority for folder permissions and capabilities.';
comment on table public.job_documents is
  'Google Drive file metadata shown in Job Detail. File bytes and ACLs remain in Google Drive; authenticated users have read-only SQL access.';
comment on column public.job_documents.web_view_url is
  'Canonical Google-provided browser URL. Store the complete URL instead of reconstructing it so resource keys remain intact.';

commit;
