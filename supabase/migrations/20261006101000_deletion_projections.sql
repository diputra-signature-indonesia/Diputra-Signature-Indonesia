begin;
CREATE OR REPLACE FUNCTION public.search_internal_services(p_search text DEFAULT ''::text, p_category_id uuid DEFAULT NULL::uuid, p_uncategorized boolean DEFAULT false, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    select s.id,s.code,s.name,s.summary,s.category_id,c.name as category_name,c.code as category_code,
      s.workflow_template_id,w.name as workflow_name,s.is_active,s.version,
      (select count(*) from public.workflow_template_steps st where st.workflow_template_id=s.workflow_template_id) as step_count,
      (select count(*) from public.jobs j where j.internal_service_id=s.id) as reference_count,
      s.deletion_started_at,
      (select count(*) from public.sop_files f join public.sops sp on sp.id=f.sop_id where sp.internal_service_id=s.id) as sop_file_count
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
$function$
;

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
      where (p_kind='service_filters' or (s.is_active and s.deletion_token is null)) and (p_id is null or s.id=p_id) and (p_id is not null or strpos(lower(concat_ws(' ',s.name,s.code)),v_query)>0)
        and (p_kind='service_filters' or p_id is not null or (w.is_active and exists(select 1 from public.workflow_template_steps st where st.workflow_template_id=w.id)))
      order by s.name,s.id limit 10) r;
  elsif p_kind in ('internal_categories','internal_category_filters') then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select c.id::text as value,c.name as label,c.code from public.internal_service_categories c
      where (p_kind='internal_category_filters' or c.is_active or p_id is not null) and (p_id is null or c.id=p_id) and (p_id is not null or strpos(lower(concat_ws(' ',c.name,c.code)),v_query)>0)
      order by c.name,c.id limit 10) r;
  elsif p_kind='job_titles' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select t.id::text as value,t.name as label from public.job_titles t
      where (t.is_active or p_id is not null) and (p_id is null or t.id=p_id)
      and (p_id is not null or strpos(lower(concat_ws(' ',t.name,t.code)),v_query)>0)
      order by t.sort_order,t.name,t.id limit 10) r;
  elsif p_kind='workflows' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select w.id::text as value,w.name as label from public.workflow_templates w
      where (w.is_active or p_id is not null) and (p_id is null or w.id=p_id)
      and (p_id is not null or strpos(lower(concat_ws(' ',w.name,w.code)),v_query)>0)
      order by w.name,w.id limit 10) r;
  elsif p_kind='jobs' then
    select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) into v_rows from (
      select j.id::text as value,j.title as label from public.jobs j where j.archived_at is null and j.deletion_token is null
      and (p_parent is null or j.client_id=p_parent) and (p_id is null or j.id=p_id)
      and (p_id is not null or strpos(lower(j.title),v_query)>0) order by j.title,j.id limit 10) r;
  else raise exception 'Invalid lookup kind.' using errcode='22023'; end if;
  return v_rows;
end;
$$;


create or replace function public.admin_master_page(p_kind text,p_query text default '',p_page integer default 1,p_trash boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_table text;v_rows jsonb;v_total bigint;v_page integer;v_active boolean;v_order text;v_ids uuid[];
begin
  if not private.is_active_staff(auth.uid()) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  if p_page is null or p_page<1 or p_page>1000000 or char_length(coalesce(p_query,''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  v_table:=case p_kind when 'priorities' then 'priorities' when 'job-statuses' then 'job_statuses'
    when 'task-statuses' then 'task_statuses' when 'job-titles' then 'job_titles'
    when 'internal-service-categories' then 'internal_service_categories' when 'workflow-templates' then 'workflow_templates' end;
  if v_table is null then raise exception 'Invalid category.' using errcode='22023'; end if;
  v_order:=case when p_kind in ('priorities','job-statuses','task-statuses','job-titles') then 'sort_order,name,id' else 'name,id' end;
  v_active:=case when p_kind='workflow-templates' then not p_trash else null end;
  execute format('select count(*) from public.%I t where strpos(lower(concat_ws('' '',t.name,t.code)),lower(btrim($1)))>0 and ($2 is null or t.is_active=$2)',v_table) into v_total using coalesce(p_query,''),v_active;
  v_page:=least(p_page,greatest(1,ceil(v_total/10.0)::integer));
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by (to_jsonb(t)->>''sort_order'')::integer nulls last,t.name,t.id),''[]''::jsonb) from (
    select * from public.%I t where strpos(lower(concat_ws('' '',t.name,t.code)),lower(btrim($1)))>0
      and ($2 is null or t.is_active=$2) order by %s limit 10 offset $3) t',v_table,v_order)
    into v_rows using coalesce(p_query,''),v_active,(v_page-1)*10;
  select array_agg((r->>'id')::uuid) into v_ids from jsonb_array_elements(v_rows) r;
  -- A single batch for the ten visible records, not one request per row.
  with counts as (select * from private.master_reference_counts(p_kind,v_ids)),
  steps as (select workflow_template_id,jsonb_agg(name order by position) as names from public.workflow_template_steps
    where p_kind='workflow-templates' and workflow_template_id=any(v_ids) group by workflow_template_id)
  select coalesce(jsonb_agg(r || jsonb_build_object('referenceCount',coalesce(c.reference_count,0))
    || case when p_kind='workflow-templates' then jsonb_build_object('stepNames',coalesce(s.names,'[]'::jsonb)) else '{}'::jsonb end order by ordinal),'[]'::jsonb)
    into v_rows from jsonb_array_elements(v_rows) with ordinality a(r,ordinal)
    left join counts c on c.id=(r->>'id')::uuid left join steps s on s.workflow_template_id=(r->>'id')::uuid;
  return jsonb_build_object('rows',v_rows,'total',v_total,'page',v_page);
end;
$$;
commit;
