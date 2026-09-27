begin;

-- Jobs already carry archived_at/archived_by, so the Trash lifecycle does not
-- need another table. All writes remain behind security-definer functions and
-- are restricted to active admin roles.

drop policy if exists "Active staff read jobs" on public.jobs;
create policy "Active staff read jobs"
on public.jobs
for select to authenticated
using (
  public.is_staff_role()
  and (archived_at is null or public.is_admin_role())
);

create policy "Active admins read archived Job Drive folders"
on public.job_drive_folders
for select to authenticated
using (public.is_admin_role() and archived_at is not null);

create policy "Active admins read archived Job documents"
on public.job_documents
for select to authenticated
using (public.is_admin_role() and archived_at is not null);

create or replace function private.can_manage_job(p_job_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.jobs as j
    where j.id = p_job_id
      and j.archived_at is null
      and (
        private.is_active_admin(p_user_id)
        or (private.is_active_staff(p_user_id) and j.pic_id = p_user_id)
      )
  );
$$;

revoke all on function private.can_manage_job(uuid,uuid) from public, anon, authenticated, service_role;

create or replace function public.trash_job(
  p_job_id uuid,
  p_expected_version integer,
  p_confirmation text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_client_name text;
  v_version integer;
begin
  if v_actor is null or not private.is_active_admin(v_actor) then
    raise exception 'Only an active admin can move a Job to Trash.' using errcode = '42501';
  end if;

  select j.*
  into v_job
  from public.jobs as j
  where j.id = p_job_id
  for update;

  if not found or v_job.archived_at is not null then
    raise exception 'Job was not found or is already in Trash.' using errcode = 'P0002';
  end if;
  select name into v_client_name from public.clients where id = v_job.client_id;
  if v_job.version <> p_expected_version then
    raise exception 'Job changed before it could be moved to Trash.' using errcode = '40001';
  end if;
  if btrim(coalesce(p_confirmation, '')) <> v_job.title
    and btrim(coalesce(p_confirmation, '')) <> v_client_name then
    raise exception 'Confirmation must exactly match the Job title or client name.' using errcode = '22023';
  end if;

  update public.job_documents
  set sync_status = 'TRASHED', archived_at = pg_catalog.now(), archived_by = v_actor,
      updated_by = v_actor, last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at is null;

  update public.job_drive_folders
  set archived_at = pg_catalog.now(), archived_by = v_actor, updated_by = v_actor,
      last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at is null;

  update public.jobs
  set archived_at = pg_catalog.now(), archived_by = v_actor, updated_by = v_actor,
      version = version + 1
  where id = p_job_id and archived_at is null
  returning version into v_version;

  perform private.log_job_activity(p_job_id, 'JOB_TRASHED');
  return v_version;
end;
$$;

create or replace function public.restore_job(
  p_job_id uuid,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_version integer;
  v_archived_at timestamptz;
begin
  if v_actor is null or not private.is_active_admin(v_actor) then
    raise exception 'Only an active admin can restore a Job.' using errcode = '42501';
  end if;

  select archived_at into v_archived_at
  from public.jobs
  where id = p_job_id and archived_at is not null and version = p_expected_version
  for update;

  if not found then
    raise exception 'Job was not found, is not in Trash, or has changed.' using errcode = '40001';
  end if;

  update public.jobs
  set archived_at = null, archived_by = null, updated_by = v_actor, version = version + 1
  where id = p_job_id
  returning version into v_version;

  update public.job_drive_folders
  set archived_at = null, archived_by = null, connection_status = 'READY',
      updated_by = v_actor, last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at = v_archived_at;

  update public.job_documents
  set archived_at = null, archived_by = null, sync_status = 'READY',
      updated_by = v_actor, last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at = v_archived_at;

  perform private.log_job_activity(p_job_id, 'JOB_RESTORED');
  return v_version;
end;
$$;

create or replace function private.delete_job_graph(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Reviews remain useful business records after their originating Job is
  -- removed, so only the optional Job association is detached.
  update public.review_requests set job_id = null where job_id = p_job_id;
  update public.reviews set job_id = null where job_id = p_job_id;

  delete from public.job_activity_logs where job_id = p_job_id;
  delete from public.job_documents where job_id = p_job_id;
  delete from public.job_drive_folders where job_id = p_job_id;
  delete from public.tasks where job_id = p_job_id;
  delete from public.job_task_statuses where job_id = p_job_id;
  delete from public.job_updates where job_id = p_job_id;
  delete from public.job_steps where job_id = p_job_id;
  delete from public.jobs where id = p_job_id;
end;
$$;

revoke all on function private.delete_job_graph(uuid) from public, anon, authenticated, service_role;

create or replace function public.delete_job_permanently(
  p_job_id uuid,
  p_expected_version integer,
  p_confirmation text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_client_name text;
begin
  if v_actor is null or not private.is_active_admin(v_actor) then
    raise exception 'Only an active admin can permanently delete a Job.' using errcode = '42501';
  end if;

  select j.*
  into v_job
  from public.jobs as j
  where j.id = p_job_id
  for update;

  if not found or v_job.archived_at is null then
    raise exception 'Job was not found or is not in Trash.' using errcode = 'P0002';
  end if;
  select name into v_client_name from public.clients where id = v_job.client_id;
  if v_job.version <> p_expected_version then
    raise exception 'Job changed before it could be permanently deleted.' using errcode = '40001';
  end if;
  if btrim(coalesce(p_confirmation, '')) <> v_job.title
    and btrim(coalesce(p_confirmation, '')) <> v_client_name then
    raise exception 'Confirmation must exactly match the Job title or client name.' using errcode = '22023';
  end if;

  perform private.delete_job_graph(p_job_id);

  return p_job_id;
end;
$$;

create or replace function public.purge_expired_job(p_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Expired Job purge is restricted to the service role.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.jobs
    where id = p_job_id
      and archived_at <= pg_catalog.now() - interval '30 days'
  ) then
    raise exception 'Job is not eligible for the 30-day purge.' using errcode = '55000';
  end if;

  perform private.delete_job_graph(p_job_id);
  return p_job_id;
end;
$$;

revoke all on function public.trash_job(uuid,integer,text) from public, anon, authenticated, service_role;
revoke all on function public.restore_job(uuid,integer) from public, anon, authenticated, service_role;
revoke all on function public.delete_job_permanently(uuid,integer,text) from public, anon, authenticated, service_role;
revoke all on function public.purge_expired_job(uuid) from public, anon, authenticated, service_role;

grant execute on function public.trash_job(uuid,integer,text) to authenticated, service_role;
grant execute on function public.restore_job(uuid,integer) to authenticated, service_role;
grant execute on function public.delete_job_permanently(uuid,integer,text) to authenticated, service_role;
grant execute on function public.purge_expired_job(uuid) to service_role;

-- Deprecated because it does not coordinate Google Drive. All UI deletion now
-- uses trash_job, which requires confirmation and archives Drive metadata.
revoke execute on function public.archive_job(uuid,integer) from authenticated;

comment on function public.trash_job(uuid,integer,text) is
  'Moves a Job and its Google Drive metadata to the admin Trash after exact-name confirmation.';
comment on function public.restore_job(uuid,integer) is
  'Restores a Job and its Google Drive metadata from the admin Trash.';
comment on function public.delete_job_permanently(uuid,integer,text) is
  'Permanently removes a trashed Job and operational child records while retaining detached reviews.';
comment on function public.purge_expired_job(uuid) is
  'Service-role-only purge for Jobs that have remained in Trash for at least 30 days.';

commit;
