# V2.1 data fetching and N+1 audit

Date: 2026-10-05. Scope: the admin read paths below in the dev worktree.
Implemented with additive local migrations; no baseline migration was edited.
No Production migration, deployment, reset or data deletion was performed.
This is a source/query-contract audit and local regression test, not a
Production load test or an assurance about every application path.

## Implemented coverage

Live searches use a 400 ms debounce and query the database again. Obsolete
requests are aborted and late responses/errors cannot replace current results.
Growing option lists are loaded on demand with ten choices and a separate
selected-ID resolution, including values outside the first choice page.
Pagination controls render at most five page buttons, not every available page.

| Area                 | Read strategy                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internal Services    | Existing server search returns 10 records, exact totals and category/workflow labels. Category filter and form options use remote lookups. Badge uses SQL count, independent of table search/page.                                                       |
| Other Master Data    | One RPC returns all seven badge counts without downloading their rows. Each selected table is searched/paginated separately (10 rows). Workflow-step/category-usage metadata is batched for that page only. Configured rank ordering is preserved.       |
| All Jobs             | Server search/filter/order, 10 joined rows and exact total. Latest remark selected in SQL for the page, not fetched per browser row. Client/service/PIC choices are lazy remote lookups.                                                                 |
| Job Detail           | Selected Job only. Related-client Jobs and remarks each have independent server pagination. No call that loads the company-wide Jobs catalogue. Contributor names are one selected-job batch.                                                            |
| My Tasks             | Independent 10-row Job List and selected-job Task pages. SQL status totals cover all matching tasks, not just the visible page. Contributor-only Jobs without tasks remain visible. Main and Job List searches combine rather than override one another. |
| Dashboard            | SQL aggregates for metrics, PIC and internal service; only 10 raw attention tasks. Filters do not download all tasks. Aggregate groups are retained for charts and scrollable legends.                                                                   |
| SOP                  | Catalogue server search/page of 10; fetch content only for the selected service/SOP, not all SOPs. See scoped-editor exception below.                                                                                                                    |
| User Management      | Joined profile/team/title server search, exact total, 10 profiles. Job Title editor choices are lazy. Existing bounded pending-access-request search is retained.                                                                                        |
| Reviews              | Existing 10-row database search/count retained. Client, Job and snapshot labels use fixed batches for at most the current two pages; form options are lazy and Jobs are client-scoped.                                                                   |
| Blog                 | Existing paginated server search retained. Category choices are SQL DISTINCT, not a download of every post's category.                                                                                                                                   |
| Client Service admin | Independent 10-row category, selected-category sub-service and modal-detail pages. Full-scope counts and next-order values come from SQL. Soft-archived content retains assets; no partial-page child cleanup or all-page download.                      |
| Task Assignment      | Profile names are one batch scoped to assigned users on the selected Job's board. Adding an assignee uses a remote search. Board exception described below.                                                                                              |

Save/delete/version checks and existing authorization constraints are retained.
New read RPCs require active staff or active admin as appropriate; anonymous
execution is revoked. API responses use private/no-store cache headers.
Search results cover records beyond 1,000 entries; no all-pages drain is used
to enable these searches. Public client Service relationships already use
embedded PostgREST reads/cache and were not rewritten in this change.

## N+1 and database work

No per-rendered-row database/API call exists in the refactored list projections.
Joined SQL reads or page-bounded label batches provide related names/counts.
The fixed query count does not imply constant SQL execution time: filtering,
exact counts and chart aggregation still examine relevant database data.

Added indexes support Job references by internal service and latest Job remarks.
Internal Service usage counts are correlated SQL for at most ten page records,
not individual network requests; their Job reference lookup now has an index.
No claim is made that every correlated SQL expression is removed or every
possible query has been load-tested.

## Deliberate parent-scoped full-data exceptions

- Task Assignment needs the complete selected Job board for existing drag/drop
  positioning. It does not load every company's task. An exact-count check
  rejects truncated results instead of presenting an incomplete board.
- The selected SOP's price editor replaces its full price list, and Download All
  needs that SOP's files. These child lists are not paginated yet. Exact-count
  checks reject REST truncation and prevent saving an incomplete price list.
- Small configuration lists (such as active status/priority choices) and
  chart aggregate groups are still loaded as configuration/aggregate data,
  not all raw records. Selected-Job steps/contributors remain parent-scoped.

If an individual Job/SOP exceeds the configured REST result limit, a separate
editor/board redesign will be needed; these guards surface an explicit error.
They do not silently omit records or fetch every page behind the user's back.

## Local verification

- TypeScript typecheck, changed TypeScript/TSX ESLint, and production build.
- 30 Node regression tests for debounce/cancellation, fixed query counts,
  true badge counts, task/job actions and Makassar deadline boundaries.
- 113 rolled-back database assertions across four targeted suites, including
  1,075-record catalogue fixtures, beyond-cap search, full-page totals,
  nested content pagination/order, contributor visibility and access checks.
- Query-count harness uses catalogue totals 1, 70 and 1,075. Jobs, My Tasks,
  Master Data pages/counts, User Management, Dashboard and Client Services use
  a fixed one data RPC; Reviews uses at most nine fixed data queries with
  page-bounded ID batches. Authentication and separate option lookups are not
  included in these data-query counts.
- Local migration dry-run confirms all new migrations are applied locally.

Browser interaction and Production-scale execution/load traces are not part of
this verification. Production must receive the incremental migrations before
these new read RPCs are used by a deployed application.
