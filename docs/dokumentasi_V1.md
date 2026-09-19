# Dokumentasi Project V1

## 1. Identitas dokumen

- Project: Diputra Signature Indonesia
- Stack utama: Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind CSS 4
- Hosting production yang terdeteksi: Vercel
- Domain production: `https://diputrasignature.com`
- Tanggal audit: 16 Agustus 2026
- Sumber dokumentasi: kode aplikasi, migration Supabase, seed lokal, hasil `npm run build`, dan respons HTTP production
- Batasan: dokumen ini tidak membaca isi data production atau secret. Audit hanya memakai artefak repository dan endpoint publik.

Dokumen masalah dan rekomendasi perbaikan berada di [problem_V1.md](./problem_V1.md).

## 2. Ringkasan arsitektur

```text
Browser
  |
  |-- halaman publik / admin
  v
Next.js App Router di Vercel
  |-- Server Components dan Server Actions
  |-- Supabase SSR client berbasis cookie
  |-- Browser client untuk Auth dan Storage
  v
Supabase
  |-- PostgreSQL + Row Level Security (RLS)
  |-- Auth (Google OAuth)
  |-- Storage bucket `images` (diasumsikan oleh kode)
  `-- RPC / database functions untuk review
```

Data publik—layanan, blog, review, dan anggota tim—diambil oleh Server Components melalui Supabase. Operasi interaktif seperti login dan upload gambar memakai Supabase browser client. Form kontak dan administrasi memakai Server Actions.

## 3. Konfigurasi environment

Variabel yang tercantum dalam `.env.example`:

| Variabel                                      | Lokasi penggunaan             | Fungsi                                              |
| --------------------------------------------- | ----------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                    | Server dan browser            | URL project Supabase                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`               | Server dan browser            | Public/anon key; keamanan tetap bergantung pada RLS |
| `NEXT_PUBLIC_SITE_URL`                        | Metadata, sitemap, review URL | Base URL aplikasi                                   |
| `RESEND_API_KEY`                              | Server                        | Kredensial pengiriman email kontak                  |
| `CONTACT_TO_EMAIL`                            | Server                        | Alamat penerima email kontak                        |
| `CONTACT_FROM_EMAIL`                          | Server                        | Alamat pengirim email kontak                        |
| `GOOGLE_CLIENT_ID`                            | Supabase local config         | Google OAuth client ID                              |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | Supabase local config         | Google OAuth client secret                          |
| `SUPABASE_SERVICE_ROLE_KEY`                   | Hanya komentar/contoh         | Tidak ditemukan dipakai oleh aplikasi               |

Aturan operasional:

- Jangan commit `.env`, `.env.local`, anon key produksi yang tidak perlu, service-role key, atau OAuth secret.
- `NEXT_PUBLIC_*` akan tersedia di browser dan tidak boleh dianggap rahasia.
- Service-role key tidak boleh digunakan dalam Client Component.
- URL Supabase production juga diizinkan pada `next.config.ts` sebagai sumber gambar Storage.

## 4. Supabase client

### 4.1 Server client

File: `src/lib/supabase/server.ts`

- Dibuat dengan `createServerClient` dari `@supabase/ssr`.
- Membaca dan menulis session melalui `cookies()` Next.js.
- Digunakan oleh Server Components, Server Actions, route handler, dan query helper.
- Karena mengakses cookie request, semua halaman publik yang memakai helper ini terdeteksi sebagai dynamic server rendering pada build saat audit.

### 4.2 Browser client

File: `src/lib/supabase/client.ts`

- Dibuat dengan `createBrowserClient`.
- Digunakan untuk Google OAuth serta upload/hapus gambar di Storage.
- Menggunakan anon key sehingga seluruh hak akses harus dibatasi oleh RLS dan Storage policy.

### 4.3 Middleware autentikasi

File: `src/middleware.ts`

- Matcher hanya berlaku untuk `/admin/:path*` dan `/login`.
- Memanggil `supabase.auth.getUser()` untuk memvalidasi session.
- Pada route admin, profil dicek melalui tabel `profiles`.
- Role yang diterima middleware: `super_admin`, `admin`, `editor`, `contributor`.
- User tanpa session diarahkan ke `/login`.
- User tanpa profil, nonaktif, atau dengan role di luar daftar ditolak.

Catatan: middleware adalah perlindungan routing, bukan pengganti RLS. Pengguna masih dapat memanggil Supabase API langsung sehingga policy database harus tetap menjadi sumber otorisasi utama.

## 5. Authentication dan role

### 5.1 Alur login

1. User membuka `/login`.
2. `GoogleLoginButton` memanggil `signInWithOAuth({ provider: 'google' })`.
3. Google/Supabase mengembalikan user ke `/auth/callback`.
4. Route callback menukar authorization code dengan session memakai `exchangeCodeForSession`.
5. User diarahkan ke `/admin`.
6. Middleware memvalidasi row pada `profiles` dan `is_active`.

### 5.2 Role database

Enum `public.role`:

- `super_admin`
- `admin`
- `editor`
- `contributor`

Ringkasan kemampuan efektif dari policy saat ini:

| Kemampuan                  | super_admin | admin |                 editor | contributor |
| -------------------------- | ----------: | ----: | ---------------------: | ----------: |
| Masuk route admin          |          Ya |    Ya |                     Ya |          Ya |
| Baca semua blog saat login |          Ya |    Ya |                     Ya |          Ya |
| Insert blog                |          Ya |    Ya |                     Ya |       Tidak |
| Update status blog apa pun |          Ya |    Ya | Terbatas draft/pending |       Tidak |
| Delete blog                |          Ya |    Ya |                     Ya |       Tidak |
| Kelola team                |          Ya |    Ya |                  Tidak |       Tidak |
| Baca/update kontak         |          Ya |    Ya |                     Ya |       Tidak |
| Delete kontak              |          Ya |    Ya |                  Tidak |       Tidak |
| Kelola review              |          Ya |    Ya |                     Ya |       Tidak |
| Delete review request      |          Ya |    Ya |                  Tidak |       Tidak |
| Update profil sendiri      |          Ya |    Ya |                     Ya |          Ya |

Tabel ini menjelaskan policy yang tersimpan, bukan rekomendasi. Risiko eskalasi role melalui update profil dijelaskan di `problem_V1.md`.

## 6. Database schema

Migration sumber: `supabase/migrations/20260814124226_remote_schema.sql`.

### 6.1 Enum

| Enum              | Nilai                                             |
| ----------------- | ------------------------------------------------- |
| `blog_status`     | `draft`, `pending`, `published`, `rejected`       |
| `categories_type` | `primary`, `secondary`                            |
| `contact_status`  | `new`, `in_progress`, `replied`, `closed`, `spam` |
| `cta_type`        | `contact`, `detail`                               |
| `role`            | `super_admin`, `admin`, `editor`, `contributor`   |

### 6.2 Tabel `profiles`

Menyimpan whitelist, role, dan status user Auth.

| Kolom        | Tipe / aturan                                                     |
| ------------ | ----------------------------------------------------------------- |
| `id`         | `uuid`, primary key, FK ke `auth.users.id`, cascade update/delete |
| `email`      | `text`, required, unique                                          |
| `role`       | enum `role`, required, default `contributor`                      |
| `is_active`  | `boolean`, required, default `true`                               |
| `updated_at` | `timestamptz`, default `now()`                                    |
| `created_at` | `timestamptz`, required, default `now()`                          |

Tidak ditemukan trigger otomatis untuk membuat profil saat user Auth dibuat. Provisioning profil saat ini harus dilakukan terpisah/manual.

### 6.3 Tabel `team_members`

Menyimpan anggota tim yang tampil di halaman About dan dapat ditautkan ke akun admin.

| Kolom           | Tipe / aturan                                                |
| --------------- | ------------------------------------------------------------ |
| `id`            | `uuid`, primary key                                          |
| `profile_id`    | `uuid`, nullable, FK ke `profiles.id`, cascade update/delete |
| `full_name`     | `text`, required                                             |
| `job_title`     | `text`, required                                             |
| `short_bio`     | `text`, nullable                                             |
| `avatar_url`    | `text`, nullable                                             |
| `is_visible`    | `boolean`, required, default `true`                          |
| `display_order` | `bigint`, nullable                                           |
| `nickname`      | `text`, nullable                                             |
| `updated_at`    | `timestamptz`, default `now()`                               |
| `created_at`    | `timestamptz`, default `now()`                               |

### 6.4 Tabel `services_categories`

Kategori layanan utama dan tambahan.

| Kolom                                       | Keterangan utama                          |
| ------------------------------------------- | ----------------------------------------- |
| `id`                                        | UUID primary key                          |
| `slug`                                      | Required, unique                          |
| `seo_title`, `seo_description`, `og_image`  | Metadata SEO                              |
| `title`, `short_description`, `description` | Konten kategori                           |
| `hero_heading`, `hero_image`, `card_image`  | Presentasi halaman/card                   |
| `card_icon_key`                             | Key icon pada kode frontend               |
| `type`                                      | enum `categories_type`, default `primary` |
| `sort_order`                                | `bigint`, default `0`                     |
| `is_published`                              | Kontrol visibilitas publik                |
| `updated_at`, `created_at`                  | Timestamp                                 |

### 6.5 Tabel `services_items`

Item layanan di dalam kategori.

| Kolom                                      | Keterangan utama                                                |
| ------------------------------------------ | --------------------------------------------------------------- |
| `id`                                       | UUID primary key                                                |
| `category_id`                              | Required, FK ke `services_categories.id`, cascade update/delete |
| `slug`                                     | Required; unik per `category_id`                                |
| `seo_title`, `seo_description`, `og_image` | Metadata SEO                                                    |
| `title`, `description`                     | Konten layanan                                                  |
| `icon_key`                                 | Key icon pada kode frontend                                     |
| `cta_label`                                | Default `contact`                                               |
| `cta_type`                                 | enum `cta_type`, required, default `contact`                    |
| `sort_order`                               | `bigint`, default `0`                                           |
| `is_published`                             | Kontrol visibilitas publik                                      |
| `updated_at`, `created_at`                 | Timestamp                                                       |

### 6.6 Tabel `services_item_details`

Bagian/accordion detail untuk suatu item layanan.

| Kolom                                     | Tipe / aturan                                              |
| ----------------------------------------- | ---------------------------------------------------------- |
| `id`                                      | UUID primary key                                           |
| `service_item_id`                         | Required, FK ke `services_items.id`, cascade update/delete |
| `title`, `description`, `cta_description` | Konten detail                                              |
| `sort_order`                              | `bigint`, default `0`                                      |
| `is_published`                            | Kontrol visibilitas publik                                 |
| `updated_at`, `created_at`                | Timestamp                                                  |

Constraint unik `(service_item_id, sort_order)` mencegah dua detail memiliki urutan sama pada item yang sama.

### 6.7 Tabel `blog_posts`

Menyimpan draft dan artikel publik.

| Kolom                                      | Keterangan utama                                        |
| ------------------------------------------ | ------------------------------------------------------- |
| `id`                                       | UUID primary key                                        |
| `slug`                                     | Required, unique                                        |
| `title`, `excerpt`, `content_md`           | Konten; `content_md` pada praktiknya berisi HTML Tiptap |
| `author_name`, `reading_time_min`          | Informasi penulis/baca                                  |
| `featured_image`, `cover_alt`              | Cover artikel                                           |
| `seo_title`, `seo_description`, `og_image` | Metadata SEO                                            |
| `published_at`                             | Tipe `date`                                             |
| `status`                                   | enum `blog_status`, default `draft`                     |
| `updated_at`, `created_at`                 | Timestamp                                               |

### 6.8 Tabel `contact_messages`

Backup/inbox untuk form kontak.

| Kolom            | Tipe / aturan                                     |
| ---------------- | ------------------------------------------------- |
| `id`             | UUID primary key                                  |
| `name`           | Required                                          |
| `email`, `phone` | Nullable di database; form aplikasi mewajibkannya |
| `message`        | Required                                          |
| `status`         | enum `contact_status`, required, default `new`    |
| `created_at`     | Timestamp, default `now()`                        |

Setelah insert sukses, Server Action mencoba mengirim email melalui Resend. Kegagalan email tidak membatalkan data yang sudah tersimpan.

### 6.9 Tabel `review_requests`

Menyimpan undangan review satu kali.

| Kolom                         | Tipe / aturan                                |
| ----------------------------- | -------------------------------------------- |
| `id`                          | UUID primary key                             |
| `token_hash`                  | Required, unique, SHA-256 dari token mentah  |
| `client_name`, `client_email` | Identitas penerima                           |
| `expires_at`                  | Kedaluwarsa link; aplikasi menetapkan 7 hari |
| `used_at`                     | Waktu pemakaian                              |
| `revoked_at`                  | Waktu pencabutan                             |
| `created_at`                  | Required, default `now()`                    |

Token mentah hanya dikembalikan sekali dalam URL; database menyimpan hash.

### 6.10 Tabel `reviews`

Review yang dikirim klien dan ditampilkan setelah dipublikasikan.

| Kolom               | Tipe / aturan              |
| ------------------- | -------------------------- |
| `id`                | UUID primary key           |
| `review_request_id` | FK ke `review_requests.id` |
| `name`              | Required                   |
| `email`             | Nullable                   |
| `message`           | Required                   |
| `is_published`      | Default `false`            |
| `is_featured`       | Default `false`            |
| `created_at`        | Required, default `now()`  |

### 6.11 Tabel `question_answer`

Disiapkan untuk FAQ per kategori layanan.

| Kolom                      | Tipe / aturan                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `id`                       | UUID primary key                                                                            |
| `services_categories_id`   | FK ke `services_categories.id`, cascade update/delete                                       |
| `question`                 | Required                                                                                    |
| `anwer`                    | Required; nama kolom mengandung typo dan harus diperlakukan sebagai kontrak schema saat ini |
| `is_visible`               | Required, default `true`                                                                    |
| `updated_at`, `created_at` | Timestamp                                                                                   |

Frontend saat audit masih memakai `src/data/dsi-qna.ts`, bukan tabel ini.

## 7. Relasi data

```text
auth.users
  `-- 1:1 profiles
          `-- 0..1 : many team_members (melalui profile_id)

services_categories
  |-- 1:many services_items
  |                 `-- 1:many services_item_details
  `-- 1:many question_answer

review_requests
  `-- 1:0..many reviews
```

Relasi `reviews.review_request_id` tidak memiliki aksi cascade eksplisit. Relasi review request perlu diperhatikan sebelum delete.

## 8. Database functions dan trigger

| Function                                             | Tujuan                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check_review_request_status(p_token)`               | Hash token dan mengembalikan `valid`, `used`, `expired`, atau `invalid`                                                                          |
| `submit_review(p_token, p_name, p_email, p_message)` | Lock request, insert review unpublished, lalu menandai request terpakai secara atomik                                                            |
| `set_blog_post_published(p_post_id, p_is_published)` | Function lama yang bermaksud mengubah publikasi blog; saat ini merujuk kolom `blog_posts.is_published` yang tidak ada dan tidak dipakai aplikasi |
| `current_role()`                                     | Membaca role dari JWT/app metadata                                                                                                               |
| `is_admin()` / `is_staff()`                          | Helper role berbasis JWT                                                                                                                         |
| `is_admin_role()` / `is_staff_role()`                | Helper role berbasis tabel `profiles`                                                                                                            |
| `set_published_at()`                                 | Mengisi `published_at` ketika status berubah menjadi `published`                                                                                 |
| `set_updated_at()`                                   | Mengisi `updated_at` pada update                                                                                                                 |

Trigger yang terpasang:

- `services_categories_update_at` pada `services_categories`.
- `services_detail_update_at` pada `services_item_details`.
- `services_items_update_at` pada `services_items`.
- `trg_set_published_at` pada `blog_posts`.

## 9. RLS publik dan staff

RLS aktif pada seluruh 10 tabel di schema `public`.

| Tabel                   | Akses publik                      | Akses authenticated/staff                                            |
| ----------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `blog_posts`            | Select hanya `status = published` | Authenticated dapat membaca semua; update/insert/delete menurut role |
| `contact_messages`      | Insert diizinkan                  | Staff baca/update; admin delete                                      |
| `profiles`              | Tidak ada                         | Select/update profil sendiri                                         |
| `question_answer`       | Select `is_visible = true`        | Sama untuk authenticated                                             |
| `review_requests`       | Tidak ada akses row langsung      | Staff insert/read/update; admin delete                               |
| `reviews`               | Select `is_published = true`      | Staff read/update/delete                                             |
| `services_categories`   | Select `is_published = true`      | Sama untuk authenticated                                             |
| `services_items`        | Select `is_published = true`      | Sama untuk authenticated                                             |
| `services_item_details` | Select `is_published = true`      | Sama untuk authenticated                                             |
| `team_members`          | Select `is_visible = true`        | User baca team terkait profil; admin kelola                          |

Grant SQL memberi hak tabel yang luas kepada role Supabase, tetapi RLS tetap membatasi row/operasi. Karena itu perubahan atau penonaktifan RLS harus dianggap operasi berisiko tinggi.

## 10. Supabase Storage

Kode mengasumsikan bucket public bernama `images`:

- Gambar isi blog: `blog/<uuid>.<ext>`.
- Cover blog: `blog_cover/<uuid>.<ext>`.
- Upload memakai `cacheControl: '3600'` dan `upsert: false`.
- URL publik disimpan langsung pada `blog_posts.featured_image` atau HTML `content_md`.
- Penghapusan artikel mencoba menghapus cover dan semua gambar Storage yang ditemukan di HTML.

Migration menyimpan policy `storage.objects` berikut:

- Public (`anon` dan authenticated) dapat membaca seluruh object dalam bucket `images`.
- Setiap user authenticated dapat insert pada path `blog/%` atau `blog_cover/%`.
- Setiap user authenticated dapat select/delete pada kedua path tersebut.
- Policy update memiliki `USING` yang hanya menerima `blog/%`, sementara `WITH CHECK` menerima `blog/%` dan `blog_cover/%`.

Migration tidak membuat row bucket `images` pada `storage.buckets`. Karena itu environment baru tetap memerlukan bootstrap bucket, dan policy saat ini belum membatasi operasi Storage berdasarkan role staff atau `is_active`.

## 11. Alur baca data halaman publik

| Halaman                          | Query utama                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| `/`                              | Kategori layanan, 3 blog published, maksimal 6 review published; paralel             |
| `/about`                         | Anggota team visible                                                                 |
| `/blog`                          | Maksimal 12 blog published                                                           |
| `/blog/[slug]`                   | Blog published berdasarkan slug; juga dipakai metadata                               |
| `/services`                      | Seluruh kategori published                                                           |
| `/services/[category]`           | Kategori, item dalam kategori, kategori lain, 3 blog; metadata juga membaca kategori |
| `/services/[category]/[service]` | Kategori, item, detail item, kategori lain, 3 blog; metadata membaca detail lagi     |
| `/contact`                       | Tidak membaca Supabase sampai form disubmit                                          |

## 12. Alur tulis data

### Kontak

`submitContact` memvalidasi empat field, insert ke `contact_messages`, lalu mencoba mengirim email. Data database tetap dianggap sukses jika email gagal.

### Blog admin

- Membuat draft dengan slug unik.
- Mengedit row blog dan media Storage.
- Mengubah status draft/pending/published/rejected sesuai policy.
- Menghapus row dan media yang direferensikan.
- Draft lokal disimpan oleh hook browser untuk membantu pemulihan form.

### Review

1. Staff membuat token random 32-byte dan menyimpan SHA-256 hash.
2. URL berlaku 7 hari.
3. Halaman review mengecek status melalui RPC.
4. Submit dilakukan oleh RPC transaction-like yang melakukan row lock.
5. Review baru unpublished sampai staff menyetujuinya.

## 13. Seed dan development lokal

Perintah yang didokumentasikan repository:

```bash
npx supabase start
npm run dev
npx supabase stop
```

Reset dan pembuatan migration:

```bash
npx supabase db reset --local
npx supabase db diff --use-migra -f nama_perubahan
```

`supabase/seed.sql` mengisi:

- `team_members` (profil hanya dipertahankan bila profil lokal tersedia),
- `services_categories`,
- `services_items`,
- `services_item_details`.

Seed tidak mengisi Auth user, `profiles`, blog, review, review request, kontak, atau Q&A.

## 14. Checklist maintenance Supabase

- Buat backup sebelum migration production.
- Jalankan reset database lokal dari nol untuk menguji migration + seed.
- Pastikan migration lokal sama dengan schema remote sebelum deploy.
- Audit RLS memakai akun anon, contributor, editor, admin, dan user nonaktif.
- Verifikasi bucket `images`, status public/private, ukuran file, MIME type, dan policy.
- Periksa query lambat dan `EXPLAIN (ANALYZE, BUFFERS)` sebelum menambah index.
- Pantau pertumbuhan `blog_posts.content_md`, Storage orphan, kontak spam, dan review request kedaluwarsa.
- Uji OAuth redirect URL untuk local, preview, dan production.
- Rotasi secret bila pernah terekspos; jangan menaruh service-role key di browser.
- Setelah perubahan konten, invalidasi/revalidate cache publik yang nantinya diterapkan.

## 15. Referensi resmi

- Next.js data fetching dan caching: <https://nextjs.org/docs/app/getting-started/fetching-data>
- Next.js `generateMetadata`: <https://nextjs.org/docs/app/api-reference/functions/generate-metadata>
- Supabase database overview/RLS: <https://supabase.com/docs/guides/database/overview>
- Supabase query optimization: <https://supabase.com/docs/guides/database/query-optimization>
- Supabase database functions: <https://supabase.com/docs/guides/database/functions>
- Vercel function regions: <https://vercel.com/docs/functions/configuring-functions/region>
