# Optional Job document folders — 2026-10-06

Implemented and migrated locally only. Production has not been migrated or
deployed; no commit/push or real Drive mutation was performed in this task.

## Behavior

- Add Folder sits beside Upload Document. A group creates a real, one-level
  child folder underneath the Job's existing Google Shared Drive folder.
- Accordion rows show the folder name, registered document count, open-in-Drive,
  add-document, and delete actions. Document lists load when expanded.
- Upload Document continues uploading directly to the Job folder. Files do not
  require a group. Existing metadata is preserved with `group_id = null`;
  no existing file is moved by the migration.
- Group folders inherit access from the Job folder. No separate ACLs are copied,
  and no limited-access flag is set. Manage Access remains on the Job folder.
- PIC, admin, and super admin can manage folders/files, following existing Job
  permissions. Other active staff can view metadata; actual file access remains
  governed by Google Drive and the user's Google account.
- Folder deletion requires confirmation and moves that folder plus all its
  contents to Drive Trash, following existing individual-document behavior.
  Only that group's active documents are hidden. Ungrouped files and other
  groups are unchanged. In-app group restoration is not implemented.
- Permanent Job deletion includes all groups, including previously trashed and
  unfinished folders: registered files, then child folders, then the Job folder.
  Review retention from the dependency-aware deletion change is unchanged.

## Schema and safety

Migration: `20261006110000_job_document_groups.sql`. Apply it after the four
dependency-aware deletion migrations and deploy matching application code.
Back up Production first; no reset/seed is required.

`job_document_groups` stores metadata and the reserved Google folder ID.
`job_documents.group_id` is optional. A composite foreign key enforces the same
Job and parent folder. RLS is enabled, authenticated table writes are revoked,
and mutation RPCs recheck PIC/admin authorization and Job deletion state.

Creation reserves metadata before calling Drive, with a pre-generated Google ID.
Same-name pending requests reuse that reservation. Lost responses can be retried
without creating a second folder. Pending creation has a Retry action.
DELETING groups reject new document metadata and remain retryable if Drive or
database completion fails. Versions guard stale deletes. Targets are verified
against their actual Drive parent and Shared Drive before upload or trash.

Groups, ungrouped files, and files inside each group are paginated at ten items.
One bounded RPC provides page rows and aggregate counts; opening one accordion
loads that folder, not every folder's files. Late responses are ignored when the
selected folder/page changes. Metadata finalization can be retried without
resending file bytes; failed metadata saving never automatically trashes a file.

## Verification

Local verification includes the production build, TypeScript, changed-file lint,
86 Node regression tests, and 818 SQL assertions across 30 files. Tests cover
root/group destinations, cross-Job isolation, pagination, authorization, stale
versions, creation retries, failed Drive operations, and nested Job cleanup.
SQL fixtures roll back. The optional dummy-data reproducibility suite is excluded.

Actual Production OIDC/Drive mutations and authenticated browser interaction
have not been tested. Verify with a disposable Job after rollout.

Google references: [folder creation and pre-generated IDs](https://developers.google.com/workspace/drive/api/guides/create-file),
[sharing and permission inheritance](https://developers.google.com/workspace/drive/api/guides/manage-sharing).
