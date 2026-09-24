begin;

-- V2 editorial metadata. The legacy content_md column intentionally remains
-- in place because existing public rendering stores sanitized Tiptap HTML in
-- it. Renaming it would add deployment risk without changing the contract.
alter table public.blog_posts
  add column if not exists category text not null default 'News',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists is_featured boolean not null default false,
  add column if not exists created_by uuid,
  add column if not exists updated_by uuid,
  add column if not exists published_by uuid,
  add column if not exists rejection_reason text,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid,
  add column if not exists version integer not null default 1;

alter table public.blog_posts
  drop constraint if exists blog_posts_created_by_fkey,
  drop constraint if exists blog_posts_updated_by_fkey,
  drop constraint if exists blog_posts_published_by_fkey,
  drop constraint if exists blog_posts_archived_by_fkey,
  drop constraint if exists blog_posts_title_length,
  drop constraint if exists blog_posts_excerpt_length,
  drop constraint if exists blog_posts_content_length,
  drop constraint if exists blog_posts_category_length,
  drop constraint if exists blog_posts_tags_count,
  drop constraint if exists blog_posts_seo_title_length,
  drop constraint if exists blog_posts_seo_description_length,
  drop constraint if exists blog_posts_reading_time,
  drop constraint if exists blog_posts_version_positive,
  drop constraint if exists blog_posts_featured_published;

alter table public.blog_posts
  add constraint blog_posts_created_by_fkey foreign key (created_by) references public.profiles(id) on update cascade on delete restrict,
  add constraint blog_posts_updated_by_fkey foreign key (updated_by) references public.profiles(id) on update cascade on delete restrict,
  add constraint blog_posts_published_by_fkey foreign key (published_by) references public.profiles(id) on update cascade on delete restrict,
  add constraint blog_posts_archived_by_fkey foreign key (archived_by) references public.profiles(id) on update cascade on delete restrict,
  add constraint blog_posts_title_length check (title is null or char_length(btrim(title)) between 1 and 200),
  add constraint blog_posts_excerpt_length check (excerpt is null or char_length(btrim(excerpt)) <= 500),
  add constraint blog_posts_content_length check (content_md is null or char_length(content_md) <= 300000),
  add constraint blog_posts_category_length check (char_length(btrim(category)) between 1 and 80),
  add constraint blog_posts_tags_count check (cardinality(tags) <= 10),
  add constraint blog_posts_seo_title_length check (seo_title is null or char_length(btrim(seo_title)) <= 70),
  add constraint blog_posts_seo_description_length check (seo_description is null or char_length(btrim(seo_description)) <= 180),
  add constraint blog_posts_reading_time check (reading_time_min is null or reading_time_min between 1 and 120),
  add constraint blog_posts_version_positive check (version > 0),
  add constraint blog_posts_featured_published check (not is_featured or (status = 'published'::public.blog_status and archived_at is null));

comment on column public.blog_posts.content_md is 'Legacy name; stores Tiptap HTML rendered through the public sanitizer.';
comment on column public.blog_posts.created_by is 'Profile that created the post; nullable only for legacy rows.';

create index if not exists blog_posts_admin_list_idx
  on public.blog_posts (archived_at, status, updated_at desc);
create index if not exists blog_posts_public_list_idx
  on public.blog_posts (is_featured desc, published_at desc)
  where status = 'published'::public.blog_status and archived_at is null;
create index if not exists blog_posts_created_by_idx on public.blog_posts (created_by);

create or replace function private.normalized_blog_tags(p_tags text[])
returns text[]
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(
    array(
      select distinct pg_catalog.left(pg_catalog.btrim(tag), 40)
      from pg_catalog.unnest(coalesce(p_tags, '{}'::text[])) as item(tag)
      where pg_catalog.btrim(tag) <> ''
      order by 1
      limit 10
    ),
    '{}'::text[]
  );
$$;

create or replace function private.validate_blog_payload(
  p_title text,
  p_excerpt text,
  p_content_html text,
  p_category text,
  p_seo_title text,
  p_seo_description text
)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) < 5 or pg_catalog.char_length(pg_catalog.btrim(p_title)) > 200 then
    raise exception using errcode = '22023', message = 'blog_title_invalid';
  end if;
  if p_excerpt is null or pg_catalog.char_length(pg_catalog.btrim(p_excerpt)) < 10 or pg_catalog.char_length(pg_catalog.btrim(p_excerpt)) > 500 then
    raise exception using errcode = '22023', message = 'blog_excerpt_invalid';
  end if;
  if p_content_html is null or pg_catalog.char_length(pg_catalog.btrim(p_content_html)) < 20 or pg_catalog.char_length(p_content_html) > 300000 then
    raise exception using errcode = '22023', message = 'blog_content_invalid';
  end if;
  if p_category is null or pg_catalog.char_length(pg_catalog.btrim(p_category)) < 1 or pg_catalog.char_length(pg_catalog.btrim(p_category)) > 80 then
    raise exception using errcode = '22023', message = 'blog_category_invalid';
  end if;
  if p_seo_title is not null and pg_catalog.char_length(pg_catalog.btrim(p_seo_title)) > 70 then
    raise exception using errcode = '22023', message = 'blog_seo_title_too_long';
  end if;
  if p_seo_description is not null and pg_catalog.char_length(pg_catalog.btrim(p_seo_description)) > 180 then
    raise exception using errcode = '22023', message = 'blog_seo_description_too_long';
  end if;
end;
$$;

create or replace function private.blog_slug_base(p_title text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(
    nullif(
      pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(p_title)), '[^a-z0-9]+', '-', 'g'), '-'),
      ''
    ),
    'artikel'
  );
$$;

create or replace function public.create_blog_post(
  p_title text,
  p_excerpt text,
  p_content_html text,
  p_reading_time_min integer,
  p_featured_image text default null,
  p_cover_alt text default null,
  p_category text default 'News',
  p_tags text[] default '{}'::text[],
  p_seo_title text default null,
  p_seo_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_author text;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 1;
  v_id uuid;
begin
  if not private.is_active_staff(v_actor) then
    raise exception using errcode = '42501', message = 'blog_staff_access_required';
  end if;
  perform private.validate_blog_payload(p_title, p_excerpt, p_content_html, p_category, p_seo_title, p_seo_description);
  if p_reading_time_min is null or p_reading_time_min not between 1 and 120 then
    raise exception using errcode = '22023', message = 'blog_reading_time_invalid';
  end if;

  select coalesce(nullif(pg_catalog.btrim(p.display_name), ''), nullif(pg_catalog.split_part(p.email, '@', 1), ''), 'Diputra Team')
    into v_author
  from public.profiles as p
  where p.id = v_actor;

  v_base_slug := private.blog_slug_base(p_title);
  v_slug := v_base_slug;
  while exists (select 1 from public.blog_posts as bp where bp.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.blog_posts (
    slug, title, excerpt, content_md, author_name, reading_time_min,
    featured_image, cover_alt, seo_title, seo_description, og_image,
    category, tags, status, created_by, updated_by
  ) values (
    v_slug, pg_catalog.btrim(p_title), pg_catalog.btrim(p_excerpt), p_content_html,
    v_author, p_reading_time_min, nullif(pg_catalog.btrim(p_featured_image), ''),
    coalesce(nullif(pg_catalog.btrim(p_cover_alt), ''), pg_catalog.btrim(p_title)),
    coalesce(nullif(pg_catalog.btrim(p_seo_title), ''), pg_catalog.btrim(p_title)),
    coalesce(nullif(pg_catalog.btrim(p_seo_description), ''), pg_catalog.btrim(p_excerpt)),
    nullif(pg_catalog.btrim(p_featured_image), ''), pg_catalog.btrim(p_category),
    private.normalized_blog_tags(p_tags), 'draft'::public.blog_status, v_actor, v_actor
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_blog_post(
  p_post_id uuid,
  p_expected_version integer,
  p_title text,
  p_excerpt text,
  p_content_html text,
  p_reading_time_min integer,
  p_featured_image text default null,
  p_cover_alt text default null,
  p_category text default 'News',
  p_tags text[] default '{}'::text[],
  p_seo_title text default null,
  p_seo_description text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_post public.blog_posts%rowtype;
  v_version integer;
begin
  if not private.is_active_staff(v_actor) then
    raise exception using errcode = '42501', message = 'blog_staff_access_required';
  end if;
  perform private.validate_blog_payload(p_title, p_excerpt, p_content_html, p_category, p_seo_title, p_seo_description);
  if p_reading_time_min is null or p_reading_time_min not between 1 and 120 then
    raise exception using errcode = '22023', message = 'blog_reading_time_invalid';
  end if;

  select * into v_post from public.blog_posts where id = p_post_id for update;
  if not found or v_post.archived_at is not null then
    raise exception using errcode = 'P0002', message = 'blog_post_not_found';
  end if;
  if v_post.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'blog_post_stale';
  end if;
  if not private.is_active_admin(v_actor) and (v_post.created_by is distinct from v_actor or v_post.status not in ('draft'::public.blog_status, 'rejected'::public.blog_status)) then
    raise exception using errcode = '42501', message = 'blog_edit_forbidden';
  end if;

  update public.blog_posts
  set title = pg_catalog.btrim(p_title),
      excerpt = pg_catalog.btrim(p_excerpt),
      content_md = p_content_html,
      reading_time_min = p_reading_time_min,
      featured_image = nullif(pg_catalog.btrim(p_featured_image), ''),
      cover_alt = coalesce(nullif(pg_catalog.btrim(p_cover_alt), ''), pg_catalog.btrim(p_title)),
      category = pg_catalog.btrim(p_category),
      tags = private.normalized_blog_tags(p_tags),
      seo_title = coalesce(nullif(pg_catalog.btrim(p_seo_title), ''), pg_catalog.btrim(p_title)),
      seo_description = coalesce(nullif(pg_catalog.btrim(p_seo_description), ''), pg_catalog.btrim(p_excerpt)),
      og_image = nullif(pg_catalog.btrim(p_featured_image), ''),
      updated_by = v_actor,
      rejection_reason = case when status = 'rejected'::public.blog_status then null else rejection_reason end,
      version = version + 1
  where id = p_post_id
  returning version into v_version;

  return v_version;
end;
$$;

create or replace function public.submit_blog_post_for_review(p_post_id uuid, p_expected_version integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_post public.blog_posts%rowtype;
  v_version integer;
begin
  if not private.is_active_staff(v_actor) then
    raise exception using errcode = '42501', message = 'blog_staff_access_required';
  end if;
  select * into v_post from public.blog_posts where id = p_post_id for update;
  if not found or v_post.archived_at is not null then raise exception using errcode = 'P0002', message = 'blog_post_not_found'; end if;
  if v_post.version <> p_expected_version then raise exception using errcode = '40001', message = 'blog_post_stale'; end if;
  if not private.is_active_admin(v_actor) and v_post.created_by is distinct from v_actor then raise exception using errcode = '42501', message = 'blog_submit_forbidden'; end if;
  if v_post.status not in ('draft'::public.blog_status, 'rejected'::public.blog_status) then raise exception using errcode = '22023', message = 'blog_status_transition_invalid'; end if;
  perform private.validate_blog_payload(v_post.title, v_post.excerpt, v_post.content_md, v_post.category, v_post.seo_title, v_post.seo_description);

  update public.blog_posts
  set status = 'pending'::public.blog_status, rejection_reason = null, is_featured = false,
      updated_by = v_actor, version = version + 1
  where id = p_post_id returning version into v_version;
  return v_version;
end;
$$;

create or replace function public.moderate_blog_post(
  p_post_id uuid,
  p_expected_version integer,
  p_status public.blog_status,
  p_rejection_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_post public.blog_posts%rowtype;
  v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception using errcode = '42501', message = 'blog_moderation_forbidden'; end if;
  if p_status not in ('draft'::public.blog_status, 'published'::public.blog_status, 'rejected'::public.blog_status) then
    raise exception using errcode = '22023', message = 'blog_moderation_status_invalid';
  end if;
  if p_status = 'rejected'::public.blog_status and (p_rejection_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_rejection_reason)) < 3) then
    raise exception using errcode = '22023', message = 'blog_rejection_reason_required';
  end if;
  select * into v_post from public.blog_posts where id = p_post_id for update;
  if not found or v_post.archived_at is not null then raise exception using errcode = 'P0002', message = 'blog_post_not_found'; end if;
  if v_post.version <> p_expected_version then raise exception using errcode = '40001', message = 'blog_post_stale'; end if;
  if p_status = 'published'::public.blog_status then
    perform private.validate_blog_payload(v_post.title, v_post.excerpt, v_post.content_md, v_post.category, v_post.seo_title, v_post.seo_description);
  end if;

  update public.blog_posts
  set status = p_status,
      rejection_reason = case when p_status = 'rejected'::public.blog_status then pg_catalog.btrim(p_rejection_reason) else null end,
      published_by = case when p_status = 'published'::public.blog_status then v_actor else published_by end,
      is_featured = case when p_status = 'published'::public.blog_status then is_featured else false end,
      updated_by = v_actor,
      version = version + 1
  where id = p_post_id returning version into v_version;
  return v_version;
end;
$$;

create or replace function public.set_blog_post_featured(p_post_id uuid, p_expected_version integer, p_is_featured boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception using errcode = '42501', message = 'blog_moderation_forbidden'; end if;
  update public.blog_posts
  set is_featured = p_is_featured, updated_by = v_actor, version = version + 1
  where id = p_post_id and version = p_expected_version and archived_at is null and status = 'published'::public.blog_status
  returning version into v_version;
  if not found then raise exception using errcode = '40001', message = 'blog_post_unavailable_or_stale'; end if;
  return v_version;
end;
$$;

create or replace function public.archive_blog_post(p_post_id uuid, p_expected_version integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception using errcode = '42501', message = 'blog_archive_forbidden'; end if;
  update public.blog_posts
  set archived_at = pg_catalog.now(), archived_by = v_actor, status = 'draft'::public.blog_status,
      is_featured = false, updated_by = v_actor, version = version + 1
  where id = p_post_id and version = p_expected_version and archived_at is null
  returning version into v_version;
  if not found then raise exception using errcode = '40001', message = 'blog_post_unavailable_or_stale'; end if;
  return v_version;
end;
$$;

create or replace function public.restore_blog_post(p_post_id uuid, p_expected_version integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception using errcode = '42501', message = 'blog_archive_forbidden'; end if;
  update public.blog_posts
  set archived_at = null, archived_by = null, status = 'draft'::public.blog_status,
      updated_by = v_actor, version = version + 1
  where id = p_post_id and version = p_expected_version and archived_at is not null
  returning version into v_version;
  if not found then raise exception using errcode = '40001', message = 'blog_post_unavailable_or_stale'; end if;
  return v_version;
end;
$$;

-- Keep the V1 API callable by existing clients while routing it through the
-- V2 authorization and lifecycle rules.
create or replace function public.set_blog_post_published(p_post_id uuid, p_is_published boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_version integer;
begin
  if p_post_id is null or p_is_published is null then raise exception using errcode = '22023', message = 'blog_publish_input_invalid'; end if;
  if not private.is_active_admin(auth.uid()) then raise exception using errcode = '42501', message = 'blog_publish_forbidden'; end if;
  select version into v_version from public.blog_posts where id = p_post_id and archived_at is null;
  if not found then raise exception using errcode = 'P0002', message = 'blog_post_not_found'; end if;
  perform public.moderate_blog_post(p_post_id, v_version, case when p_is_published then 'published'::public.blog_status else 'draft'::public.blog_status end, null);
end;
$$;

drop policy if exists "Public Read Published" on public.blog_posts;
drop policy if exists "Active staff read all blog posts" on public.blog_posts;
drop policy if exists "Active staff insert draft or pending blog posts" on public.blog_posts;
drop policy if exists "Active admins insert any blog status" on public.blog_posts;
drop policy if exists "Active staff update draft or pending blog posts" on public.blog_posts;
drop policy if exists "Active admins update any blog status" on public.blog_posts;
drop policy if exists "Active admins delete blog posts" on public.blog_posts;

create policy "Public read published active blog posts"
on public.blog_posts for select to anon, authenticated
using (status = 'published'::public.blog_status and archived_at is null);

create policy "Active staff read active blog posts"
on public.blog_posts for select to authenticated
using (private.is_active_staff(auth.uid()) and archived_at is null);

create policy "Active admins read archived blog posts"
on public.blog_posts for select to authenticated
using (private.is_active_admin(auth.uid()) and archived_at is not null);

revoke all privileges on table public.blog_posts from anon, authenticated;
grant select on table public.blog_posts to anon, authenticated;

revoke all on function private.normalized_blog_tags(text[]) from public, anon, authenticated, service_role;
revoke all on function private.validate_blog_payload(text,text,text,text,text,text) from public, anon, authenticated, service_role;
revoke all on function private.blog_slug_base(text) from public, anon, authenticated, service_role;

revoke all on function public.create_blog_post(text,text,text,integer,text,text,text,text[],text,text) from public, anon, authenticated, service_role;
grant execute on function public.create_blog_post(text,text,text,integer,text,text,text,text[],text,text) to authenticated, service_role;
revoke all on function public.update_blog_post(uuid,integer,text,text,text,integer,text,text,text,text[],text,text) from public, anon, authenticated, service_role;
grant execute on function public.update_blog_post(uuid,integer,text,text,text,integer,text,text,text,text[],text,text) to authenticated, service_role;
revoke all on function public.submit_blog_post_for_review(uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.submit_blog_post_for_review(uuid,integer) to authenticated, service_role;
revoke all on function public.moderate_blog_post(uuid,integer,public.blog_status,text) from public, anon, authenticated, service_role;
grant execute on function public.moderate_blog_post(uuid,integer,public.blog_status,text) to authenticated, service_role;
revoke all on function public.set_blog_post_featured(uuid,integer,boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_blog_post_featured(uuid,integer,boolean) to authenticated, service_role;
revoke all on function public.archive_blog_post(uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.archive_blog_post(uuid,integer) to authenticated, service_role;
revoke all on function public.restore_blog_post(uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.restore_blog_post(uuid,integer) to authenticated, service_role;
revoke all on function public.set_blog_post_published(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_blog_post_published(uuid,boolean) to authenticated, service_role;

commit;
