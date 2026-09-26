begin;

create type public.admin_access_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

create table public.admin_access_requests (
  user_id uuid primary key references auth.users(id) on update cascade on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  status public.admin_access_request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on update cascade on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_access_requests_email_not_blank check (btrim(email) <> ''),
  constraint admin_access_requests_rejection_reason_length check (
    rejection_reason is null or char_length(rejection_reason) <= 1000
  ),
  constraint admin_access_requests_review_state check (
    (
      status = 'pending'::public.admin_access_request_status
      and reviewed_at is null
      and reviewed_by is null
      and rejection_reason is null
    )
    or (
      status = 'approved'::public.admin_access_request_status
      and reviewed_at is not null
      and reviewed_by is not null
      and rejection_reason is null
    )
    or (
      status = 'rejected'::public.admin_access_request_status
      and reviewed_at is not null
      and reviewed_by is not null
    )
  )
);

comment on table public.admin_access_requests is
  'One idempotent dashboard-access request per Supabase Auth user.';

create index admin_access_requests_pending_requested_at_idx
  on public.admin_access_requests (requested_at asc)
  where status = 'pending'::public.admin_access_request_status;

create trigger admin_access_requests_set_updated_at
before update on public.admin_access_requests
for each row execute function public.set_updated_at();

alter table public.admin_access_requests enable row level security;

-- This helper is SECURITY DEFINER so policies on profiles never need to query
-- profiles recursively. It only returns a capability for auth.uid().
create or replace function public.is_active_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = 'super_admin'::public.role
  );
$$;

revoke all on function public.is_active_super_admin() from public, anon, authenticated, service_role;
grant execute on function public.is_active_super_admin() to authenticated;

create policy "Users read own access request"
on public.admin_access_requests
for select
to authenticated
using (user_id = auth.uid());

create policy "Active super admins read access requests"
on public.admin_access_requests
for select
to authenticated
using (public.is_active_super_admin());

create policy "Active super admins read profiles"
on public.profiles
for select
to authenticated
using (public.is_active_super_admin());

-- The browser only needs SELECT. All request/profile mutations in this flow go
-- through the hardened functions below.
revoke all privileges on table public.admin_access_requests from anon, authenticated;
grant select on table public.admin_access_requests to authenticated;

revoke all privileges on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

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

  if exists (
    select 1
    from public.profiles as p
    where p.id = v_user_id
      and p.is_active = true
      and p.role in (
        'super_admin'::public.role,
        'admin'::public.role,
        'staff'::public.role
      )
  ) then
    return 'approved'::public.admin_access_request_status;
  end if;

  select
    u.email,
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
    nullif(btrim(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', '')), '')
  into v_email, v_full_name, v_avatar_url
  from auth.users as u
  where u.id = v_user_id;

  if v_email is null or btrim(v_email) = '' then
    raise exception 'The authenticated user does not have an email address.' using errcode = '23514';
  end if;

  insert into public.admin_access_requests as request (
    user_id,
    email,
    full_name,
    avatar_url
  )
  values (
    v_user_id,
    v_email,
    v_full_name,
    v_avatar_url
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, request.full_name),
    avatar_url = coalesce(excluded.avatar_url, request.avatar_url)
  returning status into v_status;

  return v_status;
end;
$$;

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
  if v_reviewer_id is null or not public.is_active_super_admin() then
    raise exception 'Only an active super admin can approve access requests.' using errcode = '42501';
  end if;

  select request.*
  into v_request
  from public.admin_access_requests as request
  where request.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Access request not found.' using errcode = 'P0002';
  end if;

  if v_request.status <> 'pending'::public.admin_access_request_status then
    raise exception 'Access request has already been reviewed.' using errcode = 'P0001';
  end if;

  insert into public.profiles as profile (id, email, role, is_active, updated_at)
  values (v_request.user_id, v_request.email, p_role, true, now())
  on conflict (id) do update
  set
    email = excluded.email,
    role = excluded.role,
    is_active = true,
    updated_at = now();

  update public.admin_access_requests as request
  set
    status = 'approved'::public.admin_access_request_status,
    reviewed_at = now(),
    reviewed_by = v_reviewer_id,
    rejection_reason = null
  where request.user_id = v_request.user_id;
end;
$$;

create or replace function public.reject_admin_access_request(
  p_user_id uuid,
  p_rejection_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_status public.admin_access_request_status;
  v_reason text := nullif(btrim(p_rejection_reason), '');
begin
  if v_reviewer_id is null or not public.is_active_super_admin() then
    raise exception 'Only an active super admin can reject access requests.' using errcode = '42501';
  end if;

  if v_reason is not null and char_length(v_reason) > 1000 then
    raise exception 'Rejection reason must be 1000 characters or fewer.' using errcode = '22001';
  end if;

  select request.status
  into v_status
  from public.admin_access_requests as request
  where request.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Access request not found.' using errcode = 'P0002';
  end if;

  if v_status <> 'pending'::public.admin_access_request_status then
    raise exception 'Access request has already been reviewed.' using errcode = 'P0001';
  end if;

  update public.admin_access_requests as request
  set
    status = 'rejected'::public.admin_access_request_status,
    reviewed_at = now(),
    reviewed_by = v_reviewer_id,
    rejection_reason = v_reason
  where request.user_id = p_user_id;
end;
$$;

revoke all on function public.ensure_admin_access_request() from public, anon, authenticated, service_role;
grant execute on function public.ensure_admin_access_request() to authenticated;

revoke all on function public.approve_admin_access_request(uuid, public.role) from public, anon, authenticated, service_role;
grant execute on function public.approve_admin_access_request(uuid, public.role) to authenticated;

revoke all on function public.reject_admin_access_request(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.reject_admin_access_request(uuid, text) to authenticated;

commit;
