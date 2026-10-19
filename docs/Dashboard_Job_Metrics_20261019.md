# Dashboard Job/Task correction — 2026-10-19

Implemented and applied locally and to Production project
`imqjyxydsakfuztyrhev` on 2026-10-19. No application deployment or Git push.

## Read-only scope

`20261019100000_dashboard_job_metrics.sql` replaces only the body of the existing
`search_admin_dashboard(jsonb)` RPC. Its signature, STABLE/read-only behavior,
active-staff authorization, security-definer setting, and execution permissions
remain intact. No tables, columns, indexes, constraints, relationships, policies,
or application records are added, modified, or deleted by this migration.
Previously applied migration files are unchanged.

## Rules

- All eight cards count Jobs. Active excludes completed/cancelled Jobs and Trash.
- The Total Job diagram groups every non-Trash Job by Internal Service, including
  completed/cancelled Jobs, whether or not the Job contains Tasks.
- PIC workload still aggregates non-deleted, unfinished Tasks by assignee, using
  profile display name and falling back to email. Tasks under Trash Jobs are
  excluded. The three existing Task-status legend buckets remain unchanged.
- Attention returns at most ten distinct active Jobs: deadline within seven
  days (including overdue/today), or a delayed/hold/obstacle status. Titles, PIC,
  priority, status, estimated end date and workflow progress belong to the Job.
  Links open Job detail, not Task Assignment.
- Status options come from Job statuses. Client, service, Job status and date
  range (Job estimated end date) filter both datasets. PIC selects Job owner for
  Job panels, independently selecting Task assignee for workload. Existing Jobs
  require a PIC; Unassigned can therefore have Task workload but zero Job cards.
- One data RPC performs set-based aggregates; it does not download all raw Jobs
  or Tasks, impose a 1,000-record aggregate cap, or query per rendered row.
  Aggregate chart groups remain available for the existing scrollable lists.

## Verification and rollout

Production build, TypeScript check, changed-file ESLint, Node regression tests,
and the local database suites pass: 93 Node tests and 861 assertions across 31
database suites. Database fixture writes are transactional
and rolled back. The optional dummy-fixture reproducibility suite is excluded
because this local database intentionally uses a Production-data clone without
those dummy fixtures. Tests cover 1,076 Jobs, Jobs without Tasks, Task/Job status
separation, completed/cancelled/Trash exclusions, display-name fallback, filters,
Job progress, empty states and permission preservation.

The forward RPC migration has been applied before deploying
the application code. Legacy `job_id` and `assignee_name` response aliases are
retained for the currently deployed dashboard during that interval. They refer
to Job ID/PIC; the new UI reads explicit Job fields. No reset or seed is needed.

## Production verification

Backup snapshots and checksums are stored privately, outside Git, in
`backups/production-dashboard-20261019-195024/`. They contain schema, roles,
application/Auth/Storage data and migration history, plus post-migration
snapshots. Auth data is sensitive: protect this directory and copy it to secure
off-device storage. SQL contains Storage metadata, not file binaries or Drive
files; neither was modified by this rollout.

- Migration history is aligned at 19 entries; linked dry-run is up to date.
- All 156 public/private function definitions match local. Only
  `search_admin_dashboard(jsonb)` changed between the Production snapshots.
- Schema outside function definitions is unchanged, including tables, columns,
  relationships, constraints, indexes, triggers, grants and RLS policies.
- Every existing column and sorted row in 42 public/Storage tables matched
  before and after migration. Auth users and identities remained 11 each,
  with the same IDs. This is a live-snapshot comparison, not a guarantee
  against subsequent user activity.
- No reset, seed, local-data import, Production fixture tests, Google Drive
  mutation, or application deployment was performed.

Push/deploy the application commit separately to release the updated labels,
Job attention links, and presentation. Until then, the compatibility aliases
allow the previously deployed application to consume the new RPC response.
