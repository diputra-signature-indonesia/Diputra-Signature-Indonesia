# V2.1 - Internal Service Categories

Migrations:

- `20261004100000_internal_service_categories.sql`
- `20261004110000_internal_service_server_search.sql`

## Scope and existing data

- `internal_service_categories` is an internal admin catalogue, unrelated to
  `services_categories`, `services_items`, and the client/landing-page services.
- Existing service IDs, codes, workflow assignments, Job/SOP references and data
  are not rewritten. Their new nullable `category_id` starts as `null`.
- New services require an internal category. The database composes
  `CATEGORY_PREFIX_MANUAL_SUFFIX`; the manual suffix remains immutable as before.
- A legacy service remains editable without a category. When an admin explicitly
  chooses one, the old code becomes its suffix (e.g. `NPWP` becomes `COMPANY_NPWP`).
  Moving a categorized service changes only the prefix, not its suffix or ID.
- Category prefixes are unique uppercase letters/numbers with single underscores
  between words (maximum 30 characters); full service codes are at most 80.

## Management and removal

- Master Data has an Internal Service Categories selector and a Manage Categories
  shortcut. Internal Services supports server-side name/code/category/summary
  search, category filtering (including Uncategorized), and 10 rows per page.
  Search waits 400 ms after the last keystroke before fetching; category/page
  changes fetch immediately. Pending requests are aborted and obsolete responses
  ignored. Only ten service records are returned per request, not the full list.
  Category/workflow usage counts are aggregated across all services in SQL.
- Only active admin/super admin can mutate this Master Data, matching existing
  permissions. Active staff can read; anonymous and inactive users cannot.
- Edit/delete categories are locked while **any** internal service references
  them, including inactive services. Unused categories are hard-deleted.
- Internal Services are hard-deleted only if no Job or SOP references them.
  References from trashed Jobs still count. Used services are deactivated using
  the existing lifecycle semantics; their references/history remain intact.
- Confirmation is shown before removal. Server/database rechecks usage and version
  rather than trusting UI counts. Direct category writes are not granted to
  browser roles; a trigger also enforces the selected prefix.

## Deployment

Tested/applied locally only as of 2026-10-04. A private pre-change local snapshot
is under the Git-ignored `backups/supabase/internal-service-categories-20261004/`.

Apply both incremental migrations **before** deploying the updated Master Data UI
to Production. Keep the acknowledged V2.1 baseline unchanged; never reset the
live database, replay the baseline, include seeds, or include all old migrations.
Review the linked dry-run and take a current Production backup before applying.

The original seven-argument `save_internal_service` RPC remains for older clients
during deployment. The new form uses `save_categorized_internal_service` instead.
Rolling back UI does not require dropping the new table or deleting its data.

## Verification

Run the new self-contained database test plus related regressions:

```powershell
npx supabase test db --local supabase/tests/database/db_y_internal_service_categories.test.sql supabase/tests/database/db_z_internal_service_search.test.sql supabase/tests/database/db_k_master_data_crud.test.sql supabase/tests/database/db_i_v2_tracking_schema.test.sql supabase/tests/database/db_x_baseline_privileges.test.sql
node --experimental-strip-types --test scripts/tests/internal-service-search.test.mjs
npm run typecheck
npm run build
```

The search tests cover more than 1,000 records, literal wildcard characters,
permission checks, cancellation/out-of-order responses and debounce timing.
The SQL tests create their own fixtures inside rolled-back transactions. Do not
reset the local Production-data clone to run them. Other full-suite tests require
the opt-in fixtures and should run on a disposable local database.
