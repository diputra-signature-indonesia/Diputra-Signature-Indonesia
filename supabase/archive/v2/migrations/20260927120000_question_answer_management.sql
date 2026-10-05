begin;

-- Turn the dormant Q&A table into managed public content. A null category is
-- the global scope; category-scoped entries are shown before global entries on
-- category and sub-service pages.
alter table public.question_answer
  add column sort_order bigint not null default 0,
  add column version integer not null default 1,
  add column created_by uuid references public.profiles(id) on delete restrict,
  add column updated_by uuid references public.profiles(id) on delete restrict,
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id) on delete restrict;

alter table public.question_answer
  add constraint question_answer_question_not_blank check (char_length(btrim(question)) between 1 and 500),
  add constraint question_answer_answer_not_blank check (char_length(btrim(answer)) between 1 and 10000),
  add constraint question_answer_version_positive check (version > 0),
  add constraint question_answer_delete_state check (
    (deleted_at is null and deleted_by is null)
    or (deleted_at is not null and deleted_by is not null)
  );

create index question_answer_public_order_idx
  on public.question_answer (services_categories_id, sort_order, created_at, id)
  where is_visible is true and deleted_at is null;

drop trigger if exists question_answer_set_updated_at on public.question_answer;
create trigger question_answer_set_updated_at
before update on public.question_answer
for each row execute function public.set_updated_at();

drop policy if exists "public read published blog posts" on public.question_answer;
drop policy if exists "Public read visible Q&A" on public.question_answer;
drop policy if exists "Active staff read all Q&A" on public.question_answer;

create policy "Public read visible Q&A"
on public.question_answer
for select to anon, authenticated
using (
  is_visible is true
  and deleted_at is null
  and (
    services_categories_id is null
    or exists (
      select 1
      from public.services_categories as category
      where category.id = services_categories_id
        and category.is_published is true
        and category.deleted_at is null
    )
  )
);

create policy "Active staff read all Q&A"
on public.question_answer
for select to authenticated
using (private.is_active_staff(auth.uid()) and deleted_at is null);

revoke all privileges on table public.question_answer from anon, authenticated;
grant select on table public.question_answer to anon;
grant select, insert, update, delete on table public.question_answer to authenticated;
grant all privileges on table public.question_answer to service_role;

create or replace function public.list_question_answer_categories()
returns table (
  id uuid,
  title text,
  slug text,
  is_published boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select category.id, category.title, category.slug, category.is_published
  from public.services_categories as category
  where private.is_active_staff(auth.uid())
    and category.deleted_at is null
  order by category.sort_order, category.title, category.id;
$$;

create or replace function public.save_question_answer(
  p_id uuid,
  p_expected_version integer,
  p_question text,
  p_answer text,
  p_services_categories_id uuid default null,
  p_is_visible boolean default true,
  p_sort_order bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access is required.' using errcode = '42501';
  end if;
  if nullif(btrim(p_question), '') is null or char_length(btrim(p_question)) > 500 then
    raise exception 'Question is required and cannot exceed 500 characters.' using errcode = '22023';
  end if;
  if nullif(btrim(p_answer), '') is null or char_length(btrim(p_answer)) > 10000 then
    raise exception 'Answer is required and cannot exceed 10000 characters.' using errcode = '22023';
  end if;
  if p_sort_order < 0 then
    raise exception 'Display order cannot be negative.' using errcode = '22023';
  end if;
  if p_services_categories_id is not null and not exists (
    select 1 from public.services_categories
    where id = p_services_categories_id and deleted_at is null
  ) then
    raise exception 'Service category is unavailable.' using errcode = '23503';
  end if;

  if p_id is null then
    insert into public.question_answer (
      services_categories_id, question, answer, is_visible, sort_order,
      created_by, updated_by
    ) values (
      p_services_categories_id, btrim(p_question), btrim(p_answer),
      coalesce(p_is_visible, true), p_sort_order, v_actor, v_actor
    ) returning id into v_id;
  else
    update public.question_answer
    set services_categories_id = p_services_categories_id,
        question = btrim(p_question),
        answer = btrim(p_answer),
        is_visible = coalesce(p_is_visible, true),
        sort_order = p_sort_order,
        updated_by = v_actor,
        version = version + 1
    where id = p_id
      and deleted_at is null
      and version = p_expected_version
    returning id into v_id;

    if v_id is null then
      if exists (select 1 from public.question_answer where id = p_id and deleted_at is null) then
        raise exception 'Q&A changed before it could be saved.' using errcode = '40001';
      end if;
      raise exception 'Q&A was not found.' using errcode = 'P0002';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.delete_question_answer(
  p_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access is required.' using errcode = '42501';
  end if;

  update public.question_answer
  set deleted_at = pg_catalog.now(), deleted_by = v_actor, updated_by = v_actor,
      version = version + 1
  where id = p_id and deleted_at is null and version = p_expected_version;

  if not found then
    if exists (select 1 from public.question_answer where id = p_id and deleted_at is null) then
      raise exception 'Q&A changed before it could be deleted.' using errcode = '40001';
    end if;
    raise exception 'Q&A was not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.list_question_answer_categories() from public, anon, authenticated, service_role;
revoke all on function public.save_question_answer(uuid,integer,text,text,uuid,boolean,bigint) from public, anon, authenticated, service_role;
revoke all on function public.delete_question_answer(uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.list_question_answer_categories() to authenticated, service_role;
grant execute on function public.save_question_answer(uuid,integer,text,text,uuid,boolean,bigint) to authenticated, service_role;
grant execute on function public.delete_question_answer(uuid,integer) to authenticated, service_role;

-- Existing static website Q&A becomes global managed content. Fixed UUIDs keep
-- the data migration reproducible and avoid duplicating rows on restored DBs.
insert into public.question_answer (
  id, services_categories_id, question, answer, is_visible, sort_order
) values
  ('fa000000-0000-4000-8000-000000000001', null, 'What services does Diputra Signature Indonesia provide?', 'Diputra Signature Indonesia provides integrated legal consulting, immigration and visa assistance, and real estate advisory services in Indonesia, with a strong focus on foreign individuals and businesses.', true, 10),
  ('fa000000-0000-4000-8000-000000000002', null, 'Who can use the services of Diputra Signature Indonesia?', 'Our services are available for expatriates, foreign investors, international companies, and local clients who require professional legal, visa, or property assistance in Indonesia.', true, 20),
  ('fa000000-0000-4000-8000-000000000003', null, 'Does Diputra Signature Indonesia assist with visa and stay permits?', 'Yes. We assist with various visa and stay permits, including Tourist Visa, Business Visa, KITAS, KITAP, Investor Visa, and other immigration-related processes in compliance with Indonesian regulations.', true, 30),
  ('fa000000-0000-4000-8000-000000000004', null, 'Can you help with long-term stay permits such as KITAS or KITAP?', 'Absolutely. We provide end-to-end assistance for KITAS and KITAP applications, including investor, family, spouse, working, and retirement permits.', true, 40),
  ('fa000000-0000-4000-8000-000000000005', null, 'Do you provide legal services for business establishment in Indonesia?', 'Yes. We support business establishment and operations through legal advisory, company registration guidance, contract drafting, agreement review, and regulatory compliance.', true, 50),
  ('fa000000-0000-4000-8000-000000000006', null, 'Are your legal services compliant with Indonesian law?', 'All services are handled in accordance with applicable Indonesian laws and regulations, ensuring legal clarity, transparency, and compliance for every client.', true, 60),
  ('fa000000-0000-4000-8000-000000000007', null, 'Does Diputra Signature Indonesia offer real estate consulting?', 'Yes. We provide real estate advisory services, including property due diligence, legal review, ownership structuring, and guidance for foreign buyers and investors.', true, 70),
  ('fa000000-0000-4000-8000-000000000008', null, 'Can foreigners legally own property in Indonesia?', 'Foreign ownership is subject to specific legal structures and regulations. Our team advises clients on the most suitable and lawful options based on current Indonesian property laws.', true, 80),
  ('fa000000-0000-4000-8000-000000000009', null, 'How long does the visa or legal process usually take?', 'Processing time varies depending on the type of service and regulatory requirements. Our team will provide a clear timeline and regular updates throughout the process.', true, 90),
  ('fa000000-0000-4000-8000-000000000010', null, 'How can I start a consultation with Diputra Signature Indonesia?', 'You can start by contacting us through our website, email, or WhatsApp. Our team will assess your needs and guide you through the next steps.', true, 100)
on conflict (id) do nothing;

comment on column public.question_answer.services_categories_id is
  'Null means global Q&A; otherwise scoped to the selected client-page Service category.';

commit;
