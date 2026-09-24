-- Blog content contract and immutable revision snapshots.
-- Local migration only; apply to production through the normal reviewed migration pipeline.

alter table public.blog_posts
  add column if not exists content_format text not null default 'TIPTAP_HTML',
  add column if not exists content_format_version smallint not null default 1;

alter table public.blog_posts
  drop constraint if exists blog_posts_content_format_check,
  drop constraint if exists blog_posts_content_format_version_check;

alter table public.blog_posts
  add constraint blog_posts_content_format_check check (content_format = 'TIPTAP_HTML'),
  add constraint blog_posts_content_format_version_check check (content_format_version between 1 and 100);

comment on column public.blog_posts.content_md is 'Legacy column name. Stores sanitized Tiptap HTML.';
comment on column public.blog_posts.content_format is 'Stable contract for interpreting content_md.';
comment on column public.blog_posts.content_format_version is 'Renderer compatibility version for the stored Tiptap HTML.';

create table if not exists public.blog_post_revisions (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.blog_posts(id) on update cascade on delete cascade,
  source_version integer not null check (source_version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid references public.profiles(id) on update cascade on delete restrict,
  created_at timestamptz not null default statement_timestamp(),
  unique (post_id, source_version)
);

create index if not exists blog_post_revisions_post_created_idx
  on public.blog_post_revisions (post_id, created_at desc);

alter table public.blog_post_revisions enable row level security;
revoke all privileges on table public.blog_post_revisions from anon, authenticated;
grant select on table public.blog_post_revisions to authenticated;

drop policy if exists "Active staff read blog revisions" on public.blog_post_revisions;
create policy "Active staff read blog revisions"
on public.blog_post_revisions for select to authenticated
using (public.is_staff_role());

create or replace function private.blog_post_revision_snapshot(p_post public.blog_posts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'title', p_post.title,
    'excerpt', p_post.excerpt,
    'content_html', p_post.content_md,
    'content_format', p_post.content_format,
    'content_format_version', p_post.content_format_version,
    'author_name', p_post.author_name,
    'reading_time_min', p_post.reading_time_min,
    'featured_image', p_post.featured_image,
    'cover_alt', p_post.cover_alt,
    'category', p_post.category,
    'tags', to_jsonb(p_post.tags),
    'seo_title', p_post.seo_title,
    'seo_description', p_post.seo_description,
    'status', p_post.status::text,
    'is_featured', p_post.is_featured
  );
$$;

create or replace function private.capture_blog_post_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.blog_post_revisions (post_id, source_version, snapshot, created_by)
  values (
    new.id,
    new.version,
    private.blog_post_revision_snapshot(new),
    coalesce(auth.uid(), new.updated_by, new.created_by)
  )
  on conflict (post_id, source_version) do nothing;
  return new;
end;
$$;

drop trigger if exists capture_blog_post_revision on public.blog_posts;
create trigger capture_blog_post_revision
after insert or update on public.blog_posts
for each row execute function private.capture_blog_post_revision();

insert into public.blog_post_revisions (post_id, source_version, snapshot, created_by, created_at)
select bp.id, bp.version, private.blog_post_revision_snapshot(bp), coalesce(bp.updated_by, bp.created_by), coalesce(bp.updated_at, bp.created_at, statement_timestamp())
from public.blog_posts as bp
on conflict (post_id, source_version) do nothing;

create or replace function public.restore_blog_post_revision(
  p_post_id uuid,
  p_revision_id bigint,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_post public.blog_posts%rowtype;
  v_snapshot jsonb;
  v_version integer;
begin
  if not private.is_active_staff(v_actor) then
    raise exception using errcode = '42501', message = 'blog_staff_access_required';
  end if;

  select * into v_post from public.blog_posts where id = p_post_id for update;
  if not found or v_post.archived_at is not null then
    raise exception using errcode = 'P0002', message = 'blog_post_not_found';
  end if;
  if v_post.version <> p_expected_version then
    raise exception using errcode = '40001', message = 'blog_post_stale';
  end if;
  if not private.is_active_admin(v_actor)
     and (v_post.created_by is distinct from v_actor or v_post.status not in ('draft'::public.blog_status, 'rejected'::public.blog_status)) then
    raise exception using errcode = '42501', message = 'blog_edit_forbidden';
  end if;

  select br.snapshot into v_snapshot
  from public.blog_post_revisions as br
  where br.id = p_revision_id and br.post_id = p_post_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'blog_revision_not_found';
  end if;

  update public.blog_posts
  set title = v_snapshot->>'title',
      excerpt = v_snapshot->>'excerpt',
      content_md = v_snapshot->>'content_html',
      content_format = coalesce(v_snapshot->>'content_format', 'TIPTAP_HTML'),
      content_format_version = coalesce((v_snapshot->>'content_format_version')::smallint, 1),
      reading_time_min = greatest(1, coalesce((v_snapshot->>'reading_time_min')::integer, 1)),
      featured_image = nullif(v_snapshot->>'featured_image', ''),
      cover_alt = nullif(v_snapshot->>'cover_alt', ''),
      category = coalesce(nullif(v_snapshot->>'category', ''), 'News'),
      tags = coalesce(array(select jsonb_array_elements_text(coalesce(v_snapshot->'tags', '[]'::jsonb))), '{}'::text[]),
      seo_title = nullif(v_snapshot->>'seo_title', ''),
      seo_description = nullif(v_snapshot->>'seo_description', ''),
      og_image = nullif(v_snapshot->>'featured_image', ''),
      status = 'draft'::public.blog_status,
      is_featured = false,
      published_at = null,
      published_by = null,
      rejection_reason = null,
      updated_by = v_actor,
      version = version + 1
  where id = p_post_id
  returning version into v_version;

  return v_version;
end;
$$;

revoke all on function public.restore_blog_post_revision(uuid, bigint, integer) from public, anon;
grant execute on function public.restore_blog_post_revision(uuid, bigint, integer) to authenticated;
