begin;

-- Close lifecycle edge cases found during the second implementation audit:
-- archived/completed Jobs are immutable, and editing a Job without changing
-- Service must not import a later Master Data workflow assignment.

create or replace function public.update_job(
  p_job_id uuid,
  p_expected_version integer,
  p_client_id uuid,
  p_title text,
  p_internal_service_id uuid,
  p_priority_id uuid,
  p_description text default null,
  p_start_date date default null,
  p_estimated_end_date date default null,
  p_pic_id uuid default null
)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid();
  v_job public.jobs%rowtype;
  v_category uuid;
  v_template uuid;
  v_pic uuid;
  v_version integer;
  v_status_code text;
  v_service_changed boolean;
begin
  select j.* into v_job from public.jobs j where j.id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select s.code into v_status_code from public.job_statuses s where s.id=v_job.status_id;
  if v_status_code='COMPLETED' then raise exception 'Reopen the completed Job before editing.' using errcode='55000'; end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date<p_start_date then raise exception 'Estimated end date cannot precede start date.' using errcode='22023'; end if;

  if p_client_id is distinct from v_job.client_id and not exists(
    select 1 from public.clients where id=p_client_id and archived_at is null
  ) then raise exception 'Active client not found.' using errcode='23503'; end if;

  if p_priority_id is distinct from v_job.priority_id and not exists(
    select 1 from public.priorities where id=p_priority_id and is_active
  ) then raise exception 'Active priority not found.' using errcode='23503'; end if;

  v_service_changed:=p_internal_service_id is distinct from v_job.internal_service_id;
  if v_service_changed then
    select s.category_id,s.workflow_template_id into v_category,v_template
    from public.internal_services s
    join public.internal_service_categories c on c.id=s.category_id
    join public.workflow_templates w on w.id=s.workflow_template_id
    where s.id=p_internal_service_id and s.is_active and c.is_active and w.is_active;
    if not found or not exists(
      select 1 from public.workflow_template_steps where workflow_template_id=v_template
    ) then raise exception 'Active service/workflow not found.' using errcode='23503'; end if;
  else
    -- Master Data reassignment only affects future Jobs. Existing Jobs retain
    -- their original category/template snapshot until Service changes.
    v_category:=v_job.category_id;
    v_template:=v_job.workflow_template_id;
  end if;

  v_pic:=v_job.pic_id;
  if p_pic_id is not null and p_pic_id is distinct from v_job.pic_id then
    if not private.is_active_admin(v_actor) then raise exception 'Only an admin can change PIC.' using errcode='42501'; end if;
    perform private.assert_assignable_profile(p_pic_id);
    v_pic:=p_pic_id;
  end if;

  if v_service_changed then
    update public.job_steps
    set replaced_at=pg_catalog.now(),replaced_by=v_actor,updated_by=v_actor,version=version+1
    where job_id=p_job_id and replaced_at is null;
    insert into public.job_steps(job_id,template_step_id,name,description,position,created_by,updated_by)
    select p_job_id,s.id,s.name,s.description,s.position,v_actor,v_actor
    from public.workflow_template_steps s
    where s.workflow_template_id=v_template order by s.position;
  end if;

  update public.jobs set
    client_id=p_client_id,
    title=btrim(p_title),
    description=nullif(btrim(p_description),''),
    pic_id=v_pic,
    category_id=v_category,
    internal_service_id=p_internal_service_id,
    workflow_template_id=v_template,
    priority_id=p_priority_id,
    start_date=p_start_date,
    estimated_end_date=p_estimated_end_date,
    updated_by=v_actor,
    version=version+1
  where id=p_job_id
  returning version into v_version;

  perform private.log_job_activity(
    p_job_id,
    case when v_service_changed then 'JOB_WORKFLOW_RESTARTED' else 'JOB_UPDATED' end,
    to_jsonb(v_job)-array['created_at','updated_at'],
    jsonb_build_object('client_id',p_client_id,'title',btrim(p_title),'pic_id',v_pic,'service_id',p_internal_service_id,'priority_id',p_priority_id)
  );
  return v_version;
end;
$$;

create or replace function public.change_job_status(p_job_id uuid,p_expected_version integer,p_status_code text,p_reason text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid();
  v_job public.jobs%rowtype;
  v_status uuid;
  v_current_code text;
  v_code text:=upper(btrim(p_status_code));
  v_version integer;
begin
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select code into v_current_code from public.job_statuses where id=v_job.status_id;
  if v_current_code='COMPLETED' then raise exception 'Use reopen_job for a completed Job.' using errcode='55000'; end if;
  if v_code not in ('IN_PROGRESS','ON_HOLD','OBSTACLE') then raise exception 'This Job status cannot be selected manually.' using errcode='22023'; end if;
  if v_code in ('ON_HOLD','OBSTACLE') and nullif(btrim(p_reason),'') is null then raise exception 'A reason is required.' using errcode='22023'; end if;
  select id into v_status from public.job_statuses where code=v_code and is_active;
  update public.jobs set
    status_id=v_status,
    status_reason=case when v_code in('ON_HOLD','OBSTACLE') then btrim(p_reason) else null end,
    started_at=case when v_code='IN_PROGRESS' then coalesce(started_at,pg_catalog.now()) else started_at end,
    updated_by=v_actor,
    version=version+1
  where id=p_job_id returning version into v_version;
  perform private.log_job_activity(
    p_job_id,'JOB_STATUS_CHANGED',
    jsonb_build_object('status_id',v_job.status_id,'status_reason',v_job.status_reason),
    jsonb_build_object('status_id',v_status,'status_reason',case when v_code in('ON_HOLD','OBSTACLE') then btrim(p_reason) else null end),
    p_reason
  );
  return v_version;
end;
$$;

create or replace function public.complete_job_step(p_job_step_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid();
  v_step public.job_steps%rowtype;
  v_job public.jobs%rowtype;
  v_current uuid;
  v_is_final boolean;
  v_status_code text;
  v_completed_status uuid;
begin
  select * into v_step from public.job_steps where id=p_job_step_id and replaced_at is null for update;
  if not found then raise exception 'Active Job step not found.' using errcode='P0002'; end if;
  select * into v_job from public.jobs where id=v_step.job_id for update;
  if not private.can_manage_job(v_job.id,v_actor) then raise exception 'Step management is not allowed.' using errcode='42501'; end if;
  if v_step.version<>p_expected_version then raise exception 'Stale step version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select id into v_current from public.job_steps where job_id=v_job.id and replaced_at is null and not is_completed order by position limit 1;
  if v_current is distinct from v_step.id then raise exception 'Only the current step can be completed.' using errcode='55000'; end if;
  select not exists(select 1 from public.job_steps s where s.job_id=v_job.id and s.replaced_at is null and s.position>v_step.position) into v_is_final;
  select code into v_status_code from public.job_statuses where id=v_job.status_id;
  if v_is_final and v_status_code in('ON_HOLD','OBSTACLE') then raise exception 'Resolve the Job hold/obstacle before completing the final step.' using errcode='55000'; end if;
  update public.job_steps set is_completed=true,completed_at=pg_catalog.now(),completed_by=v_actor,updated_by=v_actor,version=version+1 where id=v_step.id;
  if v_is_final then
    select id into v_completed_status from public.job_statuses where code='COMPLETED';
    update public.jobs set
      status_id=v_completed_status,
      status_reason=null,
      started_at=coalesce(started_at,pg_catalog.now()),
      completed_at=pg_catalog.now(),
      updated_by=v_actor,
      version=version+1
    where id=v_job.id;
  end if;
  perform private.log_job_activity(v_job.id,'JOB_STEP_COMPLETED',jsonb_build_object('is_completed',false),jsonb_build_object('is_completed',true,'job_completed',v_is_final),null,null,v_step.id,null);
end;
$$;

create or replace function public.revert_last_job_step(p_job_step_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_step public.job_steps%rowtype; v_last uuid; v_job public.jobs%rowtype; v_job_status text;
begin
  select * into v_step from public.job_steps where id=p_job_step_id and replaced_at is null for update;
  if not found then raise exception 'Active Job step not found.' using errcode='P0002'; end if;
  select * into v_job from public.jobs where id=v_step.job_id for update;
  if not private.can_manage_job(v_step.job_id,v_actor) then raise exception 'Step management is not allowed.' using errcode='42501'; end if;
  if v_step.version<>p_expected_version then raise exception 'Stale step version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select s.code into v_job_status from public.job_statuses s where s.id=v_job.status_id;
  if v_job_status='COMPLETED' then raise exception 'Use reopen_job for a completed Job.' using errcode='55000'; end if;
  select id into v_last from public.job_steps where job_id=v_step.job_id and replaced_at is null and is_completed order by position desc limit 1;
  if v_last is distinct from v_step.id then raise exception 'Only the last completed step can be reverted.' using errcode='55000'; end if;
  update public.job_steps set is_completed=false,completed_at=null,completed_by=null,updated_by=v_actor,version=version+1 where id=v_step.id;
  perform private.log_job_activity(v_step.job_id,'JOB_STEP_REVERTED',jsonb_build_object('is_completed',true),jsonb_build_object('is_completed',false),null,null,v_step.id,null);
end;
$$;

create or replace function public.reopen_job(p_job_id uuid,p_expected_version integer,p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_final public.job_steps%rowtype; v_progress uuid; v_version integer;
begin
  if nullif(btrim(p_reason),'') is null then raise exception 'Reopen reason is required.' using errcode='22023'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  if not exists(select 1 from public.job_statuses s where s.id=v_job.status_id and s.code='COMPLETED') then raise exception 'Only completed Jobs can be reopened.' using errcode='55000'; end if;
  select * into v_final from public.job_steps where job_id=p_job_id and replaced_at is null order by position desc limit 1 for update;
  if not v_final.is_completed then raise exception 'Final step is not completed.' using errcode='55000'; end if;
  update public.job_steps set is_completed=false,completed_at=null,completed_by=null,updated_by=v_actor,version=version+1 where id=v_final.id;
  select id into v_progress from public.job_statuses where code='IN_PROGRESS';
  update public.jobs set status_id=v_progress,status_reason=null,completed_at=null,started_at=coalesce(started_at,pg_catalog.now()),updated_by=v_actor,version=version+1 where id=p_job_id returning version into v_version;
  perform private.log_job_activity(p_job_id,'JOB_REOPENED',jsonb_build_object('status_id',v_job.status_id),jsonb_build_object('status_id',v_progress),p_reason,null,v_final.id,null);
  return v_version;
end;
$$;

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
  set constraints job_task_statuses_job_order_key deferred;
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

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in(
      'update_job','change_job_status','complete_job_step','revert_last_job_step','reopen_job','configure_job_task_statuses'
    )
  loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
    execute format('grant execute on function %s to authenticated,service_role',r.signature);
  end loop;
end;
$$;

commit;
