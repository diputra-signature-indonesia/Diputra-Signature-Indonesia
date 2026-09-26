begin;

-- V2 phases 2 and 3: Jobs, linear workflow snapshots, Task boards,
-- Remarks, append-only activity, RLS, and the only supported write paths.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text not null,
  description text,
  pic_id uuid not null references public.profiles(id) on delete restrict,
  category_id uuid not null references public.internal_service_categories(id) on delete restrict,
  internal_service_id uuid not null references public.internal_services(id) on delete restrict,
  workflow_template_id uuid not null references public.workflow_templates(id) on delete restrict,
  priority_id uuid not null references public.priorities(id) on delete restrict,
  status_id uuid not null references public.job_statuses(id) on delete restrict,
  status_reason text,
  start_date date,
  estimated_end_date date,
  started_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint jobs_title_not_blank check (char_length(btrim(title)) between 1 and 240),
  constraint jobs_date_order check (
    start_date is null or estimated_end_date is null or estimated_end_date >= start_date
  ),
  constraint jobs_archive_state check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create table public.job_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  template_step_id uuid not null references public.workflow_template_steps(id) on delete restrict,
  name text not null,
  description text,
  position integer not null check (position > 0),
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete restrict,
  replaced_at timestamptz,
  replaced_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_steps_name_not_blank check (char_length(btrim(name)) between 1 and 160),
  constraint job_steps_completion_state check (
    (is_completed and completed_at is not null and completed_by is not null)
    or (not is_completed and completed_at is null and completed_by is null)
  ),
  constraint job_steps_replacement_state check (
    (replaced_at is null and replaced_by is null)
    or (replaced_at is not null and replaced_by is not null)
  ),
  constraint job_steps_job_id_id_key unique (job_id, id)
);

create unique index job_steps_active_position_key
  on public.job_steps (job_id, position) where replaced_at is null;
create unique index job_steps_active_template_step_key
  on public.job_steps (job_id, template_step_id) where replaced_at is null;

create table public.job_task_statuses (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  task_status_id uuid not null references public.task_statuses(id) on delete restrict,
  column_order integer not null check (column_order > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_task_statuses_job_status_key unique (job_id, task_status_id),
  constraint job_task_statuses_job_order_key unique (job_id, column_order) deferrable initially immediate,
  constraint job_task_statuses_job_id_id_key unique (job_id, id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  job_task_status_id uuid not null,
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id) on delete restrict,
  priority_id uuid references public.priorities(id) on delete restrict,
  due_date date,
  position bigint not null default 0,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint tasks_title_not_blank check (char_length(btrim(title)) between 1 and 500),
  constraint tasks_delete_state check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  ),
  constraint tasks_job_status_fkey foreign key (job_id, job_task_status_id)
    references public.job_task_statuses(job_id, id) on delete restrict,
  constraint tasks_job_id_id_key unique (job_id, id)
);

create table public.job_updates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  message text not null,
  progress_date date not null,
  performed_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_updates_message_not_blank check (char_length(btrim(message)) between 1 and 4000),
  constraint job_updates_job_id_id_key unique (job_id, id)
);

create table public.job_activity_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  task_id uuid,
  job_step_id uuid,
  job_update_id uuid,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  reason text,
  created_at timestamptz not null default now(),
  constraint job_activity_logs_action_format check (action ~ '^[A-Z][A-Z0-9_]{2,99}$'),
  constraint job_activity_logs_single_target check (
    num_nonnulls(task_id, job_step_id, job_update_id) <= 1
  ),
  constraint job_activity_logs_task_fkey foreign key (job_id, task_id)
    references public.tasks(job_id, id) on delete restrict,
  constraint job_activity_logs_step_fkey foreign key (job_id, job_step_id)
    references public.job_steps(job_id, id) on delete restrict,
  constraint job_activity_logs_update_fkey foreign key (job_id, job_update_id)
    references public.job_updates(job_id, id) on delete set null (job_update_id)
);

create index jobs_client_created_idx on public.jobs (client_id, created_at desc, id);
create index jobs_pic_status_deadline_idx on public.jobs (pic_id, status_id, estimated_end_date, id);
create index jobs_status_deadline_active_idx on public.jobs (status_id, estimated_end_date, id) where archived_at is null;
create index tasks_assignee_job_active_idx on public.tasks (assignee_id, job_id) where deleted_at is null;
create index tasks_board_active_idx on public.tasks (job_id, job_task_status_id, position, id) where deleted_at is null;
create index job_updates_order_idx on public.job_updates (job_id, progress_date desc, created_at desc, id desc);
create index job_activity_logs_order_idx on public.job_activity_logs (job_id, created_at desc, id desc);

do $$
declare v_table text;
begin
  foreach v_table in array array['jobs','job_steps','job_task_statuses','tasks','job_updates'] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', v_table, v_table);
  end loop;
  foreach v_table in array array['jobs','job_steps','job_task_statuses','tasks','job_updates','job_activity_logs'] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all privileges on table public.%I from anon, authenticated', v_table);
    execute format('grant all privileges on table public.%I to service_role', v_table);
  end loop;
end;
$$;

grant select on public.jobs, public.job_steps, public.job_task_statuses, public.tasks, public.job_updates to authenticated;

create policy "Active staff read jobs" on public.jobs for select to authenticated using (public.is_staff_role());
create policy "Active staff read job steps" on public.job_steps for select to authenticated using (public.is_staff_role());
create policy "Active staff read job task statuses" on public.job_task_statuses for select to authenticated using (public.is_staff_role());
create policy "Active staff read active tasks" on public.tasks for select to authenticated using (public.is_staff_role() and deleted_at is null);
create policy "Active staff read job updates" on public.job_updates for select to authenticated using (public.is_staff_role());

drop policy if exists "Active admins read clients" on public.clients;
create policy "Active staff read relevant clients" on public.clients for select to authenticated
using (
  public.is_admin_role()
  or (
    public.is_staff_role()
    and exists (select 1 from public.jobs j where j.client_id=clients.id)
  )
);

create or replace function private.can_manage_job(p_job_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_active_admin(p_user_id)
    or (
      private.is_active_staff(p_user_id)
      and exists (select 1 from public.jobs j where j.id=p_job_id and j.pic_id=p_user_id)
    );
$$;
revoke all on function private.can_manage_job(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function private.assert_assignable_profile(p_profile_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if p_profile_id is null or not exists(
    select 1 from public.profiles p
    where p.id=p_profile_id and p.is_active=true and p.deleted_at is null
  ) then raise exception 'Assignee/PIC must be an active profile.' using errcode='23503'; end if;
end; $$;
revoke all on function private.assert_assignable_profile(uuid) from public,anon,authenticated,service_role;

create or replace function private.log_job_activity(
  p_job_id uuid,
  p_action text,
  p_old_values jsonb default '{}'::jsonb,
  p_new_values jsonb default '{}'::jsonb,
  p_reason text default null,
  p_task_id uuid default null,
  p_job_step_id uuid default null,
  p_job_update_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  insert into public.job_activity_logs(job_id,task_id,job_step_id,job_update_id,actor_id,action,old_values,new_values,reason)
  values(p_job_id,p_task_id,p_job_step_id,p_job_update_id,auth.uid(),p_action,coalesce(p_old_values,'{}'::jsonb),coalesce(p_new_values,'{}'::jsonb),nullif(btrim(p_reason),''))
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function private.log_job_activity(uuid,text,jsonb,jsonb,text,uuid,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.create_job(
  p_client_id uuid,
  p_title text,
  p_internal_service_id uuid,
  p_priority_id uuid,
  p_pic_id uuid default null,
  p_description text default null,
  p_start_date date default null,
  p_estimated_end_date date default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid:=auth.uid(); v_job_id uuid; v_pic uuid; v_category uuid; v_template uuid; v_status uuid;
begin
  if not private.is_active_staff(v_actor) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date < p_start_date then raise exception 'Estimated end date cannot precede start date.' using errcode='22023'; end if;
  if not exists(select 1 from public.clients where id=p_client_id and archived_at is null) then raise exception 'Active client not found.' using errcode='23503'; end if;
  select s.category_id,s.workflow_template_id into v_category,v_template
  from public.internal_services s join public.internal_service_categories c on c.id=s.category_id join public.workflow_templates w on w.id=s.workflow_template_id
  where s.id=p_internal_service_id and s.is_active and c.is_active and w.is_active;
  if not found or not exists(select 1 from public.workflow_template_steps where workflow_template_id=v_template) then raise exception 'Service requires an active workflow.' using errcode='23503'; end if;
  if not exists(select 1 from public.priorities where id=p_priority_id and is_active) then raise exception 'Active priority not found.' using errcode='23503'; end if;
  if private.is_active_admin(v_actor) then v_pic:=coalesce(p_pic_id,v_actor); else v_pic:=v_actor; end if;
  perform private.assert_assignable_profile(v_pic);
  select id into v_status from public.job_statuses where code='NOT_STARTED' and is_active;
  if v_status is null then raise exception 'NOT_STARTED status is unavailable.' using errcode='55000'; end if;

  insert into public.jobs(client_id,title,description,pic_id,category_id,internal_service_id,workflow_template_id,priority_id,status_id,start_date,estimated_end_date,created_by,updated_by)
  values(p_client_id,btrim(p_title),nullif(btrim(p_description),''),v_pic,v_category,p_internal_service_id,v_template,p_priority_id,v_status,p_start_date,p_estimated_end_date,v_actor,v_actor)
  returning id into v_job_id;

  insert into public.job_steps(job_id,template_step_id,name,description,position,created_by,updated_by)
  select v_job_id,s.id,s.name,s.description,s.position,v_actor,v_actor from public.workflow_template_steps s where s.workflow_template_id=v_template order by s.position;

  insert into public.job_task_statuses(job_id,task_status_id,column_order,created_by,updated_by)
  select v_job_id,s.id,x.column_order,v_actor,v_actor
  from (values('NOT_STARTED',1),('IN_PROGRESS',2),('COMPLETED',3)) x(code,column_order)
  join public.task_statuses s on s.code=x.code and s.is_active;
  if (select count(*) from public.job_task_statuses where job_id=v_job_id) <> 3 then raise exception 'Default Task statuses are unavailable.' using errcode='55000'; end if;

  perform private.log_job_activity(v_job_id,'JOB_CREATED','{}'::jsonb,jsonb_build_object('title',btrim(p_title),'pic_id',v_pic,'service_id',p_internal_service_id));
  return v_job_id;
end; $$;

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
  select s.category_id,s.workflow_template_id into v_category,v_template from public.internal_services s join public.internal_service_categories c on c.id=s.category_id join public.workflow_templates w on w.id=s.workflow_template_id where s.id=p_internal_service_id and s.is_active and c.is_active and w.is_active;
  if not found then raise exception 'Active service/workflow not found.' using errcode='23503'; end if;
  v_pic:=v_job.pic_id;
  if p_pic_id is not null and p_pic_id is distinct from v_job.pic_id then
    if not private.is_active_admin(v_actor) then raise exception 'Only an admin can change PIC.' using errcode='42501'; end if;
    perform private.assert_assignable_profile(p_pic_id); v_pic:=p_pic_id;
  end if;

  if v_job.internal_service_id is distinct from p_internal_service_id then
    update public.job_steps set replaced_at=pg_catalog.now(),replaced_by=v_actor,updated_by=v_actor,version=version+1 where job_id=p_job_id and replaced_at is null;
    insert into public.job_steps(job_id,template_step_id,name,description,position,created_by,updated_by)
    select p_job_id,s.id,s.name,s.description,s.position,v_actor,v_actor from public.workflow_template_steps s where s.workflow_template_id=v_template order by s.position;
  end if;

  update public.jobs set client_id=p_client_id,title=btrim(p_title),description=nullif(btrim(p_description),''),pic_id=v_pic,category_id=v_category,internal_service_id=p_internal_service_id,workflow_template_id=v_template,priority_id=p_priority_id,start_date=p_start_date,estimated_end_date=p_estimated_end_date,updated_by=v_actor,version=version+1
  where id=p_job_id returning version into v_version;
  perform private.log_job_activity(p_job_id,case when v_job.internal_service_id is distinct from p_internal_service_id then 'JOB_WORKFLOW_RESTARTED' else 'JOB_UPDATED' end,to_jsonb(v_job)-array['created_at','updated_at'],jsonb_build_object('client_id',p_client_id,'title',btrim(p_title),'pic_id',v_pic,'service_id',p_internal_service_id,'priority_id',p_priority_id));
  return v_version;
end; $$;

create or replace function public.change_job_status(p_job_id uuid,p_expected_version integer,p_status_code text,p_reason text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_status uuid; v_code text:=upper(btrim(p_status_code)); v_version integer;
begin
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if v_code not in ('IN_PROGRESS','ON_HOLD','OBSTACLE') then raise exception 'This Job status cannot be selected manually.' using errcode='22023'; end if;
  if v_code in ('ON_HOLD','OBSTACLE') and nullif(btrim(p_reason),'') is null then raise exception 'A reason is required.' using errcode='22023'; end if;
  select id into v_status from public.job_statuses where code=v_code and is_active;
  update public.jobs set status_id=v_status,status_reason=case when v_code in('ON_HOLD','OBSTACLE') then btrim(p_reason) else null end,started_at=case when v_code='IN_PROGRESS' then coalesce(started_at,pg_catalog.now()) else started_at end,updated_by=v_actor,version=version+1 where id=p_job_id returning version into v_version;
  perform private.log_job_activity(p_job_id,'JOB_STATUS_CHANGED',jsonb_build_object('status_id',v_job.status_id,'status_reason',v_job.status_reason),jsonb_build_object('status_id',v_status,'status_reason',case when v_code in('ON_HOLD','OBSTACLE') then btrim(p_reason) else null end),p_reason);
  return v_version;
end; $$;

create or replace function public.complete_job_step(p_job_step_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_step public.job_steps%rowtype; v_job public.jobs%rowtype; v_current uuid; v_is_final boolean; v_status_code text; v_completed_status uuid;
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
    update public.jobs set status_id=v_completed_status,status_reason=null,completed_at=pg_catalog.now(),updated_by=v_actor,version=version+1 where id=v_job.id;
  end if;
  perform private.log_job_activity(v_job.id,'JOB_STEP_COMPLETED',jsonb_build_object('is_completed',false),jsonb_build_object('is_completed',true,'job_completed',v_is_final),null,null,v_step.id,null);
end; $$;

create or replace function public.revert_last_job_step(p_job_step_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_step public.job_steps%rowtype; v_last uuid; v_job_status text;
begin
  select * into v_step from public.job_steps where id=p_job_step_id and replaced_at is null for update;
  if not found then raise exception 'Active Job step not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs where id=v_step.job_id for update;
  if not private.can_manage_job(v_step.job_id,v_actor) then raise exception 'Step management is not allowed.' using errcode='42501'; end if;
  if v_step.version<>p_expected_version then raise exception 'Stale step version.' using errcode='40001'; end if;
  select s.code into v_job_status from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_step.job_id;
  if v_job_status='COMPLETED' then raise exception 'Use reopen_job for a completed Job.' using errcode='55000'; end if;
  select id into v_last from public.job_steps where job_id=v_step.job_id and replaced_at is null and is_completed order by position desc limit 1;
  if v_last is distinct from v_step.id then raise exception 'Only the last completed step can be reverted.' using errcode='55000'; end if;
  update public.job_steps set is_completed=false,completed_at=null,completed_by=null,updated_by=v_actor,version=version+1 where id=v_step.id;
  perform private.log_job_activity(v_step.job_id,'JOB_STEP_REVERTED',jsonb_build_object('is_completed',true),jsonb_build_object('is_completed',false),null,null,v_step.id,null);
end; $$;

create or replace function public.reopen_job(p_job_id uuid,p_expected_version integer,p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_final public.job_steps%rowtype; v_progress uuid; v_version integer;
begin
  if nullif(btrim(p_reason),'') is null then raise exception 'Reopen reason is required.' using errcode='22023'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if not exists(select 1 from public.job_statuses s where s.id=v_job.status_id and s.code='COMPLETED') then raise exception 'Only completed Jobs can be reopened.' using errcode='55000'; end if;
  select * into v_final from public.job_steps where job_id=p_job_id and replaced_at is null order by position desc limit 1 for update;
  if not v_final.is_completed then raise exception 'Final step is not completed.' using errcode='55000'; end if;
  update public.job_steps set is_completed=false,completed_at=null,completed_by=null,updated_by=v_actor,version=version+1 where id=v_final.id;
  select id into v_progress from public.job_statuses where code='IN_PROGRESS';
  update public.jobs set status_id=v_progress,status_reason=null,completed_at=null,started_at=coalesce(started_at,pg_catalog.now()),updated_by=v_actor,version=version+1 where id=p_job_id returning version into v_version;
  perform private.log_job_activity(p_job_id,'JOB_REOPENED',jsonb_build_object('status_id',v_job.status_id),jsonb_build_object('status_id',v_progress),p_reason,null,v_final.id,null);
  return v_version;
end; $$;

create or replace function public.archive_job(p_job_id uuid,p_expected_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  update public.jobs set archived_at=pg_catalog.now(),archived_by=v_actor,updated_by=v_actor,version=version+1 where id=p_job_id and version=p_expected_version and archived_at is null returning version into v_version;
  if not found then raise exception 'Job not found, archived, or stale.' using errcode='40001'; end if;
  perform private.log_job_activity(p_job_id,'JOB_ARCHIVED'); return v_version;
end; $$;

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
end; $$;

create or replace function public.create_task(
  p_job_id uuid,p_job_task_status_id uuid default null,p_title text default null,p_description text default null,
  p_assignee_id uuid default null,p_priority_id uuid default null,p_due_date date default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_admin boolean; v_pic boolean; v_status_id uuid:=p_job_task_status_id; v_assignee uuid; v_title text; v_id uuid; v_position bigint;
begin
  if not private.is_active_staff(v_actor) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=p_job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is unavailable or read-only.' using errcode='55000'; end if;
  v_admin:=private.is_active_admin(v_actor); v_pic:=private.can_manage_job(p_job_id,v_actor);
  if not (v_admin or v_pic) then v_assignee:=v_actor; else v_assignee:=p_assignee_id; end if;
  if v_assignee is not null then perform private.assert_assignable_profile(v_assignee); end if;
  if v_status_id is null then select jts.id into v_status_id from public.job_task_statuses jts join public.task_statuses s on s.id=jts.task_status_id where jts.job_id=p_job_id and s.code='NOT_STARTED'; end if;
  if not exists(select 1 from public.job_task_statuses where id=v_status_id and job_id=p_job_id) then raise exception 'Task status is not configured for this Job.' using errcode='23503'; end if;
  if p_priority_id is not null and not exists(select 1 from public.priorities where id=p_priority_id and is_active) then raise exception 'Priority is unavailable.' using errcode='23503'; end if;
  v_title:=nullif(btrim(p_title),'');
  if v_title is null then v_title:=coalesce(nullif(left(regexp_replace(btrim(coalesce(p_description,'')),'\s+',' ','g'),120),''),'Untitled Task'); end if;
  select coalesce(min(position)-1000,0) into v_position from public.tasks where job_id=p_job_id and job_task_status_id=v_status_id and deleted_at is null;
  insert into public.tasks(job_id,job_task_status_id,title,description,assignee_id,priority_id,due_date,position,created_by,updated_by)
  values(p_job_id,v_status_id,v_title,nullif(btrim(p_description),''),v_assignee,p_priority_id,p_due_date,v_position,v_actor,v_actor) returning id into v_id;
  perform private.log_job_activity(p_job_id,'TASK_CREATED','{}'::jsonb,jsonb_build_object('title',v_title,'assignee_id',v_assignee,'status_id',v_status_id),null,v_id,null,null);
  return v_id;
end; $$;

create or replace function public.update_task(
  p_task_id uuid,p_expected_version integer,p_title text,p_description text default null,
  p_assignee_id uuid default null,p_priority_id uuid default null,p_due_date date default null
)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_task public.tasks%rowtype; v_assignee uuid; v_version integer; v_manager boolean;
begin
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_task.job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is read-only.' using errcode='55000'; end if;
  v_manager:=private.can_manage_job(v_task.job_id,v_actor);
  if not v_manager and v_task.assignee_id is distinct from v_actor then raise exception 'Task management is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  v_assignee:=case when v_manager then p_assignee_id else v_actor end;
  if v_assignee is not null then perform private.assert_assignable_profile(v_assignee); end if;
  if p_priority_id is not null and not exists(select 1 from public.priorities where id=p_priority_id and is_active) then raise exception 'Priority is unavailable.' using errcode='23503'; end if;
  update public.tasks set title=coalesce(nullif(btrim(p_title),''),'Untitled Task'),description=nullif(btrim(p_description),''),assignee_id=v_assignee,priority_id=p_priority_id,due_date=p_due_date,updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
  perform private.log_job_activity(v_task.job_id,'TASK_UPDATED',jsonb_build_object('title',v_task.title,'assignee_id',v_task.assignee_id,'priority_id',v_task.priority_id,'due_date',v_task.due_date),jsonb_build_object('title',coalesce(nullif(btrim(p_title),''),'Untitled Task'),'assignee_id',v_assignee,'priority_id',p_priority_id,'due_date',p_due_date),null,p_task_id,null,null);
  return v_version;
end; $$;

create or replace function public.move_task(p_task_id uuid,p_expected_version integer,p_job_task_status_id uuid,p_position bigint default 0)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_task public.tasks%rowtype; v_version integer;
begin
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_task.job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if not private.can_manage_job(v_task.job_id,v_actor) and v_task.assignee_id is distinct from v_actor then raise exception 'Task movement is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  if not exists(select 1 from public.job_task_statuses where id=p_job_task_status_id and job_id=v_task.job_id) then raise exception 'Target status is not configured for this Job.' using errcode='23503'; end if;
  update public.tasks set job_task_status_id=p_job_task_status_id,position=p_position,updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
  perform private.log_job_activity(v_task.job_id,'TASK_MOVED',jsonb_build_object('status_id',v_task.job_task_status_id,'position',v_task.position),jsonb_build_object('status_id',p_job_task_status_id,'position',p_position),null,p_task_id,null,null);
  return v_version;
end; $$;

create or replace function public.delete_task(p_task_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_task.job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if not private.can_manage_job(v_task.job_id,v_actor) and v_task.assignee_id is distinct from v_actor then raise exception 'Task deletion is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  update public.tasks set deleted_at=pg_catalog.now(),deleted_by=v_actor,updated_by=v_actor,version=version+1 where id=p_task_id;
  perform private.log_job_activity(v_task.job_id,'TASK_DELETED',to_jsonb(v_task)-array['created_at','updated_at'],'{}'::jsonb,null,p_task_id,null,null);
end; $$;

create or replace function public.create_job_update(p_job_id uuid,p_message text,p_progress_date date,p_performed_by uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Remark management is not allowed.' using errcode='42501'; end if;
  if exists(select 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=p_job_id and (j.archived_at is not null or s.code='COMPLETED')) then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if p_progress_date is null then raise exception 'Progress date is required.' using errcode='22023'; end if;
  if p_performed_by is not null then perform private.assert_assignable_profile(p_performed_by); end if;
  insert into public.job_updates(job_id,message,progress_date,performed_by,created_by,updated_by) values(p_job_id,btrim(p_message),p_progress_date,p_performed_by,v_actor,v_actor) returning id into v_id;
  perform private.log_job_activity(p_job_id,'JOB_UPDATE_CREATED','{}'::jsonb,jsonb_build_object('message',btrim(p_message),'progress_date',p_progress_date,'performed_by',p_performed_by),null,null,null,v_id);
  return v_id;
end; $$;

create or replace function public.update_job_update(p_update_id uuid,p_expected_version integer,p_message text,p_progress_date date,p_performed_by uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_update public.job_updates%rowtype; v_version integer;
begin
  select * into v_update from public.job_updates where id=p_update_id for update;
  if not found then raise exception 'Remark not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(v_update.job_id,v_actor) then raise exception 'Remark management is not allowed.' using errcode='42501'; end if;
  if exists(select 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_update.job_id and (j.archived_at is not null or s.code='COMPLETED')) then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if v_update.version<>p_expected_version then raise exception 'Stale Remark version.' using errcode='40001'; end if;
  if p_progress_date is null then raise exception 'Progress date is required.' using errcode='22023'; end if;
  if p_performed_by is not null then perform private.assert_assignable_profile(p_performed_by); end if;
  update public.job_updates set message=btrim(p_message),progress_date=p_progress_date,performed_by=p_performed_by,updated_by=v_actor,version=version+1 where id=p_update_id returning version into v_version;
  perform private.log_job_activity(v_update.job_id,'JOB_UPDATE_UPDATED',jsonb_build_object('message',v_update.message,'progress_date',v_update.progress_date,'performed_by',v_update.performed_by),jsonb_build_object('message',btrim(p_message),'progress_date',p_progress_date,'performed_by',p_performed_by),null,null,null,p_update_id);
  return v_version;
end; $$;

create or replace function public.delete_job_update(p_update_id uuid,p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_update public.job_updates%rowtype;
begin
  select * into v_update from public.job_updates where id=p_update_id for update;
  if not found then raise exception 'Remark not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(v_update.job_id,v_actor) then raise exception 'Remark management is not allowed.' using errcode='42501'; end if;
  if exists(select 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_update.job_id and (j.archived_at is not null or s.code='COMPLETED')) then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if v_update.version<>p_expected_version then raise exception 'Stale Remark version.' using errcode='40001'; end if;
  perform private.log_job_activity(v_update.job_id,'JOB_UPDATE_DELETED',to_jsonb(v_update)-array['created_at','updated_at'],'{}'::jsonb,null,null,null,p_update_id);
  delete from public.job_updates where id=p_update_id;
end; $$;

create or replace function public.list_job_activity(p_job_id uuid,p_limit integer default 100,p_before timestamptz default null)
returns table(id uuid,job_id uuid,task_id uuid,job_step_id uuid,job_update_id uuid,actor_id uuid,action text,old_values jsonb,new_values jsonb,reason text,created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select l.id,l.job_id,l.task_id,l.job_step_id,l.job_update_id,l.actor_id,l.action,l.old_values,l.new_values,l.reason,l.created_at
  from public.job_activity_logs l
  where private.is_active_staff(auth.uid()) and l.job_id=p_job_id and (p_before is null or l.created_at<p_before)
  order by l.created_at desc,l.id desc limit least(greatest(coalesce(p_limit,100),1),200);
$$;

create or replace view public.job_overview
with (security_invoker=true)
as
select
  j.*,
  coalesce(step_metrics.progress_percentage,0) as progress_percentage,
  step_metrics.current_step_name,
  case when j.start_date is not null and j.estimated_end_date is not null then j.estimated_end_date-j.start_date end as estimated_duration_days,
  coalesce(task_metrics.task_count,0) as task_count
from public.jobs j
left join lateral (
  select
    coalesce(round(100.0*count(*) filter(where js.is_completed)/nullif(count(*),0)),0)::integer as progress_percentage,
    (array_agg(js.name order by js.position) filter(where not js.is_completed))[1] as current_step_name
  from public.job_steps js where js.job_id=j.id and js.replaced_at is null
) step_metrics on true
left join lateral (
  select count(*)::integer as task_count from public.tasks t where t.job_id=j.id and t.deleted_at is null
) task_metrics on true;

revoke all on public.job_overview from anon,authenticated;
grant select on public.job_overview to authenticated;

do $$
declare r record;
begin
  for r in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in(
    'create_job','update_job','change_job_status','complete_job_step','revert_last_job_step','reopen_job','archive_job','configure_job_task_statuses',
    'create_task','update_task','move_task','delete_task','create_job_update','update_job_update','delete_job_update','list_job_activity'
  ) loop
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.signature);
    execute format('grant execute on function %s to authenticated',r.signature);
    execute format('grant execute on function %s to service_role',r.signature);
  end loop;
end; $$;

comment on table public.job_steps is 'Immutable-per-workflow Job step snapshots. Active rows have replaced_at IS NULL.';
comment on table public.job_activity_logs is 'Append-only activity written only by trusted database functions.';
comment on view public.job_overview is 'RLS-aware derived Job metrics; values are calculated, not authorization state.';

commit;
