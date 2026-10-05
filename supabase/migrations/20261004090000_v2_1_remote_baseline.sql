-- V2.1 baseline captured from live Production on 2026-10-04.
-- Source project: imqjyxydsakfuztyrhev; V2 Git reference: b297276.
-- Replays on EMPTY LOCAL/NEW databases only. NEVER execute on existing Production.
-- Existing Production acknowledges this baseline via migration history repair only.
-- Supabase owns auth/storage DDL; only app Storage policies and bucket config follow.
-- Business content and Auth data are backed up separately, never seeded here.




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."admin_access_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."admin_access_request_status" OWNER TO "postgres";


CREATE TYPE "public"."blog_status" AS ENUM (
    'draft',
    'pending',
    'published',
    'rejected'
);


ALTER TYPE "public"."blog_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."blog_status" IS 'blog status such as draft | pending | published | rejected';



CREATE TYPE "public"."categories_type" AS ENUM (
    'primary',
    'secondary'
);


ALTER TYPE "public"."categories_type" OWNER TO "postgres";


COMMENT ON TYPE "public"."categories_type" IS 'Diputra Signature Indonesia services type such as primary & secondary';



CREATE TYPE "public"."contact_status" AS ENUM (
    'new',
    'in_progress',
    'replied',
    'closed',
    'spam'
);


ALTER TYPE "public"."contact_status" OWNER TO "postgres";


CREATE TYPE "public"."cta_type" AS ENUM (
    'contact',
    'detail'
);


ALTER TYPE "public"."cta_type" OWNER TO "postgres";


CREATE TYPE "public"."review_moderation_status" AS ENUM (
    'PENDING',
    'PUBLISHED',
    'REJECTED',
    'ARCHIVED'
);


ALTER TYPE "public"."review_moderation_status" OWNER TO "postgres";


CREATE TYPE "public"."role" AS ENUM (
    'super_admin',
    'admin',
    'staff'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."assert_assignable_profile"("p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_profile_id is null or not exists(
    select 1 from public.profiles p
    where p.id=p_profile_id and p.is_active=true and p.deleted_at is null
  ) then raise exception 'Assignee/PIC must be an active profile.' using errcode='23503'; end if;
end; $$;


ALTER FUNCTION "private"."assert_assignable_profile"("p_profile_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text",
    "excerpt" "text",
    "content_md" "text",
    "author_name" "text",
    "reading_time_min" bigint,
    "featured_image" "text",
    "cover_alt" "text",
    "seo_title" "text",
    "seo_description" "text",
    "og_image" "text",
    "published_at" "date",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."blog_status" DEFAULT 'draft'::"public"."blog_status",
    "category" "text" DEFAULT 'News'::"text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "published_by" "uuid",
    "rejection_reason" "text",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "version" integer DEFAULT 1 NOT NULL,
    "content_format" "text" DEFAULT 'TIPTAP_HTML'::"text" NOT NULL,
    "content_format_version" smallint DEFAULT 1 NOT NULL,
    CONSTRAINT "blog_posts_category_length" CHECK ((("char_length"("btrim"("category")) >= 1) AND ("char_length"("btrim"("category")) <= 80))),
    CONSTRAINT "blog_posts_content_format_check" CHECK (("content_format" = 'TIPTAP_HTML'::"text")),
    CONSTRAINT "blog_posts_content_format_version_check" CHECK ((("content_format_version" >= 1) AND ("content_format_version" <= 100))),
    CONSTRAINT "blog_posts_content_length" CHECK ((("content_md" IS NULL) OR ("char_length"("content_md") <= 300000))),
    CONSTRAINT "blog_posts_excerpt_length" CHECK ((("excerpt" IS NULL) OR ("char_length"("btrim"("excerpt")) <= 500))),
    CONSTRAINT "blog_posts_featured_published" CHECK (((NOT "is_featured") OR (("status" = 'published'::"public"."blog_status") AND ("archived_at" IS NULL)))),
    CONSTRAINT "blog_posts_reading_time" CHECK ((("reading_time_min" IS NULL) OR (("reading_time_min" >= 1) AND ("reading_time_min" <= 120)))),
    CONSTRAINT "blog_posts_seo_description_length" CHECK ((("seo_description" IS NULL) OR ("char_length"("btrim"("seo_description")) <= 180))),
    CONSTRAINT "blog_posts_seo_title_length" CHECK ((("seo_title" IS NULL) OR ("char_length"("btrim"("seo_title")) <= 70))),
    CONSTRAINT "blog_posts_tags_count" CHECK (("cardinality"("tags") <= 10)),
    CONSTRAINT "blog_posts_title_length" CHECK ((("title" IS NULL) OR (("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 200)))),
    CONSTRAINT "blog_posts_version_positive" CHECK (("version" > 0))
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."blog_posts"."content_md" IS 'Legacy column name. Stores sanitized Tiptap HTML.';



COMMENT ON COLUMN "public"."blog_posts"."created_by" IS 'Profile that created the post; nullable only for legacy rows.';



COMMENT ON COLUMN "public"."blog_posts"."content_format" IS 'Stable contract for interpreting content_md.';



COMMENT ON COLUMN "public"."blog_posts"."content_format_version" IS 'Renderer compatibility version for the stored Tiptap HTML.';



CREATE OR REPLACE FUNCTION "private"."blog_post_revision_snapshot"("p_post" "public"."blog_posts") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."blog_post_revision_snapshot"("p_post" "public"."blog_posts") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."blog_slug_base"("p_title" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(
    nullif(
      pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(p_title)), '[^a-z0-9]+', '-', 'g'), '-'),
      ''
    ),
    'artikel'
  );
$$;


ALTER FUNCTION "private"."blog_slug_base"("p_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."can_manage_job"("p_job_id" "uuid", "p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.jobs as j
    where j.id = p_job_id
      and j.archived_at is null
      and (
        private.is_active_admin(p_user_id)
        or (private.is_active_staff(p_user_id) and j.pic_id = p_user_id)
      )
  );
$$;


ALTER FUNCTION "private"."can_manage_job"("p_job_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."capture_blog_post_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."capture_blog_post_revision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."delete_job_graph"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Reviews remain useful business records after their originating Job is
  -- removed, so only the optional Job association is detached.
  update public.review_requests set job_id = null where job_id = p_job_id;
  update public.reviews set job_id = null where job_id = p_job_id;

  delete from public.job_activity_logs where job_id = p_job_id;
  delete from public.job_documents where job_id = p_job_id;
  delete from public.job_drive_folders where job_id = p_job_id;
  delete from public.tasks where job_id = p_job_id;
  delete from public.job_task_statuses where job_id = p_job_id;
  delete from public.job_updates where job_id = p_job_id;
  delete from public.job_steps where job_id = p_job_id;
  delete from public.jobs where id = p_job_id;
end;
$$;


ALTER FUNCTION "private"."delete_job_graph"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."enforce_blog_publication_readiness"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."enforce_blog_publication_readiness"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_active_admin"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active = true
      and p.deleted_at is null
      and p.role in ('super_admin'::public.role, 'admin'::public.role)
  );
$$;


ALTER FUNCTION "private"."is_active_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_active_staff"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active = true
      and p.deleted_at is null
      and p.role in (
        'super_admin'::public.role,
        'admin'::public.role,
        'staff'::public.role
      )
  );
$$;


ALTER FUNCTION "private"."is_active_staff"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."is_active_super_admin"("p_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = p_user_id
      and p.is_active = true
      and p.deleted_at is null
      and p.role = 'super_admin'::public.role
  );
$$;


ALTER FUNCTION "private"."is_active_super_admin"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."log_job_activity"("p_job_id" "uuid", "p_action" "text", "p_old_values" "jsonb" DEFAULT '{}'::"jsonb", "p_new_values" "jsonb" DEFAULT '{}'::"jsonb", "p_reason" "text" DEFAULT NULL::"text", "p_task_id" "uuid" DEFAULT NULL::"uuid", "p_job_step_id" "uuid" DEFAULT NULL::"uuid", "p_job_update_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_id uuid;
begin
  insert into public.job_activity_logs(job_id,task_id,job_step_id,job_update_id,actor_id,action,old_values,new_values,reason)
  values(p_job_id,p_task_id,p_job_step_id,p_job_update_id,auth.uid(),p_action,coalesce(p_old_values,'{}'::jsonb),coalesce(p_new_values,'{}'::jsonb),nullif(btrim(p_reason),''))
  returning id into v_id;
  return v_id;
end; $$;


ALTER FUNCTION "private"."log_job_activity"("p_job_id" "uuid", "p_action" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_reason" "text", "p_task_id" "uuid", "p_job_step_id" "uuid", "p_job_update_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."normalized_blog_tags"("p_tags" "text"[]) RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."normalized_blog_tags"("p_tags" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."provision_team_member_for_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.team_members (
    profile_id,
    full_name,
    avatar_url,
    is_visible
  ) values (
    new.id,
    coalesce(nullif(btrim(new.display_name), ''), split_part(new.email, '@', 1), 'Team Member'),
    new.avatar_url,
    false
  )
  on conflict (profile_id) where profile_id is not null do nothing;

  return new;
end;
$$;


ALTER FUNCTION "private"."provision_team_member_for_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."sync_job_contributor"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_job_id uuid;
  v_profile_id uuid;
  v_actor uuid;
begin
  if tg_table_name = 'jobs' then
    v_job_id := new.id;
    v_profile_id := new.pic_id;
    v_actor := coalesce(auth.uid(), new.updated_by, new.created_by);
  else
    v_job_id := new.job_id;
    v_profile_id := new.assignee_id;
    v_actor := coalesce(auth.uid(), new.updated_by, new.created_by);
  end if;

  if v_profile_id is not null then
    insert into public.job_contributors (job_id, profile_id, added_by)
    values (v_job_id, v_profile_id, v_actor)
    on conflict (job_id, profile_id) do nothing;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "private"."sync_job_contributor"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."sync_review_legacy_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.is_published := new.status = 'PUBLISHED'::public.review_moderation_status;
  if new.status <> 'PUBLISHED'::public.review_moderation_status then
    new.is_featured := false;
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;


ALTER FUNCTION "private"."sync_review_legacy_state"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."validate_blog_payload"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_category" "text", "p_seo_title" "text", "p_seo_description" "text") RETURNS "void"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."validate_blog_payload"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_category" "text", "p_seo_title" "text", "p_seo_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Contributor management is not allowed.' using errcode = '42501';
  end if;
  perform private.assert_assignable_profile(p_profile_id);

  insert into public.job_contributors (job_id, profile_id, added_by)
  values (p_job_id, p_profile_id, v_actor)
  on conflict (job_id, profile_id) do nothing;

  perform private.log_job_activity(
    p_job_id,
    'JOB_CONTRIBUTOR_ADDED',
    '{}'::jsonb,
    jsonb_build_object('profile_id', p_profile_id)
  );
end;
$$;


ALTER FUNCTION "public"."add_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_admin_access_request"("p_user_id" "uuid", "p_role" "public"."role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_reviewer_id uuid := auth.uid();
  v_request public.admin_access_requests%rowtype;
begin
  if v_reviewer_id is null or not private.is_active_super_admin(v_reviewer_id) then
    raise exception 'Only an active super admin can approve access requests.' using errcode = '42501';
  end if;

  select r.* into v_request
  from public.admin_access_requests as r
  where r.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Access request not found.' using errcode = 'P0002';
  end if;
  if v_request.status <> 'pending'::public.admin_access_request_status then
    raise exception 'Access request has already been reviewed.' using errcode = 'P0001';
  end if;

  insert into public.profiles as p (
    id, email, display_name, avatar_url, role, is_active, deleted_at, updated_at
  ) values (
    v_request.user_id,
    v_request.email,
    v_request.full_name,
    v_request.avatar_url,
    p_role,
    true,
    null,
    pg_catalog.now()
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, p.display_name),
    avatar_url = coalesce(excluded.avatar_url, p.avatar_url),
    role = excluded.role,
    is_active = true,
    deleted_at = null,
    updated_at = pg_catalog.now();

  update public.admin_access_requests as r set
    status = 'approved'::public.admin_access_request_status,
    reviewed_at = pg_catalog.now(),
    reviewed_by = v_reviewer_id,
    rejection_reason = null
  where r.user_id = v_request.user_id;
end;
$$;


ALTER FUNCTION "public"."approve_admin_access_request"("p_user_id" "uuid", "p_role" "public"."role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_blog_post"("p_post_id" "uuid", "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."archive_blog_post"("p_post_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  update public.clients set archived_at=pg_catalog.now(),archived_by=v_actor,updated_by=v_actor,version=version+1
  where id=p_client_id and version=p_expected_version and archived_at is null returning version into v_version;
  if not found then raise exception 'Client not found, archived, or stale.' using errcode='40001'; end if;
  return v_version;
end; $$;


ALTER FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_job"("p_job_id" "uuid", "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  update public.jobs set archived_at=pg_catalog.now(),archived_by=v_actor,updated_by=v_actor,version=version+1 where id=p_job_id and version=p_expected_version and archived_at is null returning version into v_version;
  if not found then raise exception 'Job not found, archived, or stale.' using errcode='40001'; end if;
  perform private.log_job_activity(p_job_id,'JOB_ARCHIVED'); return v_version;
end; $$;


ALTER FUNCTION "public"."archive_job"("p_job_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_job_document"("p_document_id" "uuid", "p_expected_version" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_job_id uuid;
begin
  select job_id into v_job_id
  from public.job_documents
  where id = p_document_id and archived_at is null;

  if v_job_id is null then
    raise exception 'Job document was not found.' using errcode = 'P0002';
  end if;
  if v_actor is null or not private.can_manage_job(v_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;

  update public.job_documents set
    sync_status = 'TRASHED',
    archived_at = now(),
    archived_by = v_actor,
    updated_by = v_actor,
    last_synced_at = now(),
    version = version + 1
  where id = p_document_id
    and archived_at is null
    and version = p_expected_version
  returning job_id into v_job_id;

  if not found then
    raise exception 'Job document changed before it could be archived.' using errcode = '40001';
  end if;

  return v_job_id;
end;
$$;


ALTER FUNCTION "public"."archive_job_document"("p_document_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_review"("p_review_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.reviews as r
  set status = 'ARCHIVED'::public.review_moderation_status,
      is_featured = false,
      archived_at = pg_catalog.now(),
      archived_by = v_actor,
      moderated_at = pg_catalog.now(),
      moderated_by = v_actor
  where r.id = p_review_id and r.archived_at is null;

  if not found then
    raise exception 'Review was not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."archive_review"("p_review_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_review_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.review_requests as rr
  set archived_at = pg_catalog.now(), archived_by = v_actor
  where rr.id = p_request_id and rr.archived_at is null;

  if not found then
    raise exception 'Review request was not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."archive_review_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_sop_file"("p_file_id" "uuid", "p_expected_version" integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_sop_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.sop_files set
    deleted_at = now(),
    deleted_by = v_actor,
    updated_by = v_actor,
    last_synced_at = case when storage_provider = 'GOOGLE_DRIVE' then now() else last_synced_at end,
    version = version + 1
  where id = p_file_id
    and version = p_expected_version
    and deleted_at is null
  returning sop_id into v_sop_id;

  if not found then
    raise exception 'SOP file not found, deleted, or stale.' using errcode = '40001';
  end if;

  return v_sop_id;
end;
$$;


ALTER FUNCTION "public"."archive_sop_file"("p_file_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_job_status"("p_job_id" "uuid", "p_expected_version" integer, "p_status_code" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid:=auth.uid();
  v_job public.jobs%rowtype;
  v_status uuid;
  v_current_code text;
  v_code text:=upper(btrim(p_status_code));
  v_version integer;
begin
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select code into v_current_code from public.job_statuses where id=v_job.status_id;
  if v_current_code='COMPLETED' then raise exception 'Use reopen_job for a completed Job.' using errcode='55000'; end if;
  if v_code not in ('IN_PROGRESS','ON_HOLD','OBSTACLE') then raise exception 'This Job status cannot be selected manually.' using errcode='22023'; end if;
  if v_code in ('ON_HOLD','OBSTACLE') and nullif(btrim(p_reason),'') is null then raise exception 'A reason is required.' using errcode='22023'; end if;
  select id into v_status from public.job_statuses where code=v_code and is_active;
  update public.jobs set
    status_id=v_status,
    status_reason=case when v_code in('ON_HOLD','OBSTACLE') then btrim(p_reason) else null end,
    started_at=case when v_code='IN_PROGRESS' then coalesce(started_at,pg_catalog.now()) else started_at end,
    updated_by=v_actor,
    version=version+1
  where id=p_job_id returning version into v_version;
  perform private.log_job_activity(
    p_job_id,'JOB_STATUS_CHANGED',
    jsonb_build_object('status_id',v_job.status_id,'status_reason',v_job.status_reason),
    jsonb_build_object('status_id',v_status,'status_reason',case when v_code in('ON_HOLD','OBSTACLE') then btrim(p_reason) else null end),
    p_reason
  );
  return v_version;
end;
$$;


ALTER FUNCTION "public"."change_job_status"("p_job_id" "uuid", "p_expected_version" integer, "p_status_code" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_review_request_status"("p_token" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_token text;
  v_hash text;
  v_used_at timestamptz;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
  v_archived_at timestamptz;
begin
  v_token := pg_catalog.btrim(p_token);
  if v_token is null or pg_catalog.char_length(v_token) <> 64 or v_token !~ '^[0-9A-Fa-f]{64}$' then
    return 'invalid';
  end if;

  v_hash := pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex');
  select rr.used_at, rr.revoked_at, rr.expires_at, rr.archived_at
    into v_used_at, v_revoked_at, v_expires_at, v_archived_at
  from public.review_requests as rr
  where rr.token_hash = v_hash;

  if not found or v_archived_at is not null or v_revoked_at is not null then return 'invalid'; end if;
  if v_used_at is not null then return 'used'; end if;
  if v_expires_at is not null and v_expires_at <= pg_catalog.now() then return 'expired'; end if;
  return 'valid';
end;
$_$;


ALTER FUNCTION "public"."check_review_request_status"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid:=auth.uid();
  v_step public.job_steps%rowtype;
  v_job public.jobs%rowtype;
  v_current uuid;
  v_is_final boolean;
  v_status_code text;
  v_completed_status uuid;
begin
  select * into v_step from public.job_steps where id=p_job_step_id and replaced_at is null for update;
  if not found then raise exception 'Active Job step not found.' using errcode='P0002'; end if;
  select * into v_job from public.jobs where id=v_step.job_id for update;
  if not private.can_manage_job(v_job.id,v_actor) then raise exception 'Step management is not allowed.' using errcode='42501'; end if;
  if v_step.version<>p_expected_version then raise exception 'Stale step version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select id into v_current from public.job_steps where job_id=v_job.id and replaced_at is null and not is_completed order by position limit 1;
  if v_current is distinct from v_step.id then raise exception 'Only the current step can be completed.' using errcode='55000'; end if;
  select not exists(select 1 from public.job_steps s where s.job_id=v_job.id and s.replaced_at is null and s.position>v_step.position) into v_is_final;
  select code into v_status_code from public.job_statuses where id=v_job.status_id;
  if v_is_final and v_status_code in('ON_HOLD','OBSTACLE') then raise exception 'Resolve the Job hold/obstacle before completing the final step.' using errcode='55000'; end if;
  update public.job_steps set is_completed=true,completed_at=pg_catalog.now(),completed_by=v_actor,updated_by=v_actor,version=version+1 where id=v_step.id;
  if v_is_final then
    select id into v_completed_status from public.job_statuses where code='COMPLETED';
    update public.jobs set
      status_id=v_completed_status,
      status_reason=null,
      started_at=coalesce(started_at,pg_catalog.now()),
      completed_at=pg_catalog.now(),
      updated_by=v_actor,
      version=version+1
    where id=v_job.id;
  end if;
  perform private.log_job_activity(v_job.id,'JOB_STEP_COMPLETED',jsonb_build_object('is_completed',false),jsonb_build_object('is_completed',true,'job_completed',v_is_final),null,null,v_step.id,null);
end;
$$;


ALTER FUNCTION "public"."complete_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."configure_job_task_statuses"("p_job_id" "uuid", "p_statuses" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_status_code text;
begin
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Board configuration is not allowed.' using errcode='42501'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select code into v_status_code from public.job_statuses where id=v_job.status_id;
  if v_status_code='COMPLETED' then raise exception 'Reopen the completed Job before configuring its board.' using errcode='55000'; end if;
  if jsonb_typeof(p_statuses)<>'array' or jsonb_array_length(p_statuses)=0 then raise exception 'At least one Task status is required.' using errcode='22023'; end if;
  if exists(
    select 1 from jsonb_array_elements(p_statuses) e
    where not exists(
      select 1 from public.task_statuses s
      where s.id=(e->>'task_status_id')::uuid
        and (s.is_active or exists(
          select 1 from public.job_task_statuses current_status
          where current_status.job_id=p_job_id and current_status.task_status_id=s.id
        ))
    )
  ) then raise exception 'Board contains an unavailable Task status.' using errcode='23503'; end if;
  if (select count(*) from jsonb_array_elements(p_statuses))<>(select count(distinct e->>'task_status_id') from jsonb_array_elements(p_statuses)e) then raise exception 'Duplicate Task status.' using errcode='22023'; end if;
  if exists(
    select 1 from public.job_task_statuses jts
    where jts.job_id=p_job_id
      and not exists(select 1 from jsonb_array_elements(p_statuses)e where (e->>'task_status_id')::uuid=jts.task_status_id)
      and exists(select 1 from public.tasks t where t.job_task_status_id=jts.id and t.deleted_at is null)
  ) then raise exception 'A Task status in use cannot be removed.' using errcode='23503'; end if;
  set constraints public.job_task_statuses_job_order_key deferred;
  update public.job_task_statuses set column_order=column_order+100000,updated_by=v_actor,version=version+1 where job_id=p_job_id;
  delete from public.job_task_statuses jts where jts.job_id=p_job_id and not exists(select 1 from jsonb_array_elements(p_statuses)e where (e->>'task_status_id')::uuid=jts.task_status_id);
  insert into public.job_task_statuses(job_id,task_status_id,column_order,created_by,updated_by)
  select p_job_id,(e.value->>'task_status_id')::uuid,e.ordinality::integer,v_actor,v_actor
  from jsonb_array_elements(p_statuses) with ordinality e(value,ordinality)
  on conflict(job_id,task_status_id) do update
  set column_order=excluded.column_order,updated_by=v_actor,version=public.job_task_statuses.version+1;
  perform private.log_job_activity(p_job_id,'TASK_BOARD_CONFIGURED','{}'::jsonb,p_statuses);
end;
$$;


ALTER FUNCTION "public"."configure_job_task_statuses"("p_job_id" "uuid", "p_statuses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_blog_post"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text" DEFAULT NULL::"text", "p_cover_alt" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT 'News'::"text", "p_tags" "text"[] DEFAULT '{}'::"text"[], "p_seo_title" "text" DEFAULT NULL::"text", "p_seo_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."create_blog_post"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_client"("p_client_type" "text", "p_name" "text", "p_contact_person" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_address" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  insert into public.clients(client_type,name,contact_person,email,phone,address,notes,created_by,updated_by)
  values(upper(btrim(p_client_type)),btrim(p_name),nullif(btrim(p_contact_person),''),nullif(btrim(p_email),''),nullif(btrim(p_phone),''),nullif(btrim(p_address),''),nullif(btrim(p_notes),''),v_actor,v_actor)
  returning id into v_id;
  return v_id;
end; $$;


ALTER FUNCTION "public"."create_client"("p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job"("p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_estimated_end_date" "date" DEFAULT NULL::"date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_job_id uuid;
  v_pic uuid;
  v_template uuid;
  v_status uuid;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date < p_start_date then
    raise exception 'Estimated end date cannot precede start date.' using errcode = '22023';
  end if;
  if not exists(select 1 from public.clients where id = p_client_id and archived_at is null) then
    raise exception 'Active client not found.' using errcode = '23503';
  end if;

  select s.workflow_template_id
  into v_template
  from public.internal_services s
  join public.workflow_templates w on w.id = s.workflow_template_id
  where s.id = p_internal_service_id
    and s.is_active
    and w.is_active;

  if not found or not exists(
    select 1 from public.workflow_template_steps where workflow_template_id = v_template
  ) then
    raise exception 'Service requires an active workflow.' using errcode = '23503';
  end if;
  if not exists(select 1 from public.priorities where id = p_priority_id and is_active) then
    raise exception 'Active priority not found.' using errcode = '23503';
  end if;

  if private.is_active_admin(v_actor) then
    v_pic := coalesce(p_pic_id, v_actor);
  else
    v_pic := v_actor;
  end if;
  perform private.assert_assignable_profile(v_pic);

  select id into v_status
  from public.job_statuses
  where code = 'NOT_STARTED' and is_active;
  if v_status is null then
    raise exception 'NOT_STARTED status is unavailable.' using errcode = '55000';
  end if;

  insert into public.jobs(
    client_id, title, description, pic_id, internal_service_id,
    workflow_template_id, priority_id, status_id, start_date,
    estimated_end_date, created_by, updated_by
  ) values (
    p_client_id, btrim(p_title), nullif(btrim(p_description), ''), v_pic,
    p_internal_service_id, v_template, p_priority_id, v_status, p_start_date,
    p_estimated_end_date, v_actor, v_actor
  )
  returning id into v_job_id;

  insert into public.job_steps(
    job_id, template_step_id, name, description, position, created_by, updated_by
  )
  select v_job_id, s.id, s.name, s.description, s.position, v_actor, v_actor
  from public.workflow_template_steps s
  where s.workflow_template_id = v_template
  order by s.position;

  insert into public.job_task_statuses(
    job_id, task_status_id, column_order, created_by, updated_by
  )
  select v_job_id, s.id, x.column_order, v_actor, v_actor
  from (values ('NOT_STARTED', 1), ('IN_PROGRESS', 2), ('COMPLETED', 3)) x(code, column_order)
  join public.task_statuses s on s.code = x.code and s.is_active;

  if (select count(*) from public.job_task_statuses where job_id = v_job_id) <> 3 then
    raise exception 'Default Task statuses are unavailable.' using errcode = '55000';
  end if;

  perform private.log_job_activity(
    v_job_id,
    'JOB_CREATED',
    '{}'::jsonb,
    jsonb_build_object('title', btrim(p_title), 'pic_id', v_pic, 'service_id', p_internal_service_id)
  );
  return v_job_id;
end;
$$;


ALTER FUNCTION "public"."create_job"("p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_update"("p_job_id" "uuid", "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Remark management is not allowed.' using errcode='42501'; end if;
  if exists(select 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=p_job_id and (j.archived_at is not null or s.code='COMPLETED')) then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if p_progress_date is null then raise exception 'Progress date is required.' using errcode='22023'; end if;
  if p_performed_by is not null then perform private.assert_assignable_profile(p_performed_by); end if;
  insert into public.job_updates(job_id,message,progress_date,performed_by,created_by,updated_by) values(p_job_id,btrim(p_message),p_progress_date,p_performed_by,v_actor,v_actor) returning id into v_id;
  perform private.log_job_activity(p_job_id,'JOB_UPDATE_CREATED','{}'::jsonb,jsonb_build_object('message',btrim(p_message),'progress_date',p_progress_date,'performed_by',p_performed_by),null,null,null,v_id);
  return v_id;
end; $$;


ALTER FUNCTION "public"."create_job_update"("p_job_id" "uuid", "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_with_client"("p_client_type" "text", "p_client_name" "text", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_estimated_end_date" "date" DEFAULT NULL::"date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_client_id uuid;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;
  if p_client_type not in ('COMPANY', 'INDIVIDUAL') then
    raise exception 'Invalid client type.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_client_name)) not between 1 and 200 then
    raise exception 'Client name must be 1–200 characters.' using errcode = '22023';
  end if;

  insert into public.clients(client_type, name, created_by, updated_by)
  values (p_client_type, pg_catalog.btrim(p_client_name), v_actor, v_actor)
  returning id into v_client_id;

  return public.create_job(
    v_client_id, p_title, p_internal_service_id, p_priority_id,
    p_pic_id, p_description, p_start_date, p_estimated_end_date
  );
end;
$$;


ALTER FUNCTION "public"."create_job_with_client"("p_client_type" "text", "p_client_name" "text", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_review_request"("p_client_id" "uuid" DEFAULT NULL::"uuid", "p_client_name" "text" DEFAULT NULL::"text", "p_client_email" "text" DEFAULT NULL::"text", "p_job_id" "uuid" DEFAULT NULL::"uuid", "p_expires_in_days" integer DEFAULT 7) RETURNS TABLE("request_id" "uuid", "token" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_actor uuid := auth.uid();
  v_client_name text := nullif(pg_catalog.btrim(p_client_name), '');
  v_client_email text := nullif(pg_catalog.btrim(p_client_email), '');
  v_token text;
  v_hash text;
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;

  if p_expires_in_days < 1 or p_expires_in_days > 90 then
    raise exception 'Expiry must be between 1 and 90 days.' using errcode = '22023';
  end if;

  if p_client_id is not null then
    select c.name, coalesce(v_client_email, c.email)
      into v_client_name, v_client_email
    from public.clients as c
    where c.id = p_client_id and c.archived_at is null;

    if not found then
      raise exception 'Client is unavailable.' using errcode = 'P0002';
    end if;
  end if;

  if v_client_name is null or pg_catalog.char_length(v_client_name) > 200 then
    raise exception 'Client name is required and may not exceed 200 characters.' using errcode = '22023';
  end if;

  if v_client_email is not null and (
    pg_catalog.char_length(v_client_email) > 254
    or v_client_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) then
    raise exception 'Client email is invalid.' using errcode = '22023';
  end if;

  if p_job_id is not null and (
    p_client_id is null
    or not exists (
      select 1 from public.jobs as j
      where j.id = p_job_id and j.client_id = p_client_id and j.archived_at is null
    )
  ) then
    raise exception 'Selected Job does not belong to the selected Client.' using errcode = '22023';
  end if;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex');

  insert into public.review_requests (
    token_hash, client_id, job_id, client_name, client_email,
    expires_at, created_by, created_at
  ) values (
    v_hash, p_client_id, p_job_id, v_client_name, v_client_email,
    pg_catalog.now() + pg_catalog.make_interval(days => p_expires_in_days),
    v_actor, pg_catalog.now()
  )
  returning id into request_id;

  token := v_token;
  return next;
end;
$_$;


ALTER FUNCTION "public"."create_review_request"("p_client_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_job_id" "uuid", "p_expires_in_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_review_request"("p_client_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_job_id" "uuid", "p_expires_in_days" integer) IS 'Creates a one-time review invitation. Existing Client and Job references are optional; raw tokens are returned once and never stored.';



CREATE OR REPLACE FUNCTION "public"."create_task"("p_job_id" "uuid", "p_job_task_status_id" "uuid" DEFAULT NULL::"uuid", "p_title" "text" DEFAULT NULL::"text", "p_description" "text" DEFAULT NULL::"text", "p_assignee_id" "uuid" DEFAULT NULL::"uuid", "p_priority_id" "uuid" DEFAULT NULL::"uuid", "p_due_date" "date" DEFAULT NULL::"date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_admin boolean; v_pic boolean; v_status_id uuid:=p_job_task_status_id; v_assignee uuid; v_title text; v_id uuid; v_position bigint;
begin
  if not private.is_active_staff(v_actor) then raise exception 'Active staff access required.' using errcode='42501'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=p_job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is unavailable or read-only.' using errcode='55000'; end if;
  v_admin:=private.is_active_admin(v_actor); v_pic:=private.can_manage_job(p_job_id,v_actor);
  if not (v_admin or v_pic) then v_assignee:=v_actor; else v_assignee:=p_assignee_id; end if;
  if v_assignee is not null then perform private.assert_assignable_profile(v_assignee); end if;
  if v_status_id is null then select jts.id into v_status_id from public.job_task_statuses jts join public.task_statuses s on s.id=jts.task_status_id where jts.job_id=p_job_id and s.code='NOT_STARTED'; end if;
  if not exists(select 1 from public.job_task_statuses where id=v_status_id and job_id=p_job_id) then raise exception 'Task status is not configured for this Job.' using errcode='23503'; end if;
  if p_priority_id is not null and not exists(select 1 from public.priorities where id=p_priority_id and is_active) then raise exception 'Priority is unavailable.' using errcode='23503'; end if;
  v_title:=nullif(btrim(p_title),'');
  if v_title is null then v_title:=coalesce(nullif(left(regexp_replace(btrim(coalesce(p_description,'')),'\s+',' ','g'),120),''),'Untitled Task'); end if;
  select coalesce(min(position)-1000,0) into v_position from public.tasks where job_id=p_job_id and job_task_status_id=v_status_id and deleted_at is null;
  insert into public.tasks(job_id,job_task_status_id,title,description,assignee_id,priority_id,due_date,position,created_by,updated_by)
  values(p_job_id,v_status_id,v_title,nullif(btrim(p_description),''),v_assignee,p_priority_id,p_due_date,v_position,v_actor,v_actor) returning id into v_id;
  perform private.log_job_activity(p_job_id,'TASK_CREATED','{}'::jsonb,jsonb_build_object('title',v_title,'assignee_id',v_assignee,'status_id',v_status_id),null,v_id,null,null);
  return v_id;
end; $$;


ALTER FUNCTION "public"."create_task"("p_job_id" "uuid", "p_job_task_status_id" "uuid", "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workflow_template"("p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'Workflow requires at least one step.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_steps) e where btrim(coalesce(e->>'name','')) = '') then
    raise exception 'Every workflow step requires a name.' using errcode = '22023';
  end if;

  insert into public.workflow_templates (code, name, description, created_by, updated_by)
  values (upper(btrim(p_code)), btrim(p_name), nullif(btrim(p_description), ''), v_actor, v_actor)
  returning id into v_id;

  insert into public.workflow_template_steps (
    workflow_template_id, name, description, position, created_by, updated_by
  )
  select v_id, btrim(e.value->>'name'), nullif(btrim(e.value->>'description'), ''), e.ordinality::integer, v_actor, v_actor
  from jsonb_array_elements(p_steps) with ordinality as e(value, ordinality);
  return v_id;
end;
$$;


ALTER FUNCTION "public"."create_workflow_template"("p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select coalesce(
    (
      select p.role::text
      from public.profiles as p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
    ),
    ''
  );
$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_job_permanently"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_client_name text;
begin
  if v_actor is null or not private.is_active_admin(v_actor) then
    raise exception 'Only an active admin can permanently delete a Job.' using errcode = '42501';
  end if;

  select j.*
  into v_job
  from public.jobs as j
  where j.id = p_job_id
  for update;

  if not found or v_job.archived_at is null then
    raise exception 'Job was not found or is not in Trash.' using errcode = 'P0002';
  end if;
  select name into v_client_name from public.clients where id = v_job.client_id;
  if v_job.version <> p_expected_version then
    raise exception 'Job changed before it could be permanently deleted.' using errcode = '40001';
  end if;
  if btrim(coalesce(p_confirmation, '')) <> v_job.title
    and btrim(coalesce(p_confirmation, '')) <> v_client_name then
    raise exception 'Confirmation must exactly match the Job title or client name.' using errcode = '22023';
  end if;

  perform private.delete_job_graph(p_job_id);

  return p_job_id;
end;
$$;


ALTER FUNCTION "public"."delete_job_permanently"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_job_permanently"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") IS 'Permanently removes a trashed Job and operational child records while retaining detached reviews.';



CREATE OR REPLACE FUNCTION "public"."delete_job_update"("p_update_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_update public.job_updates%rowtype;
begin
  select * into v_update from public.job_updates where id=p_update_id for update;
  if not found then raise exception 'Remark not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(v_update.job_id,v_actor) then raise exception 'Remark management is not allowed.' using errcode='42501'; end if;
  if exists(select 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_update.job_id and (j.archived_at is not null or s.code='COMPLETED')) then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if v_update.version<>p_expected_version then raise exception 'Stale Remark version.' using errcode='40001'; end if;
  perform private.log_job_activity(v_update.job_id,'JOB_UPDATE_DELETED',to_jsonb(v_update)-array['created_at','updated_at'],'{}'::jsonb,null,null,null,p_update_id);
  delete from public.job_updates where id=p_update_id;
end; $$;


ALTER FUNCTION "public"."delete_job_update"("p_update_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_public_service_category"("p_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."delete_public_service_category"("p_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_public_service_detail"("p_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid := auth.uid();
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  update public.services_item_details
  set is_published = false, deleted_at = pg_catalog.now(), deleted_by = v_actor, version = version + 1
  where id = p_id and deleted_at is null and version = p_expected_version;
  if not found then raise exception 'Stale public Service detail version.' using errcode = '40001'; end if;
end;
$$;


ALTER FUNCTION "public"."delete_public_service_detail"("p_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_public_service_item"("p_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."delete_public_service_item"("p_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_question_answer"("p_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."delete_question_answer"("p_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_rejected_admin_access_request"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can delete rejected access requests.' using errcode = '42501';
  end if;

  delete from public.admin_access_requests
  where user_id = p_user_id
    and status = 'rejected'::public.admin_access_request_status;

  if not found then
    raise exception 'Rejected access request not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."delete_rejected_admin_access_request"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_task"("p_task_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_task public.tasks%rowtype;
begin
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_task.job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if not private.can_manage_job(v_task.job_id,v_actor) and v_task.assignee_id is distinct from v_actor then raise exception 'Task deletion is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  update public.tasks set deleted_at=pg_catalog.now(),deleted_by=v_actor,updated_by=v_actor,version=version+1 where id=p_task_id;
  perform private.log_job_activity(v_task.job_id,'TASK_DELETED',to_jsonb(v_task)-array['created_at','updated_at'],'{}'::jsonb,null,p_task_id,null,null);
end; $$;


ALTER FUNCTION "public"."delete_task"("p_task_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_admin_access_request"() RETURNS "public"."admin_access_request_status"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_full_name text;
  v_avatar_url text;
  v_status public.admin_access_request_status;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if private.is_active_staff(v_user_id) then
    return 'approved'::public.admin_access_request_status;
  end if;
  select
    u.email,
    nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name','')),''),
    nullif(btrim(coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture','')),'')
  into v_email,v_full_name,v_avatar_url
  from auth.users u where u.id=v_user_id;
  if v_email is null or btrim(v_email)='' then
    raise exception 'The authenticated user does not have an email address.' using errcode='23514';
  end if;
  insert into public.admin_access_requests as r(user_id,email,full_name,avatar_url)
  values(v_user_id,v_email,v_full_name,v_avatar_url)
  on conflict(user_id) do update set
    email=excluded.email,
    full_name=coalesce(excluded.full_name,r.full_name),
    avatar_url=coalesce(excluded.avatar_url,r.avatar_url)
  returning status into v_status;
  return v_status;
end;
$$;


ALTER FUNCTION "public"."ensure_admin_access_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_active_super_admin(auth.uid());
$$;


ALTER FUNCTION "public"."is_active_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ select private.is_active_admin(auth.uid()); $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_role"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_active_admin(auth.uid());
$$;


ALTER FUNCTION "public"."is_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$ select private.is_active_staff(auth.uid()); $$;


ALTER FUNCTION "public"."is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff_role"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select private.is_active_staff(auth.uid());
$$;


ALTER FUNCTION "public"."is_staff_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_active_clients_for_job"() RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select c.id, c.name
  from public.clients c
  where private.is_active_staff(auth.uid())
    and c.archived_at is null
  order by c.name, c.id;
$$;


ALTER FUNCTION "public"."list_active_clients_for_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_assignable_profiles"() RETURNS TABLE("id" "uuid", "display_name" "text", "avatar_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.id, coalesce(p.display_name, p.email), p.avatar_url
  from public.profiles p
  where private.is_active_staff(auth.uid())
    and p.is_active=true and p.deleted_at is null
  order by coalesce(p.display_name,p.email), p.id;
$$;


ALTER FUNCTION "public"."list_assignable_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_job_activity"("p_job_id" "uuid", "p_limit" integer DEFAULT 100, "p_before" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("id" "uuid", "job_id" "uuid", "task_id" "uuid", "job_step_id" "uuid", "job_update_id" "uuid", "actor_id" "uuid", "action" "text", "old_values" "jsonb", "new_values" "jsonb", "reason" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select l.id,l.job_id,l.task_id,l.job_step_id,l.job_update_id,l.actor_id,l.action,l.old_values,l.new_values,l.reason,l.created_at
  from public.job_activity_logs l
  where private.is_active_staff(auth.uid()) and l.job_id=p_job_id and (p_before is null or l.created_at<p_before)
  order by l.created_at desc,l.id desc limit least(greatest(coalesce(p_limit,100),1),200);
$$;


ALTER FUNCTION "public"."list_job_activity"("p_job_id" "uuid", "p_limit" integer, "p_before" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_pending_admin_access_requests"("p_search" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "avatar_url" "text", "requested_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    request.user_id,
    request.email,
    request.full_name,
    request.avatar_url,
    request.requested_at
  from public.admin_access_requests as request
  where private.is_active_super_admin(auth.uid())
    and request.status = 'pending'::public.admin_access_request_status
    and (
      nullif(btrim(p_search), '') is null
      or request.email ilike '%' || btrim(p_search) || '%'
      or coalesce(request.full_name, '') ilike '%' || btrim(p_search) || '%'
    )
  order by request.requested_at asc, request.user_id
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;


ALTER FUNCTION "public"."list_pending_admin_access_requests"("p_search" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_question_answer_categories"() RETURNS TABLE("id" "uuid", "title" "text", "slug" "text", "is_published" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select category.id, category.title, category.slug, category.is_published
  from public.services_categories as category
  where private.is_active_staff(auth.uid())
    and category.deleted_at is null
  order by category.sort_order, category.title, category.id;
$$;


ALTER FUNCTION "public"."list_question_answer_categories"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_rejected_admin_access_requests"("p_search" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "avatar_url" "text", "requested_at" timestamp with time zone, "reviewed_at" timestamp with time zone, "rejection_reason" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    request.user_id,
    request.email,
    request.full_name,
    request.avatar_url,
    request.requested_at,
    request.reviewed_at,
    request.rejection_reason
  from public.admin_access_requests as request
  where private.is_active_super_admin(auth.uid())
    and request.status = 'rejected'::public.admin_access_request_status
    and (
      nullif(pg_catalog.btrim(p_search), '') is null
      or request.email ilike '%' || pg_catalog.btrim(p_search) || '%'
      or coalesce(request.full_name, '') ilike '%' || pg_catalog.btrim(p_search) || '%'
    )
  order by request.reviewed_at desc nulls last, request.user_id
  limit least(greatest(coalesce(p_limit, 10), 1), 10);
$$;


ALTER FUNCTION "public"."list_rejected_admin_access_requests"("p_search" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_visible_team_members"() RETURNS TABLE("id" "uuid", "full_name" "text", "job_title" "text", "avatar_url" "text", "short_bio" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select
    member.id,
    member.full_name,
    title.name as job_title,
    member.avatar_url,
    member.short_bio
  from public.team_members as member
  join public.job_titles as title on title.id = member.job_title_id
  where member.is_visible
    and title.is_active
  order by title.sort_order, member.created_at, member.id;
$$;


ALTER FUNCTION "public"."list_visible_team_members"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moderate_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_status" "public"."blog_status", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."moderate_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_status" "public"."blog_status", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_status" "public"."review_moderation_status", "p_is_featured" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;
  if p_status = 'ARCHIVED'::public.review_moderation_status then
    raise exception 'Use archive_review for archival.' using errcode = '22023';
  end if;

  update public.reviews as r
  set status = p_status,
      is_featured = case when p_status = 'PUBLISHED'::public.review_moderation_status then coalesce(p_is_featured, false) else false end,
      moderated_at = pg_catalog.now(),
      moderated_by = v_actor
  where r.id = p_review_id and r.archived_at is null;

  if not found then
    raise exception 'Review was not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_status" "public"."review_moderation_status", "p_is_featured" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_task"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_position" bigint DEFAULT 0) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_task public.tasks%rowtype; v_version integer;
begin
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_task.job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if not private.can_manage_job(v_task.job_id,v_actor) and v_task.assignee_id is distinct from v_actor then raise exception 'Task movement is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  if not exists(select 1 from public.job_task_statuses where id=p_job_task_status_id and job_id=v_task.job_id) then raise exception 'Target status is not configured for this Job.' using errcode='23503'; end if;
  update public.tasks set job_task_status_id=p_job_task_status_id,position=p_position,updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
  perform private.log_job_activity(v_task.job_id,'TASK_MOVED',jsonb_build_object('status_id',v_task.job_task_status_id,'position',v_task.position),jsonb_build_object('status_id',p_job_task_status_id,'position',p_position),null,p_task_id,null,null);
  return v_version;
end; $$;


ALTER FUNCTION "public"."move_task"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_position" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."place_task_on_board"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_before_task_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_job_id uuid;
  v_task public.tasks%rowtype;
  v_status_code text;
  v_id uuid;
  v_position bigint := 0;
  v_inserted boolean := false;
  v_version integer;
begin
  select job_id into v_job_id from public.tasks where id=p_task_id and deleted_at is null;
  if v_job_id is null then raise exception 'Task not found.' using errcode='P0002'; end if;

  perform 1 from public.jobs j where j.id=v_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  select s.code into v_status_code from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_job_id and j.archived_at is null;
  if v_status_code is null or v_status_code='COMPLETED' then raise exception 'Job is read-only.' using errcode='55000'; end if;

  perform 1 from public.tasks t where t.job_id=v_job_id and t.deleted_at is null order by t.id for update;
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(v_job_id,v_actor) and (
    not private.is_active_staff(v_actor) or v_task.assignee_id is distinct from v_actor
  ) then raise exception 'Task movement is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  if not exists(select 1 from public.job_task_statuses where id=p_job_task_status_id and job_id=v_job_id) then
    raise exception 'Target status is not configured for this Job.' using errcode='23503';
  end if;
  if p_before_task_id=p_task_id or (
    p_before_task_id is not null and not exists(
      select 1 from public.tasks t where t.id=p_before_task_id and t.job_id=v_job_id
        and t.job_task_status_id=p_job_task_status_id and t.deleted_at is null
    )
  ) then raise exception 'Invalid Task insertion point.' using errcode='22023'; end if;

  for v_id in
    select t.id from public.tasks t
    where t.job_id=v_job_id and t.job_task_status_id=p_job_task_status_id
      and t.deleted_at is null and t.id<>p_task_id
    order by t.position,t.created_at,t.id
  loop
    if v_id=p_before_task_id then
      v_position:=v_position+1000;
      update public.tasks set job_task_status_id=p_job_task_status_id,position=v_position,
        updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
      v_inserted:=true;
    end if;
    v_position:=v_position+1000;
    update public.tasks set position=v_position,updated_by=v_actor,version=version+1
      where id=v_id and position is distinct from v_position;
  end loop;

  if not v_inserted then
    v_position:=v_position+1000;
    update public.tasks set job_task_status_id=p_job_task_status_id,position=v_position,
      updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
  end if;

  if v_task.job_task_status_id<>p_job_task_status_id then
    v_position:=0;
    for v_id in
      select t.id from public.tasks t
      where t.job_id=v_job_id and t.job_task_status_id=v_task.job_task_status_id
        and t.deleted_at is null
      order by t.position,t.created_at,t.id
    loop
      v_position:=v_position+1000;
      update public.tasks set position=v_position,updated_by=v_actor,version=version+1
        where id=v_id and position is distinct from v_position;
    end loop;
  end if;

  perform private.log_job_activity(v_job_id,'TASK_MOVED',
    jsonb_build_object('status_id',v_task.job_task_status_id,'position',v_task.position),
    jsonb_build_object('status_id',p_job_task_status_id,'position',
      (select position from public.tasks where id=p_task_id)),null,p_task_id,null,null);
  return v_version;
end; $$;


ALTER FUNCTION "public"."place_task_on_board"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_before_task_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."purge_expired_job"("p_job_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'Expired Job purge is restricted to the service role.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.jobs
    where id = p_job_id
      and archived_at <= pg_catalog.now() - interval '30 days'
  ) then
    raise exception 'Job is not eligible for the 30-day purge.' using errcode = '55000';
  end if;

  perform private.delete_job_graph(p_job_id);
  return p_job_id;
end;
$$;


ALTER FUNCTION "public"."purge_expired_job"("p_job_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."purge_expired_job"("p_job_id" "uuid") IS 'Service-role-only purge for Jobs that have remained in Trash for at least 30 days.';



CREATE OR REPLACE FUNCTION "public"."reject_admin_access_request"("p_user_id" "uuid", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_reviewer_id uuid := auth.uid();
  v_status public.admin_access_request_status;
  v_reason text := nullif(btrim(p_rejection_reason), '');
begin
  if v_reviewer_id is null or not public.is_active_super_admin() then
    raise exception 'Only an active super admin can reject access requests.' using errcode = '42501';
  end if;

  if v_reason is not null and char_length(v_reason) > 1000 then
    raise exception 'Rejection reason must be 1000 characters or fewer.' using errcode = '22001';
  end if;

  select request.status
  into v_status
  from public.admin_access_requests as request
  where request.user_id = p_user_id
  for update;

  if not found then
    raise exception 'Access request not found.' using errcode = 'P0002';
  end if;

  if v_status <> 'pending'::public.admin_access_request_status then
    raise exception 'Access request has already been reviewed.' using errcode = 'P0001';
  end if;

  update public.admin_access_requests as request
  set
    status = 'rejected'::public.admin_access_request_status,
    reviewed_at = now(),
    reviewed_by = v_reviewer_id,
    rejection_reason = v_reason
  where request.user_id = p_user_id;
end;
$$;


ALTER FUNCTION "public"."reject_admin_access_request"("p_user_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Contributor management is not allowed.' using errcode = '42501';
  end if;
  if exists (select 1 from public.jobs where id = p_job_id and pic_id = p_profile_id) then
    raise exception 'The Job PIC cannot be removed from contributors.' using errcode = '55000';
  end if;
  if exists (
    select 1 from public.tasks
    where job_id = p_job_id and assignee_id = p_profile_id and deleted_at is null
  ) then
    raise exception 'A contributor with an active Task assignment cannot be removed.' using errcode = '55000';
  end if;

  delete from public.job_contributors
  where job_id = p_job_id and profile_id = p_profile_id;
  if not found then
    raise exception 'Contributor not found.' using errcode = 'P0002';
  end if;

  perform private.log_job_activity(
    p_job_id,
    'JOB_CONTRIBUTOR_REMOVED',
    jsonb_build_object('profile_id', p_profile_id),
    '{}'::jsonb
  );
end;
$$;


ALTER FUNCTION "public"."remove_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reopen_job"("p_job_id" "uuid", "p_expected_version" integer, "p_reason" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_job public.jobs%rowtype; v_final public.job_steps%rowtype; v_progress uuid; v_version integer;
begin
  if nullif(btrim(p_reason),'') is null then raise exception 'Reopen reason is required.' using errcode='22023'; end if;
  select * into v_job from public.jobs where id=p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(p_job_id,v_actor) then raise exception 'Job management is not allowed.' using errcode='42501'; end if;
  if v_job.version<>p_expected_version then raise exception 'Stale Job version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  if not exists(select 1 from public.job_statuses s where s.id=v_job.status_id and s.code='COMPLETED') then raise exception 'Only completed Jobs can be reopened.' using errcode='55000'; end if;
  select * into v_final from public.job_steps where job_id=p_job_id and replaced_at is null order by position desc limit 1 for update;
  if not v_final.is_completed then raise exception 'Final step is not completed.' using errcode='55000'; end if;
  update public.job_steps set is_completed=false,completed_at=null,completed_by=null,updated_by=v_actor,version=version+1 where id=v_final.id;
  select id into v_progress from public.job_statuses where code='IN_PROGRESS';
  update public.jobs set status_id=v_progress,status_reason=null,completed_at=null,started_at=coalesce(started_at,pg_catalog.now()),updated_by=v_actor,version=version+1 where id=p_job_id returning version into v_version;
  perform private.log_job_activity(p_job_id,'JOB_REOPENED',jsonb_build_object('status_id',v_job.status_id),jsonb_build_object('status_id',v_progress),p_reason,null,v_final.id,null);
  return v_version;
end;
$$;


ALTER FUNCTION "public"."reopen_job"("p_job_id" "uuid", "p_expected_version" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reorder_question_answers"("p_services_categories_id" "uuid", "p_ordered_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."reorder_question_answers"("p_services_categories_id" "uuid", "p_ordered_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reorder_question_answers"("p_services_categories_id" "uuid", "p_ordered_ids" "uuid"[]) IS 'Reorders every active Q&A inside exactly one Global or Service category scope.';



CREATE OR REPLACE FUNCTION "public"."restore_blog_post"("p_post_id" "uuid", "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."restore_blog_post"("p_post_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_blog_post_revision"("p_post_id" "uuid", "p_revision_id" bigint, "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."restore_blog_post_revision"("p_post_id" "uuid", "p_revision_id" bigint, "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_job"("p_job_id" "uuid", "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_version integer;
  v_archived_at timestamptz;
begin
  if v_actor is null or not private.is_active_admin(v_actor) then
    raise exception 'Only an active admin can restore a Job.' using errcode = '42501';
  end if;

  select archived_at into v_archived_at
  from public.jobs
  where id = p_job_id and archived_at is not null and version = p_expected_version
  for update;

  if not found then
    raise exception 'Job was not found, is not in Trash, or has changed.' using errcode = '40001';
  end if;

  update public.jobs
  set archived_at = null, archived_by = null, updated_by = v_actor, version = version + 1
  where id = p_job_id
  returning version into v_version;

  update public.job_drive_folders
  set archived_at = null, archived_by = null, connection_status = 'READY',
      updated_by = v_actor, last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at = v_archived_at;

  update public.job_documents
  set archived_at = null, archived_by = null, sync_status = 'READY',
      updated_by = v_actor, last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at = v_archived_at;

  perform private.log_job_activity(p_job_id, 'JOB_RESTORED');
  return v_version;
end;
$$;


ALTER FUNCTION "public"."restore_job"("p_job_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_job"("p_job_id" "uuid", "p_expected_version" integer) IS 'Restores a Job and its Google Drive metadata from the admin Trash.';



CREATE OR REPLACE FUNCTION "public"."restore_profile"("p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can restore profiles.' using errcode = '42501';
  end if;
  update public.profiles set deleted_at = null, is_active = false, updated_at = pg_catalog.now()
  where id = p_profile_id and deleted_at is not null;
  if not found then raise exception 'Deleted profile not found.' using errcode = 'P0002'; end if;
end;
$$;


ALTER FUNCTION "public"."restore_profile"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revert_last_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_step public.job_steps%rowtype; v_last uuid; v_job public.jobs%rowtype; v_job_status text;
begin
  select * into v_step from public.job_steps where id=p_job_step_id and replaced_at is null for update;
  if not found then raise exception 'Active Job step not found.' using errcode='P0002'; end if;
  select * into v_job from public.jobs where id=v_step.job_id for update;
  if not private.can_manage_job(v_step.job_id,v_actor) then raise exception 'Step management is not allowed.' using errcode='42501'; end if;
  if v_step.version<>p_expected_version then raise exception 'Stale step version.' using errcode='40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode='55000'; end if;
  select s.code into v_job_status from public.job_statuses s where s.id=v_job.status_id;
  if v_job_status='COMPLETED' then raise exception 'Use reopen_job for a completed Job.' using errcode='55000'; end if;
  select id into v_last from public.job_steps where job_id=v_step.job_id and replaced_at is null and is_completed order by position desc limit 1;
  if v_last is distinct from v_step.id then raise exception 'Only the last completed step can be reverted.' using errcode='55000'; end if;
  update public.job_steps set is_completed=false,completed_at=null,completed_by=null,updated_by=v_actor,version=version+1 where id=v_step.id;
  perform private.log_job_activity(v_step.job_id,'JOB_STEP_REVERTED',jsonb_build_object('is_completed',true),jsonb_build_object('is_completed',false),null,null,v_step.id,null);
end;
$$;


ALTER FUNCTION "public"."revert_last_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_review_request"("p_request_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
begin
  if not private.is_active_staff(v_actor) then
    raise exception 'Active staff access required.' using errcode = '42501';
  end if;

  update public.review_requests as rr
  set revoked_at = pg_catalog.now(), revoked_by = v_actor
  where rr.id = p_request_id
    and rr.used_at is null
    and rr.revoked_at is null
    and rr.archived_at is null
    and (rr.expires_at is null or rr.expires_at > pg_catalog.now());

  if not found then
    raise exception 'Active review request was not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."revoke_review_request"("p_request_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_internal_service"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_summary" "text" DEFAULT NULL::"text", "p_workflow_template_id" "uuid" DEFAULT NULL::"uuid", "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_workflow_template_id is not null and not exists (
    select 1
    from public.workflow_templates
    where id = p_workflow_template_id
      and is_active
  ) then
    raise exception 'Active workflow not found.' using errcode = '23503';
  end if;

  if p_id is null then
    insert into public.internal_services (
      workflow_template_id, code, name, summary,
      is_active, created_by, updated_by
    ) values (
      p_workflow_template_id, upper(btrim(p_code)), btrim(p_name),
      nullif(btrim(p_summary), ''), p_is_active, v_actor, v_actor
    )
    returning id into v_id;
  else
    update public.internal_services
    set
      workflow_template_id = p_workflow_template_id,
      name = btrim(p_name),
      summary = nullif(btrim(p_summary), ''),
      is_active = p_is_active,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Service not found or stale.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."save_internal_service"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_summary" "text", "p_workflow_template_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_job_document_metadata"("p_job_id" "uuid", "p_job_drive_folder_id" "uuid", "p_google_file_id" "text", "p_google_resource_key" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size_bytes" bigint, "p_web_view_url" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_document_id uuid;
begin
  if v_actor is null or not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.job_drive_folders
    where id = p_job_drive_folder_id and job_id = p_job_id and archived_at is null
  ) then
    raise exception 'Job Drive folder was not found.' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_google_file_id), '') is null
    or nullif(btrim(p_file_name), '') is null
    or p_file_size_bytes is not null and p_file_size_bytes < 0
    or p_web_view_url !~* '^https://(drive|docs)\.google\.com/' then
    raise exception 'Google Drive file metadata is invalid.' using errcode = '22023';
  end if;

  select id into v_document_id
  from public.job_documents
  where job_id = p_job_id
    and google_file_id = btrim(p_google_file_id)
    and archived_at is null
  for update;

  if v_document_id is null then
    insert into public.job_documents (
      job_id, job_drive_folder_id, google_file_id, google_resource_key,
      file_name, mime_type, file_size_bytes, web_view_url,
      source, sync_status, uploaded_by, last_synced_at, created_by, updated_by
    ) values (
      p_job_id, p_job_drive_folder_id, btrim(p_google_file_id), nullif(btrim(p_google_resource_key), ''),
      left(btrim(p_file_name), 500), nullif(btrim(p_mime_type), ''), p_file_size_bytes, p_web_view_url,
      'GOOGLE_DRIVE_API', 'READY', v_actor, now(), v_actor, v_actor
    )
    returning id into v_document_id;
  else
    update public.job_documents set
      job_drive_folder_id = p_job_drive_folder_id,
      google_resource_key = nullif(btrim(p_google_resource_key), ''),
      file_name = left(btrim(p_file_name), 500),
      mime_type = nullif(btrim(p_mime_type), ''),
      file_size_bytes = p_file_size_bytes,
      web_view_url = p_web_view_url,
      sync_status = 'READY',
      last_synced_at = now(),
      updated_by = v_actor,
      version = version + 1
    where id = v_document_id;
  end if;

  return v_document_id;
end;
$$;


ALTER FUNCTION "public"."save_job_document_metadata"("p_job_id" "uuid", "p_job_drive_folder_id" "uuid", "p_google_file_id" "text", "p_google_resource_key" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size_bytes" bigint, "p_web_view_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_job_drive_folder"("p_job_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_folder_id uuid;
begin
  if v_actor is null or not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;
  if nullif(btrim(p_google_drive_id), '') is null
    or nullif(btrim(p_google_folder_id), '') is null
    or nullif(btrim(p_folder_name), '') is null
    or p_web_view_url !~* '^https://drive\.google\.com/' then
    raise exception 'Google Drive folder metadata is invalid.' using errcode = '22023';
  end if;

  insert into public.job_drive_folders (
    job_id, google_drive_id, google_folder_id, folder_name, web_view_url,
    connection_status, last_synced_at, created_by, updated_by
  ) values (
    p_job_id, btrim(p_google_drive_id), btrim(p_google_folder_id),
    left(btrim(p_folder_name), 240), p_web_view_url,
    'READY', now(), v_actor, v_actor
  )
  on conflict (job_id) do update set
    google_drive_id = excluded.google_drive_id,
    google_folder_id = excluded.google_folder_id,
    folder_name = excluded.folder_name,
    web_view_url = excluded.web_view_url,
    connection_status = 'READY',
    last_synced_at = now(),
    archived_at = null,
    archived_by = null,
    updated_by = v_actor,
    version = public.job_drive_folders.version + 1
  returning id into v_folder_id;

  return v_folder_id;
end;
$$;


ALTER FUNCTION "public"."save_job_drive_folder"("p_job_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_job_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_system boolean;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.job_statuses (
      code, name, color, sort_order, is_active, is_system, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), upper(btrim(p_color)), p_sort_order,
      p_is_active, false, v_actor, v_actor
    )
    returning id into v_id;
  else
    select is_system
    into v_system
    from public.job_statuses
    where id = p_id
    for update;

    if not found then
      raise exception 'Job status not found.' using errcode = 'P0002';
    end if;

    update public.job_statuses
    set
      name = btrim(p_name),
      color = upper(btrim(p_color)),
      sort_order = p_sort_order,
      is_active = case when v_system then true else p_is_active end,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Stale Job status version.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."save_job_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_job_title"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.job_titles (
      code, name, sort_order, is_active, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), p_sort_order, p_is_active, v_actor, v_actor
    )
    returning id into v_id;
  else
    update public.job_titles
    set
      name = btrim(p_name),
      sort_order = p_sort_order,
      is_active = p_is_active,
      updated_by = v_actor,
      version = version + 1
    where id = p_id
      and version = p_expected_version
    returning id into v_id;

    if not found then
      raise exception 'Stale Job title version.' using errcode = '40001';
    end if;
  end if;

  return v_id;
end;
$$;


ALTER FUNCTION "public"."save_job_title"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_sort_order" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_priority"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_system boolean;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_id is null then
    insert into public.priorities(code,name,color,sort_order,is_active,is_system,created_by,updated_by)
    values(upper(btrim(p_code)),btrim(p_name),p_color,p_sort_order,p_is_active,false,v_actor,v_actor) returning id into v_id;
  else
    select is_system into v_system from public.priorities where id=p_id for update;
    if not found then raise exception 'Priority not found.' using errcode='P0002'; end if;
    update public.priorities set name=btrim(p_name),color=p_color,sort_order=p_sort_order,is_active=case when v_system then true else p_is_active end,updated_by=v_actor,version=version+1
    where id=p_id and version=p_expected_version returning id into v_id;
    if not found then raise exception 'Stale priority version.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;


ALTER FUNCTION "public"."save_priority"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_public_service_category"("p_id" "uuid", "p_expected_version" integer, "p_slug" "text", "p_title" "text", "p_type" "public"."categories_type", "p_short_description" "text", "p_description" "text", "p_hero_heading" "text", "p_hero_image" "text", "p_card_image" "text", "p_card_icon_key" "text", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
$_$;


ALTER FUNCTION "public"."save_public_service_category"("p_id" "uuid", "p_expected_version" integer, "p_slug" "text", "p_title" "text", "p_type" "public"."categories_type", "p_short_description" "text", "p_description" "text", "p_hero_heading" "text", "p_hero_image" "text", "p_card_image" "text", "p_card_icon_key" "text", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_public_service_detail"("p_id" "uuid", "p_expected_version" integer, "p_service_item_id" "uuid", "p_title" "text", "p_description" "text", "p_cta_description" "text", "p_sort_order" bigint, "p_is_published" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."save_public_service_detail"("p_id" "uuid", "p_expected_version" integer, "p_service_item_id" "uuid", "p_title" "text", "p_description" "text", "p_cta_description" "text", "p_sort_order" bigint, "p_is_published" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_public_service_item"("p_id" "uuid", "p_expected_version" integer, "p_category_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_icon_key" "text", "p_cta_label" "text", "p_cta_type" "public"."cta_type", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
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
$_$;


ALTER FUNCTION "public"."save_public_service_item"("p_id" "uuid", "p_expected_version" integer, "p_category_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_icon_key" "text", "p_cta_label" "text", "p_cta_type" "public"."cta_type", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_question_answer"("p_id" "uuid", "p_expected_version" integer, "p_question" "text", "p_answer" "text", "p_services_categories_id" "uuid" DEFAULT NULL::"uuid", "p_is_visible" boolean DEFAULT true, "p_sort_order" bigint DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."save_question_answer"("p_id" "uuid", "p_expected_version" integer, "p_question" "text", "p_answer" "text", "p_services_categories_id" "uuid", "p_is_visible" boolean, "p_sort_order" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_sop"("p_internal_service_id" "uuid", "p_description" "text", "p_expected_version" integer DEFAULT NULL::integer) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if not exists(select 1 from public.internal_services where id=p_internal_service_id) then raise exception 'Internal service not found.' using errcode='23503'; end if;
  select id into v_id from public.sops where internal_service_id=p_internal_service_id for update;
  if v_id is null then
    insert into public.sops(internal_service_id,description,created_by,updated_by) values(p_internal_service_id,nullif(btrim(p_description),''),v_actor,v_actor) returning id into v_id;
  else
    update public.sops set description=nullif(btrim(p_description),''),updated_by=v_actor,version=version+1
    where id=v_id and version=p_expected_version;
    if not found then raise exception 'Stale SOP version.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;


ALTER FUNCTION "public"."save_sop"("p_internal_service_id" "uuid", "p_description" "text", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_sop_drive_file_metadata"("p_sop_id" "uuid", "p_sop_drive_folder_id" "uuid", "p_file_type" "text", "p_title" "text", "p_original_filename" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_sort_order" integer, "p_google_file_id" "text", "p_google_resource_key" "text", "p_web_view_url" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_type text := upper(btrim(p_file_type));
  v_file_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.sop_drive_folders
    where id = p_sop_drive_folder_id and sop_id = p_sop_id and connection_status = 'READY'
  ) then
    raise exception 'SOP Drive folder not found.' using errcode = 'P0002';
  end if;
  if v_type not in ('FLOW', 'REQUIREMENT')
    or nullif(btrim(p_title), '') is null
    or char_length(btrim(p_title)) > 240
    or nullif(btrim(p_original_filename), '') is null
    or char_length(btrim(p_original_filename)) > 255
    or p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 10485760
    or p_sort_order is null or p_sort_order < 0
    or nullif(btrim(p_google_file_id), '') is null
    or p_web_view_url !~* '^https://(drive|docs)\.google\.com/' then
    raise exception 'SOP Drive file metadata is invalid.' using errcode = '22023';
  end if;
  if v_type = 'FLOW' and p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp') then
    raise exception 'Unsupported Flow file type.' using errcode = '22023';
  end if;
  if v_type = 'REQUIREMENT' and p_mime_type <> 'application/pdf' then
    raise exception 'Requirement files must be PDF.' using errcode = '22023';
  end if;

  -- Retire the previous Flow before inserting its replacement so the existing
  -- one-active-Flow unique index remains authoritative.
  if v_type = 'FLOW' then
    update public.sop_files set
      deleted_at = now(),
      deleted_by = v_actor,
      updated_by = v_actor,
      version = version + 1
    where sop_id = p_sop_id
      and file_type = 'FLOW'
      and upload_status = 'READY'
      and deleted_at is null
      and google_file_id is distinct from btrim(p_google_file_id);
  end if;

  select id into v_file_id
  from public.sop_files
  where google_file_id = btrim(p_google_file_id)
  for update;

  if v_file_id is null then
    insert into public.sop_files (
      sop_id, sop_drive_folder_id, storage_provider, file_type, title,
      original_filename, bucket_id, storage_path, mime_type, size_bytes,
      sort_order, upload_status, uploaded_at, google_file_id,
      google_resource_key, web_view_url, last_synced_at, created_by, updated_by
    ) values (
      p_sop_id, p_sop_drive_folder_id, 'GOOGLE_DRIVE', v_type, btrim(p_title),
      btrim(p_original_filename), null, null, p_mime_type, p_size_bytes,
      p_sort_order, 'READY', now(), btrim(p_google_file_id),
      nullif(btrim(p_google_resource_key), ''), p_web_view_url, now(), v_actor, v_actor
    ) returning id into v_file_id;
  else
    update public.sop_files set
      sop_id = p_sop_id,
      sop_drive_folder_id = p_sop_drive_folder_id,
      storage_provider = 'GOOGLE_DRIVE',
      file_type = v_type,
      title = btrim(p_title),
      original_filename = btrim(p_original_filename),
      bucket_id = null,
      storage_path = null,
      mime_type = p_mime_type,
      size_bytes = p_size_bytes,
      sort_order = p_sort_order,
      upload_status = 'READY',
      uploaded_at = now(),
      google_resource_key = nullif(btrim(p_google_resource_key), ''),
      web_view_url = p_web_view_url,
      last_synced_at = now(),
      deleted_at = null,
      deleted_by = null,
      updated_by = v_actor,
      version = version + 1
    where id = v_file_id;
  end if;

  return v_file_id;
end;
$$;


ALTER FUNCTION "public"."save_sop_drive_file_metadata"("p_sop_id" "uuid", "p_sop_drive_folder_id" "uuid", "p_file_type" "text", "p_title" "text", "p_original_filename" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_sort_order" integer, "p_google_file_id" "text", "p_google_resource_key" "text", "p_web_view_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_sop_drive_folder"("p_sop_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_folder_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.sops where id = p_sop_id) then
    raise exception 'SOP not found.' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_google_drive_id), '') is null
    or nullif(btrim(p_google_folder_id), '') is null
    or nullif(btrim(p_folder_name), '') is null
    or p_web_view_url !~* '^https://drive\.google\.com/' then
    raise exception 'Google Drive folder metadata is invalid.' using errcode = '22023';
  end if;

  insert into public.sop_drive_folders (
    sop_id, google_drive_id, google_folder_id, folder_name, web_view_url,
    connection_status, last_synced_at, created_by, updated_by
  ) values (
    p_sop_id, btrim(p_google_drive_id), btrim(p_google_folder_id),
    left(btrim(p_folder_name), 240), p_web_view_url,
    'READY', now(), v_actor, v_actor
  )
  on conflict (sop_id) do update set
    google_drive_id = excluded.google_drive_id,
    google_folder_id = excluded.google_folder_id,
    folder_name = excluded.folder_name,
    web_view_url = excluded.web_view_url,
    connection_status = 'READY',
    last_synced_at = now(),
    updated_by = v_actor,
    version = public.sop_drive_folders.version + 1
  returning id into v_folder_id;

  return v_folder_id;
end;
$$;


ALTER FUNCTION "public"."save_sop_drive_folder"("p_sop_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_sop_price_items"("p_sop_id" "uuid", "p_sop_expected_version" integer, "p_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' then raise exception 'Price items must be an array.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_items)e where btrim(coalesce(e->>'item_name',''))='' or coalesce((e->>'amount')::numeric,-1)<0) then raise exception 'Every price row requires a name and non-negative amount.' using errcode='22023'; end if;
  select version into v_version from public.sops where id=p_sop_id for update;
  if not found then raise exception 'SOP not found.' using errcode='P0002'; end if;
  if v_version<>p_sop_expected_version then raise exception 'Stale SOP version.' using errcode='40001'; end if;
  delete from public.sop_price_items where sop_id=p_sop_id;
  insert into public.sop_price_items(sop_id,item_name,amount,currency,notes,sort_order,created_by,updated_by)
  select p_sop_id,btrim(e.value->>'item_name'),(e.value->>'amount')::numeric,'IDR',nullif(btrim(e.value->>'notes'),''),e.ordinality::integer,v_actor,v_actor
  from jsonb_array_elements(p_items) with ordinality e(value,ordinality);
  update public.sops set updated_by=v_actor,version=version+1 where id=p_sop_id returning version into v_version;
  return v_version;
end; $$;


ALTER FUNCTION "public"."save_sop_price_items"("p_sop_id" "uuid", "p_sop_expected_version" integer, "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_task_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer DEFAULT 0, "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_system boolean;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if p_id is null then
    insert into public.task_statuses(code,name,color,sort_order,is_active,is_system,created_by,updated_by)
    values(upper(btrim(p_code)),btrim(p_name),p_color,p_sort_order,p_is_active,false,v_actor,v_actor) returning id into v_id;
  else
    select is_system into v_system from public.task_statuses where id=p_id for update;
    if not found then raise exception 'Task status not found.' using errcode='P0002'; end if;
    update public.task_statuses set name=btrim(p_name),color=p_color,sort_order=p_sort_order,is_active=case when v_system then true else p_is_active end,updated_by=v_actor,version=version+1
    where id=p_id and version=p_expected_version returning id into v_id;
    if not found then raise exception 'Stale task status version.' using errcode='40001'; end if;
  end if;
  return v_id;
end; $$;


ALTER FUNCTION "public"."save_task_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_team_member_profile"("p_profile_id" "uuid", "p_full_name" "text", "p_job_title_id" "uuid", "p_avatar_url" "text", "p_short_bio" "text", "p_is_visible" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_member_id uuid;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_profile_id is null or not exists (
    select 1 from public.profiles where id = p_profile_id and deleted_at is null
  ) then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
  if btrim(coalesce(p_full_name, '')) = '' or char_length(btrim(p_full_name)) > 160 then
    raise exception 'Team member name is invalid.' using errcode = '22023';
  end if;
  if p_job_title_id is not null and not exists (
    select 1 from public.job_titles where id = p_job_title_id and is_active
  ) then
    raise exception 'Active Job title not found.' using errcode = '23503';
  end if;
  if p_is_visible and p_job_title_id is null then
    raise exception 'A Job title is required before publishing a team member.' using errcode = '23514';
  end if;
  if char_length(coalesce(p_avatar_url, '')) > 2048 or char_length(coalesce(p_short_bio, '')) > 1000 then
    raise exception 'Team member details are too long.' using errcode = '22023';
  end if;

  insert into public.team_members as member (
    profile_id, full_name, job_title_id, avatar_url, short_bio, is_visible, updated_at
  ) values (
    p_profile_id,
    btrim(p_full_name),
    p_job_title_id,
    nullif(btrim(coalesce(p_avatar_url, '')), ''),
    nullif(btrim(coalesce(p_short_bio, '')), ''),
    p_is_visible,
    pg_catalog.now()
  )
  on conflict (profile_id) where profile_id is not null do update set
    full_name = excluded.full_name,
    job_title_id = excluded.job_title_id,
    avatar_url = excluded.avatar_url,
    short_bio = excluded.short_bio,
    is_visible = excluded.is_visible,
    updated_at = pg_catalog.now()
  returning id into v_member_id;

  return v_member_id;
end;
$$;


ALTER FUNCTION "public"."save_team_member_profile"("p_profile_id" "uuid", "p_full_name" "text", "p_job_title_id" "uuid", "p_avatar_url" "text", "p_short_bio" "text", "p_is_visible" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_workflow_template"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb", "p_is_active" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_used boolean := false;
  v_current_version integer;
  v_current_code text;
  v_current_name text;
  v_current_description text;
  v_current_steps jsonb;
  v_requested_steps jsonb;
  v_content_changed boolean;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then
    raise exception 'Workflow requires at least one step.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_steps) as item
    where btrim(coalesce(item->>'name', '')) = ''
  ) then
    raise exception 'Every workflow step requires a name.' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', btrim(item->>'name'),
        'description', nullif(btrim(item->>'description'), '')
      )
      order by ordinality
    ),
    '[]'::jsonb
  )
  into v_requested_steps
  from jsonb_array_elements(p_steps) with ordinality as requested(item, ordinality);

  if p_id is null then
    insert into public.workflow_templates (
      code, name, description, is_active, created_by, updated_by
    ) values (
      upper(btrim(p_code)), btrim(p_name), nullif(btrim(p_description), ''),
      p_is_active, v_actor, v_actor
    )
    returning id into v_id;

    insert into public.workflow_template_steps (
      workflow_template_id, name, description, position, created_by, updated_by
    )
    select
      v_id,
      step->>'name',
      step->>'description',
      ordinality::integer,
      v_actor,
      v_actor
    from jsonb_array_elements(v_requested_steps) with ordinality as requested(step, ordinality);

    return v_id;
  end if;

  select version, code, name, description
  into v_current_version, v_current_code, v_current_name, v_current_description
  from public.workflow_templates
  where id = p_id
  for update;

  if not found then
    raise exception 'Workflow not found.' using errcode = 'P0002';
  end if;
  if v_current_version <> p_expected_version then
    raise exception 'Stale workflow version.' using errcode = '40001';
  end if;
  if v_current_code is distinct from upper(btrim(p_code)) then
    raise exception 'Workflow code is permanent.' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('name', name, 'description', description)
      order by position
    ),
    '[]'::jsonb
  )
  into v_current_steps
  from public.workflow_template_steps
  where workflow_template_id = p_id;

  v_content_changed :=
    v_current_name is distinct from btrim(p_name)
    or v_current_description is distinct from nullif(btrim(p_description), '')
    or v_current_steps is distinct from v_requested_steps;

  if v_content_changed then
    select exists (
      select 1 from public.jobs where workflow_template_id = p_id
    ) into v_used;
    if v_used then
      raise exception 'A workflow used by a Job is immutable.' using errcode = '55000';
    end if;

    delete from public.workflow_template_steps
    where workflow_template_id = p_id;

    insert into public.workflow_template_steps (
      workflow_template_id, name, description, position, created_by, updated_by
    )
    select
      p_id,
      step->>'name',
      step->>'description',
      ordinality::integer,
      v_actor,
      v_actor
    from jsonb_array_elements(v_requested_steps) with ordinality as requested(step, ordinality);
  end if;

  if not p_is_active and exists (
    select 1
    from public.internal_services
    where workflow_template_id = p_id
      and is_active
  ) then
    raise exception 'Reassign active services before deactivating this workflow.' using errcode = '23503';
  end if;

  update public.workflow_templates
  set
    name = btrim(p_name),
    description = nullif(btrim(p_description), ''),
    is_active = p_is_active,
    updated_by = v_actor,
    version = version + 1
  where id = p_id;

  return p_id;
end;
$$;


ALTER FUNCTION "public"."save_workflow_template"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_job_access_profiles"("p_job_id" "uuid", "p_search" "text" DEFAULT ''::"text", "p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "email" "text", "display_name" "text", "avatar_url" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_search text := left(btrim(coalesce(p_search, '')), 100);
  v_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
begin
  if v_actor is null or not private.can_manage_job(p_job_id, v_actor) then
    raise exception 'Job document management is not allowed.' using errcode = '42501';
  end if;

  return query
  select p.id, p.email, coalesce(nullif(btrim(p.display_name), ''), p.email), p.avatar_url
  from public.profiles as p
  where p.is_active = true
    and p.deleted_at is null
    and (
      v_search = ''
      or p.display_name ilike '%' || v_search || '%'
      or p.email ilike '%' || v_search || '%'
    )
  order by lower(coalesce(nullif(btrim(p.display_name), ''), p.email)), lower(p.email), p.id
  limit v_limit;
end;
$$;


ALTER FUNCTION "public"."search_job_access_profiles"("p_job_id" "uuid", "p_search" "text", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_job_access_profiles"("p_job_id" "uuid", "p_search" "text", "p_limit" integer) IS 'Returns active user suggestions only to an admin or the assigned PIC of the requested Job.';



CREATE OR REPLACE FUNCTION "public"."set_blog_post_featured"("p_post_id" "uuid", "p_expected_version" integer, "p_is_featured" boolean) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."set_blog_post_featured"("p_post_id" "uuid", "p_expected_version" integer, "p_is_featured" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_version integer;
begin
  if p_post_id is null or p_is_published is null then raise exception using errcode = '22023', message = 'blog_publish_input_invalid'; end if;
  if not private.is_active_admin(auth.uid()) then raise exception using errcode = '42501', message = 'blog_publish_forbidden'; end if;
  select version into v_version from public.blog_posts where id = p_post_id and archived_at is null;
  if not found then raise exception using errcode = 'P0002', message = 'blog_post_not_found'; end if;
  perform public.moderate_blog_post(p_post_id, v_version, case when p_is_published then 'published'::public.blog_status else 'draft'::public.blog_status end, null);
end;
$$;


ALTER FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) IS 'Compatibility admin RPC: true maps to published and false maps to draft. Other workflow transitions remain application-owned.';



CREATE OR REPLACE FUNCTION "public"."set_master_data_active"("p_entity" "text", "p_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_entity text := upper(btrim(p_entity));
  v_is_system boolean;
  v_version integer;
begin
  if not private.is_active_admin(v_actor) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_id is null or p_expected_version is null or p_is_active is null then
    raise exception 'Master Data lifecycle input is invalid.' using errcode = '22023';
  end if;

  if v_entity = 'PRIORITY' then
    select is_system into v_is_system from public.priorities where id = p_id for update;
    if not found then raise exception 'Priority not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then raise exception 'System priorities must remain active.' using errcode = '55000'; end if;
    update public.priorities set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'JOB_STATUS' then
    select is_system into v_is_system from public.job_statuses where id = p_id for update;
    if not found then raise exception 'Job status not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then raise exception 'System Job statuses must remain active.' using errcode = '55000'; end if;
    update public.job_statuses set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'TASK_STATUS' then
    select is_system into v_is_system from public.task_statuses where id = p_id for update;
    if not found then raise exception 'Task status not found.' using errcode = 'P0002'; end if;
    if v_is_system and not p_is_active then raise exception 'System Task statuses must remain active.' using errcode = '55000'; end if;
    update public.task_statuses set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'INTERNAL_SERVICE' then
    update public.internal_services set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'WORKFLOW_TEMPLATE' then
    if not p_is_active and exists (
      select 1 from public.internal_services where workflow_template_id = p_id and is_active
    ) then
      raise exception 'Reassign active services before deactivating this workflow.' using errcode = '23503';
    end if;
    update public.workflow_templates set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  elsif v_entity = 'JOB_TITLE' then
    if not p_is_active and exists (
      select 1 from public.team_members where job_title_id = p_id and is_visible
    ) then
      raise exception 'Hide or reassign published team members before deactivating this Job title.' using errcode = '23503';
    end if;
    update public.job_titles set is_active = p_is_active, updated_by = v_actor, version = version + 1
    where id = p_id and version = p_expected_version returning version into v_version;
  else
    raise exception 'Unsupported Master Data entity.' using errcode = '22023';
  end if;

  if v_version is null then
    raise exception 'Master Data record is stale or unavailable.' using errcode = '40001';
  end if;
  return v_version;
end;
$$;


ALTER FUNCTION "public"."set_master_data_active"("p_entity" "text", "p_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_active"("p_profile_id" "uuid", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can change profile access.' using errcode = '42501';
  end if;
  if p_profile_id = auth.uid() and p_is_active = false then
    raise exception 'A super admin cannot deactivate their own profile.' using errcode = '22023';
  end if;
  update public.profiles set is_active = p_is_active, updated_at = pg_catalog.now()
  where id = p_profile_id and deleted_at is null;
  if not found then raise exception 'Profile not found.' using errcode = 'P0002'; end if;
end;
$$;


ALTER FUNCTION "public"."set_profile_active"("p_profile_id" "uuid", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_profile_role"("p_profile_id" "uuid", "p_role" "public"."role") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can change profile roles.' using errcode = '42501';
  end if;

  if p_profile_id = auth.uid() then
    raise exception 'A super admin cannot change their own role.' using errcode = '22023';
  end if;

  if p_role not in (
    'super_admin'::public.role,
    'admin'::public.role,
    'staff'::public.role
  ) then
    raise exception 'Unsupported profile role.' using errcode = '22023';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = pg_catalog.now()
  where id = p_profile_id
    and deleted_at is null;

  if not found then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."set_profile_role"("p_profile_id" "uuid", "p_role" "public"."role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.status = 'published'::public.blog_status
    and old.status is distinct from new.status
  then
    new.published_at := pg_catalog.now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_workflow_active"("p_template_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid := auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  if not p_is_active and exists (select 1 from public.internal_services s where s.workflow_template_id=p_template_id and s.is_active) then
    raise exception 'Reassign active services before deactivating this workflow.' using errcode='23503';
  end if;
  update public.workflow_templates set is_active=p_is_active, updated_by=v_actor, version=version+1
  where id=p_template_id and version=p_expected_version returning version into v_version;
  if not found then raise exception 'Workflow not found or stale.' using errcode='40001'; end if;
  return v_version;
end; $$;


ALTER FUNCTION "public"."set_workflow_active"("p_template_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_profile"("p_profile_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not private.is_active_super_admin(auth.uid()) then
    raise exception 'Only an active super admin can delete profiles.' using errcode = '42501';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'A super admin cannot delete their own profile.' using errcode = '22023';
  end if;
  update public.profiles set is_active = false, deleted_at = pg_catalog.now(), updated_at = pg_catalog.now()
  where id = p_profile_id and deleted_at is null;
  if not found then raise exception 'Active profile not found.' using errcode = 'P0002'; end if;

  update public.team_members
  set is_visible = false, updated_at = pg_catalog.now()
  where profile_id = p_profile_id;
end;
$$;


ALTER FUNCTION "public"."soft_delete_profile"("p_profile_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_blog_post_for_review"("p_post_id" "uuid", "p_expected_version" integer) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."submit_blog_post_for_review"("p_post_id" "uuid", "p_expected_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_token text := pg_catalog.btrim(p_token);
  v_name text := pg_catalog.btrim(p_name);
  v_email text := nullif(pg_catalog.btrim(p_email), '');
  v_message text := pg_catalog.btrim(p_message);
  v_hash text;
  v_req_id uuid;
  v_client_id uuid;
  v_job_id uuid;
  v_review_id uuid;
begin
  if v_token is null or pg_catalog.char_length(v_token) <> 64 or v_token !~ '^[0-9A-Fa-f]{64}$' then
    raise exception using errcode = '22023', message = 'review_invalid_token';
  end if;
  if v_name is null or pg_catalog.char_length(v_name) = 0 then
    raise exception using errcode = '22023', message = 'review_name_required';
  end if;
  if pg_catalog.char_length(v_name) > 100 then
    raise exception using errcode = '22023', message = 'review_name_too_long';
  end if;
  if v_email is not null and (
    pg_catalog.char_length(v_email) > 254
    or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) then
    raise exception using errcode = '22023', message = 'review_email_invalid';
  end if;
  if v_message is null or pg_catalog.char_length(v_message) = 0 then
    raise exception using errcode = '22023', message = 'review_message_required';
  end if;
  if pg_catalog.char_length(v_message) > 2000 then
    raise exception using errcode = '22023', message = 'review_message_too_long';
  end if;

  v_hash := pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex');
  select rr.id, rr.client_id, rr.job_id
    into v_req_id, v_client_id, v_job_id
  from public.review_requests as rr
  where rr.token_hash = v_hash
    and rr.revoked_at is null
    and rr.used_at is null
    and rr.archived_at is null
    and (rr.expires_at is null or rr.expires_at > pg_catalog.now())
  for update;

  if v_req_id is null then
    raise exception using errcode = 'P0001', message = 'review_request_unavailable';
  end if;

  insert into public.reviews (
    review_request_id, client_id, job_id, name, email, message,
    status, is_published, is_featured, created_at
  ) values (
    v_req_id, v_client_id, v_job_id, v_name, v_email, v_message,
    'PENDING'::public.review_moderation_status, false, false, pg_catalog.now()
  ) returning id into v_review_id;

  update public.review_requests as rr set used_at = pg_catalog.now() where rr.id = v_req_id;
  return v_review_id;
end;
$_$;


ALTER FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_own_profile_identity"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  update public.profiles as p set
    email = u.email,
    display_name = nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', p.display_name, '')), ''),
    avatar_url = nullif(btrim(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', p.avatar_url, '')), ''),
    updated_at = pg_catalog.now()
  from auth.users as u
  where u.id = v_user_id and p.id = v_user_id;

  if not found then
    raise exception 'Approved profile not found.' using errcode = 'P0002';
  end if;
end;
$$;


ALTER FUNCTION "public"."sync_own_profile_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trash_job"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_client_name text;
  v_version integer;
begin
  if v_actor is null or not private.is_active_admin(v_actor) then
    raise exception 'Only an active admin can move a Job to Trash.' using errcode = '42501';
  end if;

  select j.*
  into v_job
  from public.jobs as j
  where j.id = p_job_id
  for update;

  if not found or v_job.archived_at is not null then
    raise exception 'Job was not found or is already in Trash.' using errcode = 'P0002';
  end if;
  select name into v_client_name from public.clients where id = v_job.client_id;
  if v_job.version <> p_expected_version then
    raise exception 'Job changed before it could be moved to Trash.' using errcode = '40001';
  end if;
  if btrim(coalesce(p_confirmation, '')) <> v_job.title
    and btrim(coalesce(p_confirmation, '')) <> v_client_name then
    raise exception 'Confirmation must exactly match the Job title or client name.' using errcode = '22023';
  end if;

  update public.job_documents
  set sync_status = 'TRASHED', archived_at = pg_catalog.now(), archived_by = v_actor,
      updated_by = v_actor, last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at is null;

  update public.job_drive_folders
  set archived_at = pg_catalog.now(), archived_by = v_actor, updated_by = v_actor,
      last_synced_at = pg_catalog.now(), version = version + 1
  where job_id = p_job_id and archived_at is null;

  update public.jobs
  set archived_at = pg_catalog.now(), archived_by = v_actor, updated_by = v_actor,
      version = version + 1
  where id = p_job_id and archived_at is null
  returning version into v_version;

  perform private.log_job_activity(p_job_id, 'JOB_TRASHED');
  return v_version;
end;
$$;


ALTER FUNCTION "public"."trash_job"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trash_job"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") IS 'Moves a Job and its Google Drive metadata to the admin Trash after exact-name confirmation.';



CREATE OR REPLACE FUNCTION "public"."update_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text" DEFAULT NULL::"text", "p_cover_alt" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT 'News'::"text", "p_tags" "text"[] DEFAULT '{}'::"text"[], "p_seo_title" "text" DEFAULT NULL::"text", "p_seo_description" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."update_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client"("p_client_id" "uuid", "p_expected_version" integer, "p_client_type" "text", "p_name" "text", "p_contact_person" "text" DEFAULT NULL::"text", "p_email" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_address" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_version integer;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode='42501'; end if;
  update public.clients set client_type=upper(btrim(p_client_type)),name=btrim(p_name),contact_person=nullif(btrim(p_contact_person),''),email=nullif(btrim(p_email),''),phone=nullif(btrim(p_phone),''),address=nullif(btrim(p_address),''),notes=nullif(btrim(p_notes),''),updated_by=v_actor,version=version+1
  where id=p_client_id and version=p_expected_version and archived_at is null returning version into v_version;
  if not found then raise exception 'Client not found, archived, or stale.' using errcode='40001'; end if;
  return v_version;
end; $$;


ALTER FUNCTION "public"."update_client"("p_client_id" "uuid", "p_expected_version" integer, "p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job"("p_job_id" "uuid", "p_expected_version" integer, "p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_description" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_estimated_end_date" "date" DEFAULT NULL::"date", "p_pic_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_actor uuid := auth.uid();
  v_job public.jobs%rowtype;
  v_template uuid;
  v_pic uuid;
  v_version integer;
  v_status_code text;
  v_service_changed boolean;
begin
  select j.* into v_job from public.jobs j where j.id = p_job_id for update;
  if not found then raise exception 'Job not found.' using errcode = 'P0002'; end if;
  if not private.can_manage_job(p_job_id, v_actor) then raise exception 'Job management is not allowed.' using errcode = '42501'; end if;
  if v_job.version <> p_expected_version then raise exception 'Stale Job version.' using errcode = '40001'; end if;
  if v_job.archived_at is not null then raise exception 'Archived Job is read-only.' using errcode = '55000'; end if;

  select s.code into v_status_code from public.job_statuses s where s.id = v_job.status_id;
  if v_status_code = 'COMPLETED' then raise exception 'Reopen the completed Job before editing.' using errcode = '55000'; end if;
  if p_start_date is not null and p_estimated_end_date is not null and p_estimated_end_date < p_start_date then
    raise exception 'Estimated end date cannot precede start date.' using errcode = '22023';
  end if;
  if p_client_id is distinct from v_job.client_id and not exists(
    select 1 from public.clients where id = p_client_id and archived_at is null
  ) then raise exception 'Active client not found.' using errcode = '23503'; end if;
  if p_priority_id is distinct from v_job.priority_id and not exists(
    select 1 from public.priorities where id = p_priority_id and is_active
  ) then raise exception 'Active priority not found.' using errcode = '23503'; end if;

  v_service_changed := p_internal_service_id is distinct from v_job.internal_service_id;
  if v_service_changed then
    select s.workflow_template_id
    into v_template
    from public.internal_services s
    join public.workflow_templates w on w.id = s.workflow_template_id
    where s.id = p_internal_service_id
      and s.is_active
      and w.is_active;

    if not found or not exists(
      select 1 from public.workflow_template_steps where workflow_template_id = v_template
    ) then
      raise exception 'Active service/workflow not found.' using errcode = '23503';
    end if;
  else
    -- A later Master Data workflow reassignment only affects future Jobs.
    v_template := v_job.workflow_template_id;
  end if;

  v_pic := v_job.pic_id;
  if p_pic_id is not null and p_pic_id is distinct from v_job.pic_id then
    if not private.is_active_admin(v_actor) then raise exception 'Only an admin can change PIC.' using errcode = '42501'; end if;
    perform private.assert_assignable_profile(p_pic_id);
    v_pic := p_pic_id;
  end if;

  if v_service_changed then
    update public.job_steps
    set replaced_at = pg_catalog.now(), replaced_by = v_actor,
        updated_by = v_actor, version = version + 1
    where job_id = p_job_id and replaced_at is null;

    insert into public.job_steps(
      job_id, template_step_id, name, description, position, created_by, updated_by
    )
    select p_job_id, s.id, s.name, s.description, s.position, v_actor, v_actor
    from public.workflow_template_steps s
    where s.workflow_template_id = v_template
    order by s.position;
  end if;

  update public.jobs
  set client_id = p_client_id,
      title = btrim(p_title),
      description = nullif(btrim(p_description), ''),
      pic_id = v_pic,
      internal_service_id = p_internal_service_id,
      workflow_template_id = v_template,
      priority_id = p_priority_id,
      start_date = p_start_date,
      estimated_end_date = p_estimated_end_date,
      updated_by = v_actor,
      version = version + 1
  where id = p_job_id
  returning version into v_version;

  perform private.log_job_activity(
    p_job_id,
    case when v_service_changed then 'JOB_WORKFLOW_RESTARTED' else 'JOB_UPDATED' end,
    to_jsonb(v_job) - array['created_at', 'updated_at'],
    jsonb_build_object(
      'client_id', p_client_id,
      'title', btrim(p_title),
      'pic_id', v_pic,
      'service_id', p_internal_service_id,
      'priority_id', p_priority_id
    )
  );
  return v_version;
end;
$$;


ALTER FUNCTION "public"."update_job"("p_job_id" "uuid", "p_expected_version" integer, "p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date", "p_pic_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_update"("p_update_id" "uuid", "p_expected_version" integer, "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_update public.job_updates%rowtype; v_version integer;
begin
  select * into v_update from public.job_updates where id=p_update_id for update;
  if not found then raise exception 'Remark not found.' using errcode='P0002'; end if;
  if not private.can_manage_job(v_update.job_id,v_actor) then raise exception 'Remark management is not allowed.' using errcode='42501'; end if;
  if exists(select 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_update.job_id and (j.archived_at is not null or s.code='COMPLETED')) then raise exception 'Job is read-only.' using errcode='55000'; end if;
  if v_update.version<>p_expected_version then raise exception 'Stale Remark version.' using errcode='40001'; end if;
  if p_progress_date is null then raise exception 'Progress date is required.' using errcode='22023'; end if;
  if p_performed_by is not null then perform private.assert_assignable_profile(p_performed_by); end if;
  update public.job_updates set message=btrim(p_message),progress_date=p_progress_date,performed_by=p_performed_by,updated_by=v_actor,version=version+1 where id=p_update_id returning version into v_version;
  perform private.log_job_activity(v_update.job_id,'JOB_UPDATE_UPDATED',jsonb_build_object('message',v_update.message,'progress_date',v_update.progress_date,'performed_by',v_update.performed_by),jsonb_build_object('message',btrim(p_message),'progress_date',p_progress_date,'performed_by',p_performed_by),null,null,null,p_update_id);
  return v_version;
end; $$;


ALTER FUNCTION "public"."update_job_update"("p_update_id" "uuid", "p_expected_version" integer, "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_task"("p_task_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_assignee_id" "uuid" DEFAULT NULL::"uuid", "p_priority_id" "uuid" DEFAULT NULL::"uuid", "p_due_date" "date" DEFAULT NULL::"date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_actor uuid:=auth.uid(); v_task public.tasks%rowtype; v_assignee uuid; v_version integer; v_manager boolean;
begin
  select * into v_task from public.tasks where id=p_task_id and deleted_at is null for update;
  if not found then raise exception 'Task not found.' using errcode='P0002'; end if;
  perform 1 from public.jobs j join public.job_statuses s on s.id=j.status_id where j.id=v_task.job_id and j.archived_at is null and s.code<>'COMPLETED' for update of j;
  if not found then raise exception 'Job is read-only.' using errcode='55000'; end if;
  v_manager:=private.can_manage_job(v_task.job_id,v_actor);
  if not v_manager and v_task.assignee_id is distinct from v_actor then raise exception 'Task management is not allowed.' using errcode='42501'; end if;
  if v_task.version<>p_expected_version then raise exception 'Stale Task version.' using errcode='40001'; end if;
  v_assignee:=case when v_manager then p_assignee_id else v_actor end;
  if v_assignee is not null then perform private.assert_assignable_profile(v_assignee); end if;
  if p_priority_id is not null and not exists(select 1 from public.priorities where id=p_priority_id and is_active) then raise exception 'Priority is unavailable.' using errcode='23503'; end if;
  update public.tasks set title=coalesce(nullif(btrim(p_title),''),'Untitled Task'),description=nullif(btrim(p_description),''),assignee_id=v_assignee,priority_id=p_priority_id,due_date=p_due_date,updated_by=v_actor,version=version+1 where id=p_task_id returning version into v_version;
  perform private.log_job_activity(v_task.job_id,'TASK_UPDATED',jsonb_build_object('title',v_task.title,'assignee_id',v_task.assignee_id,'priority_id',v_task.priority_id,'due_date',v_task.due_date),jsonb_build_object('title',coalesce(nullif(btrim(p_title),''),'Untitled Task'),'assignee_id',v_assignee,'priority_id',p_priority_id,'due_date',p_due_date),null,p_task_id,null,null);
  return v_version;
end; $$;


ALTER FUNCTION "public"."update_task"("p_task_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_unused_workflow_template"("p_template_id" "uuid", "p_expected_version" integer, "p_name" "text", "p_description" "text", "p_steps" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare v_actor uuid := auth.uid(); v_current integer; v_used boolean;
begin
  if not private.is_active_admin(v_actor) then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if pg_catalog.to_regclass('public.jobs') is not null then
    execute 'select exists(select 1 from public.jobs where workflow_template_id=$1)'
      into v_used using p_template_id;
    if v_used then
      raise exception 'A workflow used by a Job is immutable.' using errcode = '55000';
    end if;
  end if;
  if jsonb_typeof(p_steps) <> 'array' or jsonb_array_length(p_steps) = 0 then raise exception 'Workflow requires steps.' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(p_steps) e where btrim(coalesce(e->>'name','')) = '') then raise exception 'Every workflow step requires a name.' using errcode = '22023'; end if;

  select version into v_current from public.workflow_templates where id = p_template_id for update;
  if not found then raise exception 'Workflow not found.' using errcode = 'P0002'; end if;
  if v_current <> p_expected_version then raise exception 'Stale workflow version.' using errcode = '40001'; end if;

  delete from public.workflow_template_steps where workflow_template_id = p_template_id;
  insert into public.workflow_template_steps (workflow_template_id, name, description, position, created_by, updated_by)
  select p_template_id, btrim(e.value->>'name'), nullif(btrim(e.value->>'description'), ''), e.ordinality::integer, v_actor, v_actor
  from jsonb_array_elements(p_steps) with ordinality as e(value, ordinality);
  update public.workflow_templates set name=btrim(p_name), description=nullif(btrim(p_description),''), updated_by=v_actor, version=version+1
  where id=p_template_id returning version into v_current;
  return v_current;
end;
$_$;


ALTER FUNCTION "public"."update_unused_workflow_template"("p_template_id" "uuid", "p_expected_version" integer, "p_name" "text", "p_description" "text", "p_steps" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_access_requests" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "status" "public"."admin_access_request_status" DEFAULT 'pending'::"public"."admin_access_request_status" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "admin_access_requests_email_not_blank" CHECK (("btrim"("email") <> ''::"text")),
    CONSTRAINT "admin_access_requests_rejection_reason_length" CHECK ((("rejection_reason" IS NULL) OR ("char_length"("rejection_reason") <= 1000))),
    CONSTRAINT "admin_access_requests_review_state" CHECK (((("status" = 'pending'::"public"."admin_access_request_status") AND ("reviewed_at" IS NULL) AND ("reviewed_by" IS NULL) AND ("rejection_reason" IS NULL)) OR (("status" = 'approved'::"public"."admin_access_request_status") AND ("reviewed_at" IS NOT NULL) AND ("reviewed_by" IS NOT NULL) AND ("rejection_reason" IS NULL)) OR (("status" = 'rejected'::"public"."admin_access_request_status") AND ("reviewed_at" IS NOT NULL) AND ("reviewed_by" IS NOT NULL))))
);


ALTER TABLE "public"."admin_access_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_access_requests" IS 'One idempotent dashboard-access request per Supabase Auth user.';



CREATE TABLE IF NOT EXISTS "public"."blog_post_revisions" (
    "id" bigint NOT NULL,
    "post_id" "uuid" NOT NULL,
    "source_version" integer NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "statement_timestamp"() NOT NULL,
    CONSTRAINT "blog_post_revisions_snapshot_check" CHECK (("jsonb_typeof"("snapshot") = 'object'::"text")),
    CONSTRAINT "blog_post_revisions_source_version_check" CHECK (("source_version" > 0))
);


ALTER TABLE "public"."blog_post_revisions" OWNER TO "postgres";


ALTER TABLE "public"."blog_post_revisions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."blog_post_revisions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "address" "text",
    "notes" "text",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "clients_archive_state" CHECK (((("archived_at" IS NULL) AND ("archived_by" IS NULL)) OR (("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL)))),
    CONSTRAINT "clients_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 200))),
    CONSTRAINT "clients_type_check" CHECK (("client_type" = ANY (ARRAY['COMPANY'::"text", 'INDIVIDUAL'::"text"]))),
    CONSTRAINT "clients_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "message" "text" NOT NULL,
    "status" "public"."contact_status" DEFAULT 'new'::"public"."contact_status" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."internal_services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_template_id" "uuid",
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "summary" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "internal_services_code_format" CHECK (("code" ~ '^[A-Z][A-Z0-9_]{1,79}$'::"text")),
    CONSTRAINT "internal_services_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "internal_services_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."internal_services" OWNER TO "postgres";


COMMENT ON TABLE "public"."internal_services" IS 'Admin-only operational Service catalogue used by Jobs and SOPs; independent from public website services.';



CREATE TABLE IF NOT EXISTS "public"."job_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "task_id" "uuid",
    "job_step_id" "uuid",
    "job_update_id" "uuid",
    "actor_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_values" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "new_values" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "job_activity_logs_action_format" CHECK (("action" ~ '^[A-Z][A-Z0-9_]{2,99}$'::"text")),
    CONSTRAINT "job_activity_logs_single_target" CHECK (("num_nonnulls"("task_id", "job_step_id", "job_update_id") <= 1))
);


ALTER TABLE "public"."job_activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_activity_logs" IS 'Append-only activity written only by trusted database functions.';



CREATE TABLE IF NOT EXISTS "public"."job_contributors" (
    "job_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "added_by" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."job_contributors" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_contributors" IS 'Durable Job membership populated manually or automatically on first PIC/Task assignment.';



CREATE TABLE IF NOT EXISTS "public"."job_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "job_drive_folder_id" "uuid" NOT NULL,
    "google_file_id" "text" NOT NULL,
    "google_resource_key" "text",
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "file_size_bytes" bigint,
    "web_view_url" "text" NOT NULL,
    "source" "text" DEFAULT 'GOOGLE_DRIVE_API'::"text" NOT NULL,
    "sync_status" "text" DEFAULT 'READY'::"text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "last_synced_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_documents_archive_state" CHECK (((("archived_at" IS NULL) AND ("archived_by" IS NULL)) OR (("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL)))),
    CONSTRAINT "job_documents_file_id_not_blank" CHECK ((("char_length"("btrim"("google_file_id")) >= 1) AND ("char_length"("btrim"("google_file_id")) <= 255))),
    CONSTRAINT "job_documents_file_size_bytes_check" CHECK ((("file_size_bytes" IS NULL) OR ("file_size_bytes" >= 0))),
    CONSTRAINT "job_documents_google_url" CHECK (("web_view_url" ~* '^https://(drive|docs)\.google\.com/'::"text")),
    CONSTRAINT "job_documents_name_not_blank" CHECK ((("char_length"("btrim"("file_name")) >= 1) AND ("char_length"("btrim"("file_name")) <= 500))),
    CONSTRAINT "job_documents_source" CHECK (("source" = ANY (ARRAY['MANUAL_LINK'::"text", 'GOOGLE_DRIVE_API'::"text"]))),
    CONSTRAINT "job_documents_sync_status" CHECK (("sync_status" = ANY (ARRAY['READY'::"text", 'MISSING'::"text", 'ERROR'::"text", 'TRASHED'::"text"]))),
    CONSTRAINT "job_documents_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_documents" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_documents" IS 'Google Drive file metadata shown in Job Detail. File bytes and ACLs remain in Google Drive; authenticated users have read-only SQL access.';



COMMENT ON COLUMN "public"."job_documents"."web_view_url" IS 'Canonical Google-provided browser URL. Store the complete URL instead of reconstructing it so resource keys remain intact.';



CREATE TABLE IF NOT EXISTS "public"."job_drive_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "google_drive_id" "text" NOT NULL,
    "google_folder_id" "text" NOT NULL,
    "folder_name" "text" NOT NULL,
    "web_view_url" "text" NOT NULL,
    "connection_status" "text" DEFAULT 'READY'::"text" NOT NULL,
    "last_synced_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_drive_folders_archive_state" CHECK (((("archived_at" IS NULL) AND ("archived_by" IS NULL)) OR (("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL)))),
    CONSTRAINT "job_drive_folders_connection_status" CHECK (("connection_status" = ANY (ARRAY['PENDING'::"text", 'READY'::"text", 'ERROR'::"text", 'DISCONNECTED'::"text"]))),
    CONSTRAINT "job_drive_folders_drive_id_not_blank" CHECK ((("char_length"("btrim"("google_drive_id")) >= 1) AND ("char_length"("btrim"("google_drive_id")) <= 255))),
    CONSTRAINT "job_drive_folders_folder_id_not_blank" CHECK ((("char_length"("btrim"("google_folder_id")) >= 1) AND ("char_length"("btrim"("google_folder_id")) <= 255))),
    CONSTRAINT "job_drive_folders_google_url" CHECK (("web_view_url" ~* '^https://drive\.google\.com/'::"text")),
    CONSTRAINT "job_drive_folders_name_not_blank" CHECK ((("char_length"("btrim"("folder_name")) >= 1) AND ("char_length"("btrim"("folder_name")) <= 240))),
    CONSTRAINT "job_drive_folders_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_drive_folders" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_drive_folders" IS 'One Google Shared Drive folder mapping per Job. Google Drive remains the authority for folder permissions and capabilities.';



CREATE TABLE IF NOT EXISTS "public"."job_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "template_step_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "position" integer NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "replaced_at" timestamp with time zone,
    "replaced_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_steps_completion_state" CHECK ((("is_completed" AND ("completed_at" IS NOT NULL) AND ("completed_by" IS NOT NULL)) OR ((NOT "is_completed") AND ("completed_at" IS NULL) AND ("completed_by" IS NULL)))),
    CONSTRAINT "job_steps_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "job_steps_position_check" CHECK (("position" > 0)),
    CONSTRAINT "job_steps_replacement_state" CHECK (((("replaced_at" IS NULL) AND ("replaced_by" IS NULL)) OR (("replaced_at" IS NOT NULL) AND ("replaced_by" IS NOT NULL)))),
    CONSTRAINT "job_steps_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_steps" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_steps" IS 'Immutable-per-workflow Job step snapshots. Active rows have replaced_at IS NULL.';



CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "pic_id" "uuid" NOT NULL,
    "internal_service_id" "uuid" NOT NULL,
    "workflow_template_id" "uuid" NOT NULL,
    "priority_id" "uuid" NOT NULL,
    "status_id" "uuid" NOT NULL,
    "status_reason" "text",
    "start_date" "date",
    "estimated_end_date" "date",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "jobs_archive_state" CHECK (((("archived_at" IS NULL) AND ("archived_by" IS NULL)) OR (("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL)))),
    CONSTRAINT "jobs_date_order" CHECK ((("start_date" IS NULL) OR ("estimated_end_date" IS NULL) OR ("estimated_end_date" >= "start_date"))),
    CONSTRAINT "jobs_title_not_blank" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 240))),
    CONSTRAINT "jobs_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."jobs"."internal_service_id" IS 'Operational Service selected for the Job; this is the value labelled Internal Service in admin UI.';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "job_task_status_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "assignee_id" "uuid",
    "priority_id" "uuid",
    "due_date" "date",
    "position" bigint DEFAULT 0 NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "tasks_delete_state" CHECK (((("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "tasks_title_not_blank" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 500))),
    CONSTRAINT "tasks_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."job_overview" WITH ("security_invoker"='true') AS
 SELECT "j"."id",
    "j"."client_id",
    "j"."title",
    "j"."description",
    "j"."pic_id",
    "j"."internal_service_id",
    "j"."workflow_template_id",
    "j"."priority_id",
    "j"."status_id",
    "j"."status_reason",
    "j"."start_date",
    "j"."estimated_end_date",
    "j"."started_at",
    "j"."completed_at",
    "j"."archived_at",
    "j"."archived_by",
    "j"."created_by",
    "j"."updated_by",
    "j"."created_at",
    "j"."updated_at",
    "j"."version",
    COALESCE("step_metrics"."progress_percentage", 0) AS "progress_percentage",
    "step_metrics"."current_step_name",
        CASE
            WHEN (("j"."start_date" IS NOT NULL) AND ("j"."estimated_end_date" IS NOT NULL)) THEN ("j"."estimated_end_date" - "j"."start_date")
            ELSE NULL::integer
        END AS "estimated_duration_days",
    COALESCE("task_metrics"."task_count", 0) AS "task_count"
   FROM (("public"."jobs" "j"
     LEFT JOIN LATERAL ( SELECT (COALESCE("round"(((100.0 * ("count"(*) FILTER (WHERE "js"."is_completed"))::numeric) / (NULLIF("count"(*), 0))::numeric)), (0)::numeric))::integer AS "progress_percentage",
            ("array_agg"("js"."name" ORDER BY "js"."position") FILTER (WHERE (NOT "js"."is_completed")))[1] AS "current_step_name"
           FROM "public"."job_steps" "js"
          WHERE (("js"."job_id" = "j"."id") AND ("js"."replaced_at" IS NULL))) "step_metrics" ON (true))
     LEFT JOIN LATERAL ( SELECT ("count"(*))::integer AS "task_count"
           FROM "public"."tasks" "t"
          WHERE (("t"."job_id" = "j"."id") AND ("t"."deleted_at" IS NULL))) "task_metrics" ON (true));


ALTER VIEW "public"."job_overview" OWNER TO "postgres";


COMMENT ON VIEW "public"."job_overview" IS 'RLS-aware derived Job metrics; values are calculated, not authorization state.';



CREATE TABLE IF NOT EXISTS "public"."job_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_statuses_code_format" CHECK (("code" ~ '^[A-Z][A-Z0-9_]{1,49}$'::"text")),
    CONSTRAINT "job_statuses_color_hex" CHECK (("color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "job_statuses_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 100))),
    CONSTRAINT "job_statuses_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_task_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "task_status_id" "uuid" NOT NULL,
    "column_order" integer NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_task_statuses_column_order_check" CHECK (("column_order" > 0)),
    CONSTRAINT "job_task_statuses_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_task_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_titles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_titles_code_format" CHECK (("code" ~ '^[A-Z][A-Z0-9_]{1,79}$'::"text")),
    CONSTRAINT "job_titles_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 120))),
    CONSTRAINT "job_titles_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "job_titles_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_titles" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_titles" IS 'Ordered titles used by public team members and managed from Master Data.';



COMMENT ON COLUMN "public"."job_titles"."sort_order" IS 'Lower values appear first on the public About page.';



CREATE TABLE IF NOT EXISTS "public"."job_updates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "progress_date" "date" NOT NULL,
    "performed_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "job_updates_message_not_blank" CHECK ((("char_length"("btrim"("message")) >= 1) AND ("char_length"("btrim"("message")) <= 4000))),
    CONSTRAINT "job_updates_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."job_updates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."priorities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "priorities_code_format" CHECK (("code" ~ '^[A-Z][A-Z0-9_]{1,49}$'::"text")),
    CONSTRAINT "priorities_color_hex" CHECK (("color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "priorities_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 100))),
    CONSTRAINT "priorities_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."priorities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."role" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "profiles_display_name_length" CHECK ((("display_name" IS NULL) OR (("char_length"("btrim"("display_name")) >= 1) AND ("char_length"("btrim"("display_name")) <= 160))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_answer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "services_categories_id" "uuid",
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sort_order" bigint DEFAULT 0 NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "question_answer_answer_not_blank" CHECK ((("char_length"("btrim"("answer")) >= 1) AND ("char_length"("btrim"("answer")) <= 10000))),
    CONSTRAINT "question_answer_delete_state" CHECK (((("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "question_answer_question_not_blank" CHECK ((("char_length"("btrim"("question")) >= 1) AND ("char_length"("btrim"("question")) <= 500))),
    CONSTRAINT "question_answer_version_positive" CHECK (("version" > 0))
);


ALTER TABLE "public"."question_answer" OWNER TO "postgres";


COMMENT ON TABLE "public"."question_answer" IS 'Reserved for the future Q&A CMS. The frontend static dataset remains canonical until the admin remake is complete.';



COMMENT ON COLUMN "public"."question_answer"."services_categories_id" IS 'Null means global Q&A; otherwise scoped to the selected client-page Service category.';



COMMENT ON COLUMN "public"."question_answer"."answer" IS 'Answer content for a future managed Q&A entry.';



CREATE TABLE IF NOT EXISTS "public"."review_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_hash" "text" NOT NULL,
    "client_name" "text",
    "client_email" "text",
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid",
    "job_id" "uuid",
    "created_by" "uuid",
    "revoked_by" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    CONSTRAINT "review_requests_archive_state" CHECK (((("archived_at" IS NULL) AND ("archived_by" IS NULL)) OR (("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL)))),
    CONSTRAINT "review_requests_client_email_length" CHECK ((("client_email" IS NULL) OR ("char_length"("client_email") <= 254))),
    CONSTRAINT "review_requests_client_name_not_blank" CHECK ((("client_name" IS NULL) OR (("char_length"("btrim"("client_name")) >= 1) AND ("char_length"("btrim"("client_name")) <= 200)))),
    CONSTRAINT "review_requests_job_requires_client" CHECK ((("job_id" IS NULL) OR ("client_id" IS NOT NULL))),
    CONSTRAINT "review_requests_revoke_state" CHECK ((("revoked_at" IS NOT NULL) OR ("revoked_by" IS NULL)))
);


ALTER TABLE "public"."review_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."review_requests" IS 'one-time link review';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_request_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text",
    "message" "text" NOT NULL,
    "is_published" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "client_id" "uuid",
    "job_id" "uuid",
    "status" "public"."review_moderation_status" DEFAULT 'PENDING'::"public"."review_moderation_status" NOT NULL,
    "moderated_at" timestamp with time zone,
    "moderated_by" "uuid",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reviews_archive_state" CHECK (((("status" = 'ARCHIVED'::"public"."review_moderation_status") AND ("archived_at" IS NOT NULL) AND ("archived_by" IS NOT NULL)) OR (("status" <> 'ARCHIVED'::"public"."review_moderation_status") AND ("archived_at" IS NULL) AND ("archived_by" IS NULL)))),
    CONSTRAINT "reviews_job_requires_client" CHECK ((("job_id" IS NULL) OR ("client_id" IS NOT NULL)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "og_image" "text",
    "title" "text",
    "type" "public"."categories_type" DEFAULT 'primary'::"public"."categories_type" NOT NULL,
    "short_description" "text",
    "description" "text",
    "hero_heading" "text",
    "hero_image" "text",
    "card_image" "text",
    "card_icon_key" "text",
    "sort_order" bigint DEFAULT '0'::bigint,
    "is_published" boolean,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1 NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "services_categories_delete_state" CHECK (((("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "services_categories_version_positive" CHECK (("version" > 0))
);


ALTER TABLE "public"."services_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."services_categories" IS 'Landing/client-page service categories. This public content catalogue is independent from admin internal_services.';



COMMENT ON COLUMN "public"."services_categories"."deleted_at" IS 'Soft deletion marker for the client-page catalogue.';



CREATE TABLE IF NOT EXISTS "public"."services_item_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_item_id" "uuid" NOT NULL,
    "title" "text",
    "description" "text",
    "cta_description" "text",
    "sort_order" bigint DEFAULT '0'::bigint,
    "is_published" boolean,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "version" integer DEFAULT 1 NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "services_item_details_delete_state" CHECK (((("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "services_item_details_version_positive" CHECK (("version" > 0))
);


ALTER TABLE "public"."services_item_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."services_item_details" IS 'Diputra Signature Indonesia child services detail of their item';



CREATE TABLE IF NOT EXISTS "public"."services_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "og_image" "text",
    "title" "text",
    "description" "text",
    "icon_key" "text",
    "cta_label" "text" DEFAULT 'contact'::"text",
    "sort_order" bigint DEFAULT '0'::bigint,
    "is_published" boolean,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "cta_type" "public"."cta_type" DEFAULT 'contact'::"public"."cta_type" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "services_items_delete_state" CHECK (((("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "services_items_version_positive" CHECK (("version" > 0))
);


ALTER TABLE "public"."services_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."services_items" IS 'Diputra Signature Indonesia child services of their categories';



COMMENT ON COLUMN "public"."services_items"."icon_key" IS 'Legacy component key or public Supabase Storage URL for an SVG icon.';



CREATE TABLE IF NOT EXISTS "public"."sop_drive_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sop_id" "uuid" NOT NULL,
    "google_drive_id" "text" NOT NULL,
    "google_folder_id" "text" NOT NULL,
    "folder_name" "text" NOT NULL,
    "web_view_url" "text" NOT NULL,
    "connection_status" "text" DEFAULT 'READY'::"text" NOT NULL,
    "last_synced_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "sop_drive_folders_connection_status" CHECK (("connection_status" = ANY (ARRAY['READY'::"text", 'ERROR'::"text", 'DISCONNECTED'::"text"]))),
    CONSTRAINT "sop_drive_folders_drive_id_not_blank" CHECK ((("char_length"("btrim"("google_drive_id")) >= 1) AND ("char_length"("btrim"("google_drive_id")) <= 255))),
    CONSTRAINT "sop_drive_folders_folder_id_not_blank" CHECK ((("char_length"("btrim"("google_folder_id")) >= 1) AND ("char_length"("btrim"("google_folder_id")) <= 255))),
    CONSTRAINT "sop_drive_folders_google_url" CHECK (("web_view_url" ~* '^https://drive\.google\.com/'::"text")),
    CONSTRAINT "sop_drive_folders_name_not_blank" CHECK ((("char_length"("btrim"("folder_name")) >= 1) AND ("char_length"("btrim"("folder_name")) <= 240))),
    CONSTRAINT "sop_drive_folders_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."sop_drive_folders" OWNER TO "postgres";


COMMENT ON TABLE "public"."sop_drive_folders" IS 'One Google Shared Drive folder mapping per SOP. Google Drive owns file bytes and folder access.';



CREATE TABLE IF NOT EXISTS "public"."sop_files" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sop_id" "uuid" NOT NULL,
    "file_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "bucket_id" "text" DEFAULT 'sop-documents'::"text",
    "storage_path" "text",
    "mime_type" "text" NOT NULL,
    "size_bytes" bigint NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "upload_status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "uploaded_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "sop_drive_folder_id" "uuid",
    "storage_provider" "text" DEFAULT 'SUPABASE'::"text" NOT NULL,
    "google_file_id" "text",
    "google_resource_key" "text",
    "web_view_url" "text",
    "last_synced_at" timestamp with time zone,
    CONSTRAINT "sop_files_delete_state" CHECK (((("deleted_at" IS NULL) AND ("deleted_by" IS NULL)) OR (("deleted_at" IS NOT NULL) AND ("deleted_by" IS NOT NULL)))),
    CONSTRAINT "sop_files_name_not_blank" CHECK ((("char_length"("btrim"("original_filename")) >= 1) AND ("char_length"("btrim"("original_filename")) <= 255))),
    CONSTRAINT "sop_files_size_bytes_check" CHECK ((("size_bytes" > 0) AND ("size_bytes" <= 10485760))),
    CONSTRAINT "sop_files_status_check" CHECK (("upload_status" = ANY (ARRAY['PENDING'::"text", 'READY'::"text", 'FAILED'::"text"]))),
    CONSTRAINT "sop_files_storage_provider_check" CHECK (("storage_provider" = ANY (ARRAY['SUPABASE'::"text", 'GOOGLE_DRIVE'::"text"]))),
    CONSTRAINT "sop_files_storage_target_check" CHECK (((("storage_provider" = 'SUPABASE'::"text") AND ("bucket_id" = 'sop-documents'::"text") AND ("storage_path" IS NOT NULL) AND ("sop_drive_folder_id" IS NULL) AND ("google_file_id" IS NULL) AND ("web_view_url" IS NULL)) OR (("storage_provider" = 'GOOGLE_DRIVE'::"text") AND ("bucket_id" IS NULL) AND ("storage_path" IS NULL) AND ("sop_drive_folder_id" IS NOT NULL) AND (NULLIF("btrim"("google_file_id"), ''::"text") IS NOT NULL) AND ("web_view_url" ~* '^https://(drive|docs)\.google\.com/'::"text")))),
    CONSTRAINT "sop_files_title_not_blank" CHECK ((("char_length"("btrim"("title")) >= 1) AND ("char_length"("btrim"("title")) <= 240))),
    CONSTRAINT "sop_files_type_check" CHECK (("file_type" = ANY (ARRAY['FLOW'::"text", 'REQUIREMENT'::"text"]))),
    CONSTRAINT "sop_files_upload_state" CHECK (((("upload_status" = 'READY'::"text") AND ("uploaded_at" IS NOT NULL)) OR (("upload_status" = ANY (ARRAY['PENDING'::"text", 'FAILED'::"text"])) AND ("uploaded_at" IS NULL)))),
    CONSTRAINT "sop_files_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."sop_files" OWNER TO "postgres";


COMMENT ON TABLE "public"."sop_files" IS 'Private Storage metadata. Object upload/delete is intentionally a retryable two-phase operation.';



COMMENT ON COLUMN "public"."sop_files"."storage_provider" IS 'SUPABASE identifies pre-migration legacy files; every new SOP upload uses GOOGLE_DRIVE.';



CREATE TABLE IF NOT EXISTS "public"."sop_price_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sop_id" "uuid" NOT NULL,
    "item_name" "text" NOT NULL,
    "amount" numeric(18,2) NOT NULL,
    "currency" "text" DEFAULT 'IDR'::"text" NOT NULL,
    "notes" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "sop_price_items_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "sop_price_items_currency_check" CHECK (("currency" = 'IDR'::"text")),
    CONSTRAINT "sop_price_items_name_not_blank" CHECK ((("char_length"("btrim"("item_name")) >= 1) AND ("char_length"("btrim"("item_name")) <= 240))),
    CONSTRAINT "sop_price_items_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."sop_price_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sops" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "internal_service_id" "uuid" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "sops_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."sops" OWNER TO "postgres";


COMMENT ON TABLE "public"."sops" IS 'One directly editable internal SOP per internal service; no business draft lifecycle.';



CREATE TABLE IF NOT EXISTS "public"."task_statuses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "task_statuses_code_format" CHECK (("code" ~ '^[A-Z][A-Z0-9_]{1,49}$'::"text")),
    CONSTRAINT "task_statuses_color_hex" CHECK (("color" ~ '^#[0-9A-Fa-f]{6}$'::"text")),
    CONSTRAINT "task_statuses_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 100))),
    CONSTRAINT "task_statuses_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."task_statuses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "full_name" "text" NOT NULL,
    "short_bio" "text",
    "avatar_url" "text",
    "is_visible" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nickname" "text",
    "job_title_id" "uuid",
    CONSTRAINT "team_members_visible_requires_title" CHECK (((NOT "is_visible") OR ("job_title_id" IS NOT NULL)))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'displayed on the company''s about page';



CREATE TABLE IF NOT EXISTS "public"."workflow_template_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "position" integer NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "workflow_template_steps_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "workflow_template_steps_position_check" CHECK (("position" > 0)),
    CONSTRAINT "workflow_template_steps_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."workflow_template_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "workflow_templates_code_format" CHECK (("code" ~ '^[A-Z][A-Z0-9_]{1,79}$'::"text")),
    CONSTRAINT "workflow_templates_name_not_blank" CHECK ((("char_length"("btrim"("name")) >= 1) AND ("char_length"("btrim"("name")) <= 160))),
    CONSTRAINT "workflow_templates_version_check" CHECK (("version" > 0))
);


ALTER TABLE "public"."workflow_templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_access_requests"
    ADD CONSTRAINT "admin_access_requests_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."blog_post_revisions"
    ADD CONSTRAINT "blog_post_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_post_revisions"
    ADD CONSTRAINT "blog_post_revisions_post_id_source_version_key" UNIQUE ("post_id", "source_version");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_email_contract" CHECK ((("email" IS NOT NULL) AND (("char_length"("btrim"("email")) >= 3) AND ("char_length"("btrim"("email")) <= 254)) AND ("email" !~ '[[:cntrl:]]'::"text") AND ("email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text"))) NOT VALID;



ALTER TABLE "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_message_contract" CHECK (((("char_length"("btrim"("message")) >= 10) AND ("char_length"("btrim"("message")) <= 5000)) AND ("translate"("message", '
'::"text", ''::"text") !~ '[[:cntrl:]]'::"text"))) NOT VALID;



ALTER TABLE "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_name_contract" CHECK (((("char_length"("btrim"("name")) >= 2) AND ("char_length"("btrim"("name")) <= 100)) AND ("name" !~ '[[:cntrl:]]'::"text"))) NOT VALID;



ALTER TABLE "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_phone_contract" CHECK ((("phone" IS NOT NULL) AND (("char_length"("btrim"("phone")) >= 7) AND ("char_length"("btrim"("phone")) <= 32)) AND ("phone" !~ '[[:cntrl:]]'::"text") AND ("phone" ~ '^[0-9+(). -]+$'::"text"))) NOT VALID;



ALTER TABLE ONLY "public"."internal_services"
    ADD CONSTRAINT "internal_services_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."internal_services"
    ADD CONSTRAINT "internal_services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_activity_logs"
    ADD CONSTRAINT "job_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_contributors"
    ADD CONSTRAINT "job_contributors_pkey" PRIMARY KEY ("job_id", "profile_id");



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_job_id_id_key" UNIQUE ("job_id", "id");



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_statuses"
    ADD CONSTRAINT "job_statuses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."job_statuses"
    ADD CONSTRAINT "job_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_job_id_id_key" UNIQUE ("job_id", "id");



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_job_id_id_key" UNIQUE ("job_id", "id");



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_job_order_key" UNIQUE ("job_id", "column_order") DEFERRABLE;



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_job_status_key" UNIQUE ("job_id", "task_status_id");



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_updates"
    ADD CONSTRAINT "job_updates_job_id_id_key" UNIQUE ("job_id", "id");



ALTER TABLE ONLY "public"."job_updates"
    ADD CONSTRAINT "job_updates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_id_client_id_key" UNIQUE ("id", "client_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."priorities"
    ADD CONSTRAINT "priorities_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."priorities"
    ADD CONSTRAINT "priorities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profile_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_answer"
    ADD CONSTRAINT "question_answer_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_token_hash_key" UNIQUE ("token_hash");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services_categories"
    ADD CONSTRAINT "services_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services_categories"
    ADD CONSTRAINT "services_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."services_item_details"
    ADD CONSTRAINT "services_item_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."services_items"
    ADD CONSTRAINT "services_items_category_slug_unique" UNIQUE ("category_id", "slug");



ALTER TABLE ONLY "public"."services_items"
    ADD CONSTRAINT "services_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_google_folder_id_key" UNIQUE ("google_folder_id");



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_sop_id_id_key" UNIQUE ("sop_id", "id");



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_sop_id_key" UNIQUE ("sop_id");



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."sop_price_items"
    ADD CONSTRAINT "sop_price_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sop_price_items"
    ADD CONSTRAINT "sop_price_items_sop_order_key" UNIQUE ("sop_id", "sort_order") DEFERRABLE;



ALTER TABLE ONLY "public"."sops"
    ADD CONSTRAINT "sops_internal_service_id_key" UNIQUE ("internal_service_id");



ALTER TABLE ONLY "public"."sops"
    ADD CONSTRAINT "sops_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_job_id_id_key" UNIQUE ("job_id", "id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_template_steps"
    ADD CONSTRAINT "workflow_template_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_template_steps"
    ADD CONSTRAINT "workflow_template_steps_template_position_key" UNIQUE ("workflow_template_id", "position");



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id");



CREATE INDEX "admin_access_requests_pending_requested_at_idx" ON "public"."admin_access_requests" USING "btree" ("requested_at") WHERE ("status" = 'pending'::"public"."admin_access_request_status");



CREATE INDEX "blog_post_revisions_post_created_idx" ON "public"."blog_post_revisions" USING "btree" ("post_id", "created_at" DESC);



CREATE INDEX "blog_posts_admin_list_idx" ON "public"."blog_posts" USING "btree" ("archived_at", "status", "updated_at" DESC);



CREATE INDEX "blog_posts_created_by_idx" ON "public"."blog_posts" USING "btree" ("created_by");



CREATE INDEX "blog_posts_public_list_idx" ON "public"."blog_posts" USING "btree" ("is_featured" DESC, "published_at" DESC) WHERE (("status" = 'published'::"public"."blog_status") AND ("archived_at" IS NULL));



CREATE INDEX "clients_active_name_idx" ON "public"."clients" USING "btree" ("name", "id") WHERE ("archived_at" IS NULL);



CREATE INDEX "internal_services_name_idx" ON "public"."internal_services" USING "btree" ("name", "id");



CREATE INDEX "job_activity_logs_order_idx" ON "public"."job_activity_logs" USING "btree" ("job_id", "created_at" DESC, "id" DESC);



CREATE INDEX "job_contributors_profile_job_idx" ON "public"."job_contributors" USING "btree" ("profile_id", "job_id");



CREATE UNIQUE INDEX "job_documents_active_file_key" ON "public"."job_documents" USING "btree" ("job_id", "google_file_id") WHERE ("archived_at" IS NULL);



CREATE INDEX "job_documents_job_uploaded_idx" ON "public"."job_documents" USING "btree" ("job_id", "uploaded_at" DESC, "id") WHERE ("archived_at" IS NULL);



CREATE UNIQUE INDEX "job_steps_active_position_key" ON "public"."job_steps" USING "btree" ("job_id", "position") WHERE ("replaced_at" IS NULL);



CREATE UNIQUE INDEX "job_steps_active_template_step_key" ON "public"."job_steps" USING "btree" ("job_id", "template_step_id") WHERE ("replaced_at" IS NULL);



CREATE UNIQUE INDEX "job_titles_name_ci_key" ON "public"."job_titles" USING "btree" ("lower"("btrim"("name")));



CREATE INDEX "job_titles_order_idx" ON "public"."job_titles" USING "btree" ("sort_order", "name", "id");



CREATE INDEX "job_updates_order_idx" ON "public"."job_updates" USING "btree" ("job_id", "progress_date" DESC, "created_at" DESC, "id" DESC);



CREATE INDEX "jobs_client_created_idx" ON "public"."jobs" USING "btree" ("client_id", "created_at" DESC, "id");



CREATE INDEX "jobs_pic_status_deadline_idx" ON "public"."jobs" USING "btree" ("pic_id", "status_id", "estimated_end_date", "id");



CREATE INDEX "jobs_status_deadline_active_idx" ON "public"."jobs" USING "btree" ("status_id", "estimated_end_date", "id") WHERE ("archived_at" IS NULL);



CREATE INDEX "question_answer_public_order_idx" ON "public"."question_answer" USING "btree" ("services_categories_id", "sort_order", "created_at", "id") WHERE (("is_visible" IS TRUE) AND ("deleted_at" IS NULL));



CREATE INDEX "review_requests_management_idx" ON "public"."review_requests" USING "btree" ("created_at" DESC, "id") WHERE ("archived_at" IS NULL);



CREATE INDEX "reviews_management_idx" ON "public"."reviews" USING "btree" ("status", "is_featured" DESC, "created_at" DESC, "id") WHERE ("archived_at" IS NULL);



CREATE INDEX "reviews_public_order_idx" ON "public"."reviews" USING "btree" ("is_featured" DESC, "created_at" DESC, "id") WHERE (("status" = 'PUBLISHED'::"public"."review_moderation_status") AND ("archived_at" IS NULL));



CREATE INDEX "services_categories_admin_order_idx" ON "public"."services_categories" USING "btree" ("sort_order", "title", "id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "services_item_details_admin_order_idx" ON "public"."services_item_details" USING "btree" ("service_item_id", "sort_order", "title", "id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "services_item_details_unique_order" ON "public"."services_item_details" USING "btree" ("service_item_id", "sort_order");



CREATE INDEX "services_items_admin_order_idx" ON "public"."services_items" USING "btree" ("category_id", "sort_order", "title", "id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "sop_drive_folders_sop_idx" ON "public"."sop_drive_folders" USING "btree" ("sop_id");



CREATE INDEX "sop_files_active_order_idx" ON "public"."sop_files" USING "btree" ("sop_id", "file_type", "sort_order", "id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "sop_files_google_file_id_key" ON "public"."sop_files" USING "btree" ("google_file_id") WHERE ("google_file_id" IS NOT NULL);



CREATE UNIQUE INDEX "sop_files_one_ready_flow_idx" ON "public"."sop_files" USING "btree" ("sop_id") WHERE (("file_type" = 'FLOW'::"text") AND ("upload_status" = 'READY'::"text") AND ("deleted_at" IS NULL));



CREATE INDEX "tasks_assignee_job_active_idx" ON "public"."tasks" USING "btree" ("assignee_id", "job_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "tasks_board_active_idx" ON "public"."tasks" USING "btree" ("job_id", "job_task_status_id", "position", "id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "team_members_profile_id_key" ON "public"."team_members" USING "btree" ("profile_id") WHERE ("profile_id" IS NOT NULL);



CREATE INDEX "team_members_public_order_idx" ON "public"."team_members" USING "btree" ("job_title_id", "created_at", "id") WHERE "is_visible";



CREATE INDEX "workflow_template_steps_order_idx" ON "public"."workflow_template_steps" USING "btree" ("workflow_template_id", "position");



CREATE OR REPLACE TRIGGER "admin_access_requests_set_updated_at" BEFORE UPDATE ON "public"."admin_access_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "blog_posts_update_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "capture_blog_post_revision" AFTER INSERT OR UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "private"."capture_blog_post_revision"();



CREATE OR REPLACE TRIGGER "clients_set_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_blog_publication_readiness" BEFORE INSERT OR UPDATE OF "status", "featured_image", "cover_alt", "seo_title", "seo_description" ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "private"."enforce_blog_publication_readiness"();



CREATE OR REPLACE TRIGGER "internal_services_set_updated_at" BEFORE UPDATE ON "public"."internal_services" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_documents_set_updated_at" BEFORE UPDATE ON "public"."job_documents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_drive_folders_set_updated_at" BEFORE UPDATE ON "public"."job_drive_folders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_statuses_set_updated_at" BEFORE UPDATE ON "public"."job_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_steps_set_updated_at" BEFORE UPDATE ON "public"."job_steps" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_task_statuses_set_updated_at" BEFORE UPDATE ON "public"."job_task_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_titles_set_updated_at" BEFORE UPDATE ON "public"."job_titles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "job_updates_set_updated_at" BEFORE UPDATE ON "public"."job_updates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "jobs_set_updated_at" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "jobs_sync_pic_contributor" AFTER INSERT OR UPDATE OF "pic_id" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "private"."sync_job_contributor"();



CREATE OR REPLACE TRIGGER "priorities_set_updated_at" BEFORE UPDATE ON "public"."priorities" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_provision_team_member" AFTER INSERT OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "private"."provision_team_member_for_profile"();



CREATE OR REPLACE TRIGGER "question_answer_set_updated_at" BEFORE UPDATE ON "public"."question_answer" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "reviews_sync_legacy_state" BEFORE INSERT OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "private"."sync_review_legacy_state"();



CREATE OR REPLACE TRIGGER "services_categories_update_at" BEFORE UPDATE ON "public"."services_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "services_detail_update_at" BEFORE UPDATE ON "public"."services_item_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "services_items_update_at" BEFORE UPDATE ON "public"."services_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sop_drive_folders_set_updated_at" BEFORE UPDATE ON "public"."sop_drive_folders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sop_files_set_updated_at" BEFORE UPDATE ON "public"."sop_files" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sop_price_items_set_updated_at" BEFORE UPDATE ON "public"."sop_price_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "sops_set_updated_at" BEFORE UPDATE ON "public"."sops" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "task_statuses_set_updated_at" BEFORE UPDATE ON "public"."task_statuses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tasks_set_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tasks_sync_assignee_contributor" AFTER INSERT OR UPDATE OF "assignee_id" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "private"."sync_job_contributor"();



CREATE OR REPLACE TRIGGER "trg_set_published_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_published_at"();



CREATE OR REPLACE TRIGGER "workflow_template_steps_set_updated_at" BEFORE UPDATE ON "public"."workflow_template_steps" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workflow_templates_set_updated_at" BEFORE UPDATE ON "public"."workflow_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."admin_access_requests"
    ADD CONSTRAINT "admin_access_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."admin_access_requests"
    ADD CONSTRAINT "admin_access_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_post_revisions"
    ADD CONSTRAINT "blog_post_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."blog_post_revisions"
    ADD CONSTRAINT "blog_post_revisions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."blog_posts"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."internal_services"
    ADD CONSTRAINT "internal_services_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."internal_services"
    ADD CONSTRAINT "internal_services_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."internal_services"
    ADD CONSTRAINT "internal_services_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_activity_logs"
    ADD CONSTRAINT "job_activity_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_activity_logs"
    ADD CONSTRAINT "job_activity_logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_activity_logs"
    ADD CONSTRAINT "job_activity_logs_step_fkey" FOREIGN KEY ("job_id", "job_step_id") REFERENCES "public"."job_steps"("job_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_activity_logs"
    ADD CONSTRAINT "job_activity_logs_task_fkey" FOREIGN KEY ("job_id", "task_id") REFERENCES "public"."tasks"("job_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_activity_logs"
    ADD CONSTRAINT "job_activity_logs_update_fkey" FOREIGN KEY ("job_id", "job_update_id") REFERENCES "public"."job_updates"("job_id", "id") ON DELETE SET NULL ("job_update_id");



ALTER TABLE ONLY "public"."job_contributors"
    ADD CONSTRAINT "job_contributors_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_contributors"
    ADD CONSTRAINT "job_contributors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_contributors"
    ADD CONSTRAINT "job_contributors_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_folder_fkey" FOREIGN KEY ("job_id", "job_drive_folder_id") REFERENCES "public"."job_drive_folders"("job_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_drive_folders"
    ADD CONSTRAINT "job_drive_folders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_statuses"
    ADD CONSTRAINT "job_statuses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_statuses"
    ADD CONSTRAINT "job_statuses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_template_step_id_fkey" FOREIGN KEY ("template_step_id") REFERENCES "public"."workflow_template_steps"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_steps"
    ADD CONSTRAINT "job_steps_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_task_status_id_fkey" FOREIGN KEY ("task_status_id") REFERENCES "public"."task_statuses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_task_statuses"
    ADD CONSTRAINT "job_task_statuses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_titles"
    ADD CONSTRAINT "job_titles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_updates"
    ADD CONSTRAINT "job_updates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_updates"
    ADD CONSTRAINT "job_updates_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_updates"
    ADD CONSTRAINT "job_updates_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_updates"
    ADD CONSTRAINT "job_updates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_internal_service_id_fkey" FOREIGN KEY ("internal_service_id") REFERENCES "public"."internal_services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."job_statuses"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."priorities"
    ADD CONSTRAINT "priorities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."priorities"
    ADD CONSTRAINT "priorities_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."question_answer"
    ADD CONSTRAINT "question_answer_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."question_answer"
    ADD CONSTRAINT "question_answer_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."question_answer"
    ADD CONSTRAINT "question_answer_services_categories_id_fkey" FOREIGN KEY ("services_categories_id") REFERENCES "public"."services_categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_answer"
    ADD CONSTRAINT "question_answer_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_job_client_fkey" FOREIGN KEY ("job_id", "client_id") REFERENCES "public"."jobs"("id", "client_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_job_client_fkey" FOREIGN KEY ("job_id", "client_id") REFERENCES "public"."jobs"("id", "client_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_moderated_by_fkey" FOREIGN KEY ("moderated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "public"."review_requests"("id");



ALTER TABLE ONLY "public"."services_categories"
    ADD CONSTRAINT "services_categories_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."services_item_details"
    ADD CONSTRAINT "services_item_details_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."services_item_details"
    ADD CONSTRAINT "services_item_details_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "public"."services_items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_items"
    ADD CONSTRAINT "services_items_category_id_fkey1" FOREIGN KEY ("category_id") REFERENCES "public"."services_categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_items"
    ADD CONSTRAINT "services_items_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "public"."sops"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_drive_folders"
    ADD CONSTRAINT "sop_drive_folders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_drive_folder_fkey" FOREIGN KEY ("sop_id", "sop_drive_folder_id") REFERENCES "public"."sop_drive_folders"("sop_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "public"."sops"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_files"
    ADD CONSTRAINT "sop_files_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_price_items"
    ADD CONSTRAINT "sop_price_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_price_items"
    ADD CONSTRAINT "sop_price_items_sop_id_fkey" FOREIGN KEY ("sop_id") REFERENCES "public"."sops"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sop_price_items"
    ADD CONSTRAINT "sop_price_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sops"
    ADD CONSTRAINT "sops_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sops"
    ADD CONSTRAINT "sops_internal_service_id_fkey" FOREIGN KEY ("internal_service_id") REFERENCES "public"."internal_services"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sops"
    ADD CONSTRAINT "sops_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."task_statuses"
    ADD CONSTRAINT "task_statuses_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_job_status_fkey" FOREIGN KEY ("job_id", "job_task_status_id") REFERENCES "public"."job_task_statuses"("job_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "public"."priorities"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_job_title_id_fkey" FOREIGN KEY ("job_title_id") REFERENCES "public"."job_titles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_template_steps"
    ADD CONSTRAINT "workflow_template_steps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workflow_template_steps"
    ADD CONSTRAINT "workflow_template_steps_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workflow_template_steps"
    ADD CONSTRAINT "workflow_template_steps_workflow_template_id_fkey" FOREIGN KEY ("workflow_template_id") REFERENCES "public"."workflow_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workflow_templates"
    ADD CONSTRAINT "workflow_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



CREATE POLICY "Active admins manage team" ON "public"."team_members" TO "authenticated" USING ("public"."is_admin_role"()) WITH CHECK ("public"."is_admin_role"());



CREATE POLICY "Active admins read all SOP file states" ON "public"."sop_files" FOR SELECT TO "authenticated" USING ("public"."is_admin_role"());



CREATE POLICY "Active admins read all public service details" ON "public"."services_item_details" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() AND ("deleted_at" IS NULL)));



CREATE POLICY "Active admins read all public service items" ON "public"."services_items" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() AND ("deleted_at" IS NULL)));



CREATE POLICY "Active admins read all service categories" ON "public"."services_categories" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() AND ("deleted_at" IS NULL)));



CREATE POLICY "Active admins read archived Job Drive folders" ON "public"."job_drive_folders" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() AND ("archived_at" IS NOT NULL)));



CREATE POLICY "Active admins read archived Job documents" ON "public"."job_documents" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() AND ("archived_at" IS NOT NULL)));



CREATE POLICY "Active admins read archived blog posts" ON "public"."blog_posts" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() AND ("archived_at" IS NOT NULL)));



CREATE POLICY "Active admins read profiles for team management" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_admin_role"());



CREATE POLICY "Active staff read Job contributors" ON "public"."job_contributors" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read SOP Drive folders" ON "public"."sop_drive_folders" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read SOP prices" ON "public"."sop_price_items" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read SOPs" ON "public"."sops" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read active Job Drive folders" ON "public"."job_drive_folders" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND ("archived_at" IS NULL)));



CREATE POLICY "Active staff read active Job documents" ON "public"."job_documents" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND ("archived_at" IS NULL)));



CREATE POLICY "Active staff read active blog posts" ON "public"."blog_posts" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND ("archived_at" IS NULL)));



CREATE POLICY "Active staff read active tasks" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND ("deleted_at" IS NULL)));



CREATE POLICY "Active staff read all Q&A" ON "public"."question_answer" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND ("deleted_at" IS NULL)));



CREATE POLICY "Active staff read all job titles" ON "public"."job_titles" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read all reviews" ON "public"."reviews" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read blog revisions" ON "public"."blog_post_revisions" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read internal services" ON "public"."internal_services" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read job statuses" ON "public"."job_statuses" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read job steps" ON "public"."job_steps" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read job task statuses" ON "public"."job_task_statuses" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read job updates" ON "public"."job_updates" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read jobs" ON "public"."jobs" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND (("archived_at" IS NULL) OR "public"."is_admin_role"())));



CREATE POLICY "Active staff read priorities" ON "public"."priorities" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read ready SOP files" ON "public"."sop_files" FOR SELECT TO "authenticated" USING (("public"."is_staff_role"() AND ("upload_status" = 'READY'::"text") AND ("deleted_at" IS NULL)));



CREATE POLICY "Active staff read relevant clients" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."is_admin_role"() OR ("public"."is_staff_role"() AND (EXISTS ( SELECT 1
   FROM "public"."jobs" "j"
  WHERE ("j"."client_id" = "clients"."id"))))));



CREATE POLICY "Active staff read review requests" ON "public"."review_requests" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read task statuses" ON "public"."task_statuses" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read workflow steps" ON "public"."workflow_template_steps" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active staff read workflow templates" ON "public"."workflow_templates" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "Active super admins read access requests" ON "public"."admin_access_requests" FOR SELECT TO "authenticated" USING ("public"."is_active_super_admin"());



CREATE POLICY "Active super admins read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ("public"."is_active_super_admin"());



CREATE POLICY "Public read active job titles" ON "public"."job_titles" FOR SELECT TO "authenticated", "anon" USING ("is_active");



CREATE POLICY "Public read published active blog posts" ON "public"."blog_posts" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'published'::"public"."blog_status") AND ("archived_at" IS NULL)));



CREATE POLICY "Public read published non-archived reviews" ON "public"."reviews" FOR SELECT TO "authenticated", "anon" USING ((("status" = 'PUBLISHED'::"public"."review_moderation_status") AND ("archived_at" IS NULL)));



CREATE POLICY "Public read visible Q&A" ON "public"."question_answer" FOR SELECT TO "authenticated", "anon" USING ((("is_visible" IS TRUE) AND ("deleted_at" IS NULL) AND (("services_categories_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."services_categories" "category"
  WHERE (("category"."id" = "question_answer"."services_categories_id") AND ("category"."is_published" IS TRUE) AND ("category"."deleted_at" IS NULL)))))));



CREATE POLICY "Public select visible team" ON "public"."team_members" FOR SELECT TO "authenticated", "anon" USING (("is_visible" = true));



CREATE POLICY "Read Team by Profile Account" ON "public"."team_members" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Select Own Profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users read own access request" ON "public"."admin_access_requests" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."admin_access_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_post_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_messages_delete_admin" ON "public"."contact_messages" FOR DELETE TO "authenticated" USING ("public"."is_admin_role"());



CREATE POLICY "contact_messages_select_staff" ON "public"."contact_messages" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "contact_messages_update_staff" ON "public"."contact_messages" FOR UPDATE TO "authenticated" USING ("public"."is_staff_role"()) WITH CHECK ("public"."is_staff_role"());



ALTER TABLE "public"."internal_services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_contributors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_drive_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_task_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_titles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_updates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."priorities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public read published categories" ON "public"."services_categories" FOR SELECT TO "authenticated", "anon" USING ((("is_published" IS TRUE) AND ("deleted_at" IS NULL)));



CREATE POLICY "public read published services item details" ON "public"."services_item_details" FOR SELECT TO "authenticated", "anon" USING ((("is_published" IS TRUE) AND ("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."services_items" "item"
     JOIN "public"."services_categories" "category" ON (("category"."id" = "item"."category_id")))
  WHERE (("item"."id" = "services_item_details"."service_item_id") AND ("item"."is_published" IS TRUE) AND ("item"."deleted_at" IS NULL) AND ("category"."is_published" IS TRUE) AND ("category"."deleted_at" IS NULL))))));



CREATE POLICY "public read published services items" ON "public"."services_items" FOR SELECT TO "authenticated", "anon" USING ((("is_published" IS TRUE) AND ("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."services_categories" "category"
  WHERE (("category"."id" = "services_items"."category_id") AND ("category"."is_published" IS TRUE) AND ("category"."deleted_at" IS NULL))))));



ALTER TABLE "public"."question_answer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_item_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sop_drive_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sop_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sop_price_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sops" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_statuses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_template_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_templates" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


-- Clear platform-inherited table ACLs before restoring exact remote grants.
-- Otherwise local globals can retain TRUNCATE/REFERENCES/TRIGGER/MAINTAIN.
REVOKE ALL ON ALL TABLES IN SCHEMA "public", "private" FROM "anon", "authenticated", "service_role";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "private"."assert_assignable_profile"("p_profile_id" "uuid") FROM PUBLIC;



GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";
GRANT SELECT ON TABLE "public"."blog_posts" TO "anon";
GRANT SELECT ON TABLE "public"."blog_posts" TO "authenticated";



REVOKE ALL ON FUNCTION "private"."blog_slug_base"("p_title" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."can_manage_job"("p_job_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."delete_job_graph"("p_job_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_active_admin"("p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_active_staff"("p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."is_active_super_admin"("p_user_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."log_job_activity"("p_job_id" "uuid", "p_action" "text", "p_old_values" "jsonb", "p_new_values" "jsonb", "p_reason" "text", "p_task_id" "uuid", "p_job_step_id" "uuid", "p_job_update_id" "uuid") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."normalized_blog_tags"("p_tags" "text"[]) FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."sync_job_contributor"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."sync_review_legacy_state"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."validate_blog_payload"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_category" "text", "p_seo_title" "text", "p_seo_description" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."add_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_admin_access_request"("p_user_id" "uuid", "p_role" "public"."role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_admin_access_request"("p_user_id" "uuid", "p_role" "public"."role") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."archive_blog_post"("p_post_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_blog_post"("p_post_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_blog_post"("p_post_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_client"("p_client_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_job"("p_job_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_job"("p_job_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_job_document"("p_document_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_job_document"("p_document_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_job_document"("p_document_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_review"("p_review_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_review"("p_review_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_review"("p_review_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_review_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_review_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_review_request"("p_request_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_sop_file"("p_file_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_sop_file"("p_file_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_sop_file"("p_file_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."change_job_status"("p_job_id" "uuid", "p_expected_version" integer, "p_status_code" "text", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."change_job_status"("p_job_id" "uuid", "p_expected_version" integer, "p_status_code" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_job_status"("p_job_id" "uuid", "p_expected_version" integer, "p_status_code" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."configure_job_task_statuses"("p_job_id" "uuid", "p_statuses" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."configure_job_task_statuses"("p_job_id" "uuid", "p_statuses" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."configure_job_task_statuses"("p_job_id" "uuid", "p_statuses" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_blog_post"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_blog_post"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_blog_post"("p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_client"("p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_client"("p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_client"("p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_job"("p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_job"("p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job"("p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_job_update"("p_job_id" "uuid", "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_job_update"("p_job_id" "uuid", "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job_update"("p_job_id" "uuid", "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_job_with_client"("p_client_type" "text", "p_client_name" "text", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_job_with_client"("p_client_type" "text", "p_client_name" "text", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job_with_client"("p_client_type" "text", "p_client_name" "text", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_pic_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_review_request"("p_client_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_job_id" "uuid", "p_expires_in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_review_request"("p_client_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_job_id" "uuid", "p_expires_in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_review_request"("p_client_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_job_id" "uuid", "p_expires_in_days" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_task"("p_job_id" "uuid", "p_job_task_status_id" "uuid", "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_task"("p_job_id" "uuid", "p_job_task_status_id" "uuid", "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_task"("p_job_id" "uuid", "p_job_task_status_id" "uuid", "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_workflow_template"("p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_workflow_template"("p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workflow_template"("p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_job_permanently"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_job_permanently"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_job_permanently"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_job_update"("p_update_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_job_update"("p_update_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_job_update"("p_update_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_public_service_category"("p_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_public_service_category"("p_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_public_service_category"("p_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_public_service_detail"("p_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_public_service_detail"("p_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_public_service_detail"("p_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_public_service_item"("p_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_public_service_item"("p_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_public_service_item"("p_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_question_answer"("p_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_question_answer"("p_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_question_answer"("p_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_rejected_admin_access_request"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_rejected_admin_access_request"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_rejected_admin_access_request"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_task"("p_task_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_task"("p_task_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_task"("p_task_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_admin_access_request"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_admin_access_request"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_active_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_super_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_admin_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_role"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_staff"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_staff"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_staff_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_staff_role"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."list_active_clients_for_job"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_active_clients_for_job"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_active_clients_for_job"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_assignable_profiles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_assignable_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_assignable_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_job_activity"("p_job_id" "uuid", "p_limit" integer, "p_before" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_job_activity"("p_job_id" "uuid", "p_limit" integer, "p_before" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_job_activity"("p_job_id" "uuid", "p_limit" integer, "p_before" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_pending_admin_access_requests"("p_search" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_pending_admin_access_requests"("p_search" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_pending_admin_access_requests"("p_search" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_question_answer_categories"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_question_answer_categories"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_question_answer_categories"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_rejected_admin_access_requests"("p_search" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_rejected_admin_access_requests"("p_search" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_rejected_admin_access_requests"("p_search" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_visible_team_members"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_visible_team_members"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_visible_team_members"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_visible_team_members"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."moderate_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_status" "public"."blog_status", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."moderate_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_status" "public"."blog_status", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."moderate_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_status" "public"."blog_status", "p_rejection_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_status" "public"."review_moderation_status", "p_is_featured" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_status" "public"."review_moderation_status", "p_is_featured" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."moderate_review"("p_review_id" "uuid", "p_status" "public"."review_moderation_status", "p_is_featured" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."move_task"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_position" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."move_task"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_position" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_task"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_position" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."place_task_on_board"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_before_task_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."place_task_on_board"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_before_task_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."place_task_on_board"("p_task_id" "uuid", "p_expected_version" integer, "p_job_task_status_id" "uuid", "p_before_task_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."purge_expired_job"("p_job_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."purge_expired_job"("p_job_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_admin_access_request"("p_user_id" "uuid", "p_rejection_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_admin_access_request"("p_user_id" "uuid", "p_rejection_reason" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."remove_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_job_contributor"("p_job_id" "uuid", "p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reopen_job"("p_job_id" "uuid", "p_expected_version" integer, "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reopen_job"("p_job_id" "uuid", "p_expected_version" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reopen_job"("p_job_id" "uuid", "p_expected_version" integer, "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reorder_question_answers"("p_services_categories_id" "uuid", "p_ordered_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reorder_question_answers"("p_services_categories_id" "uuid", "p_ordered_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_question_answers"("p_services_categories_id" "uuid", "p_ordered_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_blog_post"("p_post_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_blog_post"("p_post_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_blog_post"("p_post_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_blog_post_revision"("p_post_id" "uuid", "p_revision_id" bigint, "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_blog_post_revision"("p_post_id" "uuid", "p_revision_id" bigint, "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_blog_post_revision"("p_post_id" "uuid", "p_revision_id" bigint, "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_job"("p_job_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_job"("p_job_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_job"("p_job_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_profile"("p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_profile"("p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."revert_last_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revert_last_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."revert_last_job_step"("p_job_step_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."revoke_review_request"("p_request_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."revoke_review_request"("p_request_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_review_request"("p_request_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_internal_service"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_summary" "text", "p_workflow_template_id" "uuid", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_internal_service"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_summary" "text", "p_workflow_template_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_internal_service"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_summary" "text", "p_workflow_template_id" "uuid", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_job_document_metadata"("p_job_id" "uuid", "p_job_drive_folder_id" "uuid", "p_google_file_id" "text", "p_google_resource_key" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size_bytes" bigint, "p_web_view_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_job_document_metadata"("p_job_id" "uuid", "p_job_drive_folder_id" "uuid", "p_google_file_id" "text", "p_google_resource_key" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size_bytes" bigint, "p_web_view_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_job_document_metadata"("p_job_id" "uuid", "p_job_drive_folder_id" "uuid", "p_google_file_id" "text", "p_google_resource_key" "text", "p_file_name" "text", "p_mime_type" "text", "p_file_size_bytes" bigint, "p_web_view_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_job_drive_folder"("p_job_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_job_drive_folder"("p_job_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_job_drive_folder"("p_job_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_job_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_job_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_job_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_job_title"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_sort_order" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_job_title"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_sort_order" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_job_title"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_sort_order" integer, "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_priority"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_priority"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_priority"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_public_service_category"("p_id" "uuid", "p_expected_version" integer, "p_slug" "text", "p_title" "text", "p_type" "public"."categories_type", "p_short_description" "text", "p_description" "text", "p_hero_heading" "text", "p_hero_image" "text", "p_card_image" "text", "p_card_icon_key" "text", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_public_service_category"("p_id" "uuid", "p_expected_version" integer, "p_slug" "text", "p_title" "text", "p_type" "public"."categories_type", "p_short_description" "text", "p_description" "text", "p_hero_heading" "text", "p_hero_image" "text", "p_card_image" "text", "p_card_icon_key" "text", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_public_service_category"("p_id" "uuid", "p_expected_version" integer, "p_slug" "text", "p_title" "text", "p_type" "public"."categories_type", "p_short_description" "text", "p_description" "text", "p_hero_heading" "text", "p_hero_image" "text", "p_card_image" "text", "p_card_icon_key" "text", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_public_service_detail"("p_id" "uuid", "p_expected_version" integer, "p_service_item_id" "uuid", "p_title" "text", "p_description" "text", "p_cta_description" "text", "p_sort_order" bigint, "p_is_published" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_public_service_detail"("p_id" "uuid", "p_expected_version" integer, "p_service_item_id" "uuid", "p_title" "text", "p_description" "text", "p_cta_description" "text", "p_sort_order" bigint, "p_is_published" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_public_service_detail"("p_id" "uuid", "p_expected_version" integer, "p_service_item_id" "uuid", "p_title" "text", "p_description" "text", "p_cta_description" "text", "p_sort_order" bigint, "p_is_published" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_public_service_item"("p_id" "uuid", "p_expected_version" integer, "p_category_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_icon_key" "text", "p_cta_label" "text", "p_cta_type" "public"."cta_type", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_public_service_item"("p_id" "uuid", "p_expected_version" integer, "p_category_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_icon_key" "text", "p_cta_label" "text", "p_cta_type" "public"."cta_type", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_public_service_item"("p_id" "uuid", "p_expected_version" integer, "p_category_id" "uuid", "p_slug" "text", "p_title" "text", "p_description" "text", "p_icon_key" "text", "p_cta_label" "text", "p_cta_type" "public"."cta_type", "p_seo_title" "text", "p_seo_description" "text", "p_og_image" "text", "p_sort_order" bigint, "p_is_published" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_question_answer"("p_id" "uuid", "p_expected_version" integer, "p_question" "text", "p_answer" "text", "p_services_categories_id" "uuid", "p_is_visible" boolean, "p_sort_order" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_question_answer"("p_id" "uuid", "p_expected_version" integer, "p_question" "text", "p_answer" "text", "p_services_categories_id" "uuid", "p_is_visible" boolean, "p_sort_order" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_question_answer"("p_id" "uuid", "p_expected_version" integer, "p_question" "text", "p_answer" "text", "p_services_categories_id" "uuid", "p_is_visible" boolean, "p_sort_order" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_sop"("p_internal_service_id" "uuid", "p_description" "text", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_sop"("p_internal_service_id" "uuid", "p_description" "text", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_sop"("p_internal_service_id" "uuid", "p_description" "text", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_sop_drive_file_metadata"("p_sop_id" "uuid", "p_sop_drive_folder_id" "uuid", "p_file_type" "text", "p_title" "text", "p_original_filename" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_sort_order" integer, "p_google_file_id" "text", "p_google_resource_key" "text", "p_web_view_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_sop_drive_file_metadata"("p_sop_id" "uuid", "p_sop_drive_folder_id" "uuid", "p_file_type" "text", "p_title" "text", "p_original_filename" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_sort_order" integer, "p_google_file_id" "text", "p_google_resource_key" "text", "p_web_view_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_sop_drive_file_metadata"("p_sop_id" "uuid", "p_sop_drive_folder_id" "uuid", "p_file_type" "text", "p_title" "text", "p_original_filename" "text", "p_mime_type" "text", "p_size_bytes" bigint, "p_sort_order" integer, "p_google_file_id" "text", "p_google_resource_key" "text", "p_web_view_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_sop_drive_folder"("p_sop_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_sop_drive_folder"("p_sop_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_sop_drive_folder"("p_sop_id" "uuid", "p_google_drive_id" "text", "p_google_folder_id" "text", "p_folder_name" "text", "p_web_view_url" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_sop_price_items"("p_sop_id" "uuid", "p_sop_expected_version" integer, "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_sop_price_items"("p_sop_id" "uuid", "p_sop_expected_version" integer, "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_sop_price_items"("p_sop_id" "uuid", "p_sop_expected_version" integer, "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_task_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_task_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_task_status"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_color" "text", "p_sort_order" integer, "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_team_member_profile"("p_profile_id" "uuid", "p_full_name" "text", "p_job_title_id" "uuid", "p_avatar_url" "text", "p_short_bio" "text", "p_is_visible" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_team_member_profile"("p_profile_id" "uuid", "p_full_name" "text", "p_job_title_id" "uuid", "p_avatar_url" "text", "p_short_bio" "text", "p_is_visible" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_team_member_profile"("p_profile_id" "uuid", "p_full_name" "text", "p_job_title_id" "uuid", "p_avatar_url" "text", "p_short_bio" "text", "p_is_visible" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_workflow_template"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_workflow_template"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_workflow_template"("p_id" "uuid", "p_expected_version" integer, "p_code" "text", "p_name" "text", "p_description" "text", "p_steps" "jsonb", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_job_access_profiles"("p_job_id" "uuid", "p_search" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_job_access_profiles"("p_job_id" "uuid", "p_search" "text", "p_limit" integer) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_blog_post_featured"("p_post_id" "uuid", "p_expected_version" integer, "p_is_featured" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_blog_post_featured"("p_post_id" "uuid", "p_expected_version" integer, "p_is_featured" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_blog_post_featured"("p_post_id" "uuid", "p_expected_version" integer, "p_is_featured" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_master_data_active"("p_entity" "text", "p_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_master_data_active"("p_entity" "text", "p_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_master_data_active"("p_entity" "text", "p_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_profile_active"("p_profile_id" "uuid", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_profile_active"("p_profile_id" "uuid", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profile_active"("p_profile_id" "uuid", "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_profile_role"("p_profile_id" "uuid", "p_role" "public"."role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_profile_role"("p_profile_id" "uuid", "p_role" "public"."role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_profile_role"("p_profile_id" "uuid", "p_role" "public"."role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_published_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."set_workflow_active"("p_template_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_workflow_active"("p_template_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_workflow_active"("p_template_id" "uuid", "p_expected_version" integer, "p_is_active" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."soft_delete_profile"("p_profile_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."soft_delete_profile"("p_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_profile"("p_profile_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_blog_post_for_review"("p_post_id" "uuid", "p_expected_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_blog_post_for_review"("p_post_id" "uuid", "p_expected_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_blog_post_for_review"("p_post_id" "uuid", "p_expected_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_own_profile_identity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_own_profile_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_own_profile_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trash_job"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trash_job"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."trash_job"("p_job_id" "uuid", "p_expected_version" integer, "p_confirmation" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_blog_post"("p_post_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_excerpt" "text", "p_content_html" "text", "p_reading_time_min" integer, "p_featured_image" "text", "p_cover_alt" "text", "p_category" "text", "p_tags" "text"[], "p_seo_title" "text", "p_seo_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_expected_version" integer, "p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_expected_version" integer, "p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client"("p_client_id" "uuid", "p_expected_version" integer, "p_client_type" "text", "p_name" "text", "p_contact_person" "text", "p_email" "text", "p_phone" "text", "p_address" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_job"("p_job_id" "uuid", "p_expected_version" integer, "p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date", "p_pic_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_job"("p_job_id" "uuid", "p_expected_version" integer, "p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date", "p_pic_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job"("p_job_id" "uuid", "p_expected_version" integer, "p_client_id" "uuid", "p_title" "text", "p_internal_service_id" "uuid", "p_priority_id" "uuid", "p_description" "text", "p_start_date" "date", "p_estimated_end_date" "date", "p_pic_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_job_update"("p_update_id" "uuid", "p_expected_version" integer, "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_job_update"("p_update_id" "uuid", "p_expected_version" integer, "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_update"("p_update_id" "uuid", "p_expected_version" integer, "p_message" "text", "p_progress_date" "date", "p_performed_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_task"("p_task_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_task"("p_task_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_task"("p_task_id" "uuid", "p_expected_version" integer, "p_title" "text", "p_description" "text", "p_assignee_id" "uuid", "p_priority_id" "uuid", "p_due_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_unused_workflow_template"("p_template_id" "uuid", "p_expected_version" integer, "p_name" "text", "p_description" "text", "p_steps" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_unused_workflow_template"("p_template_id" "uuid", "p_expected_version" integer, "p_name" "text", "p_description" "text", "p_steps" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_unused_workflow_template"("p_template_id" "uuid", "p_expected_version" integer, "p_name" "text", "p_description" "text", "p_steps" "jsonb") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_access_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."admin_access_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."blog_post_revisions" TO "service_role";
GRANT SELECT ON TABLE "public"."blog_post_revisions" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."blog_post_revisions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."blog_post_revisions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."blog_post_revisions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "service_role";
GRANT SELECT ON TABLE "public"."clients" TO "authenticated";



GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."contact_messages" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."internal_services" TO "service_role";
GRANT SELECT ON TABLE "public"."internal_services" TO "authenticated";



GRANT ALL ON TABLE "public"."job_activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."job_contributors" TO "service_role";
GRANT SELECT ON TABLE "public"."job_contributors" TO "authenticated";



GRANT ALL ON TABLE "public"."job_documents" TO "service_role";
GRANT SELECT ON TABLE "public"."job_documents" TO "authenticated";



GRANT ALL ON TABLE "public"."job_drive_folders" TO "service_role";
GRANT SELECT ON TABLE "public"."job_drive_folders" TO "authenticated";



GRANT ALL ON TABLE "public"."job_steps" TO "service_role";
GRANT SELECT ON TABLE "public"."job_steps" TO "authenticated";



GRANT ALL ON TABLE "public"."jobs" TO "service_role";
GRANT SELECT ON TABLE "public"."jobs" TO "authenticated";



GRANT ALL ON TABLE "public"."tasks" TO "service_role";
GRANT SELECT ON TABLE "public"."tasks" TO "authenticated";



GRANT ALL ON TABLE "public"."job_overview" TO "service_role";
GRANT SELECT ON TABLE "public"."job_overview" TO "authenticated";



GRANT ALL ON TABLE "public"."job_statuses" TO "service_role";
GRANT SELECT ON TABLE "public"."job_statuses" TO "authenticated";



GRANT ALL ON TABLE "public"."job_task_statuses" TO "service_role";
GRANT SELECT ON TABLE "public"."job_task_statuses" TO "authenticated";



GRANT ALL ON TABLE "public"."job_titles" TO "service_role";
GRANT SELECT ON TABLE "public"."job_titles" TO "anon";
GRANT SELECT ON TABLE "public"."job_titles" TO "authenticated";



GRANT ALL ON TABLE "public"."job_updates" TO "service_role";
GRANT SELECT ON TABLE "public"."job_updates" TO "authenticated";



GRANT ALL ON TABLE "public"."priorities" TO "service_role";
GRANT SELECT ON TABLE "public"."priorities" TO "authenticated";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



GRANT ALL ON TABLE "public"."question_answer" TO "service_role";
GRANT SELECT ON TABLE "public"."question_answer" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."question_answer" TO "authenticated";



GRANT ALL ON TABLE "public"."review_requests" TO "anon";
GRANT ALL ON TABLE "public"."review_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."review_requests" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."services_categories" TO "service_role";
GRANT SELECT ON TABLE "public"."services_categories" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."services_categories" TO "authenticated";



GRANT ALL ON TABLE "public"."services_item_details" TO "service_role";
GRANT SELECT ON TABLE "public"."services_item_details" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."services_item_details" TO "authenticated";



GRANT ALL ON TABLE "public"."services_items" TO "service_role";
GRANT SELECT ON TABLE "public"."services_items" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."services_items" TO "authenticated";



GRANT ALL ON TABLE "public"."sop_drive_folders" TO "service_role";
GRANT SELECT ON TABLE "public"."sop_drive_folders" TO "authenticated";



GRANT ALL ON TABLE "public"."sop_files" TO "service_role";
GRANT SELECT ON TABLE "public"."sop_files" TO "authenticated";



GRANT ALL ON TABLE "public"."sop_price_items" TO "service_role";
GRANT SELECT ON TABLE "public"."sop_price_items" TO "authenticated";



GRANT ALL ON TABLE "public"."sops" TO "service_role";
GRANT SELECT ON TABLE "public"."sops" TO "authenticated";



GRANT ALL ON TABLE "public"."task_statuses" TO "service_role";
GRANT SELECT ON TABLE "public"."task_statuses" TO "authenticated";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_template_steps" TO "service_role";
GRANT SELECT ON TABLE "public"."workflow_template_steps" TO "authenticated";



GRANT ALL ON TABLE "public"."workflow_templates" TO "service_role";
GRANT SELECT ON TABLE "public"."workflow_templates" TO "authenticated";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

-- Application Storage policies (not Supabase-managed DDL).
CREATE POLICY "Active admins delete all blog images" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND "public"."is_admin_role"() AND (("name" ~~ 'blog/%'::"text") OR ("name" ~~ 'blog_cover/%'::"text"))));

CREATE POLICY "Active admins delete managed team photos" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'team_profile'::"text") AND "public"."is_admin_role"() AND ("name" ~~ 'profiles/%'::"text")));

CREATE POLICY "Active admins delete public service assets" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND "public"."is_admin_role"() AND ("name" ~~ 'services/%'::"text")));

CREATE POLICY "Active admins read all blog images" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND "public"."is_admin_role"() AND (("name" ~~ 'blog/%'::"text") OR ("name" ~~ 'blog_cover/%'::"text"))));

CREATE POLICY "Active admins read managed team photos" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'team_profile'::"text") AND "public"."is_admin_role"() AND ("name" ~~ 'profiles/%'::"text")));

CREATE POLICY "Active admins read public service assets" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND "public"."is_admin_role"() AND ("name" ~~ 'services/%'::"text")));

CREATE POLICY "Active admins upload managed team photos" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'team_profile'::"text") AND "public"."is_admin_role"() AND ("owner_id" = ("auth"."uid"())::"text") AND ("name" ~ '^profiles/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'::"text")));

CREATE POLICY "Active admins upload public service assets" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'images'::"text") AND "public"."is_admin_role"() AND ("owner_id" = ("auth"."uid"())::"text") AND (("name" ~ '^services/categories/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'::"text") OR ("name" ~ '^services/items/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$'::"text"))));

CREATE POLICY "Active staff delete unreferenced owned blog images" ON "storage"."objects" FOR DELETE TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND "public"."is_staff_role"() AND ("owner_id" = ("auth"."uid"())::"text") AND (("name" ~~ 'blog/%'::"text") OR ("name" ~~ 'blog_cover/%'::"text")) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."blog_posts" "post"
  WHERE ((POSITION((('/storage/v1/object/public/images/'::"text" || "objects"."name")) IN (COALESCE("post"."featured_image", ''::"text"))) > 0) OR (POSITION((('/storage/v1/object/public/images/'::"text" || "objects"."name")) IN (COALESCE("post"."og_image", ''::"text"))) > 0) OR (POSITION((('/storage/v1/object/public/images/'::"text" || "objects"."name")) IN (COALESCE("post"."content_md", ''::"text"))) > 0)))))));

CREATE POLICY "Active staff read owned blog images" ON "storage"."objects" FOR SELECT TO "authenticated" USING ((("bucket_id" = 'images'::"text") AND "public"."is_staff_role"() AND ("owner_id" = ("auth"."uid"())::"text") AND (("name" ~~ 'blog/%'::"text") OR ("name" ~~ 'blog_cover/%'::"text"))));

CREATE POLICY "Active staff upload immutable blog images" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK ((("bucket_id" = 'images'::"text") AND "public"."is_staff_role"() AND ("owner_id" = ("auth"."uid"())::"text") AND ("name" ~ '^(blog|blog_cover)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'::"text")));

-- Storage configuration and non-personal system/reference records.
INSERT INTO "storage"."buckets" ("allowed_mime_types","file_size_limit","id","name","public") VALUES
(ARRAY['image/jpeg','image/png','image/webp','image/svg+xml']::text[],5242880,'images','images',true),
(ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[],10485760,'sop-documents','sop-documents',false),
(ARRAY['image/jpeg','image/png','image/webp']::text[],1048576,'team_profile','team_profile',true);
INSERT INTO "public"."priorities" ("code","color","id","is_active","is_system","name","sort_order") VALUES
('HIGH','#EF4444','21000000-0000-4000-8000-000000000001',true,true,'High',10),
('MEDIUM','#EAB308','21000000-0000-4000-8000-000000000002',true,true,'Medium',20),
('LOW','#64748B','21000000-0000-4000-8000-000000000003',true,true,'Low',30);

INSERT INTO "public"."job_statuses" ("code","color","id","is_active","is_system","name","sort_order") VALUES
('NOT_STARTED','#94A3B8','22000000-0000-4000-8000-000000000001',true,true,'Not Started',10),
('IN_PROGRESS','#EAB308','22000000-0000-4000-8000-000000000002',true,true,'In Progress',20),
('ON_HOLD','#2563EB','22000000-0000-4000-8000-000000000003',true,true,'On Hold',30),
('OBSTACLE','#F97316','22000000-0000-4000-8000-000000000004',true,true,'Obstacle',40),
('COMPLETED','#22C55E','22000000-0000-4000-8000-000000000005',true,true,'Completed',50);

INSERT INTO "public"."task_statuses" ("code","color","id","is_active","is_system","name","sort_order") VALUES
('NOT_STARTED','#94A3B8','23000000-0000-4000-8000-000000000001',true,true,'Not Started',10),
('IN_PROGRESS','#EAB308','23000000-0000-4000-8000-000000000002',true,true,'In Progress',20),
('ON_HOLD','#2563EB','23000000-0000-4000-8000-000000000003',true,true,'On Hold',30),
('OBSTACLE','#F97316','23000000-0000-4000-8000-000000000004',true,true,'Obstacle',40),
('COMPLETED','#22C55E','23000000-0000-4000-8000-000000000005',true,true,'Completed',50);

INSERT INTO "public"."job_titles" ("code","id","is_active","name","sort_order") VALUES
('LEGACY_DE64DAA7E8EB','8e43243c-b410-4751-87a7-8d6f1a7d6d2d',true,'Managing Partner',1),
('LEGACY_97D35A0095A6','85d37350-b782-4467-bed5-1ba78b2f68be',true,'IT Partner',2),
('LEGACY_E585473323D3','aadc2200-9629-41a9-8952-83bc88c083f8',true,'Senior Associate',3),
('LEGACY_45E4F78F3802','9370723e-0022-4f1d-8c0f-8fa2adfe0150',true,'Junior Associate',4),
('LEGACY_154B9E62541A','ae29e7cd-3234-4066-a361-53d238d64f8d',true,'Associate',5);

INSERT INTO "public"."workflow_templates" ("code","description","id","is_active","name") VALUES
('GENERAL','Workflow umum lima tahap.','24000000-0000-4000-8000-000000000001',true,'Workflow Umum'),
('VISA','Workflow visa tiga tahap.','24000000-0000-4000-8000-000000000002',true,'Workflow Visa');

INSERT INTO "public"."workflow_template_steps" ("id","name","position","workflow_template_id") VALUES
('24100000-0000-4000-8000-000000000001','ANALISIS',1,'24000000-0000-4000-8000-000000000001'),
('24100000-0000-4000-8000-000000000002','DRAFTING',2,'24000000-0000-4000-8000-000000000001'),
('24100000-0000-4000-8000-000000000003','REVISION',3,'24000000-0000-4000-8000-000000000001'),
('24100000-0000-4000-8000-000000000004','FINALISASI',4,'24000000-0000-4000-8000-000000000001'),
('24100000-0000-4000-8000-000000000005','ISSUED',5,'24000000-0000-4000-8000-000000000001'),
('24200000-0000-4000-8000-000000000001','ANALISIS',1,'24000000-0000-4000-8000-000000000002'),
('24200000-0000-4000-8000-000000000002','APPLY',2,'24000000-0000-4000-8000-000000000002'),
('24200000-0000-4000-8000-000000000003','ISSUE',3,'24000000-0000-4000-8000-000000000002');
