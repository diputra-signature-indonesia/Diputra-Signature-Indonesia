begin;

-- The public/client catalogue already has the required three-level shape:
-- services_categories -> services_items -> services_item_details. Add a safe
-- lifecycle and optimistic locking without replacing existing production data.
alter table public.services_categories
  add column if not exists version integer not null default 1,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete restrict;

alter table public.services_items
  add column if not exists version integer not null default 1,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete restrict;

alter table public.services_item_details
  add column if not exists version integer not null default 1,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete restrict;

alter table public.services_categories
  add constraint services_categories_version_positive check (version > 0),
  add constraint services_categories_delete_state check (
    (deleted_at is null and deleted_by is null) or
    (deleted_at is not null and deleted_by is not null)
  );

alter table public.services_items
  add constraint services_items_version_positive check (version > 0),
  add constraint services_items_delete_state check (
    (deleted_at is null and deleted_by is null) or
    (deleted_at is not null and deleted_by is not null)
  );

alter table public.services_item_details
  add constraint services_item_details_version_positive check (version > 0),
  add constraint services_item_details_delete_state check (
    (deleted_at is null and deleted_by is null) or
    (deleted_at is not null and deleted_by is not null)
  );

create index services_categories_admin_order_idx
  on public.services_categories (sort_order, title, id)
  where deleted_at is null;
create index services_items_admin_order_idx
  on public.services_items (category_id, sort_order, title, id)
  where deleted_at is null;
create index services_item_details_admin_order_idx
  on public.services_item_details (service_item_id, sort_order, title, id)
  where deleted_at is null;

-- Public reads only receive published, non-deleted records whose parents are
-- also publicly available. Admins receive all non-deleted catalogue records.
drop policy if exists "public read published categories" on public.services_categories;
drop policy if exists "public read published services items" on public.services_items;
drop policy if exists "public read published services item details" on public.services_item_details;
drop policy if exists "Active admins read all service categories" on public.services_categories;
drop policy if exists "Active admins read all public service items" on public.services_items;
drop policy if exists "Active admins read all public service details" on public.services_item_details;

create policy "public read published categories"
on public.services_categories for select to anon, authenticated
using (is_published is true and deleted_at is null);

create policy "public read published services items"
on public.services_items for select to anon, authenticated
using (
  is_published is true
  and deleted_at is null
  and exists (
    select 1 from public.services_categories as category
    where category.id = category_id
      and category.is_published is true
      and category.deleted_at is null
  )
);

create policy "public read published services item details"
on public.services_item_details for select to anon, authenticated
using (
  is_published is true
  and deleted_at is null
  and exists (
    select 1
    from public.services_items as item
    join public.services_categories as category on category.id = item.category_id
    where item.id = service_item_id
      and item.is_published is true
      and item.deleted_at is null
      and category.is_published is true
      and category.deleted_at is null
  )
);

create policy "Active admins read all service categories"
on public.services_categories for select to authenticated
using (public.is_admin_role() and deleted_at is null);

create policy "Active admins read all public service items"
on public.services_items for select to authenticated
using (public.is_admin_role() and deleted_at is null);

create policy "Active admins read all public service details"
on public.services_item_details for select to authenticated
using (public.is_admin_role() and deleted_at is null);

revoke all privileges on table public.services_categories from anon, authenticated;
revoke all privileges on table public.services_items from anon, authenticated;
revoke all privileges on table public.services_item_details from anon, authenticated;
grant select on table public.services_categories to anon;
grant select on table public.services_items to anon;
grant select on table public.services_item_details to anon;
-- Keep DML grants for the authenticated API role, but intentionally create no
-- direct mutation policies. Direct updates/deletes therefore affect zero rows
-- and inserts fail RLS; all real mutations must pass through the hardened RPCs.
grant select, insert, update, delete on table public.services_categories to authenticated;
grant select, insert, update, delete on table public.services_items to authenticated;
grant select, insert, update, delete on table public.services_item_details to authenticated;

create or replace function public.save_public_service_category(
  p_id uuid,
  p_expected_version integer,
  p_slug text,
  p_title text,
  p_type public.categories_type,
  p_short_description text,
  p_description text,
  p_hero_heading text,
  p_hero_image text,
  p_card_image text,
  p_card_icon_key text,
  p_seo_title text,
  p_seo_description text,
  p_og_image text,
  p_sort_order bigint,
  p_is_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_slug text := lower(btrim(p_slug));
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) > 100 then
    raise exception 'Service slug is invalid.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'Service title is invalid.' using errcode = '22023';
  end if;
  if p_sort_order is null or p_sort_order < 0 then
    raise exception 'Service sort order is invalid.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.services_categories (
      slug, title, type, short_description, description, hero_heading,
      hero_image, card_image, card_icon_key, seo_title, seo_description,
      og_image, sort_order, is_published
    ) values (
      v_slug, btrim(p_title), p_type,
      nullif(btrim(coalesce(p_short_description, '')), ''),
      nullif(btrim(coalesce(p_description, '')), ''),
      nullif(btrim(coalesce(p_hero_heading, '')), ''),
      nullif(btrim(coalesce(p_hero_image, '')), ''),
      nullif(btrim(coalesce(p_card_image, '')), ''),
      nullif(btrim(coalesce(p_card_icon_key, '')), ''),
      nullif(btrim(coalesce(p_seo_title, '')), ''),
      nullif(btrim(coalesce(p_seo_description, '')), ''),
      nullif(btrim(coalesce(p_og_image, '')), ''),
      p_sort_order, p_is_published
    ) returning id into v_id;
  else
    update public.services_categories
    set
      slug = v_slug,
      title = btrim(p_title),
      type = p_type,
      short_description = nullif(btrim(coalesce(p_short_description, '')), ''),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      hero_heading = nullif(btrim(coalesce(p_hero_heading, '')), ''),
      hero_image = nullif(btrim(coalesce(p_hero_image, '')), ''),
      card_image = nullif(btrim(coalesce(p_card_image, '')), ''),
      card_icon_key = nullif(btrim(coalesce(p_card_icon_key, '')), ''),
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      og_image = nullif(btrim(coalesce(p_og_image, '')), ''),
      sort_order = p_sort_order,
      is_published = p_is_published,
      version = version + 1
    where id = p_id and deleted_at is null and version = p_expected_version
    returning id into v_id;
    if not found then raise exception 'Stale public Service version.' using errcode = '40001'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_public_service_item(
  p_id uuid,
  p_expected_version integer,
  p_category_id uuid,
  p_slug text,
  p_title text,
  p_description text,
  p_icon_key text,
  p_cta_label text,
  p_cta_type public.cta_type,
  p_seo_title text,
  p_seo_description text,
  p_og_image text,
  p_sort_order bigint,
  p_is_published boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_slug text := lower(btrim(p_slug));
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.services_categories where id = p_category_id and deleted_at is null) then
    raise exception 'Public Service not found.' using errcode = '23503';
  end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(v_slug) > 100 then
    raise exception 'Sub-service slug is invalid.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'Sub-service title is invalid.' using errcode = '22023';
  end if;
  if p_sort_order is null or p_sort_order < 0 then
    raise exception 'Sub-service sort order is invalid.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_icon_key, ''))) = 0 then
    raise exception 'Sub-service SVG icon is required.' using errcode = '23514';
  end if;

  if p_id is null then
    insert into public.services_items (
      category_id, slug, title, description, icon_key, cta_label, cta_type,
      seo_title, seo_description, og_image, sort_order, is_published
    ) values (
      p_category_id, v_slug, btrim(p_title),
      nullif(btrim(coalesce(p_description, '')), ''), btrim(p_icon_key),
      coalesce(nullif(btrim(coalesce(p_cta_label, '')), ''), 'Contact'), p_cta_type,
      nullif(btrim(coalesce(p_seo_title, '')), ''),
      nullif(btrim(coalesce(p_seo_description, '')), ''),
      nullif(btrim(coalesce(p_og_image, '')), ''),
      p_sort_order, p_is_published
    ) returning id into v_id;
  else
    update public.services_items
    set
      category_id = p_category_id,
      slug = v_slug,
      title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      icon_key = btrim(p_icon_key),
      cta_label = coalesce(nullif(btrim(coalesce(p_cta_label, '')), ''), 'Contact'),
      cta_type = p_cta_type,
      seo_title = nullif(btrim(coalesce(p_seo_title, '')), ''),
      seo_description = nullif(btrim(coalesce(p_seo_description, '')), ''),
      og_image = nullif(btrim(coalesce(p_og_image, '')), ''),
      sort_order = p_sort_order,
      is_published = p_is_published,
      version = version + 1
    where id = p_id and deleted_at is null and version = p_expected_version
    returning id into v_id;
    if not found then raise exception 'Stale public Sub-service version.' using errcode = '40001'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_public_service_detail(
  p_id uuid,
  p_expected_version integer,
  p_service_item_id uuid,
  p_title text,
  p_description text,
  p_cta_description text,
  p_sort_order bigint,
  p_is_published boolean
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
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.services_items where id = p_service_item_id and deleted_at is null) then
    raise exception 'Public Sub-service not found.' using errcode = '23503';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 1 and 160 then
    raise exception 'Service detail title is invalid.' using errcode = '22023';
  end if;
  if p_sort_order is null or p_sort_order < 0 then
    raise exception 'Service detail sort order is invalid.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.services_item_details (
      service_item_id, title, description, cta_description, sort_order, is_published
    ) values (
      p_service_item_id, btrim(p_title),
      nullif(btrim(coalesce(p_description, '')), ''),
      nullif(btrim(coalesce(p_cta_description, '')), ''),
      p_sort_order, p_is_published
    ) returning id into v_id;
  else
    update public.services_item_details
    set
      service_item_id = p_service_item_id,
      title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      cta_description = nullif(btrim(coalesce(p_cta_description, '')), ''),
      sort_order = p_sort_order,
      is_published = p_is_published,
      version = version + 1
    where id = p_id and deleted_at is null and version = p_expected_version
    returning id into v_id;
    if not found then raise exception 'Stale public Service detail version.' using errcode = '40001'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.delete_public_service_category(
  p_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  update public.services_categories
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = version + 1
  where id = p_id and deleted_at is null and version = p_expected_version;
  if not found then raise exception 'Stale public Service version.' using errcode = '40001'; end if;

  update public.services_items
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = version + 1
  where category_id = p_id and deleted_at is null;

  update public.services_item_details as detail
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = detail.version + 1
  from public.services_items as item
  where detail.service_item_id = item.id and item.category_id = p_id and detail.deleted_at is null;
end;
$$;

create or replace function public.delete_public_service_item(
  p_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  update public.services_items
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = version + 1
  where id = p_id and deleted_at is null and version = p_expected_version;
  if not found then raise exception 'Stale public Sub-service version.' using errcode = '40001'; end if;

  update public.services_item_details
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = version + 1
  where service_item_id = p_id and deleted_at is null;
end;
$$;

create or replace function public.delete_public_service_detail(
  p_id uuid,
  p_expected_version integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid();
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  update public.services_item_details
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = version + 1
  where id = p_id and deleted_at is null and version = p_expected_version;
  if not found then raise exception 'Stale public Service detail version.' using errcode = '40001'; end if;
end;
$$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'public.save_public_service_category(uuid,integer,text,text,public.categories_type,text,text,text,text,text,text,text,text,text,bigint,boolean)',
    'public.save_public_service_item(uuid,integer,uuid,text,text,text,text,text,public.cta_type,text,text,text,bigint,boolean)',
    'public.save_public_service_detail(uuid,integer,uuid,text,text,text,bigint,boolean)',
    'public.delete_public_service_category(uuid,integer)',
    'public.delete_public_service_item(uuid,integer)',
    'public.delete_public_service_detail(uuid,integer)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
    execute format('grant execute on function %s to authenticated, service_role', signature);
  end loop;
end;
$$;

-- Reuse the public images bucket while keeping service assets in isolated
-- folders. Category photos accept raster formats; item icons accept SVG only.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']::text[]
where id = 'images';

drop policy if exists "Active admins upload public service assets" on storage.objects;
drop policy if exists "Active admins read public service assets" on storage.objects;
drop policy if exists "Active admins delete public service assets" on storage.objects;

create policy "Active admins upload public service assets"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'images'
  and public.is_admin_role()
  and owner_id = auth.uid()::text
  and (
    name ~ '^services/categories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    or name ~ '^services/items/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$'
  )
);

create policy "Active admins read public service assets"
on storage.objects for select to authenticated
using (
  bucket_id = 'images'
  and public.is_admin_role()
  and name like 'services/%'
);

create policy "Active admins delete public service assets"
on storage.objects for delete to authenticated
using (
  bucket_id = 'images'
  and public.is_admin_role()
  and name like 'services/%'
);

comment on column public.services_categories.deleted_at is 'Soft deletion marker for the client-page catalogue.';
comment on column public.services_items.icon_key is 'Legacy component key or public Supabase Storage URL for an SVG icon.';

commit;
