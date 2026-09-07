# Arsitektur Caching Frontend Setelah Penyelesaian FE

> Nama file `V2_Baseline_Architecture.md` dipertahankan agar tautan dan riwayat project tidak terputus. Isi dokumen ini khusus membahas baseline arsitektur caching frontend setelah seluruh pekerjaan FE dalam `problem_V1.md` selesai di source. Dokumen ini bukan rancangan keseluruhan arsitektur V2.

## 1. Tujuan dan ruang lingkup

Dokumen ini menjadi sumber status untuk:

- arsitektur pembacaan dan caching data publik;
- batas antara data publik anonim dan data berbasis session;
- strategi freshness serta invalidasi setelah mutation;
- dampak Cache Components terhadap rendering, error handling, dan SEO;
- bukti verifikasi yang sudah tersedia;
- pengujian Preview yang masih wajib diselesaikan sebelum rollout Production.

Riwayat masalah dan keputusan rinci tetap berada di:

- `problem_V1.md` untuk daftar masalah awal;
- `Optimization_FE_Context.md` untuk urutan keputusan, implementasi, dan hasil optimasi FE.

## 2. Status saat ini

Tanggal baseline: **6 September 2026**.

| Area | Status | Keterangan |
| --- | --- | --- |
| Implementasi FE dari `problem_V1.md` | **Selesai di source** | Perubahan UX, query, asset, font, loading, error/not-found, serta Cache Components sudah diterapkan. |
| Migrasi caching Next.js 16 | **Selesai di source** | `unstable_cache` sudah diganti dengan function-level `'use cache'`. |
| Verifikasi lokal | **Lulus** | Build, typecheck/lint terarah, smoke route, cache reuse, dan invalidasi lokal sudah diuji. |
| Vercel Preview | **Sudah tersedia, verifikasi parsial** | Deployment berstatus Ready dan pemeriksaan read-only awal berhasil. |
| Acceptance test Preview | **Belum selesai** | Lima kelompok pengujian pada bagian 9 masih terbuka. |
| Production rollout | **Belum dilakukan** | Perubahan pada branch `dev` belum dianggap selesai di Production sebelum seluruh acceptance gate lulus dan rollout disetujui. |

Dengan demikian, **pekerjaan implementasi FE selesai**, tetapi **validasi caching dan kesiapan Production belum boleh ditandai selesai**.

## 3. Fondasi FE yang sudah diselesaikan

Arsitektur caching saat ini dibangun setelah penyelesaian area FE berikut:

| Kelompok | FE | Kondisi akhir yang relevan |
| --- | --- | --- |
| Caching dan lokasi runtime | FE-01, FE-02 | Cache data publik tersedia; Vercel Function diarahkan ke Singapore dan dekat dengan Supabase. |
| Query dan payload | FE-03, FE-04, FE-11 | Query metadata/page dideduplikasi, query layanan tidak lagi redundan, dan field publik dipangkas sesuai kebutuhan render. |
| Loading dan kegagalan route | FE-05, FE-15, FE-16 | Loading boundary tersedia; error operasional tidak lagi dianggap sebagai konten tidak ditemukan; not-found memiliki UI dan `noindex`. |
| Interaksi dan navigasi | FE-06, FE-07, FE-09, FE-14 | Lenis tetap dipertahankan, anchor navigation diperbaiki, carousel tidak menangkap mouse wheel, dan navigasi/prefetch disesuaikan. |
| Motion dan performa scroll | FE-08, FE-10 | Animasi berulang yang berat dipindahkan ke shared `IntersectionObserver` dan CSS transition; Motion low-count tetap dipertahankan. |
| Asset dan font | FE-12, FE-13 | Asset besar yang tidak digunakan dihapus dan font menggunakan variable font yang lebih efisien. |

Tidak ada perubahan desain yang menjadi syarat dari arsitektur caching ini.

## 4. Arsitektur caching aktif

### 4.1 Alur data

```text
Public route / metadata
        |
        v
Cached public loader: 'use cache'
        |
        +-- cacheLife(...) + cacheTag(...)
        |
        v
Supabase public server client
        |
        +-- anon key
        +-- tanpa cookies/session
        +-- tetap mengikuti RLS
        |
        v
Published / visible public rows

Admin, login, review request
        |
        v
Request-time boundary: connection() + Suspense
        |
        v
Cookie-bound Supabase server client
        |
        v
Session / role / admin-only rows

Successful blog or review mutation
        |
        v
updateTag(domain tag)
        |
        v
Public read berikutnya memperoleh state terbaru
```

Pemisahan ini mencegah cookies, session, dan data admin ikut menjadi bagian dari shared public cache.

### 4.2 Konfigurasi utama

- Next.js: `16.0.10` dengan App Router.
- React: `19`.
- `cacheComponents: true` aktif di `next.config.ts`.
- Public cache memakai function-level `'use cache'`.
- `use cache: private` dan `use cache: remote` tidak digunakan.
- Vercel Function region: `sin1` — Singapore.
- Supabase Production region: `ap-southeast-1` — Singapore.

Cache life publik dikunci melalui `src/lib/public-cache.ts`:

| Parameter | Nilai |
| --- | ---: |
| `stale` | 300 detik / 5 menit |
| `revalidate` | 900 detik / 15 menit |
| `expire` | 86.400 detik / 24 jam |

Nilai tersebut adalah lifecycle cache, bukan janji bahwa setiap perubahan langsung melalui Supabase akan terlihat tepat pada detik ke-900. Perilaku aktual pada Vercel tetap harus dibuktikan melalui cold/warm test dan observasi freshness.

### 4.3 Domain cache

| Domain | Tag | Cached loader | Filter publik |
| --- | --- | --- | --- |
| Services | `public-services` | `getServiceCategories`, `getServiceCategoryPageData`, `getServiceDetailPageData` | Category, item, dan detail yang published. |
| Blog | `public-blog` | `getPublishedBlogPosts`, `getPublishedBlogPostBySlug` | Post berstatus `published`. |
| Team | `public-team` | `getVisibleTeamMembers` | Member dengan `is_visible = true`. |
| Reviews | `public-reviews` | `getVisibleStories` | Review dengan `is_published = true`. |

Argumen serializable seperti `slug` dan `limit` menjadi bagian dari cache key yang dikelola Next.js. Metadata dan body memakai loader/domain tag yang sama sehingga tidak perlu menjalankan query publik terpisah untuk data yang identik.

### 4.4 Rendering boundary

- Public list routes dapat membentuk static shell dan memakai hasil cache publik.
- Dynamic category, service, dan blog routes menggunakan loading/Suspense serta Partial Prerendering sesuai hasil build.
- Admin layout, Login, dan review-request tetap request-time melalui `connection()` di dalam Suspense boundary.
- Navbar dan footer memiliki static fallback; state berbasis pathname dilengkapi saat runtime.
- Konten utama publik tetap berasal dari server-rendered atau pre-rendered output, bukan client-only fetch.

## 5. Kontrak data dan isolasi keamanan

Public server client:

- hanya menggunakan Supabase URL dan anon key;
- tidak membaca `cookies()` atau `headers()`;
- tidak menyimpan, memulihkan, atau me-refresh session;
- tidak menggunakan service-role credential;
- tetap bergantung pada RLS Supabase;
- hanya dipakai oleh query published/visible.

Data berikut dilarang masuk shared cache:

- user, profile, role, dan session;
- query serta halaman admin;
- draft atau preview blog;
- contact messages;
- review request, token, dan status token;
- hasil autentikasi;
- data yang hanya boleh dibaca role tertentu;
- secret dan service-role credential.

Public review hanya memilih `id`, `name`, `message`, dan `created_at`. Email serta field internal review tidak boleh berada di HTML, RSC payload, atau shared cache.

## 6. Freshness dan invalidasi

### 6.1 Mutation melalui aplikasi

`updateTag()` hanya dipanggil setelah mutation database berhasil.

| Mutation | Tindakan |
| --- | --- |
| Create/publish/edit/unpublish/delete blog yang memengaruhi output publik | Perbarui tag `public-blog`. |
| Publish/unpublish/delete review | Perbarui tag `public-reviews`. |
| Membuat draft blog baru | Tidak perlu invalidasi selama draft tidak tampil pada query publik. |
| Membuat review request atau review yang belum published | Tidak perlu invalidasi public cache. |

Tujuannya adalah read-your-own-writes: sesudah mutation berhasil, pembacaan publik berikutnya tidak menunggu lifecycle cache lama.

### 6.2 Perubahan langsung di Supabase

Services dan team belum memiliki mutation aplikasi yang memanggil tag invalidation. Perubahan langsung pada kedua domain tersebut mengikuti lifecycle cache pada bagian 4.2.

Webhook atau endpoint revalidation belum diperlukan. Jika kebutuhan operasional kelak menuntut invalidasi segera, implementasinya harus menjadi perubahan terpisah yang memakai secret, validasi request, pembatasan domain tag, logging, dan pengujian replay.

## 7. Error, not-found, dan SEO

- Query error dari Supabase harus dilempar ke error boundary; error jaringan, timeout, RLS, atau permission tidak boleh dikonversi menjadi array kosong atau `null` palsu.
- Hanya hasil query sukses tanpa row yang menjadi missing content dan menjalankan `notFound()`.
- Missing blog, category, atau service menampilkan not-found UI dan menghasilkan `robots: noindex`.
- Karena dynamic route memakai loading/PPR, `notFound()` yang terjadi setelah streaming dimulai dapat menghasilkan HTTP `200` disertai `noindex`. Perilaku streamed `200 + noindex` ini telah diterima sebagai keputusan FE-05.
- URL, slug, canonical, title, description, Open Graph, JSON-LD, heading, konten utama, internal link, dan sitemap tidak boleh berubah hanya karena caching.
- Preview Deployment harus tetap dilindungi dan tidak boleh terindeks sebagai duplikat Production.

Caching tidak dengan sendirinya menaikkan ranking. Sasaran SEO-nya adalah mempertahankan output yang sudah dapat diindeks dengan benar sambil mengurangi latency dan query berulang.

## 8. Verifikasi yang sudah selesai

### 8.1 Lokal

- Targeted ESLint dan TypeScript `tsc --noEmit` berhasil.
- Production build Next.js 16.0.10 dengan Cache Components berhasil.
- Route manifest menunjukkan public list routes dapat menjadi static dengan revalidate 15 menit/expire 1 hari; dynamic slug dan admin/auth mengikuti boundary masing-masing.
- Smoke test route publik valid menghasilkan HTTP `200`; anonymous `/admin` diarahkan ke Login dengan `307`.
- Pengujian dua request pada cold detail blog mencatat satu query detail `blog_posts`, sehingga cache reuse terbukti secara lokal.
- Variasi list homepage dan Blog menghasilkan jumlah data masing-masing tanpa cache-key collision.
- Mutation blog dan review lokal menunjukkan perubahan publik langsung setelah `updateTag()`; record pengujian telah dikembalikan ke nilai semula.
- Missing dynamic content menjalankan not-found UI dan menyertakan `noindex`.
- Pengujian visual FE-10 dengan data dummy dinilai aman; fast scroll terasa lebih halus tanpa perubahan hasil visual yang disengaja.

### 8.2 Vercel Preview

| Item | Nilai |
| --- | --- |
| Commit | `970e51e` — `perf: migrate public data to cache components` |
| Deployment ID | `6JJ16ow1vWtpftZj1qWzjrmFMFUE` |
| Preview URL | `https://diputra-signature-indonesia-c27pl2qd7.vercel.app` |
| Status deployment | Ready |
| Function region | `sin1` |

Homepage dan About telah berhasil dibuka di Preview menggunakan data Production secara read-only. Bukti ini belum menggantikan lima acceptance test pada bagian berikut.

## 9. Pengujian yang belum dilakukan sepenuhnya

Kelima kelompok pengujian berikut berstatus **belum lengkap** dan menjadi acceptance gate sebelum Production rollout.

### 9.1 Cold/warm cache

Yang perlu diuji:

- jalankan minimal tiga siklus cold lalu warm pada services, blog, team, dan reviews;
- catat TTFB, Vercel Function duration, serta jumlah query bila observability tersedia;
- bandingkan request pertama dengan request berikutnya pada URL dan deployment yang sama;
- verifikasi variasi `slug` serta `limit` tidak mengambil entry milik parameter lain;
- jangan memakai `X-Vercel-Cache` sebagai satu-satunya bukti karena Data Cache dapat reuse walaupun route tetap dieksekusi.

Lulus bila warm request menunjukkan cache reuse yang konsisten, tidak ada cache-key collision, dan output cold/warm identik.

### 9.2 Dynamic service/blog resolved state

Yang perlu diuji:

- buka satu category service published, satu detail service published, dan satu blog published melalui navigasi maupun direct URL;
- pastikan loading fallback selesai menjadi konten sebenarnya;
- verifikasi title, canonical, heading, isi, image, item/detail list, dan CTA sesuai data;
- refresh keras dan lakukan navigasi berulang untuk memastikan tidak ada fallback yang tertahan atau konten silang antar-slug.

Lulus bila seluruh route mencapai resolved state yang benar dan metadata/body konsisten untuk setiap slug.

### 9.3 Missing-route dan `noindex`

Yang perlu diuji:

- akses slug blog, category, dan detail service yang dipastikan tidak ada;
- pastikan not-found UI tampil dan `<meta name="robots" content="noindex">` tersedia;
- pastikan operational failure tetap menuju error boundary, bukan not-found;
- catat status HTTP aktual. Untuk response yang sudah streaming, `200 + noindex` diterima sesuai keputusan FE-05.

Lulus bila missing content tidak dapat diindeks dan gangguan operasional tidak disamarkan sebagai konten hilang.

### 9.4 Admin/session isolation

Yang perlu diuji:

- anonymous user tetap diarahkan dari `/admin` ke Login;
- authenticated admin hanya melihat data dan aksi sesuai session-nya;
- logout, incognito, dan session browser lain tidak menerima hasil cache milik admin sebelumnya;
- draft, role, email review, review token, dan data admin tidak muncul pada halaman publik, HTML, atau RSC payload;
- mutation Preview terhadap database Production tidak dilakukan tanpa record test terisolasi, backup/rollback, dan persetujuan eksplisit.

Lulus bila tidak ada session leakage, cache lintas user, atau data privat pada output publik.

### 9.5 Visual dan console regression

Yang perlu diuji:

- periksa `/`, `/about`, `/services`, satu category, satu detail service, `/blog`, satu blog detail, Login, dan halaman admin utama;
- gunakan viewport desktop dan mobile;
- uji fast scroll, anchor navigation, mouse drag carousel, hover, accordion, loading, error recovery, dan perpindahan route;
- pastikan desain akhir, spacing, visibility, arah/durasi reveal, serta interaksi sama dengan keputusan FE;
- pastikan browser console tidak memiliki uncaught error, hydration mismatch, atau request gagal yang tidak diharapkan.

Lulus bila tidak ada regresi visual/interaksi dan console bersih pada route representatif.

## 10. Aturan pengujian Preview

- Preview yang terhubung ke Supabase Production hanya boleh dipakai untuk pengujian read-only, kecuali mutation telah disetujui dan memakai record khusus yang dapat dipulihkan.
- Simpan URL, tanggal, viewport, kondisi cold/warm, hasil, screenshot bila relevan, dan error yang ditemukan.
- Jika salah satu acceptance gate gagal, perbaikan dilakukan di `dev`, diuji lokal, lalu menghasilkan Preview baru sebelum pengujian diulang.
- Hasil parsial tidak boleh ditulis sebagai “lulus”; setiap kelompok pada bagian 9 harus memiliki bukti lengkap.

## 11. Kriteria rollout Production

Production baru boleh diperbarui bila:

1. seluruh lima kelompok pengujian pada bagian 9 lulus di Vercel Preview;
2. output SEO dan resolved state cold/warm setara;
3. isolasi admin/session terbukti;
4. tidak ada regresi visual maupun console;
5. commit/deployment yang diuji sama dengan commit yang akan dipromosikan;
6. pemilik project memberikan persetujuan rollout;
7. rollback target sudah diketahui sebelum deployment.

Sesudah rollout, pantau error 5xx, cache freshness, Function duration/TTFB, soft 404, canonical, robots, dan Search Console. Monitoring pascadeploy tidak menggantikan acceptance gate Preview.

## 12. Rollback

- Gunakan rollback deployment Vercel ke versi Production terakhir yang stabil jika ditemukan regresi setelah rollout.
- Pertahankan commit boundary caching agar perubahan dapat dibatalkan tanpa menyentuh schema atau data.
- Jangan menghapus atau mengubah data Supabase, RLS, region, maupun credential sebagai bagian dari rollback frontend.
- Setelah rollback, verifikasi route publik, redirect admin, output SEO, serta koneksi Supabase.

## 13. Definisi selesai

| Lapisan | Definisi | Status saat ini |
| --- | --- | --- |
| Implementasi FE | Semua perubahan FE yang disepakati tersedia di source dan lulus pemeriksaan lokal. | **Selesai** |
| Migrasi arsitektur cache | `cacheComponents`, `'use cache'`, `cacheLife`, `cacheTag`, dan `updateTag` aktif tanpa sisa `unstable_cache`. | **Selesai** |
| Acceptance Preview | Lima kelompok pengujian pada bagian 9 lulus dan buktinya tercatat. | **Belum selesai** |
| Rollout Production | Commit yang sudah lulus dipromosikan, smoke test berhasil, dan monitoring awal aman. | **Belum dilakukan** |

Dokumentasi caching boleh ditandai selesai sepenuhnya hanya setelah dua status terakhir berubah menjadi **Selesai**.

## 14. Referensi implementasi

- `next.config.ts`
- `src/lib/public-cache.ts`
- `src/lib/supabase/public-server.ts`
- `src/lib/supabase/queries/services.ts`
- `src/lib/supabase/queries/blog.ts`
- `src/lib/supabase/queries/team.ts`
- `src/lib/supabase/queries/stories.ts`
- `src/app/admin/action.ts`
- `src/app/admin/blog/actions.ts`
- `src/app/admin/reviews/action.ts`
- `problem_V1.md`
- `Optimization_FE_Context.md`
