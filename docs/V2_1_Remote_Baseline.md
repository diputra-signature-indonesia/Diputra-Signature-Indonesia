# V2.1 remote baseline

Captured on 2026-10-04 from Production project imqjyxydsakfuztyrhev.
V2 source reference: b297276; local Git tag: baseline-v2-20261004.

## What changed

- The 44 V2 migrations are preserved in supabase/archive/v2/migrations.
- The active history starts at 20261004090000_v2_1_remote_baseline.sql.
- The baseline contains the live public/private schema, functions, triggers,
  constraints, indexes, RLS and grants; 11 custom Storage policies; three bucket
  configurations; system priorities/statuses; Job titles; and the original two
  workflow definitions. Reference data contains no Production user IDs.
- Supabase-managed auth/storage schema definitions are not replayed. Supabase
  provisions those schemas; their complete definitions are in the private backup.
- Business records, website content, users, photos, tokens and sessions are not
  committed as baseline/seed data. Existing Production data stays in place.
- Automatic dummy seeding is disabled. The optional test fixtures are adapted
  to the current team directory schema.

## Production safety

The baseline SQL is for empty local/new databases ONLY. Existing Production
acknowledges it through migration-history repair, not execution of its DDL/DML.
History repair does not roll back old schema changes or remove business records.

Never run db reset --linked, db push --include-all or --include-seed on the live
project. Do not run the baseline in Production SQL Editor.

For V2.1 changes, create a new timestamped migration after 20261004090000, test
locally, inspect db push --linked --dry-run, then apply only the new migrations.
Do not edit the baseline after it is acknowledged.

## Private backups

Local-only directory (ignored by Git):
backups/supabase/baseline-v2-1-20261004/

It includes Production schema, managed schemas, full data and original migration
history, the previous local schema/data, Storage binaries with their original
object names in storage-manifest.json, and SHA256SUMS.txt. The complete SQL backup
contains sensitive Auth data. Keep it private and copy it to protected off-device
storage; it is not a hosted automated backup.

Storage SQL alone does not back up file contents. The file manifest records byte
counts and SHA-256 hashes. Google Drive files are not part of this Supabase backup.

## Local workflows

- db:reset creates an empty baseline plus system/reference data, without demo
  accounts/content. It destroys current local data, so back up local work first.
- db:reset:fixtures creates a disposable demo/test database. Then db:test runs
  the full suite. Do not run it if you want to retain the Production-data clone.
- The local Production-data clone restores application records and Auth
  users/identities, but NOT Production sessions, refresh tokens or old migration
  history. Storage files are uploaded to the local Storage API.
- A local clone still contains real personal/business data and Drive folder IDs.
  Never enable Production Drive writes or real outbound messaging while testing
  destructive operations on that clone.
- Supabase project settings (OAuth providers, redirect URLs, SMTP, secrets,
  database password/network settings) are not migration-managed by this baseline.
  Local API keys remain local; no Production keys are copied into env files.

## Verification completed

- Fresh local baseline replay succeeded, including bucket configuration.
- All 523 database assertions passed across 23 test files using opt-in fixtures.
- Application schema/grants matched 1,071 normalized SQL statements from
  Production; all 11 custom Storage policies matched.
- TypeScript typecheck passed; generated public database types had no schema
  change (only the CLI's extra trailing newline was discarded).
- Application/Auth users and identities were restored from the private snapshot
  to local without Production login sessions; table counts and data hashes matched.
- Ten Storage files were restored through the LOCAL API and verified by SHA-256.
- Local/remote migration history now contains the same single baseline timestamp;
  the linked db push dry-run reports no pending migrations.
- Production schema, business data, Auth identities and Storage data matched
  before/after checks. User count and other Auth fields were preserved; normal
  live Auth updated_at activity was observed and recorded in the private report.
  No Production data restore/reset was performed.

## History-only recovery

The archived timestamp filenames and production-data.sql preserve the original
history. If consolidation must be reversed, first coordinate with all developers:
remove the new baseline history entry, restore the 44 archived files to the active
directory, then mark those timestamps applied using migration repair. These are
metadata operations only; do not replay historical SQL against live Production.

Do not restore the full data backup into live Production just to repair history.
