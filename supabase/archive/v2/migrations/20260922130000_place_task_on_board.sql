-- Place a Task before another Task (or at the end) and normalize board positions
-- in one transaction. The existing move_task RPC remains available for callers
-- that already use absolute positions.
create function public.place_task_on_board(
  p_task_id uuid,
  p_expected_version integer,
  p_job_task_status_id uuid,
  p_before_task_id uuid default null
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_job_id uuid;
  v_task public.tasks%rowtype;
  v_status_code text;
  v_id uuid;
  v_position bigint := 0;
  v_inserted boolean := false;
  v_version integer;
begin
  select job_id into v_job_id from public.tasks where id=p_task_id and deleted_at is null;
  if v_job_id is null then raise exception 'Task not found.' using errcode='P0002'; end if;

  perform 1 from public.jobs j where j.id=v_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  select s.code into v_status_code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_job_id and j.archived_at is null;
  if v_status_code is null or v_status_code='COMPLETED' then raise exception 'Job is read-only.' using errcode='55000'; end if;

  perform 1 from public.tasks t where t.job_id=v_job_id and t.deleted_at is null order by t.id for update;
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(v_job_id,v_actor) and (
    not private.is_active_staff(v_actor) or v_task.assignee_id is distinct from v_actor
  ) then raise exception 'Task movement is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  if not exists(select 1 from public.job_task_statuses where id=p_job_task_status_id and job_id=v_job_id) then
    raise exception 'Target status is not configured for this Job.' using errcode='23503';
  end if;
  if p_before_task_id=p_task_id or (
    p_before_task_id is not null and not exists(
      select 1 from public.tasks t where t.id=p_before_task_id and t.job_id=v_job_id
        and t.job_task_status_id=p_job_task_status_id and t.deleted_at is null
    )
  ) then raise exception 'Invalid Task insertion point.' using errcode='22023'; end if;

  for v_id in
    select t.id from public.tasks t
    where t.job_id=v_job_id and t.job_task_status_id=p_job_task_status_id
      and t.deleted_at is null and t.id<>p_task_id
    order by t.position,t.created_at,t.id
  loop
    if v_id=p_before_task_id then
      v_position:=v_position+1000;
      update public.tasks set job_task_status_id=p_job_task_status_id,position=v_position,
        updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
      v_inserted:=true;
    end if;
    v_position:=v_position+1000;
    update public.tasks set position=v_position,updated_by=v_actor,version=version+1
      where id=v_id and position is distinct from v_position;
  end loop;

  if not v_inserted then
    v_position:=v_position+1000;
    update public.tasks set job_task_status_id=p_job_task_status_id,position=v_position,
      updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
  end if;

  if v_task.job_task_status_id<>p_job_task_status_id then
    v_position:=0;
    for v_id in
      select t.id from public.tasks t
      where t.job_id=v_job_id and t.job_task_status_id=v_task.job_task_status_id
        and t.deleted_at is null
      order by t.position,t.created_at,t.id
    loop
      v_position:=v_position+1000;
      update public.tasks set position=v_position,updated_by=v_actor,version=version+1
        where id=v_id and position is distinct from v_position;
    end loop;
  end if;

  perform private.log_job_activity(v_job_id,'TASK_MOVED',
    jsonb_build_object('status_id',v_task.job_task_status_id,'position',v_task.position),
    jsonb_build_object('status_id',p_job_task_status_id,'position',
      (select position from public.tasks where id=p_task_id)),null,p_task_id,null,null);
  return v_version;
end; $$;

revoke all on function public.place_task_on_board(uuid,integer,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.place_task_on_board(uuid,integer,uuid,uuid) to authenticated,service_role;
