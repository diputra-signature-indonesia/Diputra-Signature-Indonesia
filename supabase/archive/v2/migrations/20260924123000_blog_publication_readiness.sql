-- Require complete SEO and visual metadata before an article enters review or publication.

create or replace function private.enforce_blog_publication_readiness()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('pending'::public.blog_status, 'published'::public.blog_status) then
    if nullif(pg_catalog.btrim(new.featured_image), '') is null then
      raise exception using errcode = '23514', message = 'blog_cover_required';
    end if;
    if nullif(pg_catalog.btrim(new.cover_alt), '') is null then
      raise exception using errcode = '23514', message = 'blog_cover_alt_required';
    end if;
    if nullif(pg_catalog.btrim(new.seo_title), '') is null or nullif(pg_catalog.btrim(new.seo_description), '') is null then
      raise exception using errcode = '23514', message = 'blog_seo_metadata_required';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_blog_publication_readiness on public.blog_posts;
create trigger enforce_blog_publication_readiness
before insert or update of status, featured_image, cover_alt, seo_title, seo_description
on public.blog_posts
for each row execute function private.enforce_blog_publication_readiness();
