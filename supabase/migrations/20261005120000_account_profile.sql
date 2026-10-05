-- Self-service account details. No table changes or general profile UPDATE grant.
begin;

create or replace function public.get_own_account_details()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'displayName', p.display_name, 'email', p.email, 'role', p.role,
    'publicProfile', case when t.id is null then null else jsonb_build_object(
      'fullName', t.full_name, 'nickname', t.nickname, 'jobTitle', jt.name,
      'shortBio', t.short_bio, 'avatarUrl', t.avatar_url, 'isVisible', t.is_visible
    ) end
  ) into v_result
  from public.profiles p
  left join public.team_members t on t.profile_id = p.id
  left join public.job_titles jt on jt.id = t.job_title_id
  where p.id = auth.uid() and p.is_active and p.deleted_at is null
    and p.role in ('super_admin'::public.role, 'admin'::public.role, 'staff'::public.role);
  if v_result is null then
    raise exception 'Active account required.' using errcode = '42501';
  end if;
  return v_result;
end;
$$;

create or replace function public.set_own_display_name(p_display_name text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := pg_catalog.btrim(p_display_name);
begin
  if auth.uid() is null then
    raise exception 'Active account required.' using errcode = '42501';
  end if;
  if v_name is null or pg_catalog.char_length(v_name) not between 1 and 160 or v_name ~ '[[:cntrl:]]' then
    raise exception 'Display name must contain 1 to 160 characters without control characters.' using errcode = '22023';
  end if;
  update public.profiles set display_name = v_name, updated_at = pg_catalog.now()
  where id = auth.uid() and is_active and deleted_at is null
    and role in ('super_admin'::public.role, 'admin'::public.role, 'staff'::public.role);
  if not found then
    raise exception 'Active account required.' using errcode = '42501';
  end if;
  return v_name;
end;
$$;

-- Preserve a custom admin name when an existing identity is synchronized.
create or replace function public.sync_own_profile_identity()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  update public.profiles as p set
    email = u.email,
    display_name = coalesce(nullif(pg_catalog.btrim(p.display_name), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'name'), '')),
    avatar_url = nullif(pg_catalog.btrim(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture', p.avatar_url, '')), ''),
    updated_at = pg_catalog.now()
  from auth.users as u where u.id = v_user_id and p.id = v_user_id;
  if not found then
    raise exception 'Approved profile not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.get_own_account_details() from public, anon;
revoke all on function public.set_own_display_name(text) from public, anon;
grant execute on function public.get_own_account_details() to authenticated;
grant execute on function public.set_own_display_name(text) to authenticated;
comment on function public.set_own_display_name(text) is 'Updates only the authenticated active account admin display name, never its role or public team profile.';
commit;
