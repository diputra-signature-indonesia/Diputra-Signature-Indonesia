begin;

create or replace function public.list_rejected_admin_access_requests(
  p_search text default null,
  p_limit integer default 10
)
returns table (
  user_id uuid,
  email text,
  full_name text,
  avatar_url text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text
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
    request.requested_at,
    request.reviewed_at,
    request.rejection_reason
  from public.admin_access_requests as request
  where private.is_active_super_admin(auth.uid())
    and request.status = 'rejected'::public.admin_access_request_status
    and (
      nullif(pg_catalog.btrim(p_search), '') is null
      or request.email ilike '%' || pg_catalog.btrim(p_search) || '%'
      or coalesce(request.full_name, '') ilike '%' || pg_catalog.btrim(p_search) || '%'
    )
  order by request.reviewed_at desc nulls last, request.user_id
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;

create or replace function public.delete_rejected_admin_access_request(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can delete rejected access requests.' using errcode = '42501';
  end if;

  delete from public.admin_access_requests
  where user_id = p_user_id
    and status = 'rejected'::public.admin_access_request_status;

  if not found then
    raise exception 'Rejected access request not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.list_rejected_admin_access_requests(text, integer)
from public, anon, authenticated, service_role;
grant execute on function public.list_rejected_admin_access_requests(text, integer) to authenticated, service_role;

revoke all on function public.delete_rejected_admin_access_request(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.delete_rejected_admin_access_request(uuid) to authenticated, service_role;

commit;
