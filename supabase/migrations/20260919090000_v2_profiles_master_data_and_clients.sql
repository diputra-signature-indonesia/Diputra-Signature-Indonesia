begin;

-- V2 phase 1: profile lifecycle, internal master data, workflows, and clients.
-- This migration is additive. It deliberately does not reuse or mutate the
-- public website service catalogue (services_categories/services_items).

create schema if not exists private authorization postgres;
revoke all on schema private from public, anon, authenticated;

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_display_name_length;
alter table public.profiles
  add constraint profiles_display_name_length
  check (display_name is null or char_length(btrim(display_name)) between 1 and 160);

-- Preserve operational history if an Auth identity is removed accidentally.
alter table public.profiles drop constraint if exists profile_id_fkey;
alter table public.profiles
  add constraint profile_id_fkey
  foreign key (id) references auth.users(id) on update cascade on delete restrict;

-- reviewed_by cannot be SET NULL because the review-state CHECK requires it.
alter table public.admin_access_requests
  drop constraint if exists admin_access_requests_reviewed_by_fkey;
alter table public.admin_access_requests
  add constraint admin_access_requests_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id)
  on update cascade on delete restrict;

create or replace function private.is_active_staff(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active = true
      and p.deleted_at is null
      and p.role in (
        'super_admin'::public.role,
        'admin'::public.role,
        'staff'::public.role
      )
  );
$$;

create or replace function private.is_active_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active = true
      and p.deleted_at is null
      and p.role in ('super_admin'::public.role, 'admin'::public.role)
  );
$$;

create or replace function private.is_active_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active = true
      and p.deleted_at is null
      and p.role = 'super_admin'::public.role
  );
$$;

revoke all on function private.is_active_staff(uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_active_admin(uuid) from public, anon, authenticated, service_role;
revoke all on function private.is_active_super_admin(uuid) from public, anon, authenticated, service_role;

create or replace function public.current_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select p.role::text
      from public.profiles as p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
    ),
    ''
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_admin(auth.uid());
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_staff(auth.uid());
$$;

create or replace function public.is_active_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_super_admin(auth.uid());
$$;

-- Keep the legacy aliases used by existing application policies.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_active_admin(auth.uid()); $$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_active_staff(auth.uid()); $$;

revoke all on function public.current_role() from public, anon, authenticated, service_role;
revoke all on function public.is_admin_role() from public, anon, authenticated, service_role;
revoke all on function public.is_staff_role() from public, anon, authenticated, service_role;
revoke all on function public.is_active_super_admin() from public, anon, authenticated, service_role;
revoke all on function public.is_admin() from public, anon, authenticated, service_role;
revoke all on function public.is_staff() from public, anon, authenticated, service_role;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin_role() to authenticated;
grant execute on function public.is_staff_role() to authenticated;
grant execute on function public.is_active_super_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- Existing approval must restore an approved profile and copy safe identity
-- metadata without allowing the caller to supply either value.
create or replace function public.approve_admin_access_request(
  p_user_id uuid,
  p_role public.role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_request public.admin_access_requests%rowtype;
begin
  if v_reviewer_id is null or not private.is_active_super_admin(v_reviewer_id) then
    raise exception 'Only an active super admin can approve access requests.' using errcode = '42501';
  end if;

  select r.* into v_request
  from public.admin_access_requests as r
  where r.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Access request not found.' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending'::public.admin_access_request_status then
    raise exception 'Access request has already been reviewed.' using errcode = 'P0001';
  end if;

  insert into public.profiles as p (
    id, email, display_name, avatar_url, role, is_active, deleted_at, updated_at
  ) values (
    v_request.user_id,
    v_request.email,
    v_request.full_name,
    v_request.avatar_url,
    p_role,
    true,
    null,
    pg_catalog.now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, p.display_name),
    avatar_url = coalesce(excluded.avatar_url, p.avatar_url),
    role = excluded.role,
    is_active = true,
    deleted_at = null,
    updated_at = pg_catalog.now();

  update public.admin_access_requests as r set
    status = 'approved'::public.admin_access_request_status,
    reviewed_at = pg_catalog.now(),
    reviewed_by = v_reviewer_id,
    rejection_reason = null
  where r.user_id = v_request.user_id;
end;
$$;

create or replace function public.ensure_admin_access_request()
returns public.admin_access_request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_avatar_url text;
  v_status public.admin_access_request_status;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if private.is_active_staff(v_user_id) then
    return 'approved'::public.admin_access_request_status;
  end if;
  select
    u.email,
    nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','')),''),
    nullif(btrim(coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture','')),'')
  into v_email,v_full_name,v_avatar_url
  from auth.users u where u.id=v_user_id;
  if v_email is null or btrim(v_email)='' then
    raise exception 'The authenticated user does not have an email address.' using errcode='23514';
  end if;
  insert into public.admin_access_requests as r(user_id,email,full_name,avatar_url)
  values(v_user_id,v_email,v_full_name,v_avatar_url)
  on conflict(user_id) do update set
    email=excluded.email,
    full_name=coalesce(excluded.full_name,r.full_name),
    avatar_url=coalesce(excluded.avatar_url,r.avatar_url)
  returning status into v_status;
  return v_status;
end;
$$;

create or replace function public.sync_own_profile_identity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  update public.profiles as p set
    email = u.email,
    display_name = nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', p.display_name, '')), ''),
    avatar_url = nullif(btrim(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', p.avatar_url, '')), ''),
    updated_at = pg_catalog.now()
  from auth.users as u
  where u.id = v_user_id and p.id = v_user_id;

  if not found then
    raise exception 'Approved profile not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.set_profile_active(p_profile_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can change profile access.' using errcode = '42501';
  end if;
  if p_profile_id = auth.uid() and p_is_active = false then
    raise exception 'A super admin cannot deactivate their own profile.' using errcode = '22023';
  end if;
  update public.profiles set is_active = p_is_active, updated_at = pg_catalog.now()
  where id = p_profile_id and deleted_at is null;
  if not found then raise exception 'Profile not found.' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.soft_delete_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can delete profiles.' using errcode = '42501';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'A super admin cannot delete their own profile.' using errcode = '22023';
  end if;
  update public.profiles set is_active = false, deleted_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where id = p_profile_id and deleted_at is null;
  if not found then raise exception 'Active profile not found.' using errcode = 'P0002'; end if;
end;
$$;

create or replace function public.restore_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can restore profiles.' using errcode = '42501';
  end if;
  update public.profiles set deleted_at = null, is_active = false, updated_at = pg_catalog.now()
  where id = p_profile_id and deleted_at is not null;
  if not found then raise exception 'Deleted profile not found.' using errcode = 'P0002'; end if;
end;
$$;

-- Master Data ---------------------------------------------------------------

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint priorities_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  constraint priorities_name_not_blank check (char_length(btrim(name)) between 1 and 100),
  constraint priorities_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.job_statuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_statuses_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  constraint job_statuses_name_not_blank check (char_length(btrim(name)) between 1 and 100),
  constraint job_statuses_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint task_statuses_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  constraint task_statuses_name_not_blank check (char_length(btrim(name)) between 1 and 100),
  constraint task_statuses_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.internal_service_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint internal_service_categories_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  constraint internal_service_categories_name_not_blank check (char_length(btrim(name)) between 1 and 160),
  constraint internal_service_categories_color_hex check (color is null or color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint workflow_templates_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  constraint workflow_templates_name_not_blank check (char_length(btrim(name)) between 1 and 160)
);

create table public.workflow_template_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_template_id uuid not null references public.workflow_templates(id) on delete restrict,
  name text not null,
  description text,
  position integer not null check (position > 0),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint workflow_template_steps_name_not_blank check (char_length(btrim(name)) between 1 and 160),
  constraint workflow_template_steps_template_position_key unique (workflow_template_id, position)
);

create table public.internal_services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.internal_service_categories(id) on delete restrict,
  workflow_template_id uuid references public.workflow_templates(id) on delete restrict,
  code text not null unique,
  name text not null,
  summary text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint internal_services_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  constraint internal_services_name_not_blank check (char_length(btrim(name)) between 1 and 160)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_type text not null,
  name text not null,
  contact_person text,
  email text,
  phone text,
  address text,
  notes text,
  archived_at timestamptz,
  archived_by uuid references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint clients_type_check check (client_type in ('COMPANY', 'INDIVIDUAL')),
  constraint clients_name_not_blank check (char_length(btrim(name)) between 1 and 200),
  constraint clients_archive_state check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  )
);

create index clients_active_name_idx on public.clients (name, id) where archived_at is null;
create index internal_services_category_idx on public.internal_services (category_id, sort_order, id);
create index workflow_template_steps_order_idx on public.workflow_template_steps (workflow_template_id, position);

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'priorities','job_statuses','task_statuses','internal_service_categories',
    'workflow_templates','workflow_template_steps','internal_services','clients'
  ] loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', v_table, v_table);
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all privileges on table public.%I from anon, authenticated', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format('grant all privileges on table public.%I to service_role', v_table);
  end loop;
end;
$$;

create policy "Active staff read priorities" on public.priorities for select to authenticated using (public.is_staff_role());
create policy "Active staff read job statuses" on public.job_statuses for select to authenticated using (public.is_staff_role());
create policy "Active staff read task statuses" on public.task_statuses for select to authenticated using (public.is_staff_role());
create policy "Active staff read internal categories" on public.internal_service_categories for select to authenticated using (public.is_staff_role());
create policy "Active staff read workflow templates" on public.workflow_templates for select to authenticated using (public.is_staff_role());
create policy "Active staff read workflow steps" on public.workflow_template_steps for select to authenticated using (public.is_staff_role());
create policy "Active staff read internal services" on public.internal_services for select to authenticated using (public.is_staff_role());
create policy "Active admins read clients" on public.clients for select to authenticated using (public.is_admin_role());

-- Stable system seeds. UUID values are deterministic so clean local resets and
-- production rollout produce identical foreign-key targets.
insert into public.priorities (id, code, name, color, sort_order, is_active, is_system)
values
  ('21000000-0000-4000-8000-000000000001', 'HIGH', 'High', '#EF4444', 10, true, true),
  ('21000000-0000-4000-8000-000000000002', 'MEDIUM', 'Medium', '#EAB308', 20, true, true),
  ('21000000-0000-4000-8000-000000000003', 'LOW', 'Low', '#64748B', 30, true, true)
on conflict (code) do nothing;

insert into public.job_statuses (id, code, name, color, sort_order, is_active, is_system)
values
  ('22000000-0000-4000-8000-000000000001', 'NOT_STARTED', 'Not Started', '#94A3B8', 10, true, true),
  ('22000000-0000-4000-8000-000000000002', 'IN_PROGRESS', 'In Progress', '#EAB308', 20, true, true),
  ('22000000-0000-4000-8000-000000000003', 'ON_HOLD', 'On Hold', '#2563EB', 30, true, true),
  ('22000000-0000-4000-8000-000000000004', 'OBSTACLE', 'Obstacle', '#F97316', 40, true, true),
  ('22000000-0000-4000-8000-000000000005', 'COMPLETED', 'Completed', '#22C55E', 50, true, true)
on conflict (code) do nothing;

insert into public.task_statuses (id, code, name, color, sort_order, is_active, is_system)
values
  ('23000000-0000-4000-8000-000000000001', 'NOT_STARTED', 'Not Started', '#94A3B8', 10, true, true),
  ('23000000-0000-4000-8000-000000000002', 'IN_PROGRESS', 'In Progress', '#EAB308', 20, true, true),
  ('23000000-0000-4000-8000-000000000003', 'ON_HOLD', 'On Hold', '#2563EB', 30, true, true),
  ('23000000-0000-4000-8000-000000000004', 'OBSTACLE', 'Obstacle', '#F97316', 40, true, true),
  ('23000000-0000-4000-8000-000000000005', 'COMPLETED', 'Completed', '#22C55E', 50, true, true)
on conflict (code) do nothing;

insert into public.workflow_templates (id, code, name, description, is_active)
values
  ('24000000-0000-4000-8000-000000000001', 'GENERAL', 'Workflow Umum', 'Workflow umum lima tahap.', true),
  ('24000000-0000-4000-8000-000000000002', 'VISA', 'Workflow Visa', 'Workflow visa tiga tahap.', true)
on conflict (code) do nothing;

insert into public.workflow_template_steps (id, workflow_template_id, name, position)
values
  ('24100000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000001', 'ANALISIS', 1),
  ('24100000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000001', 'DRAFTING', 2),
  ('24100000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000001', 'REVISION', 3),
  ('24100000-0000-4000-8000-000000000004', '24000000-0000-4000-8000-000000000001', 'FINALISASI', 4),
  ('24100000-0000-4000-8000-000000000005', '24000000-0000-4000-8000-000000000001', 'ISSUED', 5),
  ('24200000-0000-4000-8000-000000000001', '24000000-0000-4000-8000-000000000002', 'ANALISIS', 1),
  ('24200000-0000-4000-8000-000000000002', '24000000-0000-4000-8000-000000000002', 'APPLY', 2),
  ('24200000-0000-4000-8000-000000000003', '24000000-0000-4000-8000-000000000002', 'ISSUE', 3)
on conflict (workflow_template_id, position) do nothing;

-- Mutating RPCs -------------------------------------------------------------

create or replace function public.create_workflow_template(
  p_code text,
  p_name text,
  p_description text,
  p_steps jsonb
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
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'Workflow requires at least one step.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_steps) e where btrim(coalesce(e->>'name','')) = '') then
    raise exception 'Every workflow step requires a name.' using errcode = '22023';
  end if;

  insert into public.workflow_templates (code, name, description, created_by, updated_by)
  values (upper(btrim(p_code)), btrim(p_name), nullif(btrim(p_description), ''), v_actor, v_actor)
  returning id into v_id;

  insert into public.workflow_template_steps (
    workflow_template_id, name, description, position, created_by, updated_by
  )
  select v_id, btrim(e.value->>'name'), nullif(btrim(e.value->>'description'), ''), e.ordinality::integer, v_actor, v_actor
  from jsonb_array_elements(p_steps) with ordinality as e(value, ordinality);
  return v_id;
end;
$$;

create or replace function public.update_unused_workflow_template(
  p_template_id uuid,
  p_expected_version integer,
  p_name text,
  p_description text,
  p_steps jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_current integer; v_used boolean;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if pg_catalog.to_regclass('public.jobs') is not null then
    execute 'select exists(select 1 from public.jobs where workflow_template_id=$1)'
      into v_used using p_template_id;
    if v_used then
      raise exception 'A workflow used by a Job is immutable.' using errcode = '55000';
    end if;
  end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then raise exception 'Workflow requires steps.' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_steps) e where btrim(coalesce(e->>'name','')) = '') then raise exception 'Every workflow step requires a name.' using errcode = '22023'; end if;

  select version into v_current from public.workflow_templates where id = p_template_id for update;
  if not found then raise exception 'Workflow not found.' using errcode = 'P0002'; end if;
  if v_current <> p_expected_version then raise exception 'Stale workflow version.' using errcode = '40001'; end if;

  delete from public.workflow_template_steps where workflow_template_id = p_template_id;
  insert into public.workflow_template_steps (workflow_template_id, name, description, position, created_by, updated_by)
  select p_template_id, btrim(e.value->>'name'), nullif(btrim(e.value->>'description'), ''), e.ordinality::integer, v_actor, v_actor
  from jsonb_array_elements(p_steps) with ordinality as e(value, ordinality);
  update public.workflow_templates set name=btrim(p_name), description=nullif(btrim(p_description),''), updated_by=v_actor, version=version+1
  where id=p_template_id returning version into v_current;
  return v_current;
end;
$$;

create or replace function public.set_workflow_active(p_template_id uuid, p_expected_version integer, p_is_active boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if not p_is_active and exists (select 1 from public.internal_services s where s.workflow_template_id=p_template_id and s.is_active) then
    raise exception 'Reassign active services before deactivating this workflow.' using errcode='23503';
  end if;
  update public.workflow_templates set is_active=p_is_active, updated_by=v_actor, version=version+1
  where id=p_template_id and version=p_expected_version returning version into v_version;
  if not found then raise exception 'Workflow not found or stale.' using errcode='40001'; end if;
  return v_version;
end; $$;

create or replace function public.save_internal_service_category(
  p_id uuid, p_expected_version integer, p_code text, p_name text,
  p_description text default null, p_color text default null,
  p_sort_order integer default 0, p_is_active boolean default true
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_id is null then
    insert into public.internal_service_categories(code,name,description,color,sort_order,is_active,created_by,updated_by)
    values(upper(btrim(p_code)),btrim(p_name),nullif(btrim(p_description),''),nullif(btrim(p_color),''),p_sort_order,p_is_active,v_actor,v_actor)
    returning id into v_id;
  else
    update public.internal_service_categories set name=btrim(p_name),description=nullif(btrim(p_description),''),color=nullif(btrim(p_color),''),sort_order=p_sort_order,is_active=p_is_active,updated_by=v_actor,version=version+1
    where id=p_id and version=p_expected_version returning id into v_id;
    if not found then raise exception 'Category not found or stale.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.save_internal_service(
  p_id uuid, p_expected_version integer, p_category_id uuid, p_code text,
  p_name text, p_summary text default null, p_workflow_template_id uuid default null,
  p_sort_order integer default 0, p_is_active boolean default true
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if not exists(select 1 from public.internal_service_categories where id=p_category_id and is_active) then raise exception 'Active category not found.' using errcode='23503'; end if;
  if p_workflow_template_id is not null and not exists(select 1 from public.workflow_templates where id=p_workflow_template_id and is_active) then raise exception 'Active workflow not found.' using errcode='23503'; end if;
  if p_id is null then
    insert into public.internal_services(category_id,workflow_template_id,code,name,summary,sort_order,is_active,created_by,updated_by)
    values(p_category_id,p_workflow_template_id,upper(btrim(p_code)),btrim(p_name),nullif(btrim(p_summary),''),p_sort_order,p_is_active,v_actor,v_actor)
    returning id into v_id;
  else
    update public.internal_services set category_id=p_category_id,workflow_template_id=p_workflow_template_id,name=btrim(p_name),summary=nullif(btrim(p_summary),''),sort_order=p_sort_order,is_active=p_is_active,updated_by=v_actor,version=version+1
    where id=p_id and version=p_expected_version returning id into v_id;
    if not found then raise exception 'Service not found or stale.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.save_priority(
  p_id uuid, p_expected_version integer, p_code text, p_name text, p_color text,
  p_sort_order integer default 0, p_is_active boolean default true
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_system boolean;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_id is null then
    insert into public.priorities(code,name,color,sort_order,is_active,is_system,created_by,updated_by)
    values(upper(btrim(p_code)),btrim(p_name),p_color,p_sort_order,p_is_active,false,v_actor,v_actor) returning id into v_id;
  else
    select is_system into v_system from public.priorities where id=p_id for update;
    if not found then raise exception 'Priority not found.' using errcode='P0002'; end if;
    update public.priorities set name=btrim(p_name),color=p_color,sort_order=p_sort_order,is_active=case when v_system then true else p_is_active end,updated_by=v_actor,version=version+1
    where id=p_id and version=p_expected_version returning id into v_id;
    if not found then raise exception 'Stale priority version.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.save_task_status(
  p_id uuid, p_expected_version integer, p_code text, p_name text, p_color text,
  p_sort_order integer default 0, p_is_active boolean default true
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_system boolean;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_id is null then
    insert into public.task_statuses(code,name,color,sort_order,is_active,is_system,created_by,updated_by)
    values(upper(btrim(p_code)),btrim(p_name),p_color,p_sort_order,p_is_active,false,v_actor,v_actor) returning id into v_id;
  else
    select is_system into v_system from public.task_statuses where id=p_id for update;
    if not found then raise exception 'Task status not found.' using errcode='P0002'; end if;
    update public.task_statuses set name=btrim(p_name),color=p_color,sort_order=p_sort_order,is_active=case when v_system then true else p_is_active end,updated_by=v_actor,version=version+1
    where id=p_id and version=p_expected_version returning id into v_id;
    if not found then raise exception 'Stale task status version.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;

create or replace function public.create_client(
  p_client_type text, p_name text, p_contact_person text default null,
  p_email text default null, p_phone text default null, p_address text default null,
  p_notes text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  insert into public.clients(client_type,name,contact_person,email,phone,address,notes,created_by,updated_by)
  values(upper(btrim(p_client_type)),btrim(p_name),nullif(btrim(p_contact_person),''),nullif(btrim(p_email),''),nullif(btrim(p_phone),''),nullif(btrim(p_address),''),nullif(btrim(p_notes),''),v_actor,v_actor)
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.update_client(
  p_client_id uuid, p_expected_version integer, p_client_type text, p_name text,
  p_contact_person text default null, p_email text default null, p_phone text default null,
  p_address text default null, p_notes text default null
)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  update public.clients set client_type=upper(btrim(p_client_type)),name=btrim(p_name),contact_person=nullif(btrim(p_contact_person),''),email=nullif(btrim(p_email),''),phone=nullif(btrim(p_phone),''),address=nullif(btrim(p_address),''),notes=nullif(btrim(p_notes),''),updated_by=v_actor,version=version+1
  where id=p_client_id and version=p_expected_version and archived_at is null returning version into v_version;
  if not found then raise exception 'Client not found, archived, or stale.' using errcode='40001'; end if;
  return v_version;
end; $$;

create or replace function public.archive_client(p_client_id uuid, p_expected_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  update public.clients set archived_at=pg_catalog.now(),archived_by=v_actor,updated_by=v_actor,version=version+1
  where id=p_client_id and version=p_expected_version and archived_at is null returning version into v_version;
  if not found then raise exception 'Client not found, archived, or stale.' using errcode='40001'; end if;
  return v_version;
end; $$;

create or replace function public.list_assignable_profiles()
returns table(id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, coalesce(p.display_name, p.email), p.avatar_url
  from public.profiles p
  where private.is_active_staff(auth.uid())
    and p.is_active=true and p.deleted_at is null
  order by coalesce(p.display_name,p.email), p.id;
$$;

-- The old baseline granted every future function to browser roles. Explicitly
-- close every V2 endpoint, then open only the authenticated RPC surface.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'sync_own_profile_identity','set_profile_active','soft_delete_profile','restore_profile',
      'create_workflow_template','update_unused_workflow_template','set_workflow_active',
      'save_internal_service_category','save_internal_service','save_priority','save_task_status',
      'create_client','update_client','archive_client','list_assignable_profiles'
    )
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', r.signature);
    execute format('grant execute on function %s to authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end;
$$;

commit;
