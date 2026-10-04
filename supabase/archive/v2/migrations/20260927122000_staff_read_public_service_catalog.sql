begin;

-- Staff need read-only access to every client Service category so every role
-- can manage category-scoped Q&A from the Client Services workspace. Service
-- mutations remain restricted by their existing admin-only RPC checks.
drop policy if exists "Active admins read all service categories" on public.services_categories;
drop policy if exists "Active admins read all public service items" on public.services_items;
drop policy if exists "Active admins read all public service details" on public.services_item_details;

create policy "Active staff read all service categories"
on public.services_categories for select to authenticated
using (private.is_active_staff(auth.uid()) and deleted_at is null);

create policy "Active staff read all public service items"
on public.services_items for select to authenticated
using (private.is_active_staff(auth.uid()) and deleted_at is null);

create policy "Active staff read all public service details"
on public.services_item_details for select to authenticated
using (private.is_active_staff(auth.uid()) and deleted_at is null);

commit;
