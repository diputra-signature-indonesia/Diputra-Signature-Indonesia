begin;

drop policy if exists "Active staff read active blog posts" on public.blog_posts;
drop policy if exists "Active admins read archived blog posts" on public.blog_posts;

-- RLS policies execute as the caller. Use the public SECURITY DEFINER wrappers
-- because the private helpers are deliberately not executable by browser roles.
create policy "Active staff read active blog posts"
on public.blog_posts for select to authenticated
using (public.is_staff_role() and archived_at is null);

create policy "Active admins read archived blog posts"
on public.blog_posts for select to authenticated
using (public.is_admin_role() and archived_at is not null);

commit;
