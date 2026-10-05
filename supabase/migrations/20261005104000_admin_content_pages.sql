begin;
create function public.admin_blog_categories()
returns jsonb language sql stable security invoker set search_path='' as $$
  select coalesce(jsonb_agg(category order by category),'[]'::jsonb) from (
    select distinct category from public.blog_posts where public.is_staff_role() and archived_at is null and btrim(category)<>''
  ) c;
$$;

create function public.admin_public_service_page(p_category uuid default null,p_item uuid default null,
  p_category_page integer default 1,p_item_page integer default 1,p_detail_page integer default 1,p_query text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_category uuid;v_result jsonb;v_categories jsonb;v_category_total bigint;v_category_page integer;
  v_items jsonb;v_item_total bigint;v_item_page integer;v_details jsonb;v_detail_total bigint;v_detail_page integer;
begin
  if not public.is_admin_role() then raise exception 'Active admin access required.' using errcode='42501'; end if;
  if p_category_page is null or p_item_page is null or p_detail_page is null or least(p_category_page,p_item_page,p_detail_page)<1
    or greatest(p_category_page,p_item_page,p_detail_page)>1000000 or char_length(coalesce(p_query,''))>160 then raise exception 'Invalid search.' using errcode='22023'; end if;
  with matches as materialized (
    select * from public.services_categories where deleted_at is null and strpos(lower(concat_ws(' ',title,slug)),lower(btrim(coalesce(p_query,''))))>0
  ), totals as (select count(*) as total from matches), paging as (select total,least(p_category_page,greatest(1,ceil(total/10.0)::integer)) as page from totals), page_rows as materialized (
    select * from matches order by sort_order,title,id limit 10 offset ((select page from paging)-1)*10
  ), counts as (select category_id,count(*) as n from public.services_items where deleted_at is null and category_id in (select id from page_rows) group by category_id)
  select total,page,coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('items','[]'::jsonb,'itemCount',coalesce(n,0)) order by c.sort_order,c.title,c.id) from page_rows c left join counts on counts.category_id=c.id),'[]'::jsonb)
    into v_category_total,v_category_page,v_categories from paging;
  v_category:=coalesce(p_category,(v_categories->0->>'id')::uuid);
  if p_item is not null and not exists(select 1 from public.services_items where id=p_item and category_id=v_category and deleted_at is null) then raise exception 'Sub-service unavailable.' using errcode='22023'; end if;
  select count(*) into v_item_total from public.services_items where category_id=v_category and deleted_at is null;
  v_item_page:=least(p_item_page,greatest(1,ceil(v_item_total/10.0)::integer));
  with page_rows as materialized (
    select * from public.services_items where category_id=v_category and deleted_at is null order by sort_order,title,id limit 10 offset (v_item_page-1)*10
  ), counts as (select service_item_id,count(*) as n from public.services_item_details where deleted_at is null and service_item_id in (select id from page_rows) group by service_item_id)
  select coalesce(jsonb_agg(to_jsonb(i) || jsonb_build_object('details','[]'::jsonb,'detailCount',coalesce(n,0)) order by i.sort_order,i.title,i.id),'[]'::jsonb) into v_items from page_rows i left join counts on counts.service_item_id=i.id;
  select count(*) into v_detail_total from public.services_item_details where service_item_id=p_item and deleted_at is null;
  v_detail_page:=least(p_detail_page,greatest(1,ceil(v_detail_total/10.0)::integer));
  select coalesce(jsonb_agg(to_jsonb(d) order by sort_order,title,id),'[]'::jsonb) into v_details from (
    select * from public.services_item_details where service_item_id=p_item and deleted_at is null order by sort_order,title,id limit 10 offset (v_detail_page-1)*10
  ) d;
  return jsonb_build_object('categories',v_categories,'categoryTotal',v_category_total,'categoryPage',v_category_page,
    'selected',(select to_jsonb(c) || jsonb_build_object('items',v_items) from public.services_categories c where id=v_category and deleted_at is null),
    'itemTotal',v_item_total,'itemPage',v_item_page,'details',v_details,'detailTotal',v_detail_total,'detailPage',v_detail_page,
    'nextCategoryOrder',(select coalesce(max(sort_order),-10)+10 from public.services_categories where deleted_at is null),
    'nextItemOrder',(select coalesce(max(sort_order),-10)+10 from public.services_items where category_id=v_category and deleted_at is null),
    'nextDetailOrder',(select coalesce(max(sort_order),-10)+10 from public.services_item_details where service_item_id=p_item and deleted_at is null));
end;
$$;
revoke all on function public.admin_blog_categories() from public,anon;
revoke all on function public.admin_public_service_page(uuid,uuid,integer,integer,integer,text) from public,anon;
grant execute on function public.admin_blog_categories() to authenticated;
grant execute on function public.admin_public_service_page(uuid,uuid,integer,integer,integer,text) to authenticated;
commit;
