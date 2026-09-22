-- The function uses an empty search_path, so SET CONSTRAINTS must refer to
-- the public schema explicitly. Without this, adding/reordering columns fails.
create or replace function public.configure_job_task_statuses(p_job_id uuid,p_statuses jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_status_code text;
begin
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Board configuration is not allowed.' using errcode='42501'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select code into v_status_code from public.job_statuses where id=v_job.status_id;
  if v_status_code='COMPLETED' then raise exception 'Reopen the completed Job before configuring its board.' using errcode='55000'; end if;
  if jsonb_typeof(p_statuses)<>'array' or jsonb_array_length(p_statuses)=0 then raise exception 'At least one Task status is required.' using errcode='22023'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_statuses) e
    where not exists(
      select 1 from public.task_statuses s
      where s.id=(e->>'task_status_id')::uuid
        and (s.is_active or exists(
          select 1 from public.job_task_statuses current_status
          where current_status.job_id=p_job_id and current_status.task_status_id=s.id
        ))
    )
  ) then raise exception 'Board contains an unavailable Task status.' using errcode='23503'; end if;
  if (select count(*) from jsonb_array_elements(p_statuses))<>(select count(distinct e->>'task_status_id') from jsonb_array_elements(p_statuses)e) then raise exception 'Duplicate Task status.' using errcode='22023'; end if;
  if exists(
    select 1 from public.job_task_statuses jts
    where jts.job_id=p_job_id
      and not exists(select 1 from jsonb_array_elements(p_statuses)e where (e->>'task_status_id')::uuid=jts.task_status_id)
      and exists(select 1 from public.tasks t where t.job_task_status_id=jts.id and t.deleted_at is null)
  ) then raise exception 'A Task status in use cannot be removed.' using errcode='23503'; end if;
  set constraints public.job_task_statuses_job_order_key deferred;
  update public.job_task_statuses set column_order=column_order+100000,updated_by=v_actor,version=version+1 where job_id=p_job_id;
  delete from public.job_task_statuses jts where jts.job_id=p_job_id and not exists(select 1 from jsonb_array_elements(p_statuses)e where (e->>'task_status_id')::uuid=jts.task_status_id);
  insert into public.job_task_statuses(job_id,task_status_id,column_order,created_by,updated_by)
  select p_job_id,(e.value->>'task_status_id')::uuid,e.ordinality::integer,v_actor,v_actor
  from jsonb_array_elements(p_statuses) with ordinality e(value,ordinality)
  on conflict(job_id,task_status_id) do update
  set column_order=excluded.column_order,updated_by=v_actor,version=public.job_task_statuses.version+1;
  perform private.log_job_activity(p_job_id,'TASK_BOARD_CONFIGURED','{}'::jsonb,p_statuses);
end;
$$;
