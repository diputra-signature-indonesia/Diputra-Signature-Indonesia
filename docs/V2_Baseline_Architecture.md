# Baseline Arsitektur V2 Diputra Signature Indonesia

Dokumen ini adalah record kondisi teknis project setelah penyelesaian rangkaian masalah V1. Isinya menjadi titik awal yang harus dipertahankan saat pengembangan V2 dimulai.

Dokumen ini **bukan backlog caching saja**, bukan pengganti riwayat audit, dan bukan pernyataan bahwa seluruh perubahan sudah berada di Production. Detail diagnosis, keputusan, implementasi, serta bukti teknis tetap berada di:

- `problem_V1.md` - inventaris masalah awal FE, database, dan operasional;
- `Optimization_FE_Context.md` - riwayat penyelesaian FE-01 sampai FE-16;
- `Optimization_DB_Context.md` - riwayat penyelesaian DB-A sampai DB-G yang mencakup DB-01 sampai DB-16;
- `dokumentasi_V1.md` - record kontrak dan kondisi V1 sebelum forward migration.

## 1. Status baseline

Tanggal pembaruan: **8 September 2026**.

| Lapisan | Status | Arti status |
| --- | --- | --- |
| FE-01 sampai FE-16 | **Implementasi source/lokal selesai** | Seluruh masalah FE pada `problem_V1.md` telah mendapat keputusan dan implementasi yang disepakati. |
| DB-A sampai DB-G | **Implementasi dan verifikasi lokal selesai** | Seluruh DB-01 sampai DB-16 telah ditangani atau ditutup dengan keputusan berbasis bukti. DB-G masih berupa perubahan worktree yang perlu di-commit. |
| Pengujian otomatis database lokal | **Lulus** | Enam file pgTAP dengan total 145 assertion lulus; reset, lint, type drift, dan schema drift juga lulus. |
| Profiling database Production | **Selesai secara read-only** | DB-F membuktikan query utama masih cepat sehingga tidak ada index baru yang dibenarkan saat ini. |
| Acceptance test Vercel Preview | **Belum lengkap** | Lima kelompok pengujian FE/caching masih menjadi gate. |
| Rollout migration DB ke Production | **Belum dilakukan** | Forward migration DB-A sampai DB-E belum boleh dianggap aktif di Production sebelum audit, backup, deployment source, dan approval. |
| Temuan `contact_messages.id` | **Follow-up terbuka** | Kolom ID belum mempunyai primary key atau unique constraint; perubahan ditunda sampai audit Production. |

Kesimpulannya: **fase implementasi paket FE dan DB telah selesai pada source serta Supabase lokal, tetapi fase deployment/acceptance Production belum selesai**. Baseline ini merekam target arsitektur yang sudah dibangun, termasuk gate yang wajib dipenuhi sebelum target tersebut dinyatakan aktif sepenuhnya di Production.

## 2. Prinsip yang wajib dibawa ke V2

1. Production adalah environment aktif; perubahan schema, policy, credential, Storage, dan data harus melalui forward migration, Preview, backup, approval, serta rollback plan.
2. Migration baseline V1 tidak diedit. Semua evolusi schema memakai migration baru yang berurutan dan dapat diaudit.
3. Data publik dan data berbasis session tidak boleh berbagi cache atau Supabase client yang sama.
4. RLS tetap menjadi enforcement utama. Pemeriksaan role pada UI atau middleware hanya lapisan tambahan.
5. Error operasional tidak boleh disamarkan sebagai data kosong atau 404.
6. Optimasi tidak boleh mengubah desain, konten, metadata, canonical, structured data, maupun kemampuan indexing tanpa keputusan eksplisit.
7. Index database hanya ditambahkan berdasarkan query plan dan bukti latency, bukan asumsi.
8. Seed, akun dummy, password lokal, serta konfigurasi Docker tidak pernah dikirim atau dijalankan ke Production.
9. Secret Supabase, Turnstile, token, session, PII contact, dan connection string tidak boleh masuk browser, shared cache, dokumentasi, atau log.
10. Remake admin dan CMS berikutnya harus dibangun di atas kontrak role, Storage, validation, dan generated types pada baseline ini.

## 3. Gambaran arsitektur setelah V1

```text
Browser publik
    |
    +-- navigasi client, Lenis, carousel, loading/error boundary
    |
    v
Next.js 16 App Router + Cache Components
    |
    +-- public cached loaders ('use cache')
    |       |
    |       +-- Supabase public client + anon key + RLS
    |       +-- hanya data published/visible
    |
    +-- admin/auth request boundary
    |       |
    |       +-- cookie-bound Supabase server client
    |       +-- active role: super_admin/admin/staff
    |
    +-- contact Server Action
            |
            +-- server validation + Turnstile verification
            +-- server-only Supabase Secret client
            +-- Resend best-effort setelah row tersimpan

Supabase
    |
    +-- public schema + RLS + hardened functions/triggers
    +-- public Storage bucket images dengan write policy terbatas
    +-- Auth/profile role matrix
    +-- local-only ordered seed + Auth bootstrap + pgTAP
```

Lokasi runtime yang dituju:

- Vercel Function: `sin1` - Singapore, melalui `vercel.json`;
- Supabase Production: `ap-southeast-1` - Singapore.

## 4. Baseline frontend

### 4.1 Ringkasan penyelesaian FE-01 sampai FE-16

| Area | FE | Baseline hasil akhir |
| --- | --- | --- |
| Public cache | FE-01 | Data publik memakai Cache Components Next.js 16 dengan function-level `'use cache'`, domain tag, dan invalidasi mutation. |
| Region | FE-02 | Vercel Function diarahkan ke Singapore agar dekat dengan Supabase Production. |
| Query duplication | FE-03, FE-04 | Metadata/body memakai loader yang sama; query layanan yang berantai diganti relational query yang terukur. |
| Loading dan failure state | FE-05, FE-15, FE-16 | Route publik mempunyai skeleton netral, error boundary, not-found UI, retry, dan klasifikasi missing/error yang benar. |
| Smooth scroll/navigation | FE-06, FE-07, FE-14 | Lenis dipertahankan dengan lifecycle aman, anchor ditangani oleh Lenis, dan link internal memakai navigasi Next.js/prefetch yang sesuai. |
| Motion dan scroll performance | FE-08, FE-10 | LazyMotion digunakan; reveal elemen berulang memakai shared `IntersectionObserver` dan CSS transition. Motion low-count/khusus tetap dipertahankan. |
| Carousel | FE-09 | Mousewheel navigation dihapus agar tidak berkompetisi dengan scroll halaman; drag tetap tersedia. |
| Payload | FE-11 | Query list publik hanya memilih field yang benar-benar dibutuhkan. |
| Asset dan font | FE-12, FE-13 | Sekitar 21,75 MiB asset yatim dihapus; Raleway memakai variable weight tanpa mengubah tipografi. |

Tidak ada redesign yang disengaja dalam rangkaian ini. Final state, arah gerak, durasi, delay, easing, layout, warna, hierarchy, dan konten dipertahankan sesuai batas optimasi.

### 4.2 Kontrak caching publik

Konfigurasi saat ini:

- `cacheComponents: true` pada `next.config.ts`;
- `stale`: 300 detik;
- `revalidate`: 900 detik;
- `expire`: 86.400 detik;
- tidak memakai `use cache: private` atau `use cache: remote`;
- tidak ada sisa `unstable_cache` pada arsitektur target.

| Domain | Tag | Loader utama | Filter publik |
| --- | --- | --- | --- |
| Services | `public-services` | category, category detail, service detail | Hanya category/item/detail published. |
| Blog | `public-blog` | list dan detail slug | Hanya `status = published`. |
| Team | `public-team` | visible members | Hanya `is_visible = true`. |
| Reviews | `public-reviews` | visible stories | Hanya `is_published = true`. |

Public cache hanya boleh menggunakan client anon tanpa cookies/session. Data berikut tidak boleh masuk shared cache:

- user, profile, role, atau session;
- draft/preview blog dan query admin;
- contact message;
- review request, token, serta state internalnya;
- email review atau field internal;
- Secret key/service-role credential.

Mutation blog atau review yang mengubah output publik memanggil `updateTag()` setelah database berhasil. Perubahan service/team langsung melalui Dashboard masih mengikuti cache lifecycle sampai endpoint invalidation khusus benar-benar dibutuhkan.

### 4.3 Error, not-found, dan SEO

- Query sukses tanpa row menghasilkan `null` dan dapat diteruskan ke `notFound()`.
- Error network, timeout, RLS, permission, schema, atau hasil query tidak valid dilempar ke error boundary.
- Missing blog/category/service menghasilkan not-found UI dan `robots: noindex`.
- Dynamic route yang sudah mulai streaming dapat menghasilkan HTTP `200 + noindex`; kondisi ini diterima sebagai kontrak PPR saat ini.
- Konten utama tetap server-rendered/pre-rendered. Caching dan reveal animation tidak boleh membuat konten SEO hanya tersedia setelah scroll atau client fetch.
- Title, description, canonical, Open Graph, JSON-LD, H1, internal link, sitemap, dan isi publik harus tetap setara ketika V2 dikembangkan.

### 4.4 Baseline interaksi

- Lenis tetap merupakan smooth-scroll engine utama dan harus terus berfungsi pada mouse, trackpad, touch, anchor, serta perpindahan route.
- Carousel review menggunakan mouse/touch drag, bukan mousewheel.
- Reveal berulang memakai satu shared observer, berhenti setelah elemen terlihat, lalu CSS menyelesaikan opacity/transform.
- Framer Motion masih boleh dipakai pada hero, CTA, Q&A, contact, review, atau animation low-count/khusus bila penghapusannya belum terbukti bermanfaat.
- `prefers-reduced-motion`, final visibility, Back/Forward, fast scroll, dan content arrival terlambat tidak boleh meninggalkan elemen tersembunyi.

## 5. Baseline database dan Supabase

### 5.1 Paket DB yang telah diselesaikan

| Paket | DB | Hasil baseline lokal |
| --- | --- | --- |
| DB-A - Core authorization | DB-01, DB-02, DB-12 | Self-update otorisasi ditutup, role disederhanakan, akun aktif diwajibkan, dan policy blog dirapikan. |
| DB-B - Function/correctness | DB-04, DB-06, DB-07, DB-16 | Function berprivilege di-hardening, publish compatibility RPC diperbaiki, timestamp otomatis, serta review validation disinkronkan. |
| DB-C - Storage lifecycle | DB-03, DB-14 | Bucket/policy image direproduksi, batas MIME/size/path diterapkan, immutable upload dan TTL satu tahun digunakan. |
| DB-D - Public entry security | DB-15, DB-13 | OAuth redirect dikunci, contact pindah ke jalur server + Turnstile, dan direct public insert ditutup pada migration target. |
| DB-E - Q&A source of truth | DB-09, DB-08 | File statis tetap canonical sementara; typo kolom database diperbaiki dari `anwer` menjadi `answer`. |
| DB-F - Query performance | DB-05 | Audit lokal dan Production menyimpulkan tidak ada index tambahan yang diperlukan saat ini. |
| DB-G - Type/reproducibility | DB-10, DB-11 | Generated types, typed clients, ordered seed, Auth bootstrap, fixture, dan drift check tersedia. |

### 5.2 Role dan authorization contract

Role aplikasi hanya:

- `super_admin`;
- `admin`;
- `staff`.

Legacy `editor` dan `contributor` dipetakan menjadi `staff` oleh forward migration bila ditemukan. Kontrak authorization:

- profile baru tidak mendapat role implisit;
- `is_active` default `false`;
- user tidak dapat mengubah role atau status aktif profile-nya sendiri;
- seluruh capability internal memerlukan profile dengan `is_active = true`;
- authenticated user tanpa profile hanya memperoleh akses publik;
- staff dapat mengelola workflow editorial draft/pending, moderasi review, dan review request sesuai policy;
- publish/delete blog serta destructive operation yang ditetapkan tetap dibatasi untuk admin/super_admin;
- public hanya membaca blog/review yang published serta data lain yang visible.

UI dan middleware harus mengikuti matrix ini, tetapi database policy tetap menjadi sumber enforcement.

### 5.3 Function, trigger, dan validation contract

- `SECURITY DEFINER` yang dipertahankan memakai fixed empty `search_path` dan dependency yang schema-qualified.
- Grant `EXECUTE` diberikan secara eksplisit dan minimum; helper trigger tidak diekspos sebagai RPC publik.
- `set_blog_post_published` dipertahankan sebagai compatibility RPC yang benar: boolean dipetakan ke status `published`/`draft`, hanya active admin/super_admin, dan input invalid menghasilkan error domain.
- Setiap update `blog_posts` memperbarui `updated_at`; trigger `published_at` tetap konsisten dengan status.
- Review token tepat 64 karakter hexadecimal, sekali pakai, dan dikunci secara transaksional untuk mencegah double submission.
- Nama review wajib maksimal 100 karakter, email opsional maksimal 254 karakter dan harus valid bila diisi, serta message wajib maksimal 2.000 karakter.
- Validasi user-facing dan constraint/function database harus tetap sinkron.

### 5.4 Storage contract

- Bucket `images` bersifat public untuk delivery asset blog.
- Folder write yang diizinkan hanya `blog` dan `blog_cover`.
- Bucket `team_profile` adalah bucket terpisah yang sudah ada; DB-C tidak mengubah bucket atau object Production tersebut.
- Upload hanya untuk active staff/admin/super_admin dengan ownership dan path yang valid.
- MIME yang diterima: JPEG, PNG, dan WebP; ukuran maksimum 5 MiB.
- Nama object baru memakai UUID, `upsert: false`, dan `cacheControl: 31536000`.
- Tidak ada policy `UPDATE`; penggantian image menghasilkan URL/object baru.
- Staff hanya dapat menghapus object miliknya yang tidak sedang direferensikan; admin/super_admin dapat melakukan cleanup media blog sesuai policy.
- Production asset lama tidak boleh dipindahkan atau dihapus tanpa audit reference dan rollback.

### 5.5 Contact dan public entry-point

- OAuth callback yang sukses selalu menuju `/admin`; parameter redirect bebas dari user tidak lagi digunakan.
- Contact tetap menggunakan Server Action dan tampilan saat ini.
- Server memvalidasi serta menormalisasi field, kemudian memverifikasi Turnstile sebelum database atau email dipanggil.
- Insert memakai Supabase Secret client yang `server-only`; direct `INSERT` untuk `anon` dan `authenticated` ditutup oleh migration target.
- Secret key tidak memakai prefix `NEXT_PUBLIC_`.
- Email melalui Resend bersifat best-effort setelah row tersimpan; kegagalan email tidak membatalkan submission database.
- Log tidak boleh berisi payload PII, token Turnstile, secret, atau alamat IP mentah.
- Constraint contact baru berstatus `NOT VALID`: row baru terlindungi, sedangkan row legacy harus diaudit sebelum `VALIDATE CONSTRAINT`.
- Retensi otomatis contact ditunda sampai workflow/remake admin selesai. Calon baseline yang belum aktif adalah spam 30 hari serta closed/replied 12 bulan.
- Vercel WAF yang direncanakan: 5 submit per 10 menit per IP pada Server Action `submitContact`, dimulai dalam mode observasi/log.

### 5.6 Q&A contract menuju CMS

- `src/data/dsi-qna.ts` tetap satu-satunya source of truth Q&A saat ini.
- Tabel `question_answer` dipertahankan untuk CMS masa depan dan kolomnya sudah ditargetkan bernama `answer`.
- Frontend belum membaca tabel tersebut sehingga tidak ada dua sumber data aktif.
- Cutover CMS nanti harus dilakukan sebagai satu rangkaian: data migration, policy mutation, ordering, query/cache publik, invalidation, loading/error state, SEO verification, dan penghentian file statis.

### 5.7 Keputusan index berbasis bukti

DB-F tidak membuat migration index. Audit Production read-only menunjukkan query aplikasi yang diperiksa rata-rata sekitar 1-2 ms dengan cache hit sekitar 99,99-100%, sementara resource database tidak menunjukkan tekanan berarti pada snapshot audit.

Audit index dibuka kembali hanya bila volume data tumbuh material, mean/p95 meningkat konsisten, query menjadi kontributor utama database time, CMS memperkenalkan pola filter/order baru, atau `EXPLAIN (ANALYZE, BUFFERS)` menunjukkan scan/sort yang mahal.

## 6. Type safety dan local reproducibility

### 6.1 Generated database types

- `src/types/database.generated.ts` dihasilkan dari schema `public` lokal dan tidak diedit manual.
- Seluruh Supabase browser/server/public/secret/middleware client menggunakan generic `Database`.
- Type row, insert, update, relationship, RPC, dan enum berasal dari generated types.
- Domain type manual hanya dipertahankan untuk input atau projection yang memang berbeda dari row database.
- Drift check lokal tersedia melalui `npm run db:types:check`.

Compiler pada DB-G sekaligus memperbaiki drift nyata: status blog `reject` menjadi `rejected`, expiry review request menjadi ISO string, type review disesuaikan dengan kolom aktual, dan nullable database field ditangani pada boundary UI.

### 6.2 Reset dan fixture lokal

Perintah utama:

```bash
npm run db:reset
npm run db:test
npm run db:types:check
npm run typecheck
```

`npm run db:reset` menjalankan seluruh forward migration dan ordered seed, lalu membuat akun Auth melalui Admin API lokal. Bootstrap menolak host selain `localhost`, `127.0.0.1`, atau `::1`.

Fixture permanen lokal mencakup:

- data service dan team;
- empat status blog;
- tiga state review;
- review request valid, expired, used, dan revoked;
- lima status workflow contact;
- tujuh Auth user: active/inactive untuk setiap role dan satu user tanpa profile.

Asset fixture memakai repository, bukan URL Production. Google OAuth Docker dinonaktifkan agar reset lokal tidak membutuhkan credential eksternal. Akun, password, token, dan seed ini hanya untuk local development; detail penggunaan berada di `README_DEV.md`.

## 7. Forward migration setelah baseline V1

Urutan migration yang membentuk target database saat ini:

1. `20260814124226_remote_schema.sql` - snapshot baseline V1;
2. `20260906153000_harden_core_authorization.sql` - DB-A;
3. `20260906170000_harden_functions_and_review_contract.sql` - DB-B;
4. `20260906190000_harden_blog_image_storage.sql` - DB-C;
5. `20260907090000_harden_contact_submission.sql` - DB-D;
6. `20260907130000_rename_question_answer_column.sql` - DB-E.

DB-F tidak membutuhkan migration. DB-G menghasilkan source, generated types, seed, bootstrap, dan test; bukan schema migration baru.

Migration tersebut telah diterapkan dan diuji pada Supabase Docker lokal. Sesuai record saat dokumen ini diperbarui, forward migration belum diterapkan ke Production.

## 8. Bukti verifikasi yang sudah tersedia

### 8.1 Frontend

- TypeScript, targeted ESLint, Prettier, dan optimized Next.js Production build berhasil pada rangkaian FE.
- Route publik dan anonymous admin redirect lulus smoke test lokal.
- Cache reuse serta read-your-own-writes blog/review melalui `updateTag()` terbukti lokal.
- Missing dynamic route menampilkan not-found UI dan `noindex`.
- FE-10 menurunkan Task sekitar 54,6% desktop dan 61,2% mobile-sized pada route `/services` dalam POC terukur; perluasan visual dinilai aman melalui pengujian lokal.
- Asset cleanup menghapus sekitar 21,75 MiB file yatim tanpa menghapus asset aktif.
- Raleway variable font menurunkan duplikasi rule `@font-face` tanpa mengubah weight yang tersedia.

### 8.2 Database

- Full `npm run db:reset` berhasil menjalankan enam migration, dua ordered seed file, restart, dan bootstrap tujuh akun.
- Auth bootstrap idempotent ketika dijalankan ulang.
- Enam file pgTAP, total **145 assertion**, lulus.
- Storage HTTP test mencakup upload, public read, immutable behavior, MIME/size denial, cache satu tahun, serta cleanup.
- Review concurrency test membuktikan hanya satu submission dapat memakai satu token.
- Direct contact REST test membuktikan anon ditolak dan server-secret path berhasil secara lokal.
- `supabase db lint --local --level warning` tidak menemukan schema error.
- `supabase db diff --local --schema public,storage` tidak menemukan schema drift.
- `npm run db:types:check`, TypeScript, targeted ESLint, dan optimized Next.js build lulus setelah DB-G.
- Audit DB-F terhadap Production hanya read-only dan tidak membuat index, extension, atau perubahan data.

## 9. Pemisahan environment

| Environment | Data/schema | Aturan |
| --- | --- | --- |
| Supabase Docker lokal | Migration target, seed, Auth dummy, test fixture | Boleh di-reset; tidak memakai credential/data Production. |
| Vercel Preview | Source kandidat dan konfigurasi Preview | Read-only terhadap Production secara default; mutation memerlukan record terisolasi dan persetujuan. |
| Supabase Production | Data bisnis aktif | Tidak boleh diubah tanpa backup, audit, rollout plan, approval, dan post-deploy verification. |
| Vercel Production | Aplikasi publik aktif | Hanya commit/deployment yang telah melewati acceptance gate boleh dipromosikan. |

Build/deploy Vercel tidak boleh menjalankan `db:reset`, local Auth bootstrap, seed, atau type generation yang membutuhkan Docker.

## 10. Rollout dan rollback

Urutan rollout yang aman:

1. pastikan worktree/commit kandidat lengkap dan reproducible;
2. build serta test lokal dari kondisi bersih;
3. deploy kandidat ke Vercel Preview;
4. selesaikan seluruh gate FE/caching dan source integration;
5. audit serta backup Supabase Production;
6. pasang environment/third-party configuration yang diperlukan;
7. apply migration secara berurutan dengan observasi;
8. lakukan smoke test dan security matrix segera;
9. promosikan deployment yang sama ke Production setelah approval;
10. pantau error 5xx, auth denial, contact abuse/failure, Storage denial, query latency, cache freshness, soft 404, canonical, robots, dan Search Console.

Rollback harus menggunakan deployment Vercel terakhir yang stabil dan rollback database yang telah disiapkan untuk migration terkait. Jangan menghapus data, mengubah credential, atau membatalkan seluruh schema tanpa menentukan target dan dampaknya terlebih dahulu.

## 11. Definition of done

| Level | Definisi | Status saat ini |
| --- | --- | --- |
| Implementasi FE | FE-01 sampai FE-16 tersedia di source dan lulus verifikasi lokal. | **Selesai** |
| Implementasi DB | DB-A sampai DB-G tersedia/ditutup berbasis bukti dan lulus verifikasi lokal. | **Selesai; DB-G belum di-commit** |
| Follow-up schema | Keputusan dan rollout aman untuk `contact_messages.id`. | **Belum selesai** |
| Acceptance Preview | Seluruh gate akhir Preview dan smoke integration DB lulus serta tercatat. | **Belum selesai** |
| Production database | Migration/configuration diterapkan dengan backup, approval, dan post-check. | **Belum dilakukan** |
| Production application | Commit teruji dipromosikan dan monitoring awal aman. | **Belum dikonfirmasi** |

Dokumen ini sudah sah sebagai **baseline arsitektur target pasca-V1**. Ia baru boleh disebut sebagai kondisi Production penuh setelah semua status deployment, acceptance, dan follow-up yang relevan berubah menjadi selesai.

## 12. Referensi implementasi utama

Frontend/cache:

- `next.config.ts`
- `vercel.json`
- `src/lib/public-cache.ts`
- `src/lib/supabase/public-server.ts`
- `src/lib/supabase/queries/`
- `src/components/viewport-reveal.tsx`
- `src/app/(site)/**/loading.tsx`
- `src/app/(site)/error.tsx`
- `src/app/(site)/not-found.tsx`

Database/local workflow:

- `supabase/migrations/`
- `supabase/seeds/`
- `supabase/tests/database/`
- `scripts/bootstrap-local-auth.mjs`
- `src/types/database.generated.ts`
- `src/lib/supabase/secret-server.ts`
- `src/lib/review-validation.ts`
- `README_DEV.md`
- `package.json`

Riwayat keputusan:

- `problem_V1.md`
- `Optimization_FE_Context.md`
- `Optimization_DB_Context.md`
- `dokumentasi_V1.md`

## 13. Catatan terakhir: hal yang masih perlu dipastikan

Seluruh testing, configuration, dan follow-up yang belum selesai dikumpulkan di bagian paling akhir ini agar tidak tersebar di tengah baseline.

### 13.1 Acceptance FE/caching di Vercel Preview

Lima kelompok berikut belum diuji sepenuhnya dan wajib dicatat hasilnya:

1. **Cold/warm cache** - minimal tiga siklus untuk service, blog, team, dan review; periksa reuse, output parity, parameter isolation, TTFB/Function duration bila tersedia.
2. **Dynamic service/blog resolved state** - uji direct entry dan client navigation untuk category, detail service, serta blog; loading harus berakhir pada data dan metadata slug yang benar.
3. **Missing route dan `noindex`** - missing content harus menampilkan not-found + `noindex`, sedangkan operational error harus menuju error boundary.
4. **Admin/session isolation** - uji anonymous, login, logout, incognito, browser/session berbeda, dan pastikan data privat tidak muncul di HTML/RSC/shared cache.
5. **Visual dan console regression** - desktop/mobile pada route representatif; periksa fast scroll, anchor, drag carousel, reveal, hover, accordion, loading/error, hydration, network, dan console.

Kelima gate harus dijalankan terhadap commit Preview yang sama dengan kandidat Production.

### 13.2 Konfigurasi yang perlu diisi atau dipastikan

- Commit dan review perubahan DB-G sebagai satu unit generated types, typed source, seed, bootstrap, dan test.
- Pastikan Vercel Function kandidat tetap berada di `sin1`.
- Buat/pastikan widget Turnstile nyata untuk hostname Preview dan Production.
- Isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, dan `TURNSTILE_ALLOWED_HOSTNAMES` pada environment yang benar.
- Isi `SUPABASE_SECRET_KEY` pada Vercel tanpa prefix `NEXT_PUBLIC_`; jangan mencetak nilainya ke log.
- Pastikan `TURNSTILE_TEST_MODE` tidak aktif di Production.
- Buat Vercel WAF rule untuk Server Action `submitContact`: mulai dengan mode log/observasi, lalu limit 5 request per 10 menit per IP dengan respons 429.
- Pastikan build Vercel tidak menjalankan reset, seed, bootstrap Auth lokal, atau type generation yang bergantung pada Docker.
- Pastikan konfigurasi Google OAuth Preview/Production tetap terpisah dari provider lokal yang sengaja dinonaktifkan.

### 13.3 Gate database sebelum Production

1. Audit read-only Production untuk role, caller function, row legacy, policy/grant, bucket/object ownership, object yang masih direferensikan, dan consumer nama kolom lama.
2. Ambil backup/snapshot serta simpan definisi policy/function/trigger/grant sebelum migration.
3. Deploy source dan environment yang kompatibel lebih dahulu bila dibutuhkan untuk rollout tanpa downtime.
4. Terapkan migration satu per satu sesuai dependency dan approval, bukan sebagai perubahan Production yang tidak terobservasi.
5. Ulangi authorization matrix, OAuth, review submission/concurrency, contact valid/invalid, Storage, Q&A column, cache invalidation, serta smoke route setelah apply.
6. Audit row contact legacy sebelum menjalankan `VALIDATE CONSTRAINT`.
7. Uji create/edit/cancel/replace image melalui admin setelah remake admin tersedia; keputusan saat ini memang menunda pengujian UI lama tersebut.

### 13.4 Follow-up schema `contact_messages.id`

DB-G menemukan bahwa `public.contact_messages.id` memiliki default UUID dan `NOT NULL`, tetapi belum mempunyai primary key atau unique constraint. Ini tidak menghalangi reset/type generation, namun tabel aktif Production tidak boleh diubah berdasarkan asumsi.

Follow-up wajib:

1. audit read-only duplicate/null ID dan seluruh consumer/relationship Production;
2. tentukan apakah kontrak yang benar adalah primary key atau unique constraint;
3. ukur risiko lock serta siapkan migration/rollback;
4. uji lokal dan Preview;
5. apply hanya setelah approval eksplisit.

Sampai follow-up tersebut selesai, jangan mengandalkan `ON CONFLICT (id)` untuk `contact_messages`.

### 13.5 Catatan non-blocking

- Peringatan dependency `baseline-browser-mapping` yang usang masih dapat muncul saat build/development.
- Next.js masih memperingatkan bahwa konvensi file `middleware` deprecated.
- Keduanya sudah ada di luar scope FE/DB yang diselesaikan dan belum terbukti sebagai regresi runtime, tetapi sebaiknya dimasukkan ke housekeeping V2.

### 13.6 Pekerjaan V2 yang memang ditunda

Item berikut adalah keputusan sadar untuk fase produk berikutnya, bukan implementasi V1 yang terlupakan:

- remake UI dan workflow admin;
- CMS Q&A beserta cutover dari file statis ke Supabase;
- UI khusus untuk pengelolaan role/audit trail bila dibutuhkan;
- retensi otomatis contact setelah workflow dan kebutuhan bisnis/legal disepakati;
- endpoint/webhook invalidation service/team bila kebutuhan freshness instan muncul;
- baseline CI untuk generated-type drift dan test database;
- optimasi Motion low-count hanya bila profiling baru membuktikan manfaat;
- audit index ulang hanya ketika trigger performa pada bagian 5.7 terpenuhi.

### 13.7 Verifikasi lanjutan dari bagian 8-10 `problem_V1.md`

Butir berikut belum diperlukan untuk menutup implementasi FE, DB, dan OPS-01 pada level source/lokal. Semuanya sengaja ditunda dan harus dibuka kembali pada tahap Preview, persiapan Production, atau monitoring pascadeploy yang sesuai.

| Butir | Waktu pelaksanaan | Tujuan dan kriteria minimum |
| --- | --- | --- |
| 20 sampel TTFB cold/warm | Kandidat Vercel Preview final, lalu ulangi setelah Production rollout | Pisahkan cold dan warm; catat p50/p75/p95, route, lokasi pengujian, Function region, serta kondisi cache. Target awal dari audit adalah cached public navigation p75 di bawah 300 ms dan uncached dynamic p75 di bawah 800 ms. |
| Lighthouse mobile tiga kali | Vercel Preview final | Jalankan pada kondisi yang konsisten dan gunakan median, bukan skor terbaik. Simpan route, tanggal, konfigurasi throttling, serta metrik utama. |
| Audit dan implementasi `prefers-reduced-motion` | Sebelum sign-off visual Production atau ketika accessibility V2 dikerjakan | Inventaris Lenis, Framer Motion, CSS transition, carousel, dan accordion; pastikan pengguna reduced-motion memperoleh perilaku yang aman tanpa konten tertinggal tersembunyi. |
| Operational failure dan recovery test | Local production build atau Preview dengan mock/failure trigger yang aman | Simulasikan network/timeout/permission failure tanpa mengubah Supabase Production; pastikan error boundary tampil, detail internal tidak bocor, dan `Try again` dapat pulih. |
| Audit Storage policy dan orphan object Production | Sebelum migration/rollout DB-C | Lakukan read-only inventory bucket `images` dan `team_profile`, policy, ownership, pola nama legacy, referensi database/content, serta object orphan; siapkan snapshot dan rollback sebelum perubahan. |
| Core Web Vitals real-user dan monitoring pascadeploy | Setelah Production rollout | Pantau minimal beberapa hari untuk LCP, INP, CLS, error 5xx, Function duration, cache freshness, Supabase latency/error, dan regresi route utama. |
| Keputusan observability V2 | Saat baseline monitoring V2 dirancang | Tentukan apakah dashboard Vercel/Supabase sudah cukup atau diperlukan integrasi Web Vitals/error tracking khusus, termasuk retensi, alert threshold, akses, biaya, dan larangan merekam PII/secret. |

Aturan pencatatan hasil:

1. Jangan menandai butir sebagai lulus hanya karena source berhasil di-build.
2. Simpan commit dan Deployment ID yang diuji agar hasil tidak tercampur antarversi.
3. Pisahkan hasil Local, Preview, dan Production.
4. Kegagalan satu butir tidak membuka ulang seluruh FE/DB secara otomatis; buka kembali hanya komponen yang terkait dan gunakan rollback boundary terkecil.
