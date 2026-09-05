# V2 Baseline Architecture

## 1. Tujuan dokumen

Dokumen ini menetapkan arah arsitektur frontend/data-fetching V2 untuk project Diputra Signature Indonesia. Fokus utamanya adalah:

- mempercepat navigasi dan render halaman publik,
- mempertahankan keamanan serta isolasi session,
- menjaga konten admin tetap dapat diperbarui secara terukur,
- mempertahankan output SEO yang saat ini sudah terindeks dengan baik,
- menggunakan bridge `unstable_cache` secara sementara tanpa membiarkannya menjadi utang arsitektur permanen,
- bermigrasi ke model resmi Next.js 16 `cacheComponents` + `use cache` setelah fondasi FE siap.

Project aktif di production. Setiap tahap harus melalui local verification, Preview Deployment, pemeriksaan output SEO, lalu Production Deployment. Jangan menggabungkan aktivasi Cache Components dengan perubahan besar lain dalam satu deployment.

## 2. Status keputusan

Tanggal keputusan: 3 September 2026.

Keputusan:

1. FE-01 putaran pertama memakai `unstable_cache` secara scoped hanya untuk data publik anonim.
2. `cacheComponents` tidak diaktifkan pada putaran pertama.
3. Setelah rangkaian optimasi FE dan prasyarat pada dokumen ini selesai, seluruh bridge `unstable_cache` harus dimigrasikan ke `use cache`.
4. Migrasi ke `use cache` merupakan deliverable wajib V2, bukan backlog opsional.
5. Tidak ada perubahan URL, desain normal halaman, metadata, canonical, robots, structured data, atau sitemap hanya demi caching.

Status implementasi Tahap A: **selesai secara lokal dan terverifikasi pada 3 September 2026; belum di-deploy ke Preview atau Production**.

Alasan keputusan bertahap:

- Model route saat ini masih memakai banyak request-time API dan query cookie-bound untuk admin/auth.
- FE-05 loading/Suspense dan FE-15/FE-16 error/not-found belum selesai.
- Mengaktifkan Cache Components sekarang memperluas regression surface ke seluruh App Router.
- Data cache scoped sudah dapat menghilangkan banyak round-trip Supabase tanpa mengubah model rendering seluruh aplikasi.
- Setelah fondasi route siap, `use cache` menjadi target akhir karena merupakan API yang direkomendasikan Next.js 16.

## 3. Baseline arsitektur saat ini

Stack utama:

- Next.js 16 App Router,
- React 19,
- Vercel Functions,
- Supabase Postgres/Auth/Storage,
- Vercel Function region `sin1`,
- Supabase production region `ap-southeast-1`.

Kondisi data-fetching:

- Public loader dan authenticated loader memakai `createSupabaseServerClient()` yang sama.
- Helper tersebut selalu membaca `cookies()`.
- Halaman publik berbasis Supabase masih dynamic dan response production sebelumnya `private, no-store`/`X-Vercel-Cache: MISS`.
- Belum ada shared data cache, cache tag, TTL, atau invalidasi mutation.
- Admin blog/review memiliki Server Action; services/team belum memiliki mutation aplikasi dan kemungkinan diubah langsung melalui Supabase.

Data publik yang masuk scope:

| Domain | Isi | Cache tag | Mutation aplikasi | Fallback freshness |
| --- | --- | --- | --- | --- |
| Services | category, item, item detail published | `public-services` | Belum ada | TTL |
| Blog | list dan detail published | `public-blog` | Ada | Invalidasi + TTL |
| Team | member visible | `public-team` | Belum ada | TTL |
| Reviews | review published | `public-reviews` | Ada | Invalidasi + TTL |

Data yang dilarang masuk shared cache:

- user/profile/role/session,
- halaman dan query admin,
- draft atau preview blog,
- contact messages,
- review request dan token status,
- hasil autentikasi,
- data yang hanya boleh dibaca role tertentu,
- secret atau service-role credential.

## 4. Tahap A — FE-01 scoped Data Cache

### 4.1 Sasaran

- Mengurangi query Supabase berulang lintas request.
- Menurunkan Function duration dan TTFB setelah cache terisi.
- Tidak mengubah tampilan, URL, metadata, atau perilaku session.
- Menyediakan invalidasi yang benar sebelum cache dibuka ke production.

### 4.2 Rancangan public client

Buat public server client terpisah dengan karakteristik:

- menggunakan Supabase anon key,
- hanya berjalan di server,
- tidak memanggil `cookies()` atau `headers()`,
- tidak menyimpan atau me-refresh session,
- tidak menggunakan service-role key,
- tetap bergantung pada RLS anon,
- hanya dipakai oleh query dengan filter published/visible.

Client cookie-bound yang sudah ada tetap digunakan untuk auth, admin, preview, token, dan mutation.

### 4.3 Rancangan cache

- Bungkus loader publik dengan `unstable_cache`.
- Gunakan TTL awal 900 detik/15 menit.
- Gunakan tag domain pada tabel baseline.
- Argumen seperti `slug` dan `limit` wajib menjadi bagian cache key.
- Gunakan tag domain yang sama untuk list, detail, dan metadata terkait agar mutation tidak meninggalkan kombinasi konten lama/baru.
- Jangan cache error/rejected Promise sebagai fallback data.
- Jangan tambahkan `force-static`, full-route cache, Cache Components, atau webhook pada tahap ini.
- Gunakan `connection()` pada list page publik yang menjadi statis otomatis setelah cookie dipisahkan. Ini mempertahankan dynamic rendering dan mencegah Full Route Cache pada Tahap A tanpa memasukkan request context ke shared data cache.

### 4.4 Data minimization wajib

Public reviews tidak boleh memakai `select('*')`. Query hanya boleh mengambil field yang dirender:

- `id`,
- `name`,
- `message`,
- `created_at`.

Kolom `email`, status internal, dan field lain yang tidak diperlukan tidak boleh masuk shared cache atau RSC/client payload.

Prinsip yang sama diterapkan pada public loader lain bila ditemukan field privat atau tidak diperlukan. Perubahan select tidak boleh menghilangkan field yang dipakai metadata, structured data, atau UI.

### 4.5 Invalidasi mutation

Invalidasi hanya dipanggil setelah mutation database berhasil.

| Mutation | Tindakan cache |
| --- | --- |
| Publish/unpublish blog | Expire `public-blog` segera |
| Edit blog | Expire `public-blog` segera karena post mungkin sudah published |
| Delete blog | Expire `public-blog` setelah row dan asset berhasil ditangani |
| Save draft baru | Tidak perlu invalidasi public cache |
| Publish/unpublish review | Expire `public-reviews` segera |
| Delete review | Expire `public-reviews` segera |
| Toggle field review yang tidak dipakai publik | Tidak perlu, kecuali output publik kemudian memakai field tersebut |
| Submit review baru yang belum published | Tidak perlu invalidasi public cache |

Gunakan invalidasi blocking/read-your-own-writes dari Server Action agar unpublish/delete tidak menyajikan versi lama satu kali. Bila perilaku API terhadap cache bridge berbeda pada versi Next.js yang terpasang, pengujian integrasi menjadi sumber keputusan dan implementasi harus memakai mekanisme immediate-expiry yang didukung.

### 4.6 Perubahan langsung melalui Supabase

Services dan team belum memiliki mutation aplikasi. Pada Tahap A:

- perubahan langsung di Supabase boleh terlambat mengikuti TTL 15 menit,
- cache baru direvalidasi ketika ada request setelah entry dianggap stale,
- dokumentasikan waktu edit dan waktu konten terlihat saat pengujian,
- jangan membuat public revalidation endpoint tanpa secret dan validasi request.

Webhook revalidation menjadi opsi terpisah bila kebutuhan operasional membuktikan TTL tidak cukup.

### 4.7 Acceptance criteria Tahap A

- Production build berhasil.
- Seluruh route publik dan admin utama dapat dibuka di Preview.
- Public client tidak membaca cookies dan tidak memakai service-role key.
- Cache key untuk slug/limit tidak bertabrakan.
- Request berikutnya tidak mengulang query Supabase yang sudah ter-cache.
- Publish, unpublish, edit, dan delete menginvalidasi domain yang benar.
- Draft dan data admin tidak muncul pada cache publik.
- Email review tidak ada pada HTML/RSC/browser payload.
- Cold-cache error tidak diganti dengan data kosong palsu.
- UI, metadata, structured data, canonical, dan status HTTP sama dengan baseline.
- Function duration/TTFB dicatat sebelum dan sesudah.

Catatan observability: data-cache-only tidak menjamin `X-Vercel-Cache: HIT`, karena route dapat tetap dieksekusi secara dynamic. Keberhasilan dinilai dari query count, Function duration, log Supabase, dan TTFB, bukan hanya header response cache.

## 5. Pekerjaan FE sebelum Tahap B

Tahap B baru boleh dimulai setelah:

1. FE-01 Tahap A stabil di production dan invalidasi terbukti.
2. FE-02 sudah menunjukkan eksekusi Function di `sin1` pada production.
3. FE-03 menyelesaikan deduplikasi metadata dan page, terutama pada cold cache.
4. FE-04 menghilangkan query layanan yang redundan/berantai tanpa mengubah hasil.
5. FE-05 menyediakan loading/Suspense boundary yang telah disetujui.
6. FE-15 menyediakan error boundary/recovery yang benar.
7. FE-16 membedakan not-found yang sah dari gangguan Supabase/permission/timeout.
8. FE-10 berstatus deferred secara eksplisit dengan baseline profiling putaran pertama tersimpan; penyelesaiannya tetap wajib dijadwalkan sebelum arsitektur V2 dinyatakan final.
9. Seluruh perubahan di atas memiliki Preview verification dan catatan rollback.

Alasan dependency:

- Cache Components memakai Suspense untuk memisahkan static shell dan dynamic content.
- Metadata/body yang masih menggandakan query membuat cold-miss lebih sulit dianalisis.
- Error database tidak boleh dikonversi menjadi cached 404 atau fallback SEO.
- Unpublish/delete harus menghasilkan status dan metadata yang konsisten sebelum full cached shell dipertimbangkan.

### 5.1 Catatan visual FE-15

- Implementasi awal `error.tsx` dan `not-found.tsx` adalah functional baseline untuk recovery, accessibility, dan reliability; tampilannya belum dianggap sebagai final design system Diputra.
- Ketika arahan visual/design system Diputra berikutnya tersedia, error dan not-found state perlu direview serta disesuaikan secara khusus agar hierarchy, spacing, warna, copy, dan responsive behavior konsisten dengan halaman publik lain.
- Penyesuaian visual berikutnya tidak boleh menghilangkan heading semantik, focus-visible, retry manual, link pemulihan, robots `noindex`, sanitasi detail error, atau perbedaan perilaku error versus not-found.
- Redesign state tersebut harus dipisahkan dari FE-16 agar perubahan visual tidak tercampur dengan perubahan klasifikasi error data.

### 5.2 Status deferred FE-10

- FE-10 belum selesai dan tidak boleh ditandai sebagai solved. Audit source serta trace development putaran pertama tersimpan di `Optimization_FE_Context.md` sebagai baseline awal.
- Implementasi ditunda karena bukti saat ini baru menunjukkan biaya main-thread, paint, dan layerization secara umum; penyebab visual tunggal belum terisolasi. Mengubah shadow, overlay, fixed image, filter, transform, atau hierarchy sekarang masih berisiko mengubah desain tanpa bukti manfaat yang cukup.
- FE-10 dijadwalkan kembali setelah FE-16 serta batch FE-11/FE-12/FE-13 selesai. Penundaan ini tidak menghapus pekerjaan tersebut dari scope V2.
- Putaran berikutnya harus memakai production build dengan minimal tiga rekaman per route, memisahkan passive scroll dari click/hover/carousel, lalu membandingkan dropped frame, style/layout, paint, dan layerization.
- Eksperimen efek visual dilakukan sementara dan satu variabel per trace. Source visual hanya boleh diubah setelah hasilnya berulang, manfaatnya terukur, dan perubahan tampilannya disetujui.
- Exit criteria FE-10: baseline production yang dapat dibandingkan, penyebab dominan yang terisolasi, keputusan implementasi atau documented acceptance, serta Preview verification tanpa regresi visual.

## 6. Tahap B — Migrasi final ke Next.js 16 Cache Components

### 6.1 Target akhir

- Aktifkan `cacheComponents: true` pada `next.config.ts`.
- Ganti seluruh public `unstable_cache` dengan function-level `use cache`.
- Gunakan `cacheLife` eksplisit; jangan bergantung pada default yang tidak terdokumentasi di project.
- Gunakan `cacheTag` untuk empat domain publik.
- Pertahankan pemisahan public anon client dan authenticated client.
- Pertahankan invalidasi Server Action.
- Hapus semua import/pemakaian `unstable_cache` setelah parity terverifikasi.
- Jangan memakai `use cache: private` untuk admin/auth pada migrasi awal.
- Evaluasi `use cache: remote` hanya jika metrik membuktikan cache default tidak cukup dan biaya/plan telah disetujui.

### 6.2 Strategi migrasi

1. Rekam baseline Tahap A: output HTML/head, status, query count, TTFB, Function duration, dan Search Console.
2. Buat migration branch khusus; jangan dicampur dengan perubahan UI atau upgrade dependency besar.
3. Aktifkan Cache Components hanya pada Preview.
4. Audit seluruh `cookies()`, `headers()`, `searchParams`, `Date.now()`, `new Date()`, dan sumber data request-time.
5. Tempatkan dynamic work di boundary yang benar dan gunakan loading UI FE-05.
6. Migrasikan satu domain cache per langkah: services, blog, team, reviews.
7. Bandingkan metadata dan body antara cold/warm response.
8. Uji semua admin/auth route untuk memastikan tidak ada session leakage atau prerender error.
9. Jalankan SEO regression suite pada Preview.
10. Deploy Production hanya jika seluruh acceptance gate lulus.

### 6.3 Definisi utang cache telah lunas

Migrasi dianggap selesai hanya bila:

- tidak ada `unstable_cache` pada source,
- penanda `connection()` yang hanya dipakai untuk mempertahankan data-cache-only Tahap A sudah dihapus atau ditempatkan ulang berdasarkan rancangan Cache Components,
- `cacheComponents` aktif dan build stabil,
- seluruh public cache memakai `use cache`, `cacheLife`, dan `cacheTag`,
- tidak ada request API di shared cache scope,
- session/admin tetap uncached dan terisolasi,
- invalidasi mutation dan TTL fallback lulus pengujian,
- output SEO setara dengan baseline,
- dokumentasi FE-01 dan arsitektur diperbarui menjadi status selesai.

## 7. Guardrail SEO dan indexing

### 7.1 Hal yang harus tetap identik

Implementasi Tahap A maupun B tidak boleh mengubah:

- URL dan slug,
- internal link `href`,
- HTTP `200`, `404`, `410`, dan redirect yang benar,
- `<title>` dan meta description,
- canonical URL,
- robots meta/header,
- Open Graph,
- JSON-LD/structured data,
- heading dan konten utama,
- sitemap dan `lastModified`,
- visibility konten tanpa interaksi user.

Konten utama harus tetap tersedia melalui server-rendered atau pre-rendered output. Jangan memindahkan isi utama ke client-only fetch atau membuatnya bergantung pada scroll/click.

### 7.2 Risiko SEO yang harus dicegah

| Risiko | Dampak | Guardrail |
| --- | --- | --- |
| Metadata dan body memakai versi cache berbeda | Judul/deskripsi tidak cocok dengan isi | Satu tag domain dan loader konsisten |
| Artikel di-unpublish masih dicache | URL lama tetap menyajikan `200` | Immediate invalidation dan uji status |
| Error Supabase dianggap not-found | Valid URL dapat menjadi cached 404 | Selesaikan FE-16 sebelum Tahap B |
| Missing slug mengembalikan halaman kosong `200` | Soft 404 | Pastikan `notFound()` menghasilkan 404 |
| Static shell tidak memuat konten utama | Indexing bergantung pada render lanjutan | Pertahankan server/pre-rendered content |
| Preview terindeks | Duplikasi/canonical conflict | Gunakan deployment protection/noindex Preview, bukan noindex Production |
| Data session masuk shared cache | Kebocoran dan output berbeda antar crawler/user | Cache hanya anon public data |
| Sitemap tertinggal dari sumber data | Discovery blog tidak lengkap | Audit sitemap terhadap Supabase sebelum Tahap B selesai |

### 7.3 Baseline sebelum deployment

Simpan bukti untuk URL representatif:

- `/`,
- `/about`,
- `/services`,
- satu category service,
- satu detail service,
- `/blog`,
- satu blog published,
- satu slug blog tidak ada.

Untuk masing-masing URL catat:

- status HTTP,
- canonical,
- robots,
- title dan description,
- H1 dan teks utama,
- JSON-LD bila ada,
- link internal utama,
- hasil HTML tanpa interaksi,
- screenshot atau snapshot rendered page.

Di Google Search Console simpan baseline:

- Page Indexing,
- URL Inspection untuk URL representatif,
- Core Web Vitals,
- Performance: clicks, impressions, CTR, dan average position,
- enhancement/structured-data report bila tersedia.

### 7.4 Verifikasi sesudah deployment

- Bandingkan HTML/head sebelum dan sesudah secara otomatis atau manual.
- Gunakan URL Inspection untuk memastikan Google melihat konten dan canonical yang sama.
- Gunakan Rich Results Test untuk halaman dengan JSON-LD.
- Pantau error 5xx, soft 404, excluded-by-noindex, duplicate canonical, dan crawl anomaly.
- Pantau Search Console minimal 14 hari dan bandingkan jendela 28 hari bila volume data cukup.
- Jangan menilai indexing hanya dari query `site:`; gunakan Search Console sebagai sumber utama.

Caching tidak dengan sendirinya mengubah ranking. Response yang lebih cepat dapat memperbaiki pengalaman halaman, tetapi tidak menjamin kenaikan posisi. Prioritas SEO V2 adalah mempertahankan output dan status yang benar sambil mengurangi latency.

## 8. Rollback

Tahap A:

- lepaskan wrapper public cache dan kembalikan export ke uncached public loader,
- pertahankan pemangkasan kolom privat review,
- deploy ulang dan verifikasi query langsung kembali berjalan.

Tahap B:

- rollback deployment/commit aktivasi Cache Components,
- jangan menghapus implementasi Tahap A sebelum Preview Tahap B sepenuhnya lulus,
- pertahankan satu commit boundary yang memungkinkan kembali ke Tahap A,
- purge/invalidate data cache hanya bila diperlukan dan targetnya sudah diverifikasi.

Rollback tidak boleh mengubah schema, data, RLS, region Supabase, atau credential.

## 9. Referensi resmi

- Next.js — `unstable_cache`: https://nextjs.org/docs/app/api-reference/functions/unstable_cache
- Next.js — caching tanpa Cache Components: https://nextjs.org/docs/app/guides/caching-without-cache-components
- Next.js — `use cache`: https://nextjs.org/docs/app/api-reference/directives/use-cache
- Next.js — Cache Components: https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
- Next.js — `updateTag`: https://nextjs.org/docs/app/api-reference/functions/updateTag
- Next.js — `revalidateTag`: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- Google Search Central — JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Search Central — page experience: https://developers.google.com/search/docs/appearance/page-experience
- Google Search Central — crawling errors dan soft 404: https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors
- Google Search Central — canonicalization: https://developers.google.com/search/docs/crawling-indexing/canonicalization

## 10. Batas keputusan berikutnya

Dokumen ini menyetujui arsitektur bertahap, tetapi belum menerapkan FE-01. Sebelum source diubah, implementasi Tahap A harus mengikuti seluruh keputusan yang sudah dicatat:

- scoped data cache,
- public-only,
- TTL 15 menit,
- immediate invalidation untuk blog/review,
- services/team tanpa webhook pada tahap awal,
- pemangkasan kolom review publik,
- tanpa Cache Components/full-route cache/perubahan visual.
