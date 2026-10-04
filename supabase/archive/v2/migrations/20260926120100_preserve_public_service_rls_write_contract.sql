begin;

-- The authenticated API role needs table-level DML privileges so RLS can
-- reject direct writes consistently. No INSERT/UPDATE/DELETE policies are
-- provided: catalogue mutations remain available only through admin RPCs.
grant select, insert, update, delete on table public.services_categories to authenticated;
grant select, insert, update, delete on table public.services_items to authenticated;
grant select, insert, update, delete on table public.services_item_details to authenticated;

commit;
