begin;

create or replace function public.list_pending_admin_access_requests(
  p_search text default null,
  p_limit integer default 10
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  requested_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.user_id,
    request.email,
    request.full_name,
    request.avatar_url,
    request.requested_at
  from public.admin_access_requests as request
  where private.is_active_super_admin(auth.uid())
    and request.status = 'pending'::public.admin_access_request_status
    and (
      nullif(btrim(p_search), '') is null
      or request.email ilike '%' || btrim(p_search) || '%'
      or coalesce(request.full_name, '') ilike '%' || btrim(p_search) || '%'
    )
  order by request.requested_at asc, request.user_id
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;

create or replace function public.set_profile_role(
  p_profile_id uuid,
  p_role public.role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can change profile roles.' using errcode = '42501';
  end if;

  if p_profile_id = auth.uid() then
    raise exception 'A super admin cannot change their own role.' using errcode = '22023';
  end if;

  if p_role not in (
    'super_admin'::public.role,
    'admin'::public.role,
    'staff'::public.role
  ) then
    raise exception 'Unsupported profile role.' using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = pg_catalog.now()
  where id = p_profile_id
    and deleted_at is null;

  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_profile_role(uuid, public.role)
from public, anon, authenticated, service_role;
grant execute on function public.set_profile_role(uuid, public.role) to authenticated;
grant execute on function public.set_profile_role(uuid, public.role) to service_role;

revoke all on function public.list_pending_admin_access_requests(text, integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_pending_admin_access_requests(text, integer) to authenticated;
grant execute on function public.list_pending_admin_access_requests(text, integer) to service_role;

commit;
