# Runtime and dependency security update — 2026-10-28

## Scope and versions

Local implementation only: no Production deployment, Git push, database
migration/reset/seed, business-data mutation, Google Drive write, or change to
UI styling, H1 text or public URLs.

| Component | Before | After |
| --- | --- | --- |
| Local Node.js | 22.22.2 | 22.23.4 |
| Next.js / eslint-config-next | 16.0.10 / 16.0.5 | 16.4.3 / 16.4.3 |
| React / React DOM | 19.2.0 | 19.2.9 |
| sanitize-html | 2.17.7 | 2.18.1 |
| sharp, via Next.js | 0.34.5 | 0.35.5 |
| source-map-js | 1.2.1 | 1.2.2 |
| Zod, via Vercel CLI config | 4.1.11 | 4.6.7 |
| Node.js TypeScript definitions | 20.19.25 | 22.20.5 |

Node 22.23.4 contains the CVE-2026-111497 Brotli decoder fix. Its reported Brotli
library version remains 1.1.0 because the security fix is backported; checking
that library version alone cannot establish whether this Node build is patched.
The older local Node installation remains available through nvm for recovery;
do not use it to run this project.

## Configuration changes

- `.nvmrc` pins local development to 22.23.4; `engines.node` accepts patched
  releases within major 22 (`^22.23.4`). Future Node major upgrades need testing.
- `check:runtime`, automatically invoked by `predev`, `prebuild`, and `prestart`,
  rejects older/unvalidated Node versions before starting the application.
  There is no environment-variable bypass for this check.
- `partialPrefetching: false` explicitly preserves the previous Cache Components
  behavior after the Next.js minor upgrade. This does not enable a new UI or
  navigation feature. The existing middleware deprecation warning is retained;
  middleware-to-proxy migration is not part of this security update.
- `@vercel/oidc` stays at 3.8.9, retaining custom-audience support used by Drive.
  A scoped npm override selects patched Zod 4.x for `@vercel/cli-config`; no OIDC
  downgrade, API change, token/audience change, or credential rotation is made.
  Remove/review this override when upstream no longer pins vulnerable Zod.
- The npm lockfile is regenerated with verified registry integrity metadata.
  Transitive updates follow the patched framework/tooling dependency graph.
  No `npm audit fix --force` or blanket major-version upgrade was used.

## Verification

- Clean `npm ci` succeeds using the updated lockfile; no special
  peer-dependency flags are required.
- Full `npm audit` and production-only audit report zero known vulnerabilities
  at verification time. This does not replace runtime patching or guarantee
  the absence of undisclosed vulnerabilities.
- All 101 Node regression tests pass, including runtime version rejection,
  normal Brotli round-trip, sanitizer safety/content preservation, real Vercel
  config-schema compatibility, and mocked default/custom-audience Google token
  exchange and caching. No live Google token exchange or upload was performed.
- Production build, TypeScript typecheck, changed-file ESLint and diff checks
  pass on Node 22.23.4. Local Supabase was started from existing volumes without
  reset/seed solely for public-page build reads.
- Read-only HTTP smoke checks on a temporary local Production-mode server:
  Home, About, Services, Legal service, Blog, Contact and Login return 200;
  unauthenticated admin dashboard redirects to Login; dashboard API returns 401.
  The temporary server was stopped after verification. Authenticated browser
  login, real Drive upload and Vercel runtime behavior remain deployment checks.

## Production rollout still required

1. Review/commit/push these changes through the normal release workflow.
2. Confirm the Vercel project selects Node 22.x and redeploy. Vercel manages
   patch releases; repository engines are not proof of the deployed runtime's
   patch version. Check build/runtime logs, not just the major-version setting.
3. Verify actual deployed Node is at least 22.23.4 within major 22. If Vercel's
   build runtime is older, the version guard intentionally fails the build;
   resolve the runtime version instead of removing/bypassing the guard.
4. Recheck login, dashboard/filter reads, images, blog editor and real Drive
   operations in an authorized environment. No public diagnostic endpoint
   exposing runtime versions or secrets was added.

Vercel's advisory says WAF protection is automatic and new deployments receive
managed runtime mitigations while patches roll out. These protections do not
justify leaving a self-managed Node runtime unpatched. Updating local Node or
the lockfile does not itself patch an already deployed Production function.

Sources checked on 2026-10-28:

- [Node.js October security advisory](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Node.js 22.23.4 security release](https://nodejs.org/en/blog/release/v22.23.4)
- [Vercel Brotli security advisory](https://vercel.com/kb/bulletin/node-js-security-advisory)
- [Next.js 16.4.3 release](https://github.com/vercel/next.js/releases/tag/v16.4.3)
- [Cache Components migration guidance](https://nextjs.org/docs/app/guides/adopting-partial-prefetching)
