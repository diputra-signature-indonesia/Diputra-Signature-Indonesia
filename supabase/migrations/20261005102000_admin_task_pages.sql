begin;
create or replace function public.search_admin_jobs(p_filters jsonb default '{}'::jsonb, p_page integer default 1,
  p_job_id uuid default null, p_client_id uuid default null, p_mine boolean default false
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or jsonb_typeof(p_filters)<>'object'
    or char_length(coalesce(p_filters->>'query',''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  with due_metrics as materialized (
    select t.job_id,min(t.due_date) filter(where ts.code<>'COMPLETED') as task_due_date
    from public.tasks t join public.jobs j on j.id=t.job_id join public.job_task_statuses cs on cs.id=t.job_task_status_id
    join public.task_statuses ts on ts.id=cs.task_status_id
    where p_mine and t.deleted_at is null and j.archived_at is null and (j.pic_id=auth.uid() or t.assignee_id=auth.uid()) group by t.job_id
  ), candidates as materialized (
    select j.*,coalesce(dm.task_due_date,j.estimated_end_date) as task_due_date,c.name as client_name,s.name as service_name,
      coalesce(p.display_name,p.email,'PIC tidak tersedia') as pic_name,
      st.name as status_name,st.code as status_code,st.color as status_color,
      pr.name as priority_name,pr.color as priority_color
    from public.jobs j join public.clients c on c.id=j.client_id
      join public.internal_services s on s.id=j.internal_service_id
      join public.job_statuses st on st.id=j.status_id
      join public.priorities pr on pr.id=j.priority_id
      left join public.profiles p on p.id=j.pic_id
      left join due_metrics dm on dm.job_id=j.id
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
      and (coalesce(p_filters->>'dateFrom','')='' or (case when p_mine then coalesce(dm.task_due_date,j.estimated_end_date) else j.estimated_end_date end)>= (p_filters->>'dateFrom')::date)
      and (coalesce(p_filters->>'dateTo','')='' or (case when p_mine then coalesce(dm.task_due_date,j.estimated_end_date) else j.estimated_end_date end)<= (p_filters->>'dateTo')::date)
      and (coalesce(p_filters->>'deadline','Any Time')='Any Time' or (st.code<>'COMPLETED' and (
        (p_filters->>'deadline'='Due Today' and (case when p_mine then coalesce(dm.task_due_date,j.estimated_end_date) else j.estimated_end_date end)=(now() at time zone 'Asia/Makassar')::date)
        or (p_filters->>'deadline'='Overdue' and (case when p_mine then coalesce(dm.task_due_date,j.estimated_end_date) else j.estimated_end_date end)<(now() at time zone 'Asia/Makassar')::date)
        or (p_filters->>'deadline'='Next 7 Days' and (case when p_mine then coalesce(dm.task_due_date,j.estimated_end_date) else j.estimated_end_date end) between (now() at time zone 'Asia/Makassar')::date+1 and (now() at time zone 'Asia/Makassar')::date+7))))
      and (coalesce(btrim(p_filters->>'query'),'')='' or strpos(lower(concat_ws(' ',j.title,c.name,s.name,p.display_name,p.email,st.name,pr.name)),lower(btrim(p_filters->>'query')))>0
        or (p_mine and exists(select 1 from public.tasks t where t.job_id=j.id and t.deleted_at is null
          and (j.pic_id=auth.uid() or t.assignee_id=auth.uid()) and strpos(lower(t.title),lower(btrim(p_filters->>'query')))>0)))
  ), totals as (select count(*) as total from candidates), paging as (
    select total,least(p_page,greatest(1,ceil(total/10.0)::integer)) as page from totals
  ), page_rows as materialized (
    select c.*,row_number() over(order by
      case p_filters->>'groupBy' when 'Client' then client_name when 'PIC' then pic_name
        when 'Internal Service' then service_name when 'Status' then status_name when 'Priority' then priority_name end,
      case when p_filters->>'sortBy'='Client Name' then client_name end,
      case when p_filters->>'sortBy'='Newest' then created_at end desc,
      case when coalesce(p_filters->>'status','UNFINISHED') ='UNFINISHED' and not p_mine then coalesce(start_date,created_at::date) end,
      case when p_mine and coalesce(p_filters->>'sortBy','Most Urgent')='Most Urgent' then task_due_date end nulls last,
      estimated_end_date nulls last,created_at desc,id) as ordinal from candidates c order by ordinal
    limit 10 offset ((select page from paging)-1)*10
  ), enriched as (
    select r.*,ov.progress_percentage,ov.current_step_name,ov.estimated_duration_days,
      u.message as latest_message,u.progress_date as latest_date,
      coalesce(up.display_name,up.email) as latest_author
    from page_rows r join public.job_overview ov on ov.id=r.id
    left join lateral (select message,progress_date,created_by from public.job_updates
      where job_id=r.id order by progress_date desc,created_at desc,id limit 1) u on true
    left join public.profiles up on up.id=u.created_by
  ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(e) order by ordinal) from enriched e),'[]'::jsonb),
    'total',total,'page',page) into v_result from paging;
  return v_result;
end;
$$;

create function public.search_my_tasks(p_filters jsonb default '{}'::jsonb,p_page integer default 1,
  p_selected_job uuid default null,p_task_page integer default 1,p_task_status uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_jobs jsonb;v_selected uuid;v_rows jsonb;v_tasks jsonb;v_total bigint;v_task_page integer;v_statuses jsonb;v_query text;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_task_page is null or p_task_page<1 or p_task_page>1000000 then raise exception 'Invalid page.' using errcode='22023'; end if;
  v_jobs:=public.search_admin_jobs(p_filters,p_page,null,null,true);
  select coalesce(jsonb_agg(r || jsonb_build_object('task_count',coalesce(m.n,0),'completed_count',coalesce(m.completed,0)) order by (r->>'ordinal')::integer),'[]'::jsonb) into v_rows
  from jsonb_array_elements(v_jobs->'rows') r left join (
    select t.job_id,count(*) as n,count(*) filter(where ts.code='COMPLETED') as completed
    from public.tasks t join public.jobs j on j.id=t.job_id join public.job_task_statuses cs on cs.id=t.job_task_status_id join public.task_statuses ts on ts.id=cs.task_status_id
    where t.deleted_at is null and (j.pic_id=auth.uid() or t.assignee_id=auth.uid())
      and t.job_id in (select (r->>'id')::uuid from jsonb_array_elements(v_jobs->'rows') r) group by t.job_id
  ) m on m.job_id=(r->>'id')::uuid;
  select (r->>'id')::uuid into v_selected from jsonb_array_elements(v_rows) r
    order by case when (r->>'id')::uuid=p_selected_job then 0 else 1 end,(r->>'ordinal')::integer limit 1;
  v_query:=lower(btrim(coalesce(p_filters->>'query','')));
  if exists(select 1 from jsonb_array_elements(v_rows) r where (r->>'id')::uuid=v_selected and strpos(lower(concat_ws(' ',r->>'title',r->>'client_name',r->>'service_name')),v_query)>0) then v_query:=''; end if;
  with visible as materialized (
    select t.id,t.title,t.description,t.due_date,t.assignee_id,t.version,t.job_task_status_id,
      coalesce(p.display_name,p.email,'Unassigned') as assignee_name,pr.name as priority_name,
      ts.name as status_name,ts.code as status_code,ts.color as status_color,
      (js.code<>'COMPLETED' and (public.is_admin_role() or j.pic_id=auth.uid() or t.assignee_id=auth.uid())) as can_change_status
    from public.tasks t join public.jobs j on j.id=t.job_id join public.job_statuses js on js.id=j.status_id
    join public.job_task_statuses cs on cs.id=t.job_task_status_id join public.task_statuses ts on ts.id=cs.task_status_id
    left join public.profiles p on p.id=t.assignee_id left join public.priorities pr on pr.id=t.priority_id
    where t.job_id=v_selected and t.deleted_at is null and (j.pic_id=auth.uid() or t.assignee_id=auth.uid())
      and strpos(lower(t.title),v_query)>0
  ), counts as (select count(*) as total from visible where p_task_status is null or job_task_status_id=p_task_status), paging as (
    select total,least(p_task_page,greatest(1,ceil(total/10.0)::integer)) as page from counts
  ), page_rows as (
    select * from visible where p_task_status is null or job_task_status_id=p_task_status
      order by due_date nulls last,id limit 10 offset ((select page from paging)-1)*10
  ) select total,page,coalesce((select jsonb_agg(to_jsonb(t) order by due_date nulls last,id) from page_rows t),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from (
      select cs.id,ts.name,ts.code,ts.color,cs.column_order as position,count(v.id) as count
      from public.job_task_statuses cs join public.task_statuses ts on ts.id=cs.task_status_id
        left join visible v on v.job_task_status_id=cs.id
      where cs.job_id=v_selected group by cs.id,ts.id
    ) s),'[]'::jsonb) into v_total,v_task_page,v_tasks,v_statuses from paging;
  return jsonb_build_object('jobs',v_rows,'total',v_jobs->'total','page',v_jobs->'page',
    'selectedId',v_selected,'tasks',v_tasks,'statuses',v_statuses,'taskTotal',v_total,'taskPage',v_task_page,
    'jobStatuses',(select coalesce(jsonb_agg(jsonb_build_object('value',code,'label',name) order by sort_order),'[]'::jsonb) from public.job_statuses where is_active));
end;
$$;
revoke all on function public.search_my_tasks(jsonb,integer,uuid,integer,uuid) from public,anon;
grant execute on function public.search_my_tasks(jsonb,integer,uuid,integer,uuid) to authenticated;
commit;
