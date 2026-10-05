Installation:

- npm install -D prettier eslint
  do:
  - make root file called .prettierrc
  - update eslint.config.mjs
  - update package.json
  - npm run lint

- npm install clsx
- npm install tailwind-merge // (cn)

feature/site-home
feature/site-about
feature/site-services
feature/site-services-category
feature/site-services-detail
feature/site-blog
feature/site-blog-detail
feature/site-contact

feature/admin-layout
feature/admin-login
feature/admin-blog-list
feature/admin-blog-create
feature/admin-blog-edit
feature/admin-reviews
feature/admin-contacts

feature/database-schema
feature/database-posts
feature/database-reviews

## Local development

Start the local Supabase stack and rebuild from the V2.1 Production baseline:

```powershell
npx supabase start
npm run db:reset
npm run dev
```

`npm run db:reset` always targets `--local --no-seed`. It applies the remote baseline and subsequent migrations, with system/reference records but without dummy users or business content. This deletes existing local data: back up any local work first.

For a disposable database with demo/test fixtures, use `npm run db:reset:fixtures` instead, then `npm run db:test`. Fixtures in `supabase/seeds/` are opt-in and must never be applied to Production. The Auth bootstrap refuses any host other than `localhost`, `127.0.0.1`, or `::1`.

See [V2.1 remote baseline](V2_1_Remote_Baseline.md) for backup and deployment rules.

All local fixture accounts use the intentionally public development-only password:

```text
DiputraLocalOnly!2026
```

Accounts:

- `super-admin-active@example.test`
- `super-admin-inactive@example.test`
- `admin-active@example.test`
- `admin-inactive@example.test`
- `staff-active@example.test`
- `staff-inactive@example.test`
- `authenticated-no-profile@example.test`

The current application login screen remains Google OAuth-only. These password accounts support Auth API, authorization, and future admin testing without any Production credential. Google OAuth UI verification remains a separate Preview/Production test.

Useful commands:

```powershell
npm run db:test
npm run typecheck
npm run db:types:generate
npm run db:types:check
npx supabase db diff --use-migra -f nama_perubahan
npx supabase stop
```

For schema validation, back up local work, run `npm run db:reset:fixtures`, regenerate `src/types/database.generated.ts`, and run the database/type/application checks. Never use `db reset --linked`, `--include-all`, or `--include-seed` for Production. Inspect `db push --linked --dry-run` before applying reviewed new migrations only.

Local review request tokens are intentionally predictable:

- valid: 64 `e` characters;
- expired: 64 `f` characters;
- used: 64 `0` characters;
- revoked: 64 `2` characters.
