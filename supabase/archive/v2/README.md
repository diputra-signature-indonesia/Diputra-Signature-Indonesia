# V2 migration archive

The 44 migrations in this directory were applied to Production before the
2026-10-04 V2.1 baseline consolidation. They are retained for audit and recovery,
not executed by Supabase CLI.

V2 application/history reference: Git commit b297276 and local tag
baseline-v2-20261004. The active replacement is
../../migrations/20261004090000_v2_1_remote_baseline.sql.

Do not copy these files back into the active migrations directory or apply them
to the existing Production project. See docs/V2_1_Remote_Baseline.md.
