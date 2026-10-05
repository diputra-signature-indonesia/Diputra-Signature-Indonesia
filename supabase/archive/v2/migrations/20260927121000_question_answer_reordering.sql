begin;

create or replace function public.reorder_question_answers(
  p_services_categories_id uuid,
  p_ordered_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_expected_count integer;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access is required.' using errcode = '42501';
  end if;
  if p_services_categories_id is not null and not exists (
    select 1 from public.services_categories
    where id = p_services_categories_id and deleted_at is null
  ) then
    raise exception 'Service category is unavailable.' using errcode = '23503';
  end if;

  select count(*) into v_expected_count
  from public.question_answer
  where services_categories_id is not distinct from p_services_categories_id
    and deleted_at is null;

  if coalesce(array_length(p_ordered_ids, 1), 0) <> v_expected_count
    or (select count(distinct id) from unnest(p_ordered_ids) as id) <> v_expected_count
    or exists (
      select 1 from unnest(p_ordered_ids) as ordered(id)
      where not exists (
        select 1 from public.question_answer as item
        where item.id = ordered.id
          and item.services_categories_id is not distinct from p_services_categories_id
          and item.deleted_at is null
      )
    )
  then
    raise exception 'Q&A order does not match the selected scope.' using errcode = '22023';
  end if;

  update public.question_answer as item
  set sort_order = ordered.position,
      updated_by = v_actor,
      version = item.version + 1
  from unnest(p_ordered_ids) with ordinality as ordered(id, position)
  where item.id = ordered.id;
end;
$$;

revoke all on function public.reorder_question_answers(uuid,uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.reorder_question_answers(uuid,uuid[]) to authenticated, service_role;

comment on function public.reorder_question_answers(uuid,uuid[]) is
  'Reorders every active Q&A inside exactly one Global or Service category scope.';

commit;
