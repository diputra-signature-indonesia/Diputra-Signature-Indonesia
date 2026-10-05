begin;

-- Keep the existing Client Services visibility contract: staff can read the
-- published catalogue, while admin roles can also read unpublished content.
-- Q&A CRUD remains available to every active role through its own RPCs.
drop policy if exists "Active staff read all service categories" on public.services_categories;
drop policy if exists "Active staff read all public service items" on public.services_items;
drop policy if exists "Active staff read all public service details" on public.services_item_details;

create policy "Active admins read all service categories"
on public.services_categories for select to authenticated
using (public.is_admin_role() and deleted_at is null);

create policy "Active admins read all public service items"
on public.services_items for select to authenticated
using (public.is_admin_role() and deleted_at is null);

create policy "Active admins read all public service details"
on public.services_item_details for select to authenticated
using (public.is_admin_role() and deleted_at is null);

commit;
