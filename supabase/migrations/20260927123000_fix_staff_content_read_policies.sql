begin;

-- RLS policies execute as the caller, so use the public security-definer role
-- predicate rather than the private helper whose EXECUTE privilege is revoked.
drop policy if exists "Active staff read all Q&A" on public.question_answer;
create policy "Active staff read all Q&A"
on public.question_answer
for select to authenticated
using (public.is_staff_role() and deleted_at is null);

drop policy if exists "Active staff read all service categories" on public.services_categories;
drop policy if exists "Active staff read all public service items" on public.services_items;
drop policy if exists "Active staff read all public service details" on public.services_item_details;

create policy "Active staff read all service categories"
on public.services_categories for select to authenticated
using (public.is_staff_role() and deleted_at is null);

create policy "Active staff read all public service items"
on public.services_items for select to authenticated
using (public.is_staff_role() and deleted_at is null);

create policy "Active staff read all public service details"
on public.services_item_details for select to authenticated
using (public.is_staff_role() and deleted_at is null);

commit;
