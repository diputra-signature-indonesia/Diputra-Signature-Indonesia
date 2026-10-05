begin;

-- Internal catalogue taxonomy. Deliberately unrelated to services_categories
-- (the public/landing-page catalogue). Existing service IDs/codes stay intact.
create table public.internal_service_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$' and char_length(code) <= 30),
  name text not null check (char_length(btrim(name)) between 1 and 160),
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);
create unique index internal_service_categories_name_ci_key
  on public.internal_service_categories (lower(btrim(name)));

alter table public.internal_services
  add column category_id uuid references public.internal_service_categories(id) on delete restrict;
create index internal_services_category_id_idx on public.internal_services(category_id);

alter table public.internal_service_categories enable row level security;
revoke all on public.internal_service_categories from public, anon, authenticated;
grant select on public.internal_service_categories to authenticated;
grant all on public.internal_service_categories to service_role;
create policy "Active staff read internal service categories"
  on public.internal_service_categories for select to authenticated
  using (public.is_staff_role());

create function private.validate_internal_service_category()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_prefix text;
begin
  if new.category_id is not null then
    select code into v_prefix from public.internal_service_categories
    where id = new.category_id for share;
    if not found then raise exception 'Internal service category not found.' using errcode = '23503'; end if;
    if left(new.code, char_length(v_prefix) + 1) <> v_prefix || '_'
      or substring(new.code from char_length(v_prefix) + 2) !~ '^[A-Z0-9]+(_[A-Z0-9]+)*$' then
      raise exception 'Service code must use the selected category prefix.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_internal_service_category() from public, anon, authenticated, service_role;
create trigger internal_services_validate_category
before insert or update of category_id, code on public.internal_services
for each row execute function private.validate_internal_service_category();

create function public.save_internal_service_category(
  p_id uuid, p_expected_version integer, p_code text, p_name text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_code text := upper(btrim(p_code));
  v_id uuid;
  v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if v_code is null or v_code !~ '^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$' or char_length(v_code) > 30
    or p_name is null or char_length(btrim(p_name)) not between 1 and 160 then
    raise exception 'Internal service category input is invalid.' using errcode = '22023';
  end if;
  if p_id is null then
    insert into public.internal_service_categories(code,name,created_by,updated_by)
    values(v_code,btrim(p_name),v_actor,v_actor) returning id into v_id;
  else
    select version into v_version from public.internal_service_categories where id = p_id for update;
    if not found then raise exception 'Internal service category not found.' using errcode = 'P0002'; end if;
    if p_expected_version is null or v_version <> p_expected_version then raise exception 'Stale category version.' using errcode = '40001'; end if;
    if exists(select 1 from public.internal_services where category_id = p_id) then
      raise exception 'Category is used by internal services and cannot be edited.' using errcode = '23503';
    end if;
    update public.internal_service_categories
    set code=v_code,name=btrim(p_name),updated_by=v_actor,updated_at=now(),version=version+1
    where id=p_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

create function public.delete_internal_service_category(p_id uuid, p_expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_version integer;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  select version into v_version from public.internal_service_categories where id=p_id for update;
  if not found then raise exception 'Internal service category not found.' using errcode = 'P0002'; end if;
  if p_expected_version is null or v_version<>p_expected_version then raise exception 'Stale category version.' using errcode = '40001'; end if;
  if exists(select 1 from public.internal_services where category_id=p_id) then
    raise exception 'Category is used by internal services and cannot be deleted.' using errcode = '23503';
  end if;
  delete from public.internal_service_categories where id=p_id;
end;
$$;

-- Keep the seven-argument RPC for rolling-deploy/legacy compatibility.
-- The current admin form uses this strict categorized save path.
create function public.save_categorized_internal_service(
  p_id uuid, p_expected_version integer, p_category_id uuid,
  p_code_suffix text, p_name text, p_summary text default null,
  p_workflow_template_id uuid default null, p_is_active boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_suffix text := upper(btrim(p_code_suffix));
  v_prefix text;
  v_old_prefix text;
  v_code text;
  v_service public.internal_services%rowtype;
  v_id uuid;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if v_suffix is null or v_suffix !~ '^[A-Z0-9]+(_[A-Z0-9]+)*$' or p_is_active is null then
    raise exception 'Service code suffix is invalid.' using errcode = '22023';
  end if;
  if p_category_id is not null then
    select code into v_prefix from public.internal_service_categories where id=p_category_id for share;
    if not found then raise exception 'Internal service category not found.' using errcode = '23503'; end if;
  elsif p_id is null then
    raise exception 'Select an internal service category.' using errcode = '22023';
  end if;
  if p_id is not null then
    select * into v_service from public.internal_services where id=p_id for update;
    if not found then raise exception 'Internal service not found.' using errcode = 'P0002'; end if;
    if p_expected_version is null or v_service.version<>p_expected_version then raise exception 'Stale service version.' using errcode = '40001'; end if;
    if v_service.category_id is not null then
      if p_category_id is null then raise exception 'Select an internal service category.' using errcode = '22023'; end if;
      select code into v_old_prefix from public.internal_service_categories where id=v_service.category_id;
      if v_suffix<>substring(v_service.code from char_length(v_old_prefix)+2) then
        raise exception 'Service code suffix is permanent.' using errcode = '55000';
      end if;
    elsif v_suffix<>v_service.code then
      raise exception 'Service code suffix is permanent.' using errcode = '55000';
    end if;
  end if;
  v_code := case when v_prefix is null then v_suffix else v_prefix || '_' || v_suffix end;
  if char_length(v_code)>80 then raise exception 'Service code exceeds 80 characters.' using errcode = '22023'; end if;
  v_id := public.save_internal_service(p_id,p_expected_version,v_code,p_name,p_summary,p_workflow_template_id,p_is_active);
  update public.internal_services set category_id=p_category_id,code=v_code where id=v_id;
  return v_id;
end;
$$;

create function public.list_internal_service_usage()
returns table(id uuid, job_count bigint, sop_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode = '42501'; end if;
  return query select s.id,
    (select count(*) from public.jobs j where j.internal_service_id=s.id),
    (select count(*) from public.sops p where p.internal_service_id=s.id)
  from public.internal_services s;
end;
$$;

create function public.remove_internal_service(p_id uuid,p_expected_version integer)
returns text language plpgsql security definer set search_path = '' as $$
declare v_version integer;
begin
  if not private.is_active_admin(auth.uid()) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  select version into v_version from public.internal_services where id=p_id for update;
  if not found then raise exception 'Internal service not found.' using errcode = 'P0002'; end if;
  if p_expected_version is null or v_version<>p_expected_version then raise exception 'Stale service version.' using errcode = '40001'; end if;
  -- Include archived Jobs/SOPs, not just currently visible/active references.
  if exists(select 1 from public.jobs where internal_service_id=p_id)
    or exists(select 1 from public.sops where internal_service_id=p_id) then
    update public.internal_services set is_active=false,updated_by=auth.uid(),version=version+1 where id=p_id;
    return 'deactivated';
  end if;
  delete from public.internal_services where id=p_id;
  return 'deleted';
end;
$$;

revoke all on function public.save_internal_service_category(uuid,integer,text,text) from public,anon,authenticated,service_role;
revoke all on function public.delete_internal_service_category(uuid,integer) from public,anon,authenticated,service_role;
revoke all on function public.save_categorized_internal_service(uuid,integer,uuid,text,text,text,uuid,boolean) from public,anon,authenticated,service_role;
revoke all on function public.list_internal_service_usage() from public,anon,authenticated,service_role;
revoke all on function public.remove_internal_service(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.save_internal_service_category(uuid,integer,text,text) to authenticated,service_role;
grant execute on function public.delete_internal_service_category(uuid,integer) to authenticated,service_role;
grant execute on function public.save_categorized_internal_service(uuid,integer,uuid,text,text,text,uuid,boolean) to authenticated,service_role;
grant execute on function public.list_internal_service_usage() to authenticated,service_role;
grant execute on function public.remove_internal_service(uuid,integer) to authenticated,service_role;

comment on table public.internal_service_categories is 'Internal admin catalogue only; unrelated to the client-page services_categories table.';
comment on column public.internal_services.category_id is 'Null preserves existing uncategorized services; new admin service forms require a category.';
commit;
