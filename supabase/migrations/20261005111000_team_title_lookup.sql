begin;
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
      select j.id::text as value,j.title as label from public.jobs j where j.archived_at is null
      and (p_parent is null or j.client_id=p_parent) and (p_id is null or j.id=p_id)
      and (p_id is not null or strpos(lower(j.title),v_query)>0) order by j.title,j.id limit 10) r;
  else raise exception 'Invalid lookup kind.' using errcode='22023'; end if;
  return v_rows;
end;
$$;

commit;
