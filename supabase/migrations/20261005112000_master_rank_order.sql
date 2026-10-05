begin;
-- Preserve configurable ranks for statuses, priorities and titles when paginating.
create or replace function public.admin_master_page(p_kind text,p_query text default '',p_page integer default 1,p_trash boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_table text;v_rows jsonb;v_total bigint;v_page integer;v_active boolean;v_order text;
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or char_length(coalesce(p_query,''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  v_table:=case p_kind when 'priorities' then 'priorities' when 'job-statuses' then 'job_statuses'
    when 'task-statuses' then 'task_statuses' when 'job-titles' then 'job_titles'
    when 'internal-service-categories' then 'internal_service_categories' when 'workflow-templates' then 'workflow_templates' end;
  if v_table is null then raise exception 'Invalid category.' using errcode='22023'; end if;
  v_order:=case when p_kind in ('priorities','job-statuses','task-statuses','job-titles') then 'sort_order,name,id' else 'name,id' end;
  v_active:=case when p_kind='workflow-templates' then not p_trash else null end;
  execute format('select count(*) from public.%I t where strpos(lower(concat_ws('' '',t.name,t.code)),lower(btrim($1)))>0 and ($2 is null or (to_jsonb(t)->>''is_active'')::boolean=$2)',v_table) into v_total using coalesce(p_query,''),v_active;
  v_page:=least(p_page,greatest(1,ceil(v_total/10.0)::integer));
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t)->>''sort_order'')::integer nulls last,t.name,t.id),''[]''::jsonb) from (
    select * from public.%I t where strpos(lower(concat_ws('' '',t.name,t.code)),lower(btrim($1)))>0
      and ($2 is null or (to_jsonb(t)->>''is_active'')::boolean=$2) order by %s limit 10 offset $3) t',v_table,v_order)
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
commit;
