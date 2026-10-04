begin;

create or replace function public.search_job_access_profiles(
  p_job_id uuid,
  p_search text default '',
  p_limit integer default 10
)
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_search text := left(btrim(coalesce(p_search, '')), 100);
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
begin
  if v_actor is null or not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;

  return query
  select p.id, p.email, coalesce(nullif(btrim(p.display_name), ''), p.email), p.avatar_url
  from public.profiles as p
  where p.is_active = true
    and p.deleted_at is null
    and (
      v_search = ''
      or p.display_name ilike '%' || v_search || '%'
      or p.email ilike '%' || v_search || '%'
    )
  order by lower(coalesce(nullif(btrim(p.display_name), ''), p.email)), lower(p.email), p.id
  limit v_limit;
end;
$$;

revoke all on function public.search_job_access_profiles(uuid,text,integer) from public, anon, authenticated, service_role;
grant execute on function public.search_job_access_profiles(uuid,text,integer) to authenticated;

comment on function public.search_job_access_profiles(uuid,text,integer) is
  'Returns active user suggestions only to an admin or the assigned PIC of the requested Job.';

commit;
