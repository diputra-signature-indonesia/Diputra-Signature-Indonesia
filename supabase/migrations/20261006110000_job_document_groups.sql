begin;

-- Optional one-level folders beneath a Job. Existing documents remain ungrouped.
create table public.job_document_groups (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  job_drive_folder_id uuid not null,
  google_folder_id text not null unique check (char_length(btrim(google_folder_id)) between 1 and 255),
  folder_name text not null check (char_length(btrim(folder_name)) between 1 and 120),
  status text not null default 'PENDING' check (status in ('PENDING','READY','DELETING','TRASHED')),
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version>0),
  constraint job_document_groups_folder_fkey foreign key(job_id,job_drive_folder_id) references public.job_drive_folders(job_id,id) on delete restrict,
  constraint job_document_groups_parent_key unique(job_id,job_drive_folder_id,id),
  constraint job_document_groups_archive_state check ((status='TRASHED' and archived_at is not null and archived_by is not null) or (status<>'TRASHED' and archived_at is null and archived_by is null))
);
create unique index job_document_groups_active_name_key on public.job_document_groups(job_id,lower(folder_name)) where archived_at is null;
create index job_document_groups_job_idx on public.job_document_groups(job_id,created_at,id);
alter table public.job_documents add column group_id uuid;
alter table public.job_documents add constraint job_documents_group_fkey foreign key(job_id,job_drive_folder_id,group_id) references public.job_document_groups(job_id,job_drive_folder_id,id) on delete restrict;
create index job_documents_group_idx on public.job_documents(group_id);
create index job_documents_group_page_idx on public.job_documents(job_id,group_id,uploaded_at desc,id) where archived_at is null;
create trigger job_document_groups_set_updated_at before update on public.job_document_groups for each row execute function public.set_updated_at();
create trigger a_guard_job_deletion before insert or update on public.job_document_groups for each row execute function private.guard_job_deletion_child();

create function private.guard_document_group() returns trigger language plpgsql security definer set search_path='' as $$
declare v_group public.job_document_groups%rowtype;v_id uuid;
begin
  -- Lock group rows in stable order; no new upload or move while trashing.
  for v_id in select distinct id from unnest(array[new.group_id,case when tg_op='UPDATE' then old.group_id end]) ids(id) where id is not null order by id loop
    select * into v_group from public.job_document_groups where id=v_id for share;
    if not found or v_group.job_id<>new.job_id or v_group.job_drive_folder_id<>new.job_drive_folder_id then raise exception 'Document group belongs to another Job.' using errcode='23503'; end if;
    if new.archived_at is null and v_group.status<>'READY' then raise exception 'Document group is not ready for uploads.' using errcode='55000'; end if;
  end loop;
  return new;
end;
$$;
create trigger b_guard_document_group before insert or update on public.job_documents for each row execute function private.guard_document_group();
alter table public.job_document_groups enable row level security;
revoke all on public.job_document_groups from public,anon,authenticated;
grant select on public.job_document_groups to authenticated;
grant all on public.job_document_groups to service_role;
create policy "Active staff read active Job document groups" on public.job_document_groups for select to authenticated using(public.is_staff_role() and archived_at is null);
create policy "Admins read archived Job document groups" on public.job_document_groups for select to authenticated using(public.is_admin_role() and archived_at is not null);

create function public.prepare_job_document_group(p_job_id uuid,p_name text,p_google_folder_id text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_folder public.job_drive_folders%rowtype;v_group public.job_document_groups%rowtype;v_name text;
begin
  if not private.can_manage_job(p_job_id,auth.uid()) then raise exception 'Job document management is not allowed.' using errcode='42501'; end if;
  perform 1 from public.jobs where id=p_job_id and deletion_token is null for share;
  if not found then raise exception 'Job deletion is pending.' using errcode='55000'; end if;
  v_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:cntrl:]]',' ','g'));
  if char_length(v_name) not between 1 and 120 or nullif(btrim(p_google_folder_id),'') is null or p_request_id is null then raise exception 'Folder name is invalid.' using errcode='22023'; end if;
  select * into v_folder from public.job_drive_folders where job_id=p_job_id and archived_at is null and connection_status='READY' for share;
  if not found then raise exception 'Job Drive folder was not found.' using errcode='P0002'; end if;
  -- Serializes same-name requests without locking unrelated Jobs.
  perform pg_advisory_xact_lock(hashtextextended(p_job_id::text||lower(v_name),0));
  select * into v_group from public.job_document_groups where job_id=p_job_id and lower(folder_name)=lower(v_name) and archived_at is null for update;
  if found then
    if v_group.status<>'PENDING' then raise exception 'A folder with this name already exists.' using errcode='23505'; end if;
    return to_jsonb(v_group);
  end if;
  insert into public.job_document_groups(id,job_id,job_drive_folder_id,google_folder_id,folder_name,created_by,updated_by)
    values(p_request_id,p_job_id,v_folder.id,btrim(p_google_folder_id),v_name,auth.uid(),auth.uid()) returning * into v_group;
  return to_jsonb(v_group);
end;
$$;
create function public.complete_job_document_group(p_group_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_job uuid;
begin
  select job_id into v_job from public.job_document_groups where id=p_group_id;
  if not private.can_manage_job(v_job,auth.uid()) then raise exception 'Job document management is not allowed.' using errcode='42501'; end if;
  perform 1 from public.jobs where id=v_job and deletion_token is null for share;
  if not found then raise exception 'Job deletion is pending.' using errcode='55000'; end if;
  update public.job_document_groups set status='READY',updated_by=auth.uid(),version=version+1 where id=p_group_id and status='PENDING';
  if not found and not exists(select 1 from public.job_document_groups where id=p_group_id and status='READY') then raise exception 'Folder is not pending creation.' using errcode='55000'; end if;
end;
$$;

create function public.save_grouped_job_document_metadata(p_job_id uuid,p_job_drive_folder_id uuid,p_google_file_id text,p_google_resource_key text,p_file_name text,p_mime_type text,p_file_size_bytes bigint,p_web_view_url text,p_group_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_group public.job_document_groups%rowtype;
begin
  if not private.can_manage_job(p_job_id,auth.uid()) then raise exception 'Job document management is not allowed.' using errcode='42501'; end if;
  perform 1 from public.jobs where id=p_job_id and deletion_token is null for share;
  if not found then raise exception 'Job deletion is pending.' using errcode='55000'; end if;
  if p_group_id is not null then
    select * into v_group from public.job_document_groups where id=p_group_id for share;
    if not found or v_group.job_id<>p_job_id or v_group.job_drive_folder_id<>p_job_drive_folder_id then raise exception 'Document group belongs to another Job.' using errcode='23503'; end if;
    if v_group.status<>'READY' then raise exception 'Document group is not ready for uploads.' using errcode='55000'; end if;
  end if;
  if exists(select 1 from public.job_documents where job_id=p_job_id and google_file_id=btrim(p_google_file_id) and archived_at is null and group_id is distinct from p_group_id) then raise exception 'File is already mapped to a different group.' using errcode='23503'; end if;
  v_id:=public.save_job_document_metadata(p_job_id,p_job_drive_folder_id,p_google_file_id,p_google_resource_key,p_file_name,p_mime_type,p_file_size_bytes,p_web_view_url);
  update public.job_documents set group_id=p_group_id where id=v_id and group_id is distinct from p_group_id;
  return v_id;
end;
$$;

create function public.prepare_job_document_group_trash(p_group_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_group public.job_document_groups%rowtype;v_job uuid;
begin
  select job_id into v_job from public.job_document_groups where id=p_group_id;
  if not private.can_manage_job(v_job,auth.uid()) then raise exception 'Job document management is not allowed.' using errcode='42501'; end if;
  perform 1 from public.jobs where id=v_job and deletion_token is null for share;
  if not found then raise exception 'Job deletion is pending.' using errcode='55000'; end if;
  select * into v_group from public.job_document_groups where id=p_group_id and archived_at is null for update;
  if not found then raise exception 'Folder was not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_group.version<>p_expected_version then raise exception 'Folder changed. Reload before deleting.' using errcode='40001'; end if;
  if v_group.status<>'DELETING' then update public.job_document_groups set status='DELETING',updated_by=auth.uid() where id=p_group_id returning * into v_group; end if;
  return to_jsonb(v_group);
end;
$$;
create function public.finish_job_document_group_trash(p_group_id uuid,p_expected_version integer) returns void language plpgsql security definer set search_path='' as $$
declare v_group public.job_document_groups%rowtype;v_job uuid;
begin
  select job_id into v_job from public.job_document_groups where id=p_group_id;
  if not private.can_manage_job(v_job,auth.uid()) then raise exception 'Job document management is not allowed.' using errcode='42501'; end if;
  perform 1 from public.jobs where id=v_job and deletion_token is null for share;
  if not found then raise exception 'Job deletion is pending.' using errcode='55000'; end if;
  select * into v_group from public.job_document_groups where id=p_group_id for update;
  if v_group.status='TRASHED' then return; end if;
  if p_expected_version is null or v_group.version<>p_expected_version or v_group.status<>'DELETING' then raise exception 'Folder is not reserved for deletion.' using errcode='40001'; end if;
  update public.job_documents set archived_at=now(),archived_by=auth.uid(),updated_by=auth.uid(),sync_status='TRASHED',version=version+1 where group_id=p_group_id and archived_at is null;
  update public.job_document_groups set status='TRASHED',archived_at=now(),archived_by=auth.uid(),updated_by=auth.uid(),version=version+1 where id=p_group_id;
end;
$$;

-- One bounded query per document page, not one query per accordion row.
create function public.search_job_documents(p_job_id uuid,p_group_id uuid default null,p_page integer default 1,p_groups_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_total bigint;v_page integer;v_group_total bigint;v_group_page integer;v_rows jsonb;v_groups jsonb;v_folder jsonb;
begin
  if not public.is_staff_role() then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if not exists(select 1 from public.jobs where id=p_job_id and archived_at is null) then raise exception 'Job was not found.' using errcode='P0002'; end if;
  if coalesce(p_page,0)<1 or coalesce(p_groups_page,0)<1 then raise exception 'Invalid page.' using errcode='22023'; end if;
  if p_group_id is not null and not exists(select 1 from public.job_document_groups where id=p_group_id and job_id=p_job_id and archived_at is null) then raise exception 'Folder was not found.' using errcode='P0002'; end if;
  select to_jsonb(f) into v_folder from public.job_drive_folders f where job_id=p_job_id and archived_at is null;
  select count(*) into v_total from public.job_documents where job_id=p_job_id and group_id is not distinct from p_group_id and archived_at is null;
  v_page:=least(p_page,greatest(1,ceil(v_total/10.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(d) order by uploaded_at desc,id),'[]'::jsonb) into v_rows from (
    select id,job_id,group_id,google_file_id,file_name,mime_type,file_size_bytes,web_view_url,sync_status,uploaded_at,uploaded_by,version from public.job_documents
    where job_id=p_job_id and group_id is not distinct from p_group_id and archived_at is null order by uploaded_at desc,id limit 10 offset (v_page-1)*10
  ) d;
  select count(*) into v_group_total from public.job_document_groups where job_id=p_job_id and archived_at is null;
  v_group_page:=least(p_groups_page,greatest(1,ceil(v_group_total/10.0)::integer));
  with page_groups as (
    select id,job_id,folder_name,google_folder_id,status,version,created_at from public.job_document_groups where job_id=p_job_id and archived_at is null order by created_at,id limit 10 offset (v_group_page-1)*10
  ), counts as (
    select group_id,count(*) as document_count from public.job_documents where group_id in(select id from page_groups) and archived_at is null group by group_id
  ) select coalesce(jsonb_agg(to_jsonb(g)||jsonb_build_object('document_count',coalesce(c.document_count,0)) order by g.created_at,g.id),'[]'::jsonb) into v_groups from page_groups g left join counts c on c.group_id=g.id;
  return jsonb_build_object('folder',v_folder,'documents',v_rows,'documentTotal',v_total,'documentPage',v_page,'groups',v_groups,'groupTotal',v_group_total,'groupPage',v_group_page);
end;
$$;

-- All cleanup paths must include nested folders, even previously trashed ones.
create function private.job_drive_deletion_manifest(p_job_id uuid) returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('folders',coalesce((select jsonb_agg(target order by depth desc,id) from (
    select g.google_folder_id as id,1 as depth,jsonb_build_object('id',g.google_folder_id,'driveId',f.google_drive_id,'parentId',f.google_folder_id) as target from public.job_document_groups g join public.job_drive_folders f on f.id=g.job_drive_folder_id where g.job_id=p_job_id
    union all select google_folder_id,0,jsonb_build_object('id',google_folder_id,'driveId',google_drive_id) from public.job_drive_folders where job_id=p_job_id
  ) folders),'[]'::jsonb),
  'files',coalesce((select jsonb_agg(jsonb_build_object('id',d.google_file_id,'folderId',coalesce(g.google_folder_id,f.google_folder_id),'driveId',f.google_drive_id)) from public.job_documents d join public.job_drive_folders f on f.id=d.job_drive_folder_id left join public.job_document_groups g on g.id=d.group_id where d.job_id=p_job_id),'[]'::jsonb));
$$;
create or replace function public.prepare_job_deletion(p_job_id uuid,p_expected_version integer,p_confirmation text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;v_token uuid;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if coalesce(p_confirmation,'')<>v_job.title then raise exception 'Confirmation must exactly match the Job title.' using errcode='22023'; end if;
  v_token:=v_job.deletion_token;
  if v_token is null then v_token:=gen_random_uuid();update public.jobs set deletion_token=v_token,deletion_started_at=now() where id=p_job_id;end if;
  return jsonb_build_object('token',v_token)||private.job_drive_deletion_manifest(p_job_id);
end;
$$;
create or replace function public.prepare_expired_job_deletion(p_job_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;v_token uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found or v_job.archived_at is null or v_job.archived_at>now()-interval '30 days' then raise exception 'Job is not expired Trash.' using errcode='55000'; end if;
  v_token:=v_job.deletion_token;
  if v_token is null then v_token:=gen_random_uuid();update public.jobs set deletion_token=v_token,deletion_started_at=now() where id=p_job_id;end if;
  return jsonb_build_object('token',v_token)||private.job_drive_deletion_manifest(p_job_id);
end;
$$;
-- Existing graph finalizers and folder FK already require all group checkpoints.
create or replace function public.ack_deleted_drive_target(p_kind text,p_id uuid,p_token uuid,p_google_id text,p_is_folder boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
  if p_kind='job' then select deletion_token into v_token from public.jobs where id=p_id for update;
  elsif p_kind='sop' then select deletion_token into v_token from public.internal_services where id=p_id for update;
  else raise exception 'Invalid deletion kind.' using errcode='22023'; end if;
  if not found then return; end if;
  if p_token is null or v_token is distinct from p_token then raise exception 'Invalid deletion token.' using errcode='40001'; end if;
  if p_is_folder is null or nullif(p_google_id,'') is null then raise exception 'Invalid deletion target.' using errcode='22023'; end if;
  if p_kind='job' and p_is_folder then
    delete from public.job_document_groups where job_id=p_id and google_folder_id=p_google_id;
    delete from public.job_drive_folders where job_id=p_id and google_folder_id=p_google_id;
  elsif p_kind='job' then delete from public.job_documents where job_id=p_id and google_file_id=p_google_id;
  elsif p_is_folder then delete from public.sop_drive_folders where google_folder_id=p_google_id and sop_id in(select id from public.sops where internal_service_id=p_id);
  else delete from public.sop_files where storage_provider='GOOGLE_DRIVE' and google_file_id=p_google_id and sop_id in(select id from public.sops where internal_service_id=p_id);
  end if;
end;
$$;

revoke all on function private.guard_document_group(),private.job_drive_deletion_manifest(uuid) from public,anon,authenticated,service_role;
revoke all on function public.prepare_job_document_group(uuid,text,text,uuid),public.complete_job_document_group(uuid),public.prepare_job_document_group_trash(uuid,integer),public.finish_job_document_group_trash(uuid,integer),public.save_grouped_job_document_metadata(uuid,uuid,text,text,text,text,bigint,text,uuid),public.search_job_documents(uuid,uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.prepare_job_document_group(uuid,text,text,uuid),public.complete_job_document_group(uuid),public.prepare_job_document_group_trash(uuid,integer),public.finish_job_document_group_trash(uuid,integer),public.save_grouped_job_document_metadata(uuid,uuid,text,text,text,text,bigint,text,uuid),public.search_job_documents(uuid,uuid,integer,integer) to authenticated;
create or replace function public.job_deletion_impact(p_job_id uuid,p_expected_version integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if p_expected_version is null or v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  return jsonb_build_object('title',v_job.title,'pending',v_job.deletion_token is not null,
    'tasks',(select count(*) from public.tasks where job_id=p_job_id),
    'steps',(select count(*) from public.job_steps where job_id=p_job_id),
    'statuses',(select count(*) from public.job_task_statuses where job_id=p_job_id),
    'remarks',(select count(*) from public.job_updates where job_id=p_job_id),
    'contributors',(select count(*) from public.job_contributors where job_id=p_job_id),
    'logs',(select count(*) from public.job_activity_logs where job_id=p_job_id),
    'documents',(select count(*) from public.job_documents where job_id=p_job_id),
    'folders',(select count(*) from public.job_drive_folders where job_id=p_job_id),
    'groups',(select count(*) from public.job_document_groups where job_id=p_job_id),
    'reviews',(select count(*) from public.reviews where job_id=p_job_id),
    'unusedReviewLinks',(select count(*) from public.review_requests where job_id=p_job_id and used_at is null and revoked_at is null));
end;
$$;
comment on table public.job_document_groups is 'Optional one-level child folders of Job Drive folders; inherited Drive access, PostgreSQL display metadata only.';
commit;
