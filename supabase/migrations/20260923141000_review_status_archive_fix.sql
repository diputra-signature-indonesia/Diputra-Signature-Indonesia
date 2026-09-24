begin;

-- Keep historical duplicate data deployable if production ever received more
-- than one legacy review for a request. Row locking and used_at remain the
-- authoritative one-time submission guard.
drop index if exists public.reviews_review_request_unique_idx;

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
$$;

revoke all on function public.check_review_request_status(text) from public, anon, authenticated, service_role;
grant execute on function public.check_review_request_status(text) to anon, authenticated, service_role;

commit;
