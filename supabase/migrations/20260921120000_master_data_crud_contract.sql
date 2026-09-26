begin;

-- Complete the admin Master Data mutation surface. Browser roles keep SELECT
-- only table privileges; all writes pass through hardened RPCs that validate
-- an active admin/super_admin profile and use optimistic locking.

create or replace function public.save_job_status(
  p_id uuid,
  p_expected_version integer,
  p_code text,
  p_name text,
  p_color text,
  p_sort_order integer default 0,
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
  v_system boolean;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.job_statuses (
      code, name, color, sort_order, is_active, is_system, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), upper(btrim(p_color)), p_sort_order,
      p_is_active, false, v_actor, v_actor
    )
    returning id into v_id;
  else
    select is_system
    into v_system
    from public.job_statuses
    where id = p_id
    for update;

    if not found then
      raise exception 'Job status not found.' using errcode = 'P0002';
    end if;

    update public.job_statuses
    set
      name = btrim(p_name),
      color = upper(btrim(p_color)),
      sort_order = p_sort_order,
      is_active = case when v_system then true else p_is_active end,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Stale Job status version.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.set_master_data_active(
  p_entity text,
  p_id uuid,
  p_expected_version integer,
  p_is_active boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_entity text := upper(btrim(p_entity));
  v_is_system boolean;
  v_version integer;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_id is null or p_expected_version is null or p_is_active is null then
    raise exception 'Master Data lifecycle input is invalid.' using errcode = '22023';
  end if;

  if v_entity = 'PRIORITY' then
    select is_system into v_is_system from public.priorities where id = p_id for update;
    if not found then raise exception 'Priority not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then
      raise exception 'System priorities must remain active.' using errcode = '55000';
    end if;
    update public.priorities
    set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version
    returning version into v_version;

  elsif v_entity = 'JOB_STATUS' then
    select is_system into v_is_system from public.job_statuses where id = p_id for update;
    if not found then raise exception 'Job status not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then
      raise exception 'System Job statuses must remain active.' using errcode = '55000';
    end if;
    update public.job_statuses
    set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version
    returning version into v_version;

  elsif v_entity = 'TASK_STATUS' then
    select is_system into v_is_system from public.task_statuses where id = p_id for update;
    if not found then raise exception 'Task status not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then
      raise exception 'System Task statuses must remain active.' using errcode = '55000';
    end if;
    update public.task_statuses
    set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version
    returning version into v_version;

  elsif v_entity = 'INTERNAL_SERVICE' then
    update public.internal_services
    set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version
    returning version into v_version;

  elsif v_entity = 'WORKFLOW_TEMPLATE' then
    if not p_is_active and exists (
      select 1
      from public.internal_services
      where workflow_template_id = p_id
        and is_active
    ) then
      raise exception 'Reassign active services before deactivating this workflow.' using errcode = '23503';
    end if;
    update public.workflow_templates
    set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version
    returning version into v_version;

  else
    raise exception 'Unsupported Master Data entity.' using errcode = '22023';
  end if;

  if v_version is null then
    raise exception 'Master Data record is stale or unavailable.' using errcode = '40001';
  end if;

  return v_version;
end;
$$;

create or replace function public.save_workflow_template(
  p_id uuid,
  p_expected_version integer,
  p_code text,
  p_name text,
  p_description text,
  p_steps jsonb,
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
  v_used boolean := false;
  v_current_version integer;
  v_current_code text;
  v_current_name text;
  v_current_description text;
  v_current_steps jsonb;
  v_requested_steps jsonb;
  v_content_changed boolean;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'Workflow requires at least one step.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_steps) as item
    where btrim(coalesce(item->>'name', '')) = ''
  ) then
    raise exception 'Every workflow step requires a name.' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', btrim(item->>'name'),
        'description', nullif(btrim(item->>'description'), '')
      )
      order by ordinality
    ),
    '[]'::jsonb
  )
  into v_requested_steps
  from jsonb_array_elements(p_steps) with ordinality as requested(item, ordinality);

  if p_id is null then
    insert into public.workflow_templates (
      code, name, description, is_active, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), nullif(btrim(p_description), ''),
      p_is_active, v_actor, v_actor
    )
    returning id into v_id;

    insert into public.workflow_template_steps (
      workflow_template_id, name, description, position, created_by, updated_by
    )
    select
      v_id,
      step->>'name',
      step->>'description',
      ordinality::integer,
      v_actor,
      v_actor
    from jsonb_array_elements(v_requested_steps) with ordinality as requested(step, ordinality);

    return v_id;
  end if;

  select version, code, name, description
  into v_current_version, v_current_code, v_current_name, v_current_description
  from public.workflow_templates
  where id = p_id
  for update;

  if not found then
    raise exception 'Workflow not found.' using errcode = 'P0002';
  end if;
  if v_current_version <> p_expected_version then
    raise exception 'Stale workflow version.' using errcode = '40001';
  end if;
  if v_current_code is distinct from upper(btrim(p_code)) then
    raise exception 'Workflow code is permanent.' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', name, 'description', description)
      order by position
    ),
    '[]'::jsonb
  )
  into v_current_steps
  from public.workflow_template_steps
  where workflow_template_id = p_id;

  v_content_changed :=
    v_current_name is distinct from btrim(p_name)
    or v_current_description is distinct from nullif(btrim(p_description), '')
    or v_current_steps is distinct from v_requested_steps;

  if v_content_changed then
    select exists (
      select 1 from public.jobs where workflow_template_id = p_id
    ) into v_used;
    if v_used then
      raise exception 'A workflow used by a Job is immutable.' using errcode = '55000';
    end if;

    delete from public.workflow_template_steps
    where workflow_template_id = p_id;

    insert into public.workflow_template_steps (
      workflow_template_id, name, description, position, created_by, updated_by
    )
    select
      p_id,
      step->>'name',
      step->>'description',
      ordinality::integer,
      v_actor,
      v_actor
    from jsonb_array_elements(v_requested_steps) with ordinality as requested(step, ordinality);
  end if;

  if not p_is_active and exists (
    select 1
    from public.internal_services
    where workflow_template_id = p_id
      and is_active
  ) then
    raise exception 'Reassign active services before deactivating this workflow.' using errcode = '23503';
  end if;

  update public.workflow_templates
  set
    name = btrim(p_name),
    description = nullif(btrim(p_description), ''),
    is_active = p_is_active,
    updated_by = v_actor,
    version = version + 1
  where id = p_id;

  return p_id;
end;
$$;

revoke all on function public.save_job_status(uuid, integer, text, text, text, integer, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.save_job_status(uuid, integer, text, text, text, integer, boolean)
to authenticated, service_role;

revoke all on function public.set_master_data_active(text, uuid, integer, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.set_master_data_active(text, uuid, integer, boolean)
to authenticated, service_role;

revoke all on function public.save_workflow_template(uuid, integer, text, text, text, jsonb, boolean)
from public, anon, authenticated, service_role;
grant execute on function public.save_workflow_template(uuid, integer, text, text, text, jsonb, boolean)
to authenticated, service_role;

commit;
