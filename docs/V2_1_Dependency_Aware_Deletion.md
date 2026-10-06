# V2.1 dependency-aware deletion — 2026-10-06

## Status

Implemented and migrated **locally only**. Production migration, deployment,
commit, and push have not been performed in this task. No actual business Job,
SOP, Google Drive file, or Storage object was deleted for verification.

Four incremental migrations (`20261006100000` through `20261006103000`) add
category availability, parent deletion reservations, dependency-aware RPCs,
bounded admin projections, and external-cleanup checkpoints. They create no
new tables and do not delete existing business records during migration.

## Rules

- Master data without references can be permanently deleted. Referenced data
  is deactivated instead; once references are removed, permanent deletion
  becomes available even if already inactive. Historical, hidden, archived,
  and inactive references still count. System records remain protected.
- A used internal service category permits availability changes, but its name
  and code prefix remain locked. Inactive categories are excluded from new
  assignments and retained in historical filtering/selected-value resolution.
- SOP is owned by its internal service, not a deletion-blocking reference.
  Jobs, including archived Jobs, block service deletion. Removing an unused
  service removes its SOP description, price list, mapped files, and folder.
- Job deletion goes directly to permanent removal: impact preview, then exact
  title confirmation. Tasks, workflow, remarks, contributors, activity logs,
  and the managed Drive folder (including manually added contents) are removed.
- Reviews remain intact, detached from the Job. Client relationships remain;
  unused review-request links are revoked. Users, clients, master data, and
  SOP are not deleted when deleting a Job. Legacy Job Trash remains accessible.
- Public Client Services and user-management deletion policies are unchanged.

## Failure handling

Prepare RPCs recheck active-admin access, record version, references, and exact
Job title under a parent lock. A durable reservation prevents concurrent edits,
new tasks/contributors/uploads, or new Jobs referencing a deleting service.
Only server credentials can checkpoint and finalize cleanup.

Mapped files are removed before their folder. Each confirmed deletion removes
that target's metadata under the reservation token, so retry resumes remaining
targets. A 404 is treated as already removed only after checking access to the
configured managed root. Wrong drives, protected roots, moved files, 403s,
network failures, and checkpoint failures stop cleanup without reporting success.
Legacy Supabase SOP objects are removed by exact bucket/path, never bucket-wide.
Finalization refuses to remove the parent while mapped external metadata remains.

Cleanup uses a 40-second between-target budget; a large cleanup may require
multiple clicks. A server interruption can leave deletion pending. Use the same
Delete permanently action to resume; do not restore partially deleted records.
The existing expired-Trash endpoint also uses this workflow; no new cron schedule
was created. External API/database cleanup is not a cross-system transaction.

## Rollout and verification

Back up Production before applying the four migrations, then deploy the matching
application code. Do not reset or reseed Production. Server Supabase credentials
and the existing Drive integration must be configured; verify permanent-delete
permission on the Shared Drive using a disposable Job after deployment.

Verified locally:

- Production build, TypeScript typecheck, and changed-file ESLint passed.
- 71 Node regression tests passed, including mocked Drive/storage failures,
  cleanup/checkpoint ordering, unsafe targets, and retry behavior.
- 771 SQL assertions passed across 29 files, including authorization, stale
  versions, dependency rules, reservations, checkpoint/finalizer guards,
  review preservation, and graph cleanup. Fixture changes roll back.
- The optional legacy reproducibility suite was excluded because it requires
  dummy fixtures absent from this Production-data clone.

Real Drive deletion with Production OIDC credentials and authenticated browser
interaction have not been exercised in this task. Existing build warnings about
middleware naming and browser mapping age are unrelated to these changes.
