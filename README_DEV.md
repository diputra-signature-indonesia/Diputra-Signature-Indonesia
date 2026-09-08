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

Start the local Supabase stack, rebuild the database, and create the local Auth fixtures:

```powershell
npx supabase start
npm run db:reset
npm run dev
```

`npm run db:reset` always targets `--local`. It applies every migration, runs the ordered files in `supabase/seeds/`, then creates seven login-capable local Auth users and their profile matrix. The bootstrap script refuses any host other than `localhost`, `127.0.0.1`, or `::1`.

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

After every schema migration, run `npm run db:reset`, regenerate `src/types/database.generated.ts`, then run the type drift check and application verification. Never use `--linked`, `db reset --linked`, or `--include-seed` for the Production project.

Local review request tokens are intentionally predictable:

- valid: 64 `e` characters;
- expired: 64 `f` characters;
- used: 64 `0` characters;
- revoked: 64 `2` characters.
