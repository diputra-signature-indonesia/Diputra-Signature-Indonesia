-- Service categories and internal services are ordinary reference lists. Their
-- presentation is sorted by name or creation time, not by semantic rank.

drop function if exists public.save_internal_service_category(uuid, integer, text, text, text, text, integer, boolean);
drop function if exists public.save_internal_service(uuid, integer, uuid, text, text, text, uuid, integer, boolean);

drop index if exists public.internal_services_category_idx;

alter table public.internal_service_categories
  drop column if exists sort_order;

alter table public.internal_services
  drop column if exists sort_order;

create index internal_service_categories_name_idx
  on public.internal_service_categories (name, id);

create index internal_services_name_idx
  on public.internal_services (name, id);

create index internal_services_category_name_idx
  on public.internal_services (category_id, name, id);

create or replace function public.save_internal_service_category(
  p_id uuid,
  p_expected_version integer,
  p_code text,
  p_name text,
  p_description text default null,
  p_color text default null,
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

  if p_id is null then
    insert into public.internal_service_categories (
      code, name, description, color, is_active, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), nullif(btrim(p_description), ''),
      nullif(btrim(p_color), ''), p_is_active, v_actor, v_actor
    )
    returning id into v_id;
  else
    update public.internal_service_categories
    set
      name = btrim(p_name),
      description = nullif(btrim(p_description), ''),
      color = nullif(btrim(p_color), ''),
      is_active = p_is_active,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Category not found or stale.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.save_internal_service(
  p_id uuid,
  p_expected_version integer,
  p_category_id uuid,
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

  if not exists (
    select 1
    from public.internal_service_categories
    where id = p_category_id
      and is_active
  ) then
    raise exception 'Active category not found.' using errcode = '23503';
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
      category_id, workflow_template_id, code, name, summary,
      is_active, created_by, updated_by
    ) values (
      p_category_id, p_workflow_template_id, upper(btrim(p_code)), btrim(p_name),
      nullif(btrim(p_summary), ''), p_is_active, v_actor, v_actor
    )
    returning id into v_id;
  else
    update public.internal_services
    set
      category_id = p_category_id,
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

revoke all on function public.save_internal_service_category(uuid, integer, text, text, text, text, boolean) from public, anon;
grant execute on function public.save_internal_service_category(uuid, integer, text, text, text, text, boolean) to authenticated, service_role;

revoke all on function public.save_internal_service(uuid, integer, uuid, text, text, text, uuid, boolean) from public, anon;
grant execute on function public.save_internal_service(uuid, integer, uuid, text, text, text, uuid, boolean) to authenticated, service_role;
