begin;

-- A contributor is a durable Job membership. It is intentionally independent
-- from active Tasks so the Job remains visible in My Tasks after an assignment
-- is changed or before another Task is created.
create table public.job_contributors (
  job_id uuid not null references public.jobs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  added_by uuid not null references public.profiles(id) on delete restrict,
  added_at timestamptz not null default pg_catalog.now(),
  primary key (job_id, profile_id)
);

create index job_contributors_profile_job_idx
  on public.job_contributors (profile_id, job_id);

alter table public.job_contributors enable row level security;
revoke all privileges on table public.job_contributors from public, anon, authenticated;
grant select on table public.job_contributors to authenticated;
grant all privileges on table public.job_contributors to service_role;

create policy "Active staff read Job contributors"
on public.job_contributors
for select to authenticated
using (public.is_staff_role());

-- Preserve the current effective contributors before switching reads to the
-- durable relation.
insert into public.job_contributors (job_id, profile_id, added_by, added_at)
select j.id, j.pic_id, j.created_by, j.created_at
from public.jobs as j
on conflict (job_id, profile_id) do nothing;

insert into public.job_contributors (job_id, profile_id, added_by, added_at)
select t.job_id, t.assignee_id, t.created_by, t.created_at
from public.tasks as t
where t.assignee_id is not null
on conflict (job_id, profile_id) do nothing;

create or replace function private.sync_job_contributor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_profile_id uuid;
  v_actor uuid;
begin
  if tg_table_name = 'jobs' then
    v_job_id := new.id;
    v_profile_id := new.pic_id;
    v_actor := coalesce(auth.uid(), new.updated_by, new.created_by);
  else
    v_job_id := new.job_id;
    v_profile_id := new.assignee_id;
    v_actor := coalesce(auth.uid(), new.updated_by, new.created_by);
  end if;

  if v_profile_id is not null then
    insert into public.job_contributors (job_id, profile_id, added_by)
    values (v_job_id, v_profile_id, v_actor)
    on conflict (job_id, profile_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_job_contributor() from public, anon, authenticated, service_role;

create trigger jobs_sync_pic_contributor
after insert or update of pic_id on public.jobs
for each row execute function private.sync_job_contributor();

create trigger tasks_sync_assignee_contributor
after insert or update of assignee_id on public.tasks
for each row execute function private.sync_job_contributor();

create or replace function public.add_job_contributor(
  p_job_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Contributor management is not allowed.' using errcode = '42501';
  end if;
  perform private.assert_assignable_profile(p_profile_id);

  insert into public.job_contributors (job_id, profile_id, added_by)
  values (p_job_id, p_profile_id, v_actor)
  on conflict (job_id, profile_id) do nothing;

  perform private.log_job_activity(
    p_job_id,
    'JOB_CONTRIBUTOR_ADDED',
    '{}'::jsonb,
    jsonb_build_object('profile_id', p_profile_id)
  );
end;
$$;

create or replace function public.remove_job_contributor(
  p_job_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Contributor management is not allowed.' using errcode = '42501';
  end if;
  if exists (select 1 from public.jobs where id = p_job_id and pic_id = p_profile_id) then
    raise exception 'The Job PIC cannot be removed from contributors.' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.tasks
    where job_id = p_job_id and assignee_id = p_profile_id and deleted_at is null
  ) then
    raise exception 'A contributor with an active Task assignment cannot be removed.' using errcode = '55000';
  end if;

  delete from public.job_contributors
  where job_id = p_job_id and profile_id = p_profile_id;
  if not found then
    raise exception 'Contributor not found.' using errcode = 'P0002';
  end if;

  perform private.log_job_activity(
    p_job_id,
    'JOB_CONTRIBUTOR_REMOVED',
    jsonb_build_object('profile_id', p_profile_id),
    '{}'::jsonb
  );
end;
$$;

revoke all on function public.add_job_contributor(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.remove_job_contributor(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.add_job_contributor(uuid, uuid) to authenticated, service_role;
grant execute on function public.remove_job_contributor(uuid, uuid) to authenticated, service_role;

comment on table public.job_contributors is
  'Durable Job membership populated manually or automatically on first PIC/Task assignment.';

commit;
