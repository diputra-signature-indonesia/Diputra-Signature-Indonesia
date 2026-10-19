begin;

-- Read-only dashboard correction. No table, column, policy, grant or data changes.
-- CREATE OR REPLACE retains the existing signature and execution permissions.
create or replace function public.search_admin_dashboard(p_filters jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;v_today date:=(now() at time zone 'Asia/Makassar')::date;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_filters is null or jsonb_typeof(p_filters)<>'object' then raise exception 'Invalid filters.' using errcode='22023'; end if;

  -- Shared filters describe Jobs, including their status and estimated end date.
  -- Apply PIC separately: Job owner for Job panels, assignee for Task workload.
  with job_scope as materialized (
    select j.id,j.title,j.pic_id,j.estimated_end_date as due_date,
      coalesce(nullif(btrim(p.display_name),''),p.email,'Belum ditugaskan') as pic_name,
      j.internal_service_id,s.name as service_name,c.name as client_name,
      pr.name as priority_name,pr.color as priority_color,
      st.name as status_name,st.code as status_code,st.color as status_color,
      st.code not in ('COMPLETED','CANCELLED','CANCELED') as is_active
    from public.jobs j
      join public.clients c on c.id=j.client_id
      join public.internal_services s on s.id=j.internal_service_id
      join public.job_statuses st on st.id=j.status_id
      left join public.profiles p on p.id=j.pic_id
      left join public.priorities pr on pr.id=j.priority_id
    where j.archived_at is null
      and (coalesce(p_filters->>'client','')='' or j.client_id::text=p_filters->>'client')
      and (coalesce(p_filters->>'status','')='' or j.status_id::text=p_filters->>'status')
      and (coalesce(p_filters->>'internalService','')='' or j.internal_service_id::text=p_filters->>'internalService')
      and (coalesce(p_filters->>'dateFrom','')='' or j.estimated_end_date>=(p_filters->>'dateFrom')::date)
      and (coalesce(p_filters->>'dateTo','')='' or j.estimated_end_date<=(p_filters->>'dateTo')::date)
  ), filtered_jobs as materialized (
    select * from job_scope
    where coalesce(p_filters->>'pic','')='' or coalesce(pic_id::text,'UNASSIGNED')=p_filters->>'pic'
  ), metrics as (
    select count(*) filter(where is_active) as active,
      count(*) filter(where status_code='NOT_STARTED') as not_started,
      count(*) filter(where status_code='IN_PROGRESS') as in_progress,
      count(*) filter(where status_code in ('ON_HOLD','OBSTACLE','BLOCKED','DELAYED')) as delayed,
      count(*) filter(where status_code='COMPLETED') as completed,
      count(*) filter(where is_active and due_date between v_today+1 and v_today+7) as near_deadline,
      count(*) filter(where is_active and due_date=v_today) as due_today,
      count(*) filter(where is_active and due_date<v_today) as overdue
    from filtered_jobs
  ), task_scope as (
    select t.assignee_id,
      coalesce(nullif(btrim(p.display_name),''),p.email,'Belum ditugaskan') as assignee_name,
      ts.code as status_code
    from public.tasks t
      join job_scope j on j.id=t.job_id
      join public.job_task_statuses cs on cs.id=t.job_task_status_id
      join public.task_statuses ts on ts.id=cs.task_status_id
      left join public.profiles p on p.id=t.assignee_id
    where t.deleted_at is null and ts.code not in ('COMPLETED','CANCELLED','CANCELED')
      and (coalesce(p_filters->>'pic','')='' or coalesce(t.assignee_id::text,'UNASSIGNED')=p_filters->>'pic')
  ), pics as (
    select coalesce(assignee_id::text,'UNASSIGNED') as id,assignee_name as name,
      count(*) filter(where status_code='NOT_STARTED') as "notStarted",
      count(*) filter(where status_code='IN_PROGRESS') as "inProgress",
      count(*) filter(where status_code in ('ON_HOLD','OBSTACLE','BLOCKED','DELAYED')) as delayed
    from task_scope group by assignee_id,assignee_name
  ), services as (
    -- Total Job includes completed/cancelled Jobs, but never Trash or Tasks.
    select internal_service_id as id,service_name as label,count(*) as value
    from filtered_jobs group by internal_service_id,service_name
  ), attention as materialized (
    select * from filtered_jobs
    where is_active and (due_date<=v_today+7 or status_code in ('ON_HOLD','OBSTACLE','BLOCKED','DELAYED'))
    order by due_date nulls last,title,id limit 10
  ), attention_progress as (
    -- One set-based aggregation for at most ten Jobs; no per-row queries.
    select js.job_id,round(100.0*count(*) filter(where js.is_completed)/nullif(count(*),0))::integer as progress
    from public.job_steps js join attention a on a.id=js.job_id
    where js.replaced_at is null group by js.job_id
  ), attention_rows as (
    -- Retain legacy field aliases so the currently deployed app can read this
    -- RPC during rollout. Both IDs now identify the Job, never a Task.
    select a.id,a.id as job_id,a.title,a.due_date,a.client_name,
      a.pic_name,a.pic_name as assignee_name,a.service_name,
      a.priority_name,a.priority_color,a.status_name,a.status_color,coalesce(p.progress,0) as progress
    from attention a left join attention_progress p on p.job_id=a.id
  ) select jsonb_build_object(
    'counts',(select to_jsonb(m) from metrics m),
    'taskLoads',coalesce((select jsonb_agg(to_jsonb(p) order by ("notStarted"+"inProgress"+delayed) desc,name,id) from pics p),'[]'::jsonb),
    'internalServices',coalesce((select jsonb_agg(to_jsonb(s) order by value desc,label,id) from services s),'[]'::jsonb),
    'attention',coalesce((select jsonb_agg(to_jsonb(a) order by due_date nulls last,title,id) from attention_rows a),'[]'::jsonb),
    'statuses',(select coalesce(jsonb_agg(jsonb_build_object('value',id,'label',name) order by sort_order,name,id),'[]'::jsonb) from public.job_statuses where is_active)
  ) into v_result;
  return v_result;
end;
$$;

commit;
