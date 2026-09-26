begin;

-- The public website catalogue (services_categories/services_items) and the
-- operational admin catalogue (internal_services) are independent domains.
-- A Job's "Category" selection is its internal Service; it must never point
-- at landing-page content or an intermediate category table.

drop view if exists public.job_overview;

drop function if exists public.save_internal_service_category(uuid, integer, text, text, text, text, boolean);
drop function if exists public.save_internal_service(uuid, integer, uuid, text, text, text, uuid, boolean);

drop index if exists public.internal_services_category_name_idx;
drop index if exists public.internal_service_categories_name_idx;

alter table public.jobs
  drop column if exists category_id;

alter table public.internal_services
  drop column if exists category_id;

drop table if exists public.internal_service_categories;

create or replace function public.save_internal_service(
  p_id uuid,
  p_expected_version integer,
  p_code text,
  p_name text,
  p_summary text default null,
  p_workflow_template_id uuid default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_workflow_template_id is not null and not exists (
    select 1
    from public.workflow_templates
    where id = p_workflow_template_id
      and is_active
  ) then
    raise exception 'Active workflow not found.' using errcode = '23503';
  end if;

  if p_id is null then
    insert into public.internal_services (
      workflow_template_id, code, name, summary,
      is_active, created_by, updated_by
    ) values (
      p_workflow_template_id, upper(btrim(p_code)), btrim(p_name),
      nullif(btrim(p_summary), ''), p_is_active, v_actor, v_actor
    )
    returning id into v_id;
  else
    update public.internal_services
    set
      workflow_template_id = p_workflow_template_id,
      name = btrim(p_name),
      summary = nullif(btrim(p_summary), ''),
      is_active = p_is_active,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Service not found or stale.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;

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
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job_id uuid;
  v_pic uuid;
  v_template uuid;
  v_status uuid;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date < p_start_date then
    raise exception 'Estimated end date cannot precede start date.' using errcode = '22023';
  end if;
  if not exists(select 1 from public.clients where id = p_client_id and archived_at is null) then
    raise exception 'Active client not found.' using errcode = '23503';
  end if;

  select s.workflow_template_id
  into v_template
  from public.internal_services s
  join public.workflow_templates w on w.id = s.workflow_template_id
  where s.id = p_internal_service_id
    and s.is_active
    and w.is_active;

  if not found or not exists(
    select 1 from public.workflow_template_steps where workflow_template_id = v_template
  ) then
    raise exception 'Service requires an active workflow.' using errcode = '23503';
  end if;
  if not exists(select 1 from public.priorities where id = p_priority_id and is_active) then
    raise exception 'Active priority not found.' using errcode = '23503';
  end if;

  if private.is_active_admin(v_actor) then
    v_pic := coalesce(p_pic_id, v_actor);
  else
    v_pic := v_actor;
  end if;
  perform private.assert_assignable_profile(v_pic);

  select id into v_status
  from public.job_statuses
  where code = 'NOT_STARTED' and is_active;
  if v_status is null then
    raise exception 'NOT_STARTED status is unavailable.' using errcode = '55000';
  end if;

  insert into public.jobs(
    client_id, title, description, pic_id, internal_service_id,
    workflow_template_id, priority_id, status_id, start_date,
    estimated_end_date, created_by, updated_by
  ) values (
    p_client_id, btrim(p_title), nullif(btrim(p_description), ''), v_pic,
    p_internal_service_id, v_template, p_priority_id, v_status, p_start_date,
    p_estimated_end_date, v_actor, v_actor
  )
  returning id into v_job_id;

  insert into public.job_steps(
    job_id, template_step_id, name, description, position, created_by, updated_by
  )
  select v_job_id, s.id, s.name, s.description, s.position, v_actor, v_actor
  from public.workflow_template_steps s
  where s.workflow_template_id = v_template
  order by s.position;

  insert into public.job_task_statuses(
    job_id, task_status_id, column_order, created_by, updated_by
  )
  select v_job_id, s.id, x.column_order, v_actor, v_actor
  from (values ('NOT_STARTED', 1), ('IN_PROGRESS', 2), ('COMPLETED', 3)) x(code, column_order)
  join public.task_statuses s on s.code = x.code and s.is_active;

  if (select count(*) from public.job_task_statuses where job_id = v_job_id) <> 3 then
    raise exception 'Default Task statuses are unavailable.' using errcode = '55000';
  end if;

  perform private.log_job_activity(
    v_job_id,
    'JOB_CREATED',
    '{}'::jsonb,
    jsonb_build_object('title', btrim(p_title), 'pic_id', v_pic, 'service_id', p_internal_service_id)
  );
  return v_job_id;
end;
$$;

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
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_template uuid;
  v_pic uuid;
  v_version integer;
  v_status_code text;
  v_service_changed boolean;
begin
  select j.* into v_job from public.jobs j where j.id = p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode = 'P0002'; end if;
  if not private.can_manage_job(p_job_id, v_actor) then raise exception 'Job management is not allowed.' using errcode = '42501'; end if;
  if v_job.version <> p_expected_version then raise exception 'Stale Job version.' using errcode = '40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode = '55000'; end if;

  select s.code into v_status_code from public.job_statuses s where s.id = v_job.status_id;
  if v_status_code = 'COMPLETED' then raise exception 'Reopen the completed Job before editing.' using errcode = '55000'; end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date < p_start_date then
    raise exception 'Estimated end date cannot precede start date.' using errcode = '22023';
  end if;
  if p_client_id is distinct from v_job.client_id and not exists(
    select 1 from public.clients where id = p_client_id and archived_at is null
  ) then raise exception 'Active client not found.' using errcode = '23503'; end if;
  if p_priority_id is distinct from v_job.priority_id and not exists(
    select 1 from public.priorities where id = p_priority_id and is_active
  ) then raise exception 'Active priority not found.' using errcode = '23503'; end if;

  v_service_changed := p_internal_service_id is distinct from v_job.internal_service_id;
  if v_service_changed then
    select s.workflow_template_id
    into v_template
    from public.internal_services s
    join public.workflow_templates w on w.id = s.workflow_template_id
    where s.id = p_internal_service_id
      and s.is_active
      and w.is_active;

    if not found or not exists(
      select 1 from public.workflow_template_steps where workflow_template_id = v_template
    ) then
      raise exception 'Active service/workflow not found.' using errcode = '23503';
    end if;
  else
    -- A later Master Data workflow reassignment only affects future Jobs.
    v_template := v_job.workflow_template_id;
  end if;

  v_pic := v_job.pic_id;
  if p_pic_id is not null and p_pic_id is distinct from v_job.pic_id then
    if not private.is_active_admin(v_actor) then raise exception 'Only an admin can change PIC.' using errcode = '42501'; end if;
    perform private.assert_assignable_profile(p_pic_id);
    v_pic := p_pic_id;
  end if;

  if v_service_changed then
    update public.job_steps
    set replaced_at = pg_catalog.now(), replaced_by = v_actor,
        updated_by = v_actor, version = version + 1
    where job_id = p_job_id and replaced_at is null;

    insert into public.job_steps(
      job_id, template_step_id, name, description, position, created_by, updated_by
    )
    select p_job_id, s.id, s.name, s.description, s.position, v_actor, v_actor
    from public.workflow_template_steps s
    where s.workflow_template_id = v_template
    order by s.position;
  end if;

  update public.jobs
  set client_id = p_client_id,
      title = btrim(p_title),
      description = nullif(btrim(p_description), ''),
      pic_id = v_pic,
      internal_service_id = p_internal_service_id,
      workflow_template_id = v_template,
      priority_id = p_priority_id,
      start_date = p_start_date,
      estimated_end_date = p_estimated_end_date,
      updated_by = v_actor,
      version = version + 1
  where id = p_job_id
  returning version into v_version;

  perform private.log_job_activity(
    p_job_id,
    case when v_service_changed then 'JOB_WORKFLOW_RESTARTED' else 'JOB_UPDATED' end,
    to_jsonb(v_job) - array['created_at', 'updated_at'],
    jsonb_build_object(
      'client_id', p_client_id,
      'title', btrim(p_title),
      'pic_id', v_pic,
      'service_id', p_internal_service_id,
      'priority_id', p_priority_id
    )
  );
  return v_version;
end;
$$;

create or replace view public.job_overview
with (security_invoker = true)
as
select
  j.*,
  coalesce(step_metrics.progress_percentage, 0) as progress_percentage,
  step_metrics.current_step_name,
  case
    when j.start_date is not null and j.estimated_end_date is not null
      then j.estimated_end_date - j.start_date
  end as estimated_duration_days,
  coalesce(task_metrics.task_count, 0) as task_count
from public.jobs j
left join lateral (
  select
    coalesce(round(100.0 * count(*) filter(where js.is_completed) / nullif(count(*), 0)), 0)::integer as progress_percentage,
    (array_agg(js.name order by js.position) filter(where not js.is_completed))[1] as current_step_name
  from public.job_steps js
  where js.job_id = j.id and js.replaced_at is null
) step_metrics on true
left join lateral (
  select count(*)::integer as task_count
  from public.tasks t
  where t.job_id = j.id and t.deleted_at is null
) task_metrics on true;

drop policy if exists "Active admins read all service categories" on public.services_categories;
create policy "Active admins read all service categories"
on public.services_categories
for select
to authenticated
using (public.is_admin_role());

revoke all on function public.save_internal_service(uuid, integer, text, text, text, uuid, boolean) from public, anon;
grant execute on function public.save_internal_service(uuid, integer, text, text, text, uuid, boolean) to authenticated, service_role;

revoke all on function public.create_job(uuid, text, uuid, uuid, uuid, text, date, date) from public, anon;
grant execute on function public.create_job(uuid, text, uuid, uuid, uuid, text, date, date) to authenticated, service_role;

revoke all on function public.update_job(uuid, integer, uuid, text, uuid, uuid, text, date, date, uuid) from public, anon;
grant execute on function public.update_job(uuid, integer, uuid, text, uuid, uuid, text, date, date, uuid) to authenticated, service_role;

revoke all on public.job_overview from anon, authenticated;
grant select on public.job_overview to authenticated;

comment on table public.services_categories is
  'Landing/client-page service categories. This public content catalogue is independent from admin internal_services.';
comment on table public.internal_services is
  'Admin-only operational Service catalogue used by Jobs and SOPs; independent from public website services.';
comment on column public.jobs.internal_service_id is
  'Operational Service selected for the Job; this is the value labelled Internal Service in admin UI.';
comment on view public.job_overview is
  'RLS-aware derived Job metrics; values are calculated, not authorization state.';

commit;
