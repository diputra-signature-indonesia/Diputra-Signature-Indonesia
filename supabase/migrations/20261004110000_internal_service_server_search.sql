begin;

-- Only the requested page crosses the API boundary. Search parameters are
-- literal text, not interpolated SQL/PostgREST filters; no wildcard injection.
create function public.search_internal_services(
  p_search text default '', p_category_id uuid default null,
  p_uncategorized boolean default false, p_page integer default 1
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_search text := lower(regexp_replace(btrim(coalesce(p_search,'')), '\s+', ' ', 'g'));
  v_total bigint;
  v_page integer;
  v_page_count integer;
  v_rows jsonb;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if char_length(v_search)>160 or p_page is null or p_page<1 or p_uncategorized is null
    or (p_uncategorized and p_category_id is not null) then
    raise exception 'Internal service search input is invalid.' using errcode='22023';
  end if;
  select count(*) into v_total
  from public.internal_services s left join public.internal_service_categories c on c.id=s.category_id
  where (p_category_id is null or s.category_id=p_category_id)
    and (not p_uncategorized or s.category_id is null)
    and not exists (
      select 1 from unnest(regexp_split_to_array(v_search,'\s+')) as t(term)
      where strpos(lower(concat_ws(' ',s.code,s.name,s.summary,c.name)),t.term)=0
    );
  v_page_count := greatest(1,ceil(v_total/10.0)::integer);
  v_page := least(p_page,v_page_count);
  select coalesce(jsonb_agg(to_jsonb(r) order by lower(r.name),r.name,r.id),'[]'::jsonb) into v_rows
  from (
    select s.id,s.code,s.name,s.summary,s.category_id,c.name as category_name,
      s.workflow_template_id,w.name as workflow_name,s.is_active,s.version,
      (select count(*) from public.workflow_template_steps st where st.workflow_template_id=s.workflow_template_id) as step_count,
      (select count(*) from public.jobs j where j.internal_service_id=s.id)
        + (select count(*) from public.sops sp where sp.internal_service_id=s.id) as reference_count
    from public.internal_services s
    left join public.internal_service_categories c on c.id=s.category_id
    left join public.workflow_templates w on w.id=s.workflow_template_id
    where (p_category_id is null or s.category_id=p_category_id)
      and (not p_uncategorized or s.category_id is null)
      and not exists (
        select 1 from unnest(regexp_split_to_array(v_search,'\s+')) as t(term)
        where strpos(lower(concat_ws(' ',s.code,s.name,s.summary,c.name)),t.term)=0
      )
    order by lower(s.name),s.name,s.id limit 10 offset (v_page-1)*10
  ) r;
  return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page,'page_count',v_page_count);
end;
$$;

-- Counts are aggregated in SQL; never derive these from the ten visible rows.
create function public.internal_service_catalogue_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  return jsonb_build_object(
    'categories',coalesce((select jsonb_object_agg(category_id::text,n) from (
      select category_id,count(*) as n from public.internal_services where category_id is not null group by category_id
    ) c),'{}'::jsonb),
    'workflows',coalesce((select jsonb_object_agg(workflow_template_id::text,n) from (
      select workflow_template_id,count(*) as n from public.internal_services where workflow_template_id is not null group by workflow_template_id
    ) w),'{}'::jsonb)
  );
end;
$$;

revoke all on function public.search_internal_services(text,uuid,boolean,integer) from public,anon,authenticated,service_role;
revoke all on function public.internal_service_catalogue_counts() from public,anon,authenticated,service_role;
grant execute on function public.search_internal_services(text,uuid,boolean,integer) to authenticated,service_role;
grant execute on function public.internal_service_catalogue_counts() to authenticated,service_role;
commit;
