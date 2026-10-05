begin;
create function public.search_admin_dashboard(p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;v_today date:=(now() at time zone 'Asia/Makassar')::date;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if jsonb_typeof(p_filters)<>'object' then raise exception 'Invalid filters.' using errcode='22023'; end if;
  with filtered as materialized (
    select t.id,t.job_id,t.title,t.due_date,t.assignee_id,coalesce(p.display_name,p.email,'Belum ditugaskan') as assignee_name,
      j.client_id,c.name as client_name,j.internal_service_id,s.name as service_name,
      pr.name as priority_name,pr.color as priority_color,ts.id as status_id,ts.name as status_name,ts.code as status_code,ts.color as status_color
    from public.tasks t join public.jobs j on j.id=t.job_id join public.clients c on c.id=j.client_id
      join public.internal_services s on s.id=j.internal_service_id
      join public.job_task_statuses cs on cs.id=t.job_task_status_id join public.task_statuses ts on ts.id=cs.task_status_id
      left join public.profiles p on p.id=t.assignee_id left join public.priorities pr on pr.id=t.priority_id
    where t.deleted_at is null and j.archived_at is null
      and (coalesce(p_filters->>'pic','')='' or coalesce(t.assignee_id::text,'UNASSIGNED')=p_filters->>'pic')
      and (coalesce(p_filters->>'client','')='' or j.client_id::text=p_filters->>'client')
      and (coalesce(p_filters->>'status','')='' or ts.id::text=p_filters->>'status')
      and (coalesce(p_filters->>'internalService','')='' or j.internal_service_id::text=p_filters->>'internalService')
      and (coalesce(p_filters->>'dateFrom','')='' or t.due_date>=(p_filters->>'dateFrom')::date)
      and (coalesce(p_filters->>'dateTo','')='' or t.due_date<=(p_filters->>'dateTo')::date)
  ), metrics as (
    select count(*) filter(where status_code<>'COMPLETED') as active,
      count(*) filter(where status_code='NOT_STARTED') as not_started,
      count(*) filter(where status_code='IN_PROGRESS') as in_progress,
      count(*) filter(where status_code in ('ON_HOLD','OBSTACLE','BLOCKED','DELAYED')) as delayed,
      count(*) filter(where status_code='COMPLETED') as completed,
      count(*) filter(where status_code<>'COMPLETED' and due_date between v_today+1 and v_today+7) as near_deadline,
      count(*) filter(where status_code<>'COMPLETED' and due_date=v_today) as due_today,
      count(*) filter(where status_code<>'COMPLETED' and due_date<v_today) as overdue from filtered
  ), pics as (
    select coalesce(assignee_id::text,'UNASSIGNED') as id,assignee_name as name,
      count(*) filter(where status_code='NOT_STARTED') as "notStarted",
      count(*) filter(where status_code='IN_PROGRESS') as "inProgress",
      count(*) filter(where status_code in ('ON_HOLD','OBSTACLE','BLOCKED','DELAYED')) as delayed
    from filtered where status_code<>'COMPLETED' group by assignee_id,assignee_name
  ), services as (
    select internal_service_id as id,service_name as label,count(*) as value from filtered where status_code<>'COMPLETED' group by internal_service_id,service_name
  ), attention as materialized (
    select * from filtered where status_code<>'COMPLETED' and (due_date<=v_today+7 or status_code in ('ON_HOLD','OBSTACLE','BLOCKED','DELAYED'))
      order by due_date nulls last,title,id limit 10
  ), attention_rows as (
    select a.*,ov.progress_percentage as progress from attention a join public.job_overview ov on ov.id=a.job_id
  ) select jsonb_build_object('counts',(select to_jsonb(m) from metrics m),
    'taskLoads',coalesce((select jsonb_agg(to_jsonb(p) order by ("notStarted"+"inProgress"+delayed) desc,name,id) from pics p),'[]'::jsonb),
    'internalServices',coalesce((select jsonb_agg(to_jsonb(s) order by value desc,label,id) from services s),'[]'::jsonb),
    'attention',coalesce((select jsonb_agg(to_jsonb(a) order by due_date nulls last,title,id) from attention_rows a),'[]'::jsonb),
    'statuses',(select coalesce(jsonb_agg(jsonb_build_object('value',id,'label',name) order by sort_order),'[]'::jsonb) from public.task_statuses where is_active)) into v_result;
  return v_result;
end;
$$;

create function public.search_managed_profiles(p_query text default '',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_rows jsonb;v_total bigint;v_page integer;
begin
  if not public.is_admin_role() then raise exception 'Active admin access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or char_length(coalesce(p_query,''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  with matches as materialized (
    select p.id,p.email,p.display_name,p.avatar_url,p.role,p.is_active,p.created_at,p.updated_at,
      case when tm.id is null then null else jsonb_build_object('id',tm.id,'profile_id',tm.profile_id,'full_name',tm.full_name,
        'short_bio',tm.short_bio,'avatar_url',tm.avatar_url,'is_visible',tm.is_visible,'job_title_id',tm.job_title_id,'jobTitleName',jt.name) end as "teamMember"
    from public.profiles p left join public.team_members tm on tm.profile_id=p.id left join public.job_titles jt on jt.id=tm.job_title_id
    where p.deleted_at is null and strpos(lower(concat_ws(' ',p.display_name,p.email)),lower(btrim(coalesce(p_query,''))))>0
  ), totals as (select count(*) as total from matches), paging as (select total,least(p_page,greatest(1,ceil(total/10.0)::integer)) as page from totals), page_rows as (
    select * from matches order by display_name nulls last,email,id limit 10 offset ((select page from paging)-1)*10
  ) select total,page,coalesce((select jsonb_agg(to_jsonb(r) order by display_name nulls last,email,id) from page_rows r),'[]'::jsonb)
    into v_total,v_page,v_rows from paging;
  return jsonb_build_object('profiles',v_rows,'total',v_total,'page',v_page);
end;
$$;

create function public.search_sop_services(p_query text default '',p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_rows jsonb;v_total bigint;v_page integer;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or char_length(coalesce(p_query,''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  with matches as materialized (
    select id,name as title,coalesce(summary,'Internal service procedure.') as summary from public.internal_services
      where is_active and strpos(lower(concat_ws(' ',name,code,summary)),lower(btrim(coalesce(p_query,''))))>0
  ), totals as (select count(*) as total from matches), paging as (select total,least(p_page,greatest(1,ceil(total/10.0)::integer)) as page from totals), page_rows as (
    select * from matches order by title,id limit 10 offset ((select page from paging)-1)*10
  ) select total,page,coalesce((select jsonb_agg(to_jsonb(r) order by title,id) from page_rows r),'[]'::jsonb)
    into v_total,v_page,v_rows from paging;
  return jsonb_build_object('services',v_rows,'total',v_total,'page',v_page);
end;
$$;
revoke all on function public.search_admin_dashboard(jsonb) from public,anon;
revoke all on function public.search_managed_profiles(text,integer) from public,anon;
revoke all on function public.search_sop_services(text,integer) from public,anon;
grant execute on function public.search_admin_dashboard(jsonb) to authenticated;
grant execute on function public.search_managed_profiles(text,integer) to authenticated;
grant execute on function public.search_sop_services(text,integer) to authenticated;
commit;
