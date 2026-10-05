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
      and (coalesce(p_filters->>'excludeJobId','')='' or j.id::text<>p_filters->>'excludeJobId')
      and (coalesce(btrim(p_filters->>'jobQuery'),'')='' or strpos(lower(concat_ws(' ',j.title,c.name,s.name)),lower(btrim(p_filters->>'jobQuery')))>0)
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

create or replace function public.search_admin_lookup(p_kind text,p_query text default '',p_id uuid default null,p_parent uuid default null)
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
  elsif p_kind in ('services','service_filters') then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select s.id::text as value,s.name as label,w.name as "workflowName",
        case when p_id is not null then (select coalesce(jsonb_agg(st.name order by st.position),'[]'::jsonb)
          from public.workflow_template_steps st where st.workflow_template_id=s.workflow_template_id) else '[]'::jsonb end as steps
      from public.internal_services s left join public.workflow_templates w on w.id=s.workflow_template_id
      where (p_kind='service_filters' or s.is_active) and (p_id is null or s.id=p_id) and (p_id is not null or strpos(lower(concat_ws(' ',s.name,s.code)),v_query)>0)
        and (p_kind='service_filters' or p_id is not null or (w.is_active and exists(select 1 from public.workflow_template_steps st where st.workflow_template_id=w.id)))
      order by s.name,s.id limit 10) r;
  elsif p_kind='internal_categories' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select c.id::text as value,c.name as label,c.code from public.internal_service_categories c
      where (p_id is null or c.id=p_id) and (p_id is not null or strpos(lower(concat_ws(' ',c.name,c.code)),v_query)>0)
      order by c.name,c.id limit 10) r;
  elsif p_kind='workflows' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select w.id::text as value,w.name as label from public.workflow_templates w
      where (w.is_active or p_id is not null) and (p_id is null or w.id=p_id)
      and (p_id is not null or strpos(lower(concat_ws(' ',w.name,w.code)),v_query)>0)
      order by w.name,w.id limit 10) r;
  elsif p_kind='jobs' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select j.id::text as value,j.title as label from public.jobs j where j.archived_at is null
      and (p_parent is null or j.client_id=p_parent) and (p_id is null or j.id=p_id)
      and (p_id is not null or strpos(lower(j.title),v_query)>0) order by j.title,j.id limit 10) r;
  else raise exception 'Invalid lookup kind.' using errcode='22023'; end if;
  return v_rows;
end;
$$;

create function public.admin_master_counts() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  return jsonb_build_object(
    'priorities',(select count(*) from public.priorities),'job-statuses',(select count(*) from public.job_statuses),
    'task-statuses',(select count(*) from public.task_statuses),'job-titles',(select count(*) from public.job_titles),
    'workflow-templates',(select count(*) from public.workflow_templates),
    'internal-service-categories',(select count(*) from public.internal_service_categories),
    'internal-services',(select count(*) from public.internal_services));
end;
$$;

-- Only whitelisted table identifiers are interpolated; filters are parameters.
create function public.admin_master_page(p_kind text,p_query text default '',p_page integer default 1,p_trash boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_table text;v_rows jsonb;v_total bigint;v_page integer;v_active boolean;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or char_length(coalesce(p_query,''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  v_table:=case p_kind when 'priorities' then 'priorities' when 'job-statuses' then 'job_statuses'
    when 'task-statuses' then 'task_statuses' when 'job-titles' then 'job_titles'
    when 'internal-service-categories' then 'internal_service_categories' when 'workflow-templates' then 'workflow_templates' end;
  if v_table is null then raise exception 'Invalid category.' using errcode='22023'; end if;
  v_active:=case when p_kind='workflow-templates' then not p_trash else null end;
  execute format('select count(*) from public.%I t where strpos(lower(concat_ws('' '',t.name,t.code)),lower(btrim($1)))>0 and ($2 is null or (to_jsonb(t)->>''is_active'')::boolean=$2)',v_table) into v_total using coalesce(p_query,''),v_active;
  v_page:=least(p_page,greatest(1,ceil(v_total/10.0)::integer));
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by t.name,t.id),''[]''::jsonb) from (
    select * from public.%I t where strpos(lower(concat_ws('' '',t.name,t.code)),lower(btrim($1)))>0
      and ($2 is null or (to_jsonb(t)->>''is_active'')::boolean=$2) order by name,id limit 10 offset $3) t',v_table)
    into v_rows using coalesce(p_query,''),v_active,(v_page-1)*10;
  if p_kind='workflow-templates' then
    with ids as (select (r->>'id')::uuid as id from jsonb_array_elements(v_rows) r),
    steps as (select workflow_template_id,jsonb_agg(name order by position) as names from public.workflow_template_steps where workflow_template_id in(select id from ids) group by workflow_template_id),
    counts as (select workflow_template_id,count(*) as n from public.internal_services where workflow_template_id in(select id from ids) group by workflow_template_id)
    select coalesce(jsonb_agg(r || jsonb_build_object('stepNames',coalesce(s.names,'[]'::jsonb),'referenceCount',coalesce(c.n,0)) order by r->>'name',r->>'id'),'[]'::jsonb)
      into v_rows from jsonb_array_elements(v_rows) r left join steps s on s.workflow_template_id=(r->>'id')::uuid left join counts c on c.workflow_template_id=(r->>'id')::uuid;
  elsif p_kind='internal-service-categories' then
    with ids as (select (r->>'id')::uuid as id from jsonb_array_elements(v_rows) r),
    counts as (select category_id,count(*) as n from public.internal_services where category_id in(select id from ids) group by category_id)
    select coalesce(jsonb_agg(r || jsonb_build_object('referenceCount',coalesce(c.n,0)) order by r->>'name',r->>'id'),'[]'::jsonb)
      into v_rows from jsonb_array_elements(v_rows) r left join counts c on c.category_id=(r->>'id')::uuid;
  end if;
  return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page);
end;
$$;
revoke all on function public.admin_master_counts() from public,anon;
revoke all on function public.admin_master_page(text,text,integer,boolean) from public,anon;
grant execute on function public.admin_master_counts() to authenticated;
grant execute on function public.admin_master_page(text,text,integer,boolean) to authenticated;
commit;
