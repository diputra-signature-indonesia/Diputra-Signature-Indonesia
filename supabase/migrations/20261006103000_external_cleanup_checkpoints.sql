begin;
-- No new table: remove individual metadata only AFTER its external bytes are
-- confirmed deleted. The parent reservation remains, so retries resume from
-- the remaining manifest rather than repeatedly scanning thousands of 404s.
create function public.ack_deleted_drive_target(p_kind text,p_id uuid,p_token uuid,p_google_id text,p_is_folder boolean)
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
    delete from public.job_drive_folders where job_id=p_id and google_folder_id=p_google_id;
  elsif p_kind='job' then
    delete from public.job_documents where job_id=p_id and google_file_id=p_google_id;
  elsif p_is_folder then
    delete from public.sop_drive_folders where google_folder_id=p_google_id and sop_id in(select id from public.sops where internal_service_id=p_id);
  else
    delete from public.sop_files where storage_provider='GOOGLE_DRIVE' and google_file_id=p_google_id and sop_id in(select id from public.sops where internal_service_id=p_id);
  end if;
end;
$$;
create function public.ack_deleted_sop_storage_target(p_id uuid,p_token uuid,p_bucket text,p_path text)
returns void language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
  select deletion_token into v_token from public.internal_services where id=p_id for update;
  if not found then return; end if;
  if p_token is null or v_token is distinct from p_token then raise exception 'Invalid deletion token.' using errcode='40001'; end if;
  delete from public.sop_files where storage_provider='SUPABASE' and bucket_id=p_bucket and storage_path=p_path and sop_id in(select id from public.sops where internal_service_id=p_id);
end;
$$;

-- Parent finalization requires every mapped external target to be acknowledged.
create or replace function public.finish_job_deletion(p_job_id uuid,p_token uuid,p_actor uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
  if auth.role() is distinct from 'service_role' or not private.is_active_admin(p_actor) then raise exception 'Server admin access required.' using errcode='42501'; end if;
  select deletion_token into v_token from public.jobs where id=p_job_id for update;
  if not found then return p_job_id; end if;
  if p_token is null or v_token is distinct from p_token then raise exception 'Invalid deletion token.' using errcode='40001'; end if;
  if exists(select 1 from public.job_drive_folders where job_id=p_job_id) or exists(select 1 from public.job_documents where job_id=p_job_id) then raise exception 'External cleanup is incomplete.' using errcode='55000'; end if;
  perform set_config('request.jwt.claim.sub',p_actor::text,true);
  perform private.delete_job_graph(p_job_id);
  return p_job_id;
end;
$$;
create or replace function public.finish_internal_service_deletion(p_id uuid,p_token uuid,p_actor uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_token uuid;
begin
  if auth.role() is distinct from 'service_role' or not private.is_active_admin(p_actor) then raise exception 'Server admin access required.' using errcode='42501'; end if;
  select deletion_token into v_token from public.internal_services where id=p_id for update;
  if not found then return; end if;
  if p_token is null or v_token is distinct from p_token then raise exception 'Invalid deletion token.' using errcode='40001'; end if;
  if exists(select 1 from public.jobs where internal_service_id=p_id) then raise exception 'Service is used by Jobs.' using errcode='23503'; end if;
  if exists(select 1 from public.sop_drive_folders f join public.sops s on s.id=f.sop_id where s.internal_service_id=p_id)
    or exists(select 1 from public.sop_files f join public.sops s on s.id=f.sop_id where s.internal_service_id=p_id) then raise exception 'External cleanup is incomplete.' using errcode='55000'; end if;
  perform private.delete_service_graph(p_id);
end;
$$;
create or replace function public.finish_expired_job_deletion(p_job_id uuid,p_token uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then return; end if;
  if v_job.archived_at is null or v_job.archived_at>now()-interval '30 days' or p_token is null or v_job.deletion_token is distinct from p_token then raise exception 'Invalid expired Job deletion.' using errcode='55000'; end if;
  if exists(select 1 from public.job_drive_folders where job_id=p_job_id) or exists(select 1 from public.job_documents where job_id=p_job_id) then raise exception 'External cleanup is incomplete.' using errcode='55000'; end if;
  perform private.delete_job_graph(p_job_id);
end;
$$;
revoke all on function public.ack_deleted_drive_target(text,uuid,uuid,text,boolean),public.ack_deleted_sop_storage_target(uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.ack_deleted_drive_target(text,uuid,uuid,text,boolean),public.ack_deleted_sop_storage_target(uuid,uuid,text,text) to service_role;
commit;
