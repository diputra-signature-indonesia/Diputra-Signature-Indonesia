begin;

-- Public team titles are reusable Master Data. Existing free-text titles are
-- migrated first so this change is safe for environments that already contain
-- published team members.
create table public.job_titles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  constraint job_titles_code_format check (code ~ '^[A-Z][A-Z0-9_]{1,79}$'),
  constraint job_titles_name_not_blank check (char_length(btrim(name)) between 1 and 120),
  constraint job_titles_sort_order_non_negative check (sort_order >= 0)
);

create unique index job_titles_name_ci_key on public.job_titles (lower(btrim(name)));
create index job_titles_order_idx on public.job_titles (sort_order, name, id);

insert into public.job_titles (code, name, sort_order)
select
  'LEGACY_' || upper(substr(md5(lower(btrim(source.job_title))), 1, 12)),
  min(btrim(source.job_title)),
  dense_rank() over (
    order by min(coalesce(source.display_order, 2147483647)), lower(btrim(source.job_title))
  )::integer
from public.team_members as source
where btrim(source.job_title) <> ''
group by lower(btrim(source.job_title));

alter table public.team_members
  add column job_title_id uuid references public.job_titles(id) on delete restrict;

update public.team_members as member
set job_title_id = title.id
from public.job_titles as title
where lower(btrim(member.job_title)) = lower(btrim(title.name));

-- Keep the oldest/published row linked when legacy data contains duplicates.
-- Other legacy rows remain available as unlinked historical team entries.
with ranked as (
  select
    id,
    row_number() over (
      partition by profile_id
      order by is_visible desc, created_at asc, id asc
    ) as row_number
  from public.team_members
  where profile_id is not null
)
update public.team_members as member
set profile_id = null
from ranked
where ranked.id = member.id
  and ranked.row_number > 1;

create unique index team_members_profile_id_key
  on public.team_members (profile_id)
  where profile_id is not null;

alter table public.team_members alter column is_visible set default false;
alter table public.team_members
  add constraint team_members_visible_requires_title
  check (not is_visible or job_title_id is not null);

create index team_members_public_order_idx
  on public.team_members (job_title_id, created_at, id)
  where is_visible;

alter table public.team_members drop column display_order;
alter table public.team_members drop column job_title;

-- Every approved profile receives one private team record. The same trigger
-- also protects future profile creation paths outside the approval RPC.
create or replace function private.provision_team_member_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.team_members (
    profile_id,
    full_name,
    avatar_url,
    is_visible
  ) values (
    new.id,
    coalesce(nullif(btrim(new.display_name), ''), split_part(new.email, '@', 1), 'Team Member'),
    new.avatar_url,
    false
  )
  on conflict (profile_id) where profile_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_provision_team_member on public.profiles;
create trigger profiles_provision_team_member
after insert or update on public.profiles
for each row execute function private.provision_team_member_for_profile();

insert into public.team_members (profile_id, full_name, avatar_url, is_visible)
select
  profile.id,
  coalesce(nullif(btrim(profile.display_name), ''), split_part(profile.email, '@', 1), 'Team Member'),
  profile.avatar_url,
  false
from public.profiles as profile
where not exists (
  select 1
  from public.team_members as member
  where member.profile_id = profile.id
);

create trigger job_titles_set_updated_at
before update on public.job_titles
for each row execute function public.set_updated_at();

alter table public.job_titles enable row level security;
revoke all privileges on table public.job_titles from anon, authenticated;
grant select on table public.job_titles to anon, authenticated;
grant all privileges on table public.job_titles to service_role;

create policy "Public read active job titles"
on public.job_titles
for select
to anon, authenticated
using (is_active);

create policy "Active staff read all job titles"
on public.job_titles
for select
to authenticated
using (public.is_staff_role());

create policy "Active admins read profiles for team management"
on public.profiles
for select
to authenticated
using (public.is_admin_role());

create or replace function public.save_job_title(
  p_id uuid,
  p_expected_version integer,
  p_code text,
  p_name text,
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
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.job_titles (
      code, name, sort_order, is_active, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), p_sort_order, p_is_active, v_actor, v_actor
    )
    returning id into v_id;
  else
    update public.job_titles
    set
      name = btrim(p_name),
      sort_order = p_sort_order,
      is_active = p_is_active,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Stale Job title version.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.save_team_member_profile(
  p_profile_id uuid,
  p_full_name text,
  p_job_title_id uuid,
  p_avatar_url text,
  p_short_bio text,
  p_is_visible boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_member_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_profile_id is null or not exists (
    select 1 from public.profiles where id = p_profile_id and deleted_at is null
  ) then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
  if btrim(coalesce(p_full_name, '')) = '' or char_length(btrim(p_full_name)) > 160 then
    raise exception 'Team member name is invalid.' using errcode = '22023';
  end if;
  if p_job_title_id is not null and not exists (
    select 1 from public.job_titles where id = p_job_title_id and is_active
  ) then
    raise exception 'Active Job title not found.' using errcode = '23503';
  end if;
  if p_is_visible and p_job_title_id is null then
    raise exception 'A Job title is required before publishing a team member.' using errcode = '23514';
  end if;
  if char_length(coalesce(p_avatar_url, '')) > 2048 or char_length(coalesce(p_short_bio, '')) > 1000 then
    raise exception 'Team member details are too long.' using errcode = '22023';
  end if;

  insert into public.team_members as member (
    profile_id, full_name, job_title_id, avatar_url, short_bio, is_visible, updated_at
  ) values (
    p_profile_id,
    btrim(p_full_name),
    p_job_title_id,
    nullif(btrim(coalesce(p_avatar_url, '')), ''),
    nullif(btrim(coalesce(p_short_bio, '')), ''),
    p_is_visible,
    pg_catalog.now()
  )
  on conflict (profile_id) where profile_id is not null do update set
    full_name = excluded.full_name,
    job_title_id = excluded.job_title_id,
    avatar_url = excluded.avatar_url,
    short_bio = excluded.short_bio,
    is_visible = excluded.is_visible,
    updated_at = pg_catalog.now()
  returning id into v_member_id;

  return v_member_id;
end;
$$;

create or replace function public.list_visible_team_members()
returns table (
  id uuid,
  full_name text,
  job_title text,
  avatar_url text,
  short_bio text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    member.id,
    member.full_name,
    title.name as job_title,
    member.avatar_url,
    member.short_bio
  from public.team_members as member
  join public.job_titles as title on title.id = member.job_title_id
  where member.is_visible
    and title.is_active
  order by title.sort_order, member.created_at, member.id;
$$;

-- Add Job Titles to the shared Master Data lifecycle RPC.
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
    if v_is_system and not p_is_active then raise exception 'System priorities must remain active.' using errcode = '55000'; end if;
    update public.priorities set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'JOB_STATUS' then
    select is_system into v_is_system from public.job_statuses where id = p_id for update;
    if not found then raise exception 'Job status not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then raise exception 'System Job statuses must remain active.' using errcode = '55000'; end if;
    update public.job_statuses set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'TASK_STATUS' then
    select is_system into v_is_system from public.task_statuses where id = p_id for update;
    if not found then raise exception 'Task status not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then raise exception 'System Task statuses must remain active.' using errcode = '55000'; end if;
    update public.task_statuses set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'INTERNAL_SERVICE' then
    update public.internal_services set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'WORKFLOW_TEMPLATE' then
    if not p_is_active and exists (
      select 1 from public.internal_services where workflow_template_id = p_id and is_active
    ) then
      raise exception 'Reassign active services before deactivating this workflow.' using errcode = '23503';
    end if;
    update public.workflow_templates set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'JOB_TITLE' then
    if not p_is_active and exists (
      select 1 from public.team_members where job_title_id = p_id and is_visible
    ) then
      raise exception 'Hide or reassign published team members before deactivating this Job title.' using errcode = '23503';
    end if;
    update public.job_titles set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  else
    raise exception 'Unsupported Master Data entity.' using errcode = '22023';
  end if;

  if v_version is null then
    raise exception 'Master Data record is stale or unavailable.' using errcode = '40001';
  end if;
  return v_version;
end;
$$;

-- Soft-deleted users must never remain published on the public About page.
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

  update public.team_members
  set is_visible = false, updated_at = pg_catalog.now()
  where profile_id = p_profile_id;
end;
$$;

revoke all on function public.save_job_title(uuid, integer, text, text, integer, boolean) from public, anon, authenticated, service_role;
grant execute on function public.save_job_title(uuid, integer, text, text, integer, boolean) to authenticated, service_role;

revoke all on function public.save_team_member_profile(uuid, text, uuid, text, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.save_team_member_profile(uuid, text, uuid, text, text, boolean) to authenticated, service_role;

revoke all on function public.list_visible_team_members() from public, anon, authenticated, service_role;
grant execute on function public.list_visible_team_members() to anon, authenticated, service_role;

comment on table public.job_titles is 'Ordered titles used by public team members and managed from Master Data.';
comment on column public.job_titles.sort_order is 'Lower values appear first on the public About page.';

commit;
