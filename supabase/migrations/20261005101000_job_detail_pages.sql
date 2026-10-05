begin;
create function public.search_job_remarks(p_job_id uuid,p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_total bigint;v_page integer;v_rows jsonb;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 then raise exception 'Invalid page.' using errcode='22023'; end if;
  if not exists(select 1 from public.jobs where id=p_job_id and archived_at is null) then raise exception 'Job unavailable.' using errcode='22023'; end if;
  select count(*) into v_total from public.job_updates where job_id=p_job_id;
  v_page:=least(p_page,greatest(1,ceil(v_total/10.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
    select u.*,coalesce(p.display_name,p.email,'Pengguna tidak tersedia') as "createdByName",
      case when u.performed_by is not null then coalesce(pb.display_name,pb.email,'Pengguna tidak tersedia') end as "performedByName"
    from public.job_updates u left join public.profiles p on p.id=u.created_by left join public.profiles pb on pb.id=u.performed_by
    where u.job_id=p_job_id order by u.progress_date desc,u.created_at desc,u.id limit 10 offset (v_page-1)*10
  ) r;
  return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page);
end;
$$;
revoke all on function public.search_job_remarks(uuid,integer) from public,anon;
grant execute on function public.search_job_remarks(uuid,integer) to authenticated;
commit;
