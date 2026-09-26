


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






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


CREATE TYPE "public"."role" AS ENUM (
    'super_admin',
    'admin',
    'editor',
    'contributor'
);


ALTER TYPE "public"."role" OWNER TO "postgres";


COMMENT ON TYPE "public"."role" IS 'Access role for admin Diputra Signature Indonesia';



CREATE OR REPLACE FUNCTION "public"."check_review_request_status"("p_token" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_hash text;
  v_used_at timestamptz;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return 'invalid';
  end if;

  -- sha256 hex
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select used_at, revoked_at, expires_at
    into v_used_at, v_revoked_at, v_expires_at
  from public.review_requests
  where token_hash = v_hash;

  if not found then
    return 'invalid';
  end if;

  if v_revoked_at is not null then
    return 'invalid';
  end if;

  if v_used_at is not null then
    return 'used';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    return 'expired';
  end if;

  return 'valid';
end;
$$;


ALTER FUNCTION "public"."check_review_request_status"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_role"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$BEGIN
  return coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role',
    ''
  );
END;$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$begin
  return public.current_role() in ('super_admin','admin');
end;$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_role"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_admin_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff"() RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$begin
  return public.current_role() in ('super_admin','admin','editor');
end;$$;


ALTER FUNCTION "public"."is_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_staff_role"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'editor')
  );
$$;


ALTER FUNCTION "public"."is_staff_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- hanya super_admin/admin yang boleh publish/unpublish
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = any (array['super_admin','admin']::role[])
  ) then
    raise exception 'forbidden';
  end if;

  update public.blog_posts
  set is_published = p_is_published,
      updated_at = now()
  where id = p_post_id;
end;
$$;


ALTER FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- kalau status berubah menjadi published
  if new.status = 'published'
     and (old.status is distinct from new.status) then
    new.published_at := now();
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$begin
  new.updated_at = now();
  return new;
end;$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$declare
  v_hash text;
  v_req_id uuid;
  v_review_id uuid;
begin
  if p_message is null or length(trim(p_message)) = 0 then
    raise exception 'Review message is required';
  end if;

  -- hash token dari URL (sha256 hex)
  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  -- ambil request yang valid + lock row supaya tidak double submit
  select id into v_req_id
  from public.review_requests
  where token_hash = v_hash
    and revoked_at is null
    and used_at is null
    and (expires_at is null or expires_at > now())
  for update;

  if v_req_id is null then
    raise exception 'Review link is invalid, expired, or already used';
  end if;

  insert into public.reviews (
    review_request_id,
    name,
    email,
    message,
    is_published,
    is_featured,
    created_at
  )
  values (
    v_req_id,
    nullif(trim(p_name), ''),
    nullif(trim(p_email), ''),
    trim(p_message),
    false,
    false,
    now()
  )
  returning id into v_review_id;

  update public.review_requests
  set used_at = now()
  where id = v_req_id;

  return v_review_id;
end;$$;


ALTER FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") OWNER TO "postgres";

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
    "status" "public"."blog_status" DEFAULT 'draft'::"public"."blog_status"
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."role" DEFAULT 'contributor'::"public"."role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_answer" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "services_categories_id" "uuid",
    "question" "text" NOT NULL,
    "anwer" "text" NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."question_answer" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_hash" "text" NOT NULL,
    "client_name" "text",
    "client_email" "text",
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
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
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."services_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."services_categories" IS 'Diputra Signature Indonesia services category base';



CREATE TABLE IF NOT EXISTS "public"."services_item_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_item_id" "uuid" NOT NULL,
    "title" "text",
    "description" "text",
    "cta_description" "text",
    "sort_order" bigint DEFAULT '0'::bigint,
    "is_published" boolean,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "cta_type" "public"."cta_type" DEFAULT 'contact'::"public"."cta_type" NOT NULL
);


ALTER TABLE "public"."services_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."services_items" IS 'Diputra Signature Indonesia child services of their categories';



CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid",
    "full_name" "text" NOT NULL,
    "job_title" "text" NOT NULL,
    "short_bio" "text",
    "avatar_url" "text",
    "is_visible" boolean DEFAULT true NOT NULL,
    "display_order" bigint,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "nickname" "text"
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_members" IS 'displayed on the company''s about page';



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_slug_key" UNIQUE ("slug");



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



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "services_item_details_unique_order" ON "public"."services_item_details" USING "btree" ("service_item_id", "sort_order");



CREATE OR REPLACE TRIGGER "services_categories_update_at" BEFORE UPDATE ON "public"."services_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "services_detail_update_at" BEFORE UPDATE ON "public"."services_item_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "services_items_update_at" BEFORE UPDATE ON "public"."services_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_published_at" BEFORE UPDATE ON "public"."blog_posts" FOR EACH ROW EXECUTE FUNCTION "public"."set_published_at"();



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_answer"
    ADD CONSTRAINT "question_answer_services_categories_id_fkey" FOREIGN KEY ("services_categories_id") REFERENCES "public"."services_categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_review_request_id_fkey" FOREIGN KEY ("review_request_id") REFERENCES "public"."review_requests"("id");



ALTER TABLE ONLY "public"."services_item_details"
    ADD CONSTRAINT "services_item_details_service_item_id_fkey" FOREIGN KEY ("service_item_id") REFERENCES "public"."services_items"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services_items"
    ADD CONSTRAINT "services_items_category_id_fkey1" FOREIGN KEY ("category_id") REFERENCES "public"."services_categories"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Admin can manage team" ON "public"."team_members" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_active" = true) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_active" = true) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role"]))))));



CREATE POLICY "Public Read Published" ON "public"."blog_posts" FOR SELECT TO "authenticated", "anon" USING (("status" = 'published'::"public"."blog_status"));



CREATE POLICY "Public select visible team" ON "public"."team_members" FOR SELECT TO "authenticated", "anon" USING (("is_visible" = true));



CREATE POLICY "Read Team by Profile Account" ON "public"."team_members" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Select Own Profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Update Own Profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "admin update any status" ON "public"."blog_posts" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."role", 'super_admin'::"public"."role"])))))) WITH CHECK (("status" = ANY (ARRAY['draft'::"public"."blog_status", 'pending'::"public"."blog_status", 'published'::"public"."blog_status", 'rejected'::"public"."blog_status"])));



CREATE POLICY "auth read blog posts" ON "public"."blog_posts" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_messages_delete_admin" ON "public"."contact_messages" FOR DELETE TO "authenticated" USING ("public"."is_admin_role"());



CREATE POLICY "contact_messages_insert_public" ON "public"."contact_messages" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);



CREATE POLICY "contact_messages_select_staff" ON "public"."contact_messages" FOR SELECT TO "authenticated" USING ("public"."is_staff_role"());



CREATE POLICY "contact_messages_update_staff" ON "public"."contact_messages" FOR UPDATE TO "authenticated" USING ("public"."is_staff_role"()) WITH CHECK ("public"."is_staff_role"());



CREATE POLICY "editor update draft pending" ON "public"."blog_posts" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'editor'::"public"."role")))) AND ("status" = ANY (ARRAY['draft'::"public"."blog_status", 'pending'::"public"."blog_status"])))) WITH CHECK (("status" = ANY (ARRAY['draft'::"public"."blog_status", 'pending'::"public"."blog_status"])));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can read published reviews" ON "public"."reviews" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "public read published blog posts" ON "public"."question_answer" FOR SELECT TO "authenticated", "anon" USING (("is_visible" = true));



CREATE POLICY "public read published categories" ON "public"."services_categories" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "public read published services item details" ON "public"."services_item_details" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "public read published services items" ON "public"."services_items" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



ALTER TABLE "public"."question_answer" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_item_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."services_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff can delete review_requests" ON "public"."review_requests" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role"]))))));



CREATE POLICY "staff can delete reviews" ON "public"."reviews" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff can insert review_requests" ON "public"."review_requests" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff can read all reviews" ON "public"."reviews" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff can read review_requests" ON "public"."review_requests" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff can update review_requests" ON "public"."review_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff can update reviews" ON "public"."reviews" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff delete blog posts" ON "public"."blog_posts" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_active" = true) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



CREATE POLICY "staff insert blog posts" ON "public"."blog_posts" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."is_active" = true) AND ("p"."role" = ANY (ARRAY['super_admin'::"public"."role", 'admin'::"public"."role", 'editor'::"public"."role"]))))));



ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_review_request_status"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_staff_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_staff_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_staff_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_blog_post_published"("p_post_id" "uuid", "p_is_published" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_published_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_published_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_published_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_review"("p_token" "text", "p_name" "text", "p_email" "text", "p_message" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."question_answer" TO "anon";
GRANT ALL ON TABLE "public"."question_answer" TO "authenticated";
GRANT ALL ON TABLE "public"."question_answer" TO "service_role";



GRANT ALL ON TABLE "public"."review_requests" TO "anon";
GRANT ALL ON TABLE "public"."review_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."review_requests" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."services_categories" TO "anon";
GRANT ALL ON TABLE "public"."services_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."services_categories" TO "service_role";



GRANT ALL ON TABLE "public"."services_item_details" TO "anon";
GRANT ALL ON TABLE "public"."services_item_details" TO "authenticated";
GRANT ALL ON TABLE "public"."services_item_details" TO "service_role";



GRANT ALL ON TABLE "public"."services_items" TO "anon";
GRANT ALL ON TABLE "public"."services_items" TO "authenticated";
GRANT ALL ON TABLE "public"."services_items" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";









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































drop extension if exists "pg_net";

drop policy "Public Read Published" on "public"."blog_posts";

drop policy "contact_messages_insert_public" on "public"."contact_messages";

drop policy "public read published blog posts" on "public"."question_answer";

drop policy "public can read published reviews" on "public"."reviews";

drop policy "public read published categories" on "public"."services_categories";

drop policy "public read published services item details" on "public"."services_item_details";

drop policy "public read published services items" on "public"."services_items";

drop policy "Public select visible team" on "public"."team_members";


  create policy "Public Read Published"
  on "public"."blog_posts"
  as permissive
  for select
  to anon, authenticated
using ((status = 'published'::public.blog_status));



  create policy "contact_messages_insert_public"
  on "public"."contact_messages"
  as permissive
  for insert
  to anon, authenticated
with check (true);



  create policy "public read published blog posts"
  on "public"."question_answer"
  as permissive
  for select
  to anon, authenticated
using ((is_visible = true));



  create policy "public can read published reviews"
  on "public"."reviews"
  as permissive
  for select
  to anon, authenticated
using ((is_published = true));



  create policy "public read published categories"
  on "public"."services_categories"
  as permissive
  for select
  to anon, authenticated
using ((is_published = true));



  create policy "public read published services item details"
  on "public"."services_item_details"
  as permissive
  for select
  to anon, authenticated
using ((is_published = true));



  create policy "public read published services items"
  on "public"."services_items"
  as permissive
  for select
  to anon, authenticated
using ((is_published = true));



  create policy "Public select visible team"
  on "public"."team_members"
  as permissive
  for select
  to anon, authenticated
using ((is_visible = true));



  create policy "Allow authenticated delete images/blog 1ffg0oo_0"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'images'::text) AND ((name ~~ 'blog/%'::text) OR (name ~~ 'blog_cover/%'::text))));



  create policy "Allow authenticated delete images/blog 1ffg0oo_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'images'::text) AND ((name ~~ 'blog/%'::text) OR (name ~~ 'blog_cover/%'::text))));



  create policy "Allow authenticated update images/blog 1ffg0oo_0"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'images'::text) AND (name ~~ 'blog/%'::text)))
with check (((bucket_id = 'images'::text) AND ((name ~~ 'blog/%'::text) OR (name ~~ 'blog_cover/%'::text))));



  create policy "Allow authenticated update images/blog 1ffg0oo_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'images'::text) AND ((name ~~ 'blog/%'::text) OR (name ~~ 'blog_cover/%'::text))));



  create policy "Allow authenticated upload to images/blog 1ffg0oo_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'images'::text) AND ((name ~~ 'blog/%'::text) OR (name ~~ 'blog_cover/%'::text))));



  create policy "Public read images 1ffg0oo_0"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'images'::text));



