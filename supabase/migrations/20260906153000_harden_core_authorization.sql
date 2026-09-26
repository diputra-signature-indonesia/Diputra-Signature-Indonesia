begin;

-- DB-A: remove policies that depend on the legacy role enum or grant overly
-- broad authenticated access. Public published-read policies remain intact.
drop policy if exists "Update Own Profile" on public.profiles;

drop policy if exists "admin update any status" on public.blog_posts;
drop policy if exists "auth read blog posts" on public.blog_posts;
drop policy if exists "editor update draft pending" on public.blog_posts;
drop policy if exists "staff delete blog posts" on public.blog_posts;
drop policy if exists "staff insert blog posts" on public.blog_posts;

drop policy if exists "staff can delete review_requests" on public.review_requests;
drop policy if exists "staff can insert review_requests" on public.review_requests;
drop policy if exists "staff can read review_requests" on public.review_requests;
drop policy if exists "staff can update review_requests" on public.review_requests;

drop policy if exists "staff can delete reviews" on public.reviews;
drop policy if exists "staff can read all reviews" on public.reviews;
drop policy if exists "staff can update reviews" on public.reviews;

drop policy if exists "Admin can manage team" on public.team_members;

-- Replace the legacy four-value role enum. Production currently only contains
-- admin and super_admin profiles; the CASE keeps the migration deterministic
-- for local or future environments that still contain editor/contributor rows.
alter table public.profiles alter column role drop default;

create type public.role_db_a as enum ('super_admin', 'admin', 'staff');

alter table public.profiles
  alter column role type public.role_db_a
  using (
    case role::text
      when 'super_admin' then 'super_admin'
      when 'admin' then 'admin'
      when 'editor' then 'staff'
      when 'contributor' then 'staff'
    end
  )::public.role_db_a;

drop type public.role;
alter type public.role_db_a rename to role;

-- New profiles must be explicitly assigned a role and explicitly activated by
-- a trusted operator. Existing rows keep their current is_active value.
alter table public.profiles alter column role drop default;
alter table public.profiles alter column is_active set default false;

-- Use profiles as the authorization source of truth. These functions remain
-- security invoker; Select Own Profile lets an authenticated user evaluate
-- their own capability without bypassing RLS.
create or replace function public.current_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select p.role::text
      from public.profiles as p
      where p.id = auth.uid()
        and p.is_active = true
    ),
    ''
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin'::public.role, 'admin'::public.role)
  );
$$;

create or replace function public.is_staff_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('super_admin'::public.role, 'admin'::public.role, 'staff'::public.role)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.is_admin_role();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.is_staff_role();
$$;

-- Blog: public users still read published rows through the existing public
-- policy. Active staff can run the editorial workflow; only admins can publish
-- arbitrary states or delete rows.
create policy "Active staff read all blog posts"
on public.blog_posts
for select
to authenticated
using (public.is_staff_role());

create policy "Active staff insert draft or pending blog posts"
on public.blog_posts
for insert
to authenticated
with check (
  public.is_staff_role()
  and status in ('draft'::public.blog_status, 'pending'::public.blog_status)
);

create policy "Active admins insert any blog status"
on public.blog_posts
for insert
to authenticated
with check (public.is_admin_role());

create policy "Active staff update draft or pending blog posts"
on public.blog_posts
for update
to authenticated
using (
  public.is_staff_role()
  and status in ('draft'::public.blog_status, 'pending'::public.blog_status)
)
with check (
  public.is_staff_role()
  and status in ('draft'::public.blog_status, 'pending'::public.blog_status)
);

create policy "Active admins update any blog status"
on public.blog_posts
for update
to authenticated
using (public.is_admin_role())
with check (public.is_admin_role());

create policy "Active admins delete blog posts"
on public.blog_posts
for delete
to authenticated
using (public.is_admin_role());

-- Reviews and review requests: staff can operate the workflow, while delete is
-- intentionally restricted to admins.
create policy "Active admins delete review requests"
on public.review_requests
for delete
to authenticated
using (public.is_admin_role());

create policy "Active staff insert review requests"
on public.review_requests
for insert
to authenticated
with check (public.is_staff_role());

create policy "Active staff read review requests"
on public.review_requests
for select
to authenticated
using (public.is_staff_role());

create policy "Active staff update review requests"
on public.review_requests
for update
to authenticated
using (public.is_staff_role())
with check (public.is_staff_role());

create policy "Active admins delete reviews"
on public.reviews
for delete
to authenticated
using (public.is_admin_role());

create policy "Active staff read all reviews"
on public.reviews
for select
to authenticated
using (public.is_staff_role());

create policy "Active staff update reviews"
on public.reviews
for update
to authenticated
using (public.is_staff_role())
with check (public.is_staff_role());

-- Team management remains an admin-only capability.
create policy "Active admins manage team"
on public.team_members
for all
to authenticated
using (public.is_admin_role())
with check (public.is_admin_role());

commit;
