begin;

-- Forward-only: no existing records or applied baselines are rewritten.
create index if not exists jobs_internal_service_idx on public.jobs(internal_service_id);
create index if not exists job_updates_latest_idx on public.job_updates(job_id,progress_date desc,created_at desc,id);

create function public.search_admin_jobs(
  p_filters jsonb default '{}'::jsonb, p_page integer default 1,
  p_job_id uuid default null, p_client_id uuid default null, p_mine boolean default false
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or jsonb_typeof(p_filters)<>'object'
    or char_length(coalesce(p_filters->>'query',''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  with candidates as materialized (
    select j.*,c.name as client_name,s.name as service_name,
      coalesce(p.display_name,p.email,'PIC tidak tersedia') as pic_name,
      st.name as status_name,st.code as status_code,st.color as status_color,
      pr.name as priority_name,pr.color as priority_color
    from public.jobs j join public.clients c on c.id=j.client_id
      join public.internal_services s on s.id=j.internal_service_id
      join public.job_statuses st on st.id=j.status_id
      join public.priorities pr on pr.id=j.priority_id
      left join public.profiles p on p.id=j.pic_id
    where j.archived_at is null and (p_job_id is null or j.id=p_job_id)
      and (p_client_id is null or j.client_id=p_client_id)
      and (not p_mine or j.pic_id=auth.uid() or exists(select 1 from public.job_contributors jc where jc.job_id=j.id and jc.profile_id=auth.uid())
        or exists(select 1 from public.tasks t where t.job_id=j.id and t.assignee_id=auth.uid() and t.deleted_at is null))
      and (coalesce(p_filters->>'pic','') in ('','All Assignees') or j.pic_id::text=p_filters->>'pic')
      and (coalesce(p_filters->>'internalService','') in ('','All Internal Services') or j.internal_service_id::text=p_filters->>'internalService')
      and (coalesce(p_filters->>'priority','') in ('','All Priorities') or j.priority_id::text=p_filters->>'priority')
      and (coalesce(p_filters->>'status','') in ('','ALL')
        or (p_filters->>'status' in ('UNFINISHED','ACTIVE') and st.code<>'COMPLETED')
        or (p_filters->>'status'='COMPLETED_ONLY' and st.code='COMPLETED')
        or st.code=replace(p_filters->>'status','STATUS:',''))
      and (coalesce(p_filters->>'dateFrom','')='' or j.estimated_end_date>= (p_filters->>'dateFrom')::date)
      and (coalesce(p_filters->>'dateTo','')='' or j.estimated_end_date<= (p_filters->>'dateTo')::date)
      and (coalesce(p_filters->>'deadline','Any Time')='Any Time' or (st.code<>'COMPLETED' and (
        (p_filters->>'deadline'='Due Today' and j.estimated_end_date=(now() at time zone 'Asia/Makassar')::date)
        or (p_filters->>'deadline'='Overdue' and j.estimated_end_date<(now() at time zone 'Asia/Makassar')::date)
        or (p_filters->>'deadline'='Next 7 Days' and j.estimated_end_date between (now() at time zone 'Asia/Makassar')::date+1 and (now() at time zone 'Asia/Makassar')::date+7))))
      and (coalesce(btrim(p_filters->>'query'),'')='' or strpos(lower(concat_ws(' ',j.title,c.name,s.name,p.display_name,p.email,st.name,pr.name)),lower(btrim(p_filters->>'query')))>0
        or (p_mine and exists(select 1 from public.tasks t where t.job_id=j.id and t.deleted_at is null
          and (j.pic_id=auth.uid() or t.assignee_id=auth.uid()) and strpos(lower(t.title),lower(btrim(p_filters->>'query')))>0)))
  ), totals as (select count(*) as total from candidates), paging as (
    select total,least(p_page,greatest(1,ceil(total/10.0)::integer)) as page from totals
  ), page_rows as materialized (
    select c.* from candidates c order by
      case p_filters->>'groupBy' when 'Client' then client_name when 'PIC' then pic_name
        when 'Internal Service' then service_name when 'Status' then status_name when 'Priority' then priority_name end,
      case when p_filters->>'sortBy'='Client Name' then client_name end,
      case when p_filters->>'sortBy'='Newest' then created_at end desc,
      case when coalesce(p_filters->>'status','UNFINISHED') in ('UNFINISHED','ACTIVE') then coalesce(start_date,created_at::date) end,
      estimated_end_date nulls last,created_at desc,id
    limit 10 offset ((select page from paging)-1)*10
  ), enriched as (
    select r.*,ov.progress_percentage,ov.current_step_name,ov.estimated_duration_days,
      u.message as latest_message,u.progress_date as latest_date,
      coalesce(up.display_name,up.email) as latest_author
    from page_rows r join public.job_overview ov on ov.id=r.id
    left join lateral (select message,progress_date,created_by from public.job_updates
      where job_id=r.id order by progress_date desc,created_at desc,id limit 1) u on true
    left join public.profiles up on up.id=u.created_by
  ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(e)) from enriched e),'[]'::jsonb),
    'total',total,'page',page) into v_result from paging;
  return v_result;
end;
$$;

-- Lookup rows, not entire dropdown catalogues. Selected values can be resolved
-- by ID even when they are outside the first ten results.
create function public.search_admin_lookup(p_kind text,p_query text default '',p_id uuid default null,p_parent uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_rows jsonb; v_query text:=lower(btrim(coalesce(p_query,'')));
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if char_length(v_query)>160 then raise exception 'Invalid lookup.' using errcode='22023'; end if;
  if p_kind='profiles' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select p.id::text as value,coalesce(p.display_name,p.email) as label from public.profiles p
      where p.is_active and p.deleted_at is null and (p_id is null or p.id=p_id)
        and (p_id is not null or strpos(lower(concat_ws(' ',p.display_name,p.email)),v_query)>0)
      order by coalesce(p.display_name,p.email),p.id limit 10) r;
  elsif p_kind='clients' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select c.id::text as value,c.name as label from public.clients c
      where c.archived_at is null and (p_id is null or c.id=p_id) and (p_id is not null or strpos(lower(c.name),v_query)>0)
      order by c.name,c.id limit 10) r;
  elsif p_kind='services' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select s.id::text as value,s.name as label,w.name as "workflowName",
        case when p_id is not null then (select coalesce(jsonb_agg(st.name order by st.position),'[]'::jsonb)
          from public.workflow_template_steps st where st.workflow_template_id=s.workflow_template_id) else '[]'::jsonb end as steps
      from public.internal_services s left join public.workflow_templates w on w.id=s.workflow_template_id
      where s.is_active and (p_id is null or s.id=p_id) and (p_id is not null or strpos(lower(concat_ws(' ',s.name,s.code)),v_query)>0)
        and (p_id is not null or (w.is_active and exists(select 1 from public.workflow_template_steps st where st.workflow_template_id=w.id)))
      order by s.name,s.id limit 10) r;
  elsif p_kind='jobs' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select j.id::text as value,j.title as label from public.jobs j where j.archived_at is null
      and (p_parent is null or j.client_id=p_parent) and (p_id is null or j.id=p_id)
      and (p_id is not null or strpos(lower(j.title),v_query)>0) order by j.title,j.id limit 10) r;
  else raise exception 'Invalid lookup kind.' using errcode='22023'; end if;
  return v_rows;
end;
$$;

revoke all on function public.search_admin_jobs(jsonb,integer,uuid,uuid,boolean) from public,anon;
revoke all on function public.search_admin_lookup(text,text,uuid,uuid) from public,anon;
grant execute on function public.search_admin_jobs(jsonb,integer,uuid,uuid,boolean) to authenticated;
grant execute on function public.search_admin_lookup(text,text,uuid,uuid) to authenticated;
commit;
