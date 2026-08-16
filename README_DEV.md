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

DEVELOPMENT
=======start

- npx supabase start
- npm run dev
  =======end
- npx supabase stop
  =======reset
- npx supabase db reset --local
  =======Every DB Changes
- npx supabase db diff --use-migra -f nama_perubahan
- npx supabase db reset --local
