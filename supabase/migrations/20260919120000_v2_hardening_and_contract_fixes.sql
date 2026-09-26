begin;

-- V2 phase 5: cross-domain hardening and compatibility with existing V1 RPCs.

create or replace function public.set_blog_post_published(
  p_post_id uuid,
  p_is_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_updated_count integer;
begin
  if p_post_id is null or p_is_published is null then
    raise exception using errcode='22023',message='blog_publish_input_invalid';
  end if;
  if not private.is_active_admin(auth.uid()) then
    raise exception using errcode='42501',message='blog_publish_forbidden';
  end if;
  update public.blog_posts set status=case when p_is_published then 'published'::public.blog_status else 'draft'::public.blog_status end where id=p_post_id;
  get diagnostics v_updated_count=row_count;
  if v_updated_count=0 then raise exception using errcode='P0002',message='blog_post_not_found'; end if;
end;
$$;

create or replace function public.configure_job_task_statuses(p_job_id uuid,p_statuses jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid();
begin
  perform 1 from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Board configuration is not allowed.' using errcode='42501'; end if;
  if jsonb_typeof(p_statuses)<>'array' or jsonb_array_length(p_statuses)=0 then raise exception 'At least one Task status is required.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_statuses) e where not exists(select 1 from public.task_statuses s where s.id=(e->>'task_status_id')::uuid and s.is_active)) then raise exception 'Board contains an unavailable Task status.' using errcode='23503'; end if;
  if (select count(*) from jsonb_array_elements(p_statuses))<>(select count(distinct e->>'task_status_id') from jsonb_array_elements(p_statuses)e) then raise exception 'Duplicate Task status.' using errcode='22023'; end if;
  if exists(select 1 from public.job_task_statuses jts where jts.job_id=p_job_id and not exists(select 1 from jsonb_array_elements(p_statuses)e where (e->>'task_status_id')::uuid=jts.task_status_id) and exists(select 1 from public.tasks t where t.job_task_status_id=jts.id and t.deleted_at is null)) then raise exception 'A Task status in use cannot be removed.' using errcode='23503'; end if;
  set constraints job_task_statuses_job_order_key deferred;
  update public.job_task_statuses set column_order=column_order+100000,updated_by=v_actor,version=version+1 where job_id=p_job_id;
  delete from public.job_task_statuses jts where jts.job_id=p_job_id and not exists(select 1 from jsonb_array_elements(p_statuses)e where (e->>'task_status_id')::uuid=jts.task_status_id);
  insert into public.job_task_statuses(job_id,task_status_id,column_order,created_by,updated_by)
  select p_job_id,(e.value->>'task_status_id')::uuid,e.ordinality::integer,v_actor,v_actor from jsonb_array_elements(p_statuses) with ordinality e(value,ordinality)
  on conflict(job_id,task_status_id) do update set column_order=excluded.column_order,updated_by=v_actor,version=public.job_task_statuses.version+1;
  perform private.log_job_activity(p_job_id,'TASK_BOARD_CONFIGURED','{}'::jsonb,p_statuses);
end;
$$;

create policy "Active admins read all SOP file states"
on public.sop_files for select to authenticated
using(public.is_admin_role());

create or replace function public.fail_sop_file_upload(p_file_id uuid,p_expected_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  update public.sop_files set upload_status='FAILED',updated_by=v_actor,version=version+1
  where id=p_file_id and version=p_expected_version and upload_status='PENDING' and deleted_at is null
  returning version into v_version;
  if not found then raise exception 'File reservation not found or stale.' using errcode='40001'; end if;
  return v_version;
end;
$$;

-- A validation exception rolls back its statement, so finalize deliberately
-- leaves a mismatched reservation PENDING. The server may retry or explicitly
-- call fail_sop_file_upload after handling/removing the bad object.
create or replace function public.finalize_sop_file_upload(p_file_id uuid,p_expected_version integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_file public.sop_files%rowtype; v_object storage.objects%rowtype; v_size bigint; v_mime text; v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  select * into v_file from public.sop_files where id=p_file_id for update;
  if not found then raise exception 'File reservation not found.' using errcode='P0002'; end if;
  if v_file.version<>p_expected_version or v_file.upload_status<>'PENDING' or v_file.deleted_at is not null then raise exception 'File reservation is unavailable or stale.' using errcode='40001'; end if;
  select * into v_object from storage.objects where bucket_id=v_file.bucket_id and name=v_file.storage_path;
  if not found then raise exception 'Uploaded object not found.' using errcode='P0002'; end if;
  v_size:=coalesce((v_object.metadata->>'size')::bigint,0);
  v_mime:=coalesce(v_object.metadata->>'mimetype','');
  if v_size<>v_file.size_bytes or v_size>10485760 or v_mime<>v_file.mime_type then
    raise exception 'Uploaded object metadata does not match the reservation.' using errcode='22023';
  end if;
  if v_file.file_type='FLOW' then
    update public.sop_files set deleted_at=pg_catalog.now(),deleted_by=v_actor,updated_by=v_actor,version=version+1
    where sop_id=v_file.sop_id and file_type='FLOW' and upload_status='READY' and deleted_at is null and id<>p_file_id;
  end if;
  update public.sop_files set upload_status='READY',uploaded_at=pg_catalog.now(),updated_by=v_actor,version=version+1 where id=p_file_id returning version into v_version;
  return v_version;
end;
$$;

revoke all on function public.set_blog_post_published(uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.set_blog_post_published(uuid,boolean) to authenticated,service_role;
revoke all on function public.configure_job_task_statuses(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.configure_job_task_statuses(uuid,jsonb) to authenticated,service_role;
revoke all on function public.finalize_sop_file_upload(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.finalize_sop_file_upload(uuid,integer) to authenticated,service_role;
revoke all on function public.fail_sop_file_upload(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.fail_sop_file_upload(uuid,integer) to authenticated,service_role;

-- Reassert the intended browser surface after the permissive legacy default
-- privileges in the remote baseline.
revoke all privileges on table public.job_activity_logs from anon,authenticated;
revoke all privileges on table public.admin_access_requests from anon,authenticated;
grant select on table public.admin_access_requests to authenticated;
revoke all privileges on table public.profiles from anon,authenticated;
grant select on table public.profiles to authenticated;

commit;
