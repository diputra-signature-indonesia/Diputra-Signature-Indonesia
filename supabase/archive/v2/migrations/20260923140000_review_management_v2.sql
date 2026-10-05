begin;

create type public.review_moderation_status as enum (
  'PENDING',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED'
);

alter table public.review_requests
  add column client_id uuid references public.clients(id) on delete restrict,
  add column job_id uuid,
  add column created_by uuid references public.profiles(id) on delete restrict,
  add column revoked_by uuid references public.profiles(id) on delete restrict,
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles(id) on delete restrict;

alter table public.reviews
  add column client_id uuid references public.clients(id) on delete restrict,
  add column job_id uuid,
  add column status public.review_moderation_status not null default 'PENDING',
  add column moderated_at timestamptz,
  add column moderated_by uuid references public.profiles(id) on delete restrict,
  add column archived_at timestamptz,
  add column archived_by uuid references public.profiles(id) on delete restrict,
  add column updated_at timestamptz not null default now();

update public.reviews
set status = case when is_published then 'PUBLISHED'::public.review_moderation_status else 'PENDING'::public.review_moderation_status end;

alter table public.jobs
  add constraint jobs_id_client_id_key unique (id, client_id);

alter table public.review_requests
  add constraint review_requests_job_requires_client check (job_id is null or client_id is not null),
  add constraint review_requests_job_client_fkey foreign key (job_id, client_id)
    references public.jobs(id, client_id) on delete restrict,
  add constraint review_requests_client_name_not_blank check (
    client_name is null or char_length(btrim(client_name)) between 1 and 200
  ),
  add constraint review_requests_client_email_length check (
    client_email is null or char_length(client_email) <= 254
  ),
  add constraint review_requests_revoke_state check (
    revoked_at is not null or revoked_by is null
  ),
  add constraint review_requests_archive_state check (
    (archived_at is null and archived_by is null)
    or (archived_at is not null and archived_by is not null)
  );

alter table public.reviews
  add constraint reviews_job_requires_client check (job_id is null or client_id is not null),
  add constraint reviews_job_client_fkey foreign key (job_id, client_id)
    references public.jobs(id, client_id) on delete restrict,
  add constraint reviews_archive_state check (
    (status = 'ARCHIVED'::public.review_moderation_status and archived_at is not null and archived_by is not null)
    or (status <> 'ARCHIVED'::public.review_moderation_status and archived_at is null and archived_by is null)
  );

create index review_requests_management_idx
  on public.review_requests(created_at desc, id)
  where archived_at is null;
create index reviews_management_idx
  on public.reviews(status, is_featured desc, created_at desc, id)
  where archived_at is null;
create index reviews_public_order_idx
  on public.reviews(is_featured desc, created_at desc, id)
  where status = 'PUBLISHED'::public.review_moderation_status and archived_at is null;

create or replace function private.sync_review_legacy_state()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.is_published := new.status = 'PUBLISHED'::public.review_moderation_status;
  if new.status <> 'PUBLISHED'::public.review_moderation_status then
    new.is_featured := false;
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function private.sync_review_legacy_state() from public, anon, authenticated, service_role;

create trigger reviews_sync_legacy_state
before insert or update on public.reviews
for each row execute function private.sync_review_legacy_state();

-- Browser clients may read management rows, but every mutation is forced
-- through a narrow RPC that validates both role and allowed columns.
drop policy if exists "Active admins delete review requests" on public.review_requests;
drop policy if exists "Active staff insert review requests" on public.review_requests;
drop policy if exists "Active staff update review requests" on public.review_requests;
drop policy if exists "Active admins delete reviews" on public.reviews;
drop policy if exists "Active staff update reviews" on public.reviews;
drop policy if exists "public can read published reviews" on public.reviews;

create policy "Public read published non-archived reviews"
on public.reviews
for select
to anon, authenticated
using (
  status = 'PUBLISHED'::public.review_moderation_status
  and archived_at is null
);

create or replace function public.create_review_request(
  p_client_id uuid default null,
  p_client_name text default null,
  p_client_email text default null,
  p_job_id uuid default null,
  p_expires_in_days integer default 7
)
returns table(request_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create or replace function public.revoke_review_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

create or replace function public.moderate_review(
  p_review_id uuid,
  p_status public.review_moderation_status,
  p_is_featured boolean default false
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

create or replace function public.archive_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

create or replace function public.archive_review_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

-- Preserve public token submission while copying the optional Client/Job
-- context from the invite into the immutable submitted review.
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
$$;

revoke all on function public.create_review_request(uuid,text,text,uuid,integer) from public, anon, authenticated, service_role;
grant execute on function public.create_review_request(uuid,text,text,uuid,integer) to authenticated, service_role;
revoke all on function public.revoke_review_request(uuid) from public, anon, authenticated, service_role;
grant execute on function public.revoke_review_request(uuid) to authenticated, service_role;
revoke all on function public.moderate_review(uuid,public.review_moderation_status,boolean) from public, anon, authenticated, service_role;
grant execute on function public.moderate_review(uuid,public.review_moderation_status,boolean) to authenticated, service_role;
revoke all on function public.archive_review(uuid) from public, anon, authenticated, service_role;
grant execute on function public.archive_review(uuid) to authenticated, service_role;
revoke all on function public.archive_review_request(uuid) from public, anon, authenticated, service_role;
grant execute on function public.archive_review_request(uuid) to authenticated, service_role;

comment on function public.create_review_request(uuid,text,text,uuid,integer) is
  'Creates a one-time review invitation. Existing Client and Job references are optional; raw tokens are returned once and never stored.';

commit;
