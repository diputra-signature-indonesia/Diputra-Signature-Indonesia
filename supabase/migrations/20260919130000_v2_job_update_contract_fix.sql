begin;

-- NULL p_pic_id means "leave the current PIC unchanged". This is required so
-- a PIC can edit the fields they own without having permission to reassign PIC.
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
  v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_category uuid; v_template uuid; v_pic uuid; v_version integer; v_completed boolean;
begin
  select j.* into v_job from public.jobs j where j.id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  select (s.code='COMPLETED') into v_completed from public.job_statuses s where s.id=v_job.status_id;
  if v_completed then raise exception 'Reopen the completed Job before editing.' using errcode='55000'; end if;
  if not exists(select 1 from public.clients where id=p_client_id and archived_at is null) then raise exception 'Active client not found.' using errcode='23503'; end if;
  if not exists(select 1 from public.priorities where id=p_priority_id and is_active) then raise exception 'Active priority not found.' using errcode='23503'; end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date<p_start_date then raise exception 'Estimated end date cannot precede start date.' using errcode='22023'; end if;
  select s.category_id,s.workflow_template_id into v_category,v_template
  from public.internal_services s
  join public.internal_service_categories c on c.id=s.category_id
  join public.workflow_templates w on w.id=s.workflow_template_id
  where s.id=p_internal_service_id and s.is_active and c.is_active and w.is_active;
  if not found or not exists(select 1 from public.workflow_template_steps where workflow_template_id=v_template) then raise exception 'Active service/workflow not found.' using errcode='23503'; end if;
  v_pic:=v_job.pic_id;
  if p_pic_id is not null and p_pic_id is distinct from v_job.pic_id then
    if not private.is_active_admin(v_actor) then raise exception 'Only an admin can change PIC.' using errcode='42501'; end if;
    perform private.assert_assignable_profile(p_pic_id);
    v_pic:=p_pic_id;
  end if;

  if v_job.internal_service_id is distinct from p_internal_service_id then
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
    case when v_job.internal_service_id is distinct from p_internal_service_id then 'JOB_WORKFLOW_RESTARTED' else 'JOB_UPDATED' end,
    to_jsonb(v_job)-array['created_at','updated_at'],
    jsonb_build_object('client_id',p_client_id,'title',btrim(p_title),'pic_id',v_pic,'service_id',p_internal_service_id,'priority_id',p_priority_id)
  );
  return v_version;
end;
$$;

revoke all on function public.update_job(uuid,integer,uuid,text,uuid,uuid,text,date,date,uuid) from public,anon,authenticated,service_role;
grant execute on function public.update_job(uuid,integer,uuid,text,uuid,uuid,text,date,date,uuid) to authenticated,service_role;

commit;
