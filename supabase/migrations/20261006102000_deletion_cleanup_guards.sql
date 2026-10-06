begin;
-- Legacy scheduled Trash cleanup uses the same durable reservation. This is not
-- a new automatic deletion schedule; it hardens the existing protected endpoint.
create function public.prepare_expired_job_deletion(p_job_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;v_token uuid;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found or v_job.archived_at is null or v_job.archived_at>now()-interval '30 days' then raise exception 'Job is not expired Trash.' using errcode='55000'; end if;
  v_token:=v_job.deletion_token;
  if v_token is null then
    v_token:=gen_random_uuid();
    update public.jobs set deletion_token=v_token,deletion_started_at=now() where id=p_job_id;
  end if;
  return jsonb_build_object('token',v_token,
    'folders',coalesce((select jsonb_agg(jsonb_build_object('id',google_folder_id,'driveId',google_drive_id)) from public.job_drive_folders where job_id=p_job_id),'[]'::jsonb),
    'files',coalesce((select jsonb_agg(jsonb_build_object('id',d.google_file_id,'folderId',f.google_folder_id,'driveId',f.google_drive_id)) from public.job_documents d join public.job_drive_folders f on f.id=d.job_drive_folder_id where d.job_id=p_job_id),'[]'::jsonb));
end;
$$;
create function public.finish_expired_job_deletion(p_job_id uuid,p_token uuid) returns void language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server access required.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then return; end if;
  if v_job.archived_at is null or v_job.archived_at>now()-interval '30 days' or p_token is null or v_job.deletion_token is distinct from p_token then raise exception 'Invalid expired Job deletion.' using errcode='55000'; end if;
  perform private.delete_job_graph(p_job_id);
end;
$$;
revoke all on function public.prepare_expired_job_deletion(uuid),public.finish_expired_job_deletion(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.prepare_expired_job_deletion(uuid),public.finish_expired_job_deletion(uuid,uuid) to service_role;

-- Old purge callers may delete only records without external resources.
create or replace function public.purge_expired_job(p_job_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v_job public.jobs%rowtype;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Only the cleanup service can purge expired Job Trash.' using errcode='42501'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found or v_job.archived_at is null or v_job.archived_at>now()-interval '30 days' then raise exception 'Job Trash is not eligible for automatic purge.' using errcode='55000'; end if;
  if v_job.deletion_token is not null or exists(select 1 from public.job_drive_folders where job_id=p_job_id) then raise exception 'Use the server deletion workflow to clean Drive first.' using errcode='55000'; end if;
  perform private.delete_job_graph(p_job_id);return p_job_id;
end;
$$;
create or replace function public.search_my_tasks(p_filters jsonb default '{}'::jsonb,p_page integer default 1,
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
      (j.deletion_token is null and js.code<>'COMPLETED' and (public.is_admin_role() or j.pic_id=auth.uid() or t.assignee_id=auth.uid())) as can_change_status
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
commit;
