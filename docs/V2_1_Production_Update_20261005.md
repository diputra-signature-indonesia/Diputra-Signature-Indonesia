# V2.1 Production update — 2026-10-05

Target: existing Production project `imqjyxydsakfuztyrhev`.
Git branch: `dev`; no merge into `main` or website deployment performed.

## Database rollout

Applied the 12 pending forward migrations from
`20261004100000_internal_service_categories.sql` through
`20261005120000_account_profile.sql` using `supabase db push --linked --yes`.
The acknowledged remote baseline was not replayed. No reset, seed, data restore,
Google Drive writes, or notification setup was performed.

Changes add the internal service taxonomy, bounded admin searches/projections,
and secure self-service account details/display-name functions. Existing
internal services remain uncategorized until an administrator assigns them.
Their existing IDs, codes, and business records were preserved.

After rollout, all 13 local/remote migration timestamps matched and the linked
push dry-run reported no pending migrations. All 132 public/private function
definitions matched the current local schema.

## Data protection

Private, Git-ignored directory:
`backups/production-pre-migration-20261005-233345/`.

It contains pre-migration schema, data (public/auth/storage), roles, post-migration
schema/data, local schema, and SHA-256 checksums. It contains sensitive Auth data:
keep it private and copy to protected off-device storage. SQL backups include
Storage metadata, not Storage file binaries or Google Drive files. No Storage
files were changed by these migrations.

Compared every existing column and sorted row in 40 public/storage tables
before and after rollout: no differences. The new category table is empty.
Auth user count remained 10. This check is a live snapshot comparison, not a
guarantee against later user activity.

## Verification

- Production build, TypeScript typecheck, changed-file ESLint, and diff checks passed.
- All 48 Node regression tests passed.
- Local database suite: 675 of 692 assertions passed across 26 files; all
  new feature suites passed. The full suite is **not** reported as passing.
- 15 legacy reproducibility assertions require optional dummy fixtures that
  are intentionally absent from the current Production-data clone.
- 2 legacy document assertions expect one read policy, but the existing
  remote baseline has two: active staff read active records and active admins
  read archived records. These policies already existed before this rollout.
  Production policies were not altered just to satisfy outdated tests.

## Application handoff

The current commit also includes consistent admin search/control styling,
the account modal (only own display name editable), and the hidden notification
bell with its markup retained. Google Chat notifications remain deferred.
Merge `dev` into `main` separately to release application code to Production.
