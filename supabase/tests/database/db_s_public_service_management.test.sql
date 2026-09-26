begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(26);

select extensions.is(
  (
    select count(*)::integer
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'Active admins upload public service assets',
        'Active admins read public service assets',
        'Active admins delete public service assets'
      )
  ),
  3,
  'public Service assets use three admin-only Storage policies'
);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('99000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'catalog-admin@example.test', now(), now()),
  ('99000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'catalog-staff@example.test', now(), now());

insert into public.profiles (id, email, display_name, role, is_active)
values
  ('99000000-0000-4000-8000-000000000001', 'catalog-admin@example.test', 'Catalog Admin', 'admin', true),
  ('99000000-0000-4000-8000-000000000002', 'catalog-staff@example.test', 'Catalog Staff', 'staff', true);

insert into public.services_categories (id, slug, title, type, sort_order, is_published)
values ('99000000-0000-4000-8000-000000000010', 'catalog-private', 'Catalog Private', 'secondary', 990, false);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000002', true);

select extensions.throws_ok(
  $$ select public.save_public_service_category(null, null, 'staff-service', 'Staff Service', 'primary', null, null, null, null, null, null, null, null, null, 10, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a public Service through the RPC'
);

select extensions.throws_ok(
  $$ select public.save_public_service_item(null, null, '99000000-0000-4000-8000-000000000010', 'staff-item', 'Staff Item', null, 'law', 'Contact', 'contact', null, null, null, 10, true) $$,
  '42501',
  'Admin access required.',
  'staff cannot create a public Sub-service through the RPC'
);

select extensions.throws_ok(
  $$ select public.delete_public_service_category('99000000-0000-4000-8000-000000000010', 1) $$,
  '42501',
  'Admin access required.',
  'staff cannot delete a public Service through the RPC'
);

select extensions.throws_ok(
  $$ insert into public.services_categories (slug, title, type, is_published) values ('direct-forged', 'Direct Forged', 'primary', true) $$,
  '42501',
  null,
  'authenticated users cannot bypass RPCs with direct inserts'
);

select extensions.is(
  (select count(*)::integer from public.services_categories where id = '99000000-0000-4000-8000-000000000010'),
  0,
  'staff cannot read an unpublished public Service'
);

select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from public.services_categories where id = '99000000-0000-4000-8000-000000000010'),
  1,
  'admin can read an unpublished public Service'
);

select extensions.results_eq(
  $$
    update public.services_categories
    set title = 'Direct Update Must Fail'
    where id = '99000000-0000-4000-8000-000000000010'
    returning title
  $$,
  array[]::text[],
  'admin direct table updates remain blocked by RLS'
);

select set_config(
  'test.catalog_category_id',
  public.save_public_service_category(
    null, null, 'CATALOG-TEST', 'Catalog Test', 'primary',
    'Short description', 'Long description', 'Hero heading',
    'https://example.test/hero.webp', 'https://example.test/card.webp', 'law',
    'Catalog SEO', 'Catalog SEO description', 'https://example.test/og.webp',
    991, true
  )::text,
  true
);

select extensions.is(
  (select slug from public.services_categories where id = current_setting('test.catalog_category_id')::uuid),
  'catalog-test',
  'Service slugs are normalized before storage'
);

select extensions.is(
  (select version from public.services_categories where id = current_setting('test.catalog_category_id')::uuid),
  1,
  'a new public Service starts at version one'
);

select set_config(
  'test.catalog_item_id',
  public.save_public_service_item(
    null, null, current_setting('test.catalog_category_id')::uuid,
    'company-setup', 'Company Setup', 'Company setup support',
    'https://example.test/company-setup.svg', 'View details', 'detail',
    'Company Setup SEO', 'Company Setup description', null, 10, true
  )::text,
  true
);

select extensions.is(
  (select icon_key from public.services_items where id = current_setting('test.catalog_item_id')::uuid),
  'https://example.test/company-setup.svg',
  'a public Sub-service stores its SVG asset URL'
);

select set_config(
  'test.catalog_detail_id',
  public.save_public_service_detail(
    null, null, current_setting('test.catalog_item_id')::uuid,
    'Company Revision', 'Revision assistance', 'Ask our team', 10, true
  )::text,
  true
);

select extensions.is(
  (select title from public.services_item_details where id = current_setting('test.catalog_detail_id')::uuid),
  'Company Revision',
  'admin can create an optional nested Service detail'
);

select extensions.is(
  (
    select count(*)::integer
    from public.services_items as item
    join public.services_item_details as detail on detail.service_item_id = item.id
    where item.category_id = current_setting('test.catalog_category_id')::uuid
  ),
  1,
  'the three-level Service hierarchy is linked correctly'
);

select extensions.throws_ok(
  format(
    $$ select public.save_public_service_category(%L, 0, 'catalog-test', 'Stale', 'primary', null, null, null, null, null, null, null, null, null, 991, true) $$,
    current_setting('test.catalog_category_id')
  ),
  '40001',
  'Stale public Service version.',
  'stale public Service updates are rejected'
);

select extensions.is(
  public.save_public_service_category(
    current_setting('test.catalog_category_id')::uuid, 1,
    'catalog-test', 'Catalog Test Updated', 'primary',
    'Short description', 'Long description', 'Hero heading',
    'https://example.test/hero.webp', 'https://example.test/card.webp', 'law',
    'Catalog SEO', 'Catalog SEO description', 'https://example.test/og.webp',
    991, true
  ),
  current_setting('test.catalog_category_id')::uuid,
  'admin can update a public Service with its current version'
);

select extensions.is(
  (select version from public.services_categories where id = current_setting('test.catalog_category_id')::uuid),
  2,
  'updating a public Service increments its version'
);

select set_config(
  'test.catalog_private_item_id',
  public.save_public_service_item(
    null, null, '99000000-0000-4000-8000-000000000010',
    'private-child', 'Private Child', null, 'law', 'Contact', 'contact',
    null, null, null, 10, true
  )::text,
  true
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select extensions.is(
  (select count(*)::integer from public.services_categories where id = current_setting('test.catalog_category_id')::uuid),
  1,
  'anonymous visitors can read a published public Service'
);

select extensions.is(
  (select count(*)::integer from public.services_items where id = current_setting('test.catalog_item_id')::uuid),
  1,
  'anonymous visitors can read a published Sub-service'
);

select extensions.is(
  (select count(*)::integer from public.services_item_details where id = current_setting('test.catalog_detail_id')::uuid),
  1,
  'anonymous visitors can read a published nested detail'
);

select extensions.is(
  (select count(*)::integer from public.services_items where id = current_setting('test.catalog_private_item_id')::uuid),
  0,
  'a published Sub-service remains hidden when its parent Service is unpublished'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000001', true);

select extensions.lives_ok(
  format(
    $$ select public.delete_public_service_item(%L, 1) $$,
    current_setting('test.catalog_item_id')
  ),
  'admin can soft-delete a public Sub-service'
);

reset role;

select extensions.is(
  (select deleted_by from public.services_items where id = current_setting('test.catalog_item_id')::uuid),
  '99000000-0000-4000-8000-000000000001'::uuid,
  'soft deletion records the authenticated admin'
);

select extensions.is(
  (select deleted_at is not null from public.services_item_details where id = current_setting('test.catalog_detail_id')::uuid),
  true,
  'deleting a Sub-service also soft-deletes its nested details'
);

set local role anon;
select set_config('request.jwt.claim.role', 'anon', true);
select set_config('request.jwt.claim.sub', '', true);

select extensions.is(
  (select count(*)::integer from public.services_items where id = current_setting('test.catalog_item_id')::uuid),
  0,
  'soft-deleted Sub-services are absent from public reads'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '99000000-0000-4000-8000-000000000001', true);

select extensions.lives_ok(
  format(
    $$ select public.delete_public_service_category(%L, 2) $$,
    current_setting('test.catalog_category_id')
  ),
  'admin can soft-delete a public Service using its current version'
);

reset role;

select extensions.is(
  (select deleted_at is not null from public.services_categories where id = current_setting('test.catalog_category_id')::uuid),
  true,
  'public Service deletion retains the row as soft-deleted history'
);

reset role;

select * from extensions.finish();

rollback;
