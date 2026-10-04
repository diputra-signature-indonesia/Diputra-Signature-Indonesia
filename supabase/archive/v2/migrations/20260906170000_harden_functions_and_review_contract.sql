begin;

-- DB-04: public review RPCs intentionally bypass table RLS because the token
-- is the capability. Keep their object resolution deterministic.
create or replace function public.check_review_request_status(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_hash text;
  v_used_at timestamptz;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
begin
  v_token := pg_catalog.btrim(p_token);

  if v_token is null
    or pg_catalog.char_length(v_token) <> 64
    or v_token !~ '^[0-9A-Fa-f]{64}$'
  then
    return 'invalid';
  end if;

  v_hash := pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex');

  select rr.used_at, rr.revoked_at, rr.expires_at
    into v_used_at, v_revoked_at, v_expires_at
  from public.review_requests as rr
  where rr.token_hash = v_hash;

  if not found then
    return 'invalid';
  end if;

  if v_revoked_at is not null then
    return 'invalid';
  end if;

  if v_used_at is not null then
    return 'used';
  end if;

  if v_expires_at is not null and v_expires_at <= pg_catalog.now() then
    return 'expired';
  end if;

  return 'valid';
end;
$$;

create or replace function public.submit_review(
  p_token text,
  p_name text,
  p_email text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_name text;
  v_email text;
  v_message text;
  v_hash text;
  v_req_id uuid;
  v_review_id uuid;
begin
  v_token := pg_catalog.btrim(p_token);
  v_name := pg_catalog.btrim(p_name);
  v_email := nullif(pg_catalog.btrim(p_email), '');
  v_message := pg_catalog.btrim(p_message);

  if v_token is null
    or pg_catalog.char_length(v_token) <> 64
    or v_token !~ '^[0-9A-Fa-f]{64}$'
  then
    raise exception using
      errcode = '22023',
      message = 'review_invalid_token';
  end if;

  if v_name is null or pg_catalog.char_length(v_name) = 0 then
    raise exception using
      errcode = '22023',
      message = 'review_name_required';
  end if;

  if pg_catalog.char_length(v_name) > 100 then
    raise exception using
      errcode = '22023',
      message = 'review_name_too_long';
  end if;

  if v_email is not null and (
    pg_catalog.char_length(v_email) > 254
    or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) then
    raise exception using
      errcode = '22023',
      message = 'review_email_invalid';
  end if;

  if v_message is null or pg_catalog.char_length(v_message) = 0 then
    raise exception using
      errcode = '22023',
      message = 'review_message_required';
  end if;

  if pg_catalog.char_length(v_message) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'review_message_too_long';
  end if;

  v_hash := pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex');

  -- Re-check the one-time token after acquiring the row lock. Under READ
  -- COMMITTED, a concurrent waiter sees used_at and cannot submit again.
  select rr.id
    into v_req_id
  from public.review_requests as rr
  where rr.token_hash = v_hash
    and rr.revoked_at is null
    and rr.used_at is null
    and (rr.expires_at is null or rr.expires_at > pg_catalog.now())
  for update;

  if v_req_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'review_request_unavailable';
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
    v_name,
    v_email,
    v_message,
    false,
    false,
    pg_catalog.now()
  )
  returning id into v_review_id;

  update public.review_requests as rr
  set used_at = pg_catalog.now()
  where rr.id = v_req_id;

  return v_review_id;
end;
$$;

-- DB-16: preserve the legacy boolean RPC as a narrow compatibility endpoint.
-- The application still owns the full draft/pending/published/reject workflow.
create or replace function public.set_blog_post_published(
  p_post_id uuid,
  p_is_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated_count integer;
begin
  if p_post_id is null or p_is_published is null then
    raise exception using
      errcode = '22023',
      message = 'blog_publish_input_invalid';
  end if;

  if not exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin'::public.role, 'admin'::public.role)
  ) then
    raise exception using
      errcode = '42501',
      message = 'blog_publish_forbidden';
  end if;

  update public.blog_posts as bp
  set status = case
    when p_is_published then 'published'::public.blog_status
    else 'draft'::public.blog_status
  end
  where bp.id = p_post_id;

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 0 then
    raise exception using
      errcode = 'P0002',
      message = 'blog_post_not_found';
  end if;
end;
$$;

-- DB-06: all future blog updates receive a database-owned timestamp. Existing
-- rows are intentionally not backfilled.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace function public.set_published_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'published'::public.blog_status
    and old.status is distinct from new.status
  then
    new.published_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

drop trigger if exists blog_posts_update_at on public.blog_posts;
create trigger blog_posts_update_at
before update on public.blog_posts
for each row
execute function public.set_updated_at();

-- Function privileges are explicit. Trigger helpers are not public RPCs.
revoke all on function public.check_review_request_status(text) from public, anon, authenticated, service_role;
grant execute on function public.check_review_request_status(text) to anon, authenticated, service_role;

revoke all on function public.submit_review(text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.submit_review(text, text, text, text) to anon, authenticated, service_role;

revoke all on function public.set_blog_post_published(uuid, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_blog_post_published(uuid, boolean) to authenticated, service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.set_published_at() from public, anon, authenticated, service_role;

comment on function public.set_blog_post_published(uuid, boolean) is
  'Compatibility admin RPC: true maps to published and false maps to draft. Other workflow transitions remain application-owned.';

commit;
