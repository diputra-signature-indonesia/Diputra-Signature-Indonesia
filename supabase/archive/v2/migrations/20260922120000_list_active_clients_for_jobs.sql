-- Job creation is available to active staff. Expose only client identifiers and
-- names for its selector; the clients table keeps its narrower detail RLS.
create or replace function public.list_active_clients_for_job()
returns table(id uuid, name text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.name
  from public.clients c
  where private.is_active_staff(auth.uid())
    and c.archived_at is null
  order by c.name, c.id;
$$;

revoke all on function public.list_active_clients_for_job() from public, anon, authenticated, service_role;
grant execute on function public.list_active_clients_for_job() to authenticated, service_role;

-- Client creation and Job creation must succeed or roll back together. This is
-- deliberately narrower than create_client: staff can create a Client only as
-- part of creating a Job, not through an unrestricted standalone endpoint.
create or replace function public.create_job_with_client(
  p_client_type text, p_client_name text, p_title text,
  p_internal_service_id uuid, p_priority_id uuid,
  p_pic_id uuid default null, p_description text default null,
  p_start_date date default null, p_estimated_end_date date default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_client_id uuid;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;
  if p_client_type not in ('COMPANY', 'INDIVIDUAL') then
    raise exception 'Invalid client type.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_client_name)) not between 1 and 200 then
    raise exception 'Client name must be 1–200 characters.' using errcode = '22023';
  end if;

  insert into public.clients(client_type, name, created_by, updated_by)
  values (p_client_type, pg_catalog.btrim(p_client_name), v_actor, v_actor)
  returning id into v_client_id;

  return public.create_job(
    v_client_id, p_title, p_internal_service_id, p_priority_id,
    p_pic_id, p_description, p_start_date, p_estimated_end_date
  );
end;
$$;

revoke all on function public.create_job_with_client(text,text,text,uuid,uuid,uuid,text,date,date) from public, anon, authenticated, service_role;
grant execute on function public.create_job_with_client(text,text,text,uuid,uuid,uuid,text,date,date) to authenticated, service_role;
