# Problem dan Audit V1

## 1. Tujuan dan batas audit

Dokumen ini mencatat masalah yang ditemukan ketika menyusun `dokumentasi_V1.md`, khususnya:

- lambat saat membuka halaman baru di production,
- lag atau rasa berat saat scroll,
- risiko dan ketidakkonsistenan integrasi Supabase,
- urutan perbaikan tanpa menerapkan perubahan kode pada audit ini.

Tidak ada source code, migration, policy, atau konfigurasi production yang diubah.

Pembaruan klasifikasi 31 Agustus 2026 juga hanya mengubah dokumen ini. Seluruh temuan awal V1 tetap dipertahankan, lalu dilengkapi dengan peta kategori dan temuan tambahan hasil validasi source saat ini.

Tingkat kepastian:

- **Terbukti**: langsung terlihat dari source, build, schema, atau respons HTTP.
- **Sangat mungkin**: ada bukti teknis kuat, tetapi perlu trace browser/database untuk mengukur kontribusinya.
- **Perlu verifikasi**: kandidat yang harus diuji sebelum diubah.

## 2. Ringkasan penyebab utama frontend lambat

Penyebab terbesar perpindahan halaman bukan ukuran gambar lama, melainkan jalur render server:

1. Semua halaman yang membaca Supabase menjadi dynamic dan tidak memakai cache response.
2. Respons production terukur memiliki TTFB tinggi dan selalu `X-Vercel-Cache: MISS`.
3. Metadata dan halaman dinamis menjalankan pembacaan data yang sama; halaman layanan juga memiliki query berantai.
4. Function production terindikasi berjalan di `iad1` (Washington, D.C.) walaupun request masuk melalui `sin1` (Singapore), sehingga jarak compute, database, dan mayoritas user Bali perlu diperiksa.
5. Tidak ada `loading.tsx`/Suspense boundary publik, sehingga waktu tunggu server terasa sebagai navigasi yang diam.

Penyebab utama rasa berat saat scroll:

1. Lenis berjalan global dan meminta animation frame terus-menerus.
2. Loop `requestAnimationFrame` tidak dibatalkan ketika Lenis dihancurkan.
3. Native `scroll-behavior: smooth` aktif bersamaan dengan Lenis.
4. Banyak section memakai Framer Motion `whileInView`, menambah JavaScript, IntersectionObserver, hydration, dan animasi transform saat scroll.
5. Carousel review mengaktifkan modul Swiper Mousewheel yang berinteraksi langsung dengan input scroll.

## 3. Bukti production

Pengukuran dilakukan 16 Agustus 2026 dari lingkungan audit, sehingga bukan pengganti Lighthouse dari perangkat user Bali.

| Request                  | Status |      TTFB | Total download HTML |
| ------------------------ | -----: | --------: | ------------------: |
| Home, pengukuran pertama |    200 | 2,452 dtk |           2,734 dtk |
| About                    |    200 | 1,182 dtk |           1,403 dtk |
| Services                 |    200 | 1,186 dtk |           1,448 dtk |
| Home, pengukuran ulang 1 |    200 | 1,411 dtk |           1,719 dtk |
| Home, pengukuran ulang 2 |    200 | 0,776 dtk |           1,051 dtk |

Header yang konsisten:

```text
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
X-Vercel-Cache: MISS
X-Vercel-Id: sin1::iad1::...
```

Hasil build production:

- `/contact` static.
- `/`, `/about`, `/blog`, `/blog/[slug]`, `/services`, dan seluruh detail layanan dynamic.
- Build berhasil tanpa error TypeScript.

Interpretasi:

- Halaman statis dapat dilayani CDN, tetapi halaman berbasis Supabase harus menunggu function dan query pada setiap request.
- `sin1::iad1` sangat mengindikasikan ingress Singapore lalu compute `iad1`. Vercel mendokumentasikan `iad1` sebagai default function region. Region Supabase belum diverifikasi dari repository.
- Cache MISS/no-store menjelaskan mengapa navigasi yang berulang tetap membayar biaya render dan query.

## 4. Peta masalah berdasarkan kategori

Pengelompokan di bawah memakai **kategori utama** agar urutan pekerjaan lebih mudah dipisahkan. Beberapa masalah bersifat lintas kategori; misalnya caching adalah masalah teknis data delivery, tetapi dampaknya langsung terasa sebagai UX navigasi yang lambat.

| Kategori utama                                       | ID masalah                                             | Fokus                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **UI/UX client dan perceived performance**           | FE-05, FE-06, FE-07, FE-08, FE-09, FE-10, FE-14, FE-15 | Kelancaran scroll, respons navigasi, motion, interaksi input, dan feedback saat loading/error.        |
| **Logika frontend dan data fetching**                | FE-03, FE-04, FE-11, FE-16, DB-09                      | Deduplikasi, urutan query, payload, pemetaan error, dan konsistensi sumber data.                      |
| **Caching dan data delivery**                        | FE-01, DB-14                                           | Cache response/data publik, invalidasi konten, dan TTL asset immutable.                               |
| **Infrastruktur dan deployment**                     | FE-02                                                  | Jarak region user, Vercel Function, dan Supabase.                                                     |
| **Keamanan backend**                                 | DB-01, DB-02, DB-03, DB-04, DB-12, DB-13, DB-15        | Otorisasi role, akun nonaktif, Storage, function berprivilege, abuse, dan redirect.                   |
| **Logika dan correctness database**                  | DB-06, DB-07, DB-08, DB-10, DB-16                      | Timestamp, validasi, kontrak schema, type safety, dan function obsolete.                              |
| **Performa database**                                | DB-05                                                  | Index berdasarkan pola filter/order dan bukti query plan.                                             |
| **Reliability, local development, dan housekeeping** | FE-12, FE-13, DB-11, OPS-01                            | Reproduksibilitas lokal, ketergantungan environment, asset, dan resource yang bukan bottleneck utama. |

### 4.1 Batas fase UI/UX pertama tanpa perubahan tampilan

Untuk memenuhi target optimasi client tanpa redesign, masalah UI/UX perlu dipisahkan lagi:

1. **Kandidat optimasi perilaku/non-visual:** FE-06, FE-07, FE-09, dan FE-14. Perubahan harus mempertahankan layout, warna, tipografi, konten, serta hierarchy komponen yang terlihat.
2. **Kandidat optimasi internal dengan pembandingan visual:** FE-08. Final state harus sama; timing motion dan hydration harus diuji agar tidak menimbulkan flash atau perubahan animasi yang tidak disengaja.
3. **Profil dahulu, jangan ubah style tanpa bukti:** FE-10. Audit paint/compositing boleh dilakukan, tetapi perubahan shadow, overlay, fixed image, atau transform berarti perubahan visual dan berada di luar batas fase ketat ini.
4. **Memerlukan state UI baru:** FE-05 dan FE-15. Loading, skeleton, error, atau retry meningkatkan perceived UX, tetapi menambah tampilan baru pada kondisi tertentu. Tunda atau minta persetujuan desain terpisah bila batas “tidak ada perubahan tampilan sama sekali” diterapkan secara literal.
5. **Berdampak besar pada UX tetapi bukan pekerjaan UI client murni:** FE-01 sampai FE-04. Caching, region, deduplikasi, dan query berantai sebaiknya menjadi fase berikutnya karena menyentuh data layer/deployment.

Dengan batas tersebut, fase UI/UX pertama tidak boleh dipakai sebagai alasan untuk sekaligus mengubah query, RLS, migration, cache production, region deployment, atau tampilan normal halaman.

## 5. Rincian masalah frontend dan cara mengatasinya

### FE-01 — Halaman publik Supabase selalu dynamic tanpa cache

- Prioritas: **P0 performa**
- Kepastian: **Terbukti**
- Bukti: helper server selalu memanggil `cookies()`; build menandai semua route data sebagai dynamic; production mengirim `no-store` dan cache MISS.
- Dampak: setiap navigasi menunggu Vercel Function dan Supabase walaupun konten publik jarang berubah.
- Cara mengatasi:
  - Pisahkan client query publik anonim yang tidak membaca cookie dari client SSR ber-session.
  - Cache fungsi/data publik dengan mekanisme Next.js 16 yang sesuai (`use cache` + cache lifetime/tag bila Cache Components diaktifkan, atau strategi cache yang kompatibel dengan konfigurasi project).
  - Gunakan invalidasi berbasis tag setelah admin publish/update/delete.
  - Pertimbangkan prerender/ISR untuk kategori, layanan, blog list, dan blog detail.
- Verifikasi selesai bila: build tidak lagi menandai semua halaman publik sebagai dynamic, atau respons dynamic yang disengaja memiliki cache/revalidation terukur.

### FE-02 — Region function kemungkinan jauh dari user dan/atau database

- Prioritas: **P0 performa**
- Kepastian: **Sangat mungkin**
- Bukti: `X-Vercel-Id` memperlihatkan `sin1::iad1`; repository tidak memiliki `vercel.json` atau `preferredRegion`.
- Dampak: request Bali/Singapore menuju compute Washington lalu function memanggil Supabase; setiap query berantai memperbesar latency.
- Cara mengatasi:
  - Cek region Supabase di dashboard.
  - Tempatkan Vercel Function sedekat mungkin dengan region Supabase, bukan hanya dekat dengan user.
  - Bila Supabase berada di Asia Pacific, evaluasi region Vercel Asia yang paling dekat dan tersedia pada plan.
  - Ukur kembali p50/p75/p95 sebelum dan sesudah; jangan mengubah region berdasarkan asumsi saja.

### FE-03 — Data dinamis dibaca lagi untuk metadata dan body

- Prioritas: **P1**
- Kepastian: **Terbukti pada struktur kode; jumlah request aktual perlu trace**
- Bukti:
  - `/blog/[slug]`: `getPublishedBlogPostBySlug` dipanggil oleh `generateMetadata` dan page.
  - `/services/[category]`: kategori dibaca di metadata, page, dan sekali lagi di dalam helper item.
  - `/services/[category]/[service]`: helper detail dipanggil oleh metadata dan page.
- Dampak: pembacaan identik berpotensi terulang dalam satu render/navigation.
- Cara mengatasi:
  - Bungkus data loader yang dipakai metadata dan page dengan React `cache` agar deduplikasi eksplisit ketika fetch bawaan tidak dipanggil langsung.
  - Pastikan key cache mencakup slug category/service.
  - Log query/fetch di development untuk memastikan jumlah aktual sebelum dan sesudah.

### FE-04 — Query layanan berantai dan redundan

- Prioritas: **P1**
- Kepastian: **Terbukti**
- Bukti: detail melakukan category -> item -> details secara serial. Daftar item memanggil category dahulu walaupun page sudah mengambil category.
- Dampak: latency total adalah penjumlahan beberapa round-trip.
- Cara mengatasi:
  - Gunakan satu query relasi PostgREST atau RPC/view untuk mengambil category, item, dan details.
  - Atau teruskan `category.id`/object yang sudah didapat agar tidak query ulang.
  - Jalankan query yang benar-benar independen secara paralel.

### FE-05 — Tidak ada loading UI per route publik

- Prioritas: **P1 perceived performance**
- Kepastian: **Terbukti**
- Bukti: tidak ditemukan `loading.tsx`; data utama ditunggu sebelum page dikembalikan.
- Dampak: user melihat halaman lama tanpa feedback sehingga navigasi terasa macet.
- Cara mengatasi:
  - Tambahkan `loading.tsx` pada segment publik yang dynamic.
  - Pecah bagian lambat dengan Suspense dan skeleton yang stabil ukurannya.
  - Jangan memakai loading UI untuk menutupi TTFB; tetap selesaikan FE-01 sampai FE-04.

### FE-06 — Lenis menjalankan RAF global tanpa mekanisme pembatalan loop

- Prioritas: **P0 scroll**
- Kepastian: **Terbukti**
- Bukti: `initLenis()` memanggil `requestAnimationFrame(raf)` berulang; cleanup hanya `lenis.destroy()` dan tidak memanggil `cancelAnimationFrame` atau menghentikan callback.
- Dampak: callback tetap terjadwal setiap frame dan menambah pekerjaan main thread. Jika root pernah remount, loop lama dapat terus hidup.
- Cara mengatasi:
  - Pilihan paling sederhana: hapus Lenis dan gunakan native scroll.
  - Jika tetap dipakai, simpan RAF id, hentikan loop pada cleanup, dan pastikan hanya ada satu instance.
  - Hentikan animasi ketika document hidden bila relevan.
  - Hormati `prefers-reduced-motion`.

### FE-07 — Dua sistem smooth scrolling aktif

- Prioritas: **P1 scroll**
- Kepastian: **Terbukti**
- Bukti: Lenis global aktif dan CSS menetapkan `html { scroll-behavior: smooth; }`.
- Dampak: perilaku scroll dapat saling bertumpuk, terasa tertunda, atau tidak natural pada device tertentu.
- Cara mengatasi: gunakan hanya satu sistem. Native scroll disarankan sebagai baseline, kemudian bandingkan trace sebelum mengaktifkan library kembali.

### FE-08 — Framer Motion dipakai hampir di setiap section

- Prioritas: **P1 scroll/hydration**
- Kepastian: **Terbukti**
- Bukti: komponen `Motion` memakai `whileInView`; puluhan instance ditemukan pada home, about, service, blog, contact, Q&A, dan detail. Build menghasilkan dua chunk terkait motion berukuran raw sekitar 85 KB dan 114 KB.
- Dampak: banyak komponen menjadi Client Component, perlu hydration, observer, dan update animasi ketika masuk viewport.
- Cara mengatasi:
  - Batasi motion pada elemen yang benar-benar bernilai secara visual.
  - Gunakan CSS transition untuk efek sederhana.
  - Jangan menganimasikan setiap card pada list panjang.
  - Sediakan reduced-motion dan lakukan profiling main thread/frames setelah setiap pengurangan.

### FE-09 — Swiper Mousewheel berkompetisi dengan scroll halaman

- Prioritas: **P1 scroll**
- Kepastian: **Sangat mungkin**
- Bukti: review carousel memuat modul `Mousewheel` dengan `forceToAxis` dan `releaseOnEdges`; chunk Swiper raw sekitar 88 KB.
- Dampak: event wheel di area carousel dapat terasa tertahan atau mengubah momentum scroll halaman; state juga berubah pada setiap perpindahan slide.
- Cara mengatasi:
  - Uji tanpa modul Mousewheel; pertahankan touch/drag dan tombol navigasi.
  - Load carousel secara lazy bila berada jauh di bawah fold.
  - Gunakan scroll-snap CSS bila kebutuhan carousel sederhana.

### FE-10 — Efek paint/compositing cukup berat

- Prioritas: **P2**
- Kepastian: **Perlu verifikasi**
- Bukti: banyak shadow besar, sticky navbar, fixed full-screen image pada About, overlay gradient, scale/rotate, brightness, dan transform saat hover/scroll.
- Dampak: GPU lemah/mobile dapat mengalami dropped frames walau network sudah cepat.
- Cara mengatasi:
  - Rekam Performance trace dan aktifkan paint flashing/layers.
  - Kurangi shadow/overlay besar pada elemen full-width.
  - Pastikan gambar fixed tidak memicu repaint berlebihan; pertimbangkan layout non-fixed pada mobile.
  - Terapkan `content-visibility: auto` secara selektif pada section panjang setelah pengujian.

### FE-11 — Query list memilih kolom lebih banyak dari yang dipakai

- Prioritas: **P2**
- Kepastian: **Terbukti**
- Bukti: kategori layanan dan beberapa review memakai `select('*')`.
- Dampak: payload dan serialisasi bertambah; efek kecil sekarang tetapi membesar saat schema/konten tumbuh.
- Cara mengatasi: pilih kolom eksplisit sesuai card/page dan jangan mengirim konten panjang yang tidak dirender.

### FE-12 — Asset lokal besar ada tetapi tidak menjadi penyebab utama saat ini

- Prioritas: **P3 housekeeping**
- Kepastian: **Terbukti**
- Bukti:
  - `about-hero-section.jpg` sekitar 11,9 MB.
  - `about-section.png` sekitar 8,6 MB.
  - Referensi aktif memakai versi WebP; referensi PNG/JPG besar ditemukan pada data test atau komentar.
- Dampak saat ini: tidak ikut terdownload pada route publik yang diaudit. Akan menjadi masalah besar bila dipakai kembali.
- Cara mengatasi: hapus dari deployment bila benar-benar tidak dibutuhkan atau kompres/konversi sebelum digunakan. Jangan menjadikan ini fokus pertama untuk masalah navigasi sekarang.

### FE-13 — Seluruh 9 weight Raleway diminta

- Prioritas: **P3**
- Kepastian: **Terbukti**
- Bukti: root layout meminta weight 100 sampai 900. Build menghasilkan beberapa file font dengan total raw sekitar 122 KB.
- Dampak: menambah resource dan parsing font; bukan penyebab utama TTFB/scroll.
- Cara mengatasi: batasi ke weight yang benar-benar digunakan setelah audit CSS.

### FE-14 — Tautan internal About ke Contact memicu full page reload

- Kategori: **UI/UX client dan logika navigasi**
- Prioritas: **P1 perceived navigation**
- Kepastian: **Terbukti**
- Bukti: CTA `Contact Us` pada `src/components/layout/about-hero-section.tsx` memakai `<a href="/contact">`, sementara navigasi internal lain umumnya memakai `next/link`.
- Dampak: browser melakukan document navigation penuh, sehingga state client dan shell halaman dimuat ulang; transisi terasa lebih keras dan tidak memperoleh perilaku client-side navigation/prefetch App Router.
- Cara mengatasi: gunakan `Link` untuk URL internal sambil mempertahankan child, class, dan tampilan tombol yang sama. Tetap gunakan elemen `<a>` biasa untuk URL eksternal, `mailto:`, `tel:`, dan anchor halaman.
- Verifikasi selesai bila: klik CTA berpindah route tanpa request document penuh dan tampilan tombol tidak berubah.

### FE-15 — Tidak ada error boundary atau not-found UI khusus pada route publik

- Kategori: **UI/UX client dan reliability**
- Prioritas: **P1 failure UX**
- Kepastian: **Terbukti**
- Bukti: tidak ditemukan `error.tsx`, `global-error.tsx`, atau `not-found.tsx` di `src/app`; helper query publik melempar error Supabase.
- Dampak: kegagalan data sementara tidak memiliki recovery/retry yang dirancang untuk user, sedangkan slug yang tidak valid memakai fallback framework. Pengalaman gagal dapat terasa mendadak dan tidak konsisten dengan situs.
- Cara mengatasi:
  - Tambahkan boundary pada segment yang tepat dan logging server yang tidak membocorkan detail internal.
  - Sediakan retry hanya untuk kegagalan yang memang dapat dicoba ulang.
  - Pertahankan halaman normal tanpa perubahan; karena state error baru tetap merupakan tambahan tampilan, implementasinya perlu persetujuan bila scope fase pertama benar-benar non-visual.

### FE-16 — Error operasional Supabase dapat dipetakan sebagai 404

- Kategori: **Logika frontend/data fetching**
- Prioritas: **P1 correctness/reliability**
- Kepastian: **Terbukti dari alur kode**
- Bukti: halaman category dan detail layanan menangkap seluruh error dari loader dengan `catch` lalu memanggil `notFound()`. Loader memakai `.single()` dan melempar semua error, sehingga row tidak ditemukan, timeout, gangguan jaringan, dan error permission tidak dibedakan.
- Dampak: outage sementara atau salah konfigurasi dapat terlihat sebagai “halaman tidak ada”, menyulitkan user, monitoring, dan diagnosis production.
- Cara mengatasi: bedakan hasil `not found` yang sah dari error operasional; hanya panggil `notFound()` untuk row yang benar-benar tidak ada dan teruskan error lain ke error boundary/observability.

## 6. Masalah Supabase/database yang ditemukan

### DB-01 — User dapat mengubah role profilnya sendiri

- Prioritas: **P0 keamanan/kritis**
- Kepastian: **Terbukti dari policy**
- Bukti: policy `Update Own Profile` hanya membatasi `auth.uid() = id` dan tidak membatasi kolom. PostgreSQL RLS bekerja pada row, bukan otomatis pada kolom.
- Risiko: user yang sudah memiliki profil dapat mengirim update langsung ke `profiles.role` atau `profiles.is_active`, kemudian memperoleh hak admin melalui policy lain.
- Rekomendasi:
  - Cabut update umum pada tabel `profiles` untuk user biasa.
  - Bila user perlu mengubah atribut aman, expose RPC terbatas atau column-level grant hanya untuk field non-otorisasi.
  - Role dan `is_active` hanya boleh diubah oleh admin tepercaya melalui function/policy yang ketat.
  - Audit log perubahan role dan periksa riwayat production.

### DB-02 — Policy role tidak konsisten memeriksa `is_active`

- Prioritas: **P0 keamanan**
- Kepastian: **Terbukti**
- Bukti: sebagian policy blog/team memeriksa `is_active`, sedangkan policy review, review request, dan beberapa update blog hanya memeriksa role.
- Risiko: user nonaktif yang masih memiliki session dapat mencoba API Supabase langsung walaupun middleware menolak halaman admin.
- Rekomendasi: sentralisasi pemeriksaan role + aktif dalam helper function yang aman, lalu pakai konsisten pada semua policy.

### DB-03 — Bucket Storage tidak dibuat dan policy object terlalu luas

- Prioritas: **P1 reliability/security**
- Kepastian: **Terbukti**
- Bukti: migration memiliki policy `storage.objects`, tetapi tidak membuat bucket `images`. Policy upload/select/delete memberi akses kepada setiap user authenticated pada path blog tanpa pemeriksaan role atau `is_active`.
- Risiko: environment baru gagal upload tanpa bootstrap bucket. Contributor atau akun nonaktif yang masih memiliki session berpotensi menghapus atau mengganti media blog melalui Storage API langsung.
- Rekomendasi: buat migration idempotent untuk bucket; batasi operasi tulis/hapus ke staff aktif; tetapkan pembatasan path, MIME, dan ukuran; pertahankan public select hanya bila bucket memang harus public.

### DB-04 — Function `SECURITY DEFINER` belum semuanya menetapkan `search_path`

- Prioritas: **P1 keamanan**
- Kepastian: **Terbukti**
- Bukti: `check_review_request_status` dan `submit_review` adalah `SECURITY DEFINER` tanpa `SET search_path`; function publish sudah menetapkannya.
- Risiko: resolusi object yang tidak aman pada function berprivilege.
- Rekomendasi: tetapkan `search_path` eksplisit dan schema-qualify seluruh object/function. Supabase juga merekomendasikan ini untuk security-definer function.

### DB-05 — Index belum mengikuti pola filter + order utama

- Prioritas: **P1 saat data tumbuh**
- Kepastian: **Terbukti; dampak perlu EXPLAIN**
- Kandidat pola:
  - `blog_posts(status, published_at desc)`
  - `reviews(is_published, created_at desc)`
  - `services_categories(is_published, sort_order)`
  - `services_items(category_id, is_published, sort_order)`
  - `services_item_details(service_item_id, is_published, sort_order)`
  - `team_members(is_visible, display_order)`
- Rekomendasi: gunakan Supabase Index Advisor dan `EXPLAIN ANALYZE`; tambahkan hanya index yang terbukti membantu dan pertimbangkan partial index untuk row published/visible.

### DB-06 — `updated_at` blog tidak otomatis diperbarui

- Prioritas: **P1 data correctness**
- Kepastian: **Terbukti**
- Bukti: blog hanya memiliki trigger `set_published_at`; trigger `set_updated_at` dipasang pada tabel layanan, bukan blog. Update helper juga tidak mengirim `updated_at`.
- Dampak: metadata `updatedAt`, audit perubahan, dan sorting dapat menjadi tidak akurat.
- Rekomendasi: pasang trigger update timestamp yang konsisten pada blog dan tabel lain yang memiliki `updated_at`.

### DB-07 — Validasi nama review tidak sinkron dengan constraint

- Prioritas: **P1 correctness**
- Kepastian: **Terbukti**
- Bukti: RPC mengubah nama kosong menjadi `NULL`, sedangkan `reviews.name` adalah `NOT NULL`; RPC hanya memvalidasi message.
- Dampak: request dengan nama kosong gagal sebagai error database yang tidak spesifik.
- Rekomendasi: validasi nama/email/message di RPC dan aplikasi, serta kembalikan error domain yang jelas.

### DB-08 — Typo schema `question_answer.anwer`

- Prioritas: **P2 maintainability**
- Kepastian: **Terbukti**
- Dampak: client/types mudah salah memakai `answer`; integrasi FAQ berisiko gagal.
- Rekomendasi: migration rename terencana ke `answer`, update type/query atomik, dan siapkan backward compatibility bila API sudah dipakai.

### DB-09 — Q&A database belum dipakai frontend

- Prioritas: **P2 data drift**
- Kepastian: **Terbukti**
- Bukti: section Q&A membaca file statis, bukan `question_answer`.
- Dampak: perubahan Supabase tidak tampil dan ada dua sumber kebenaran.
- Rekomendasi: pilih satu sumber resmi; bila Supabase menjadi CMS, pindahkan query dan cache publik ke sana.

### DB-10 — Type Supabase ditulis manual dan sudah memiliki perbedaan

- Prioritas: **P2 maintainability**
- Kepastian: **Terbukti**
- Bukti: Supabase client tidak memakai generic `Database`; beberapa type memuat field yang tidak ada/berbeda, misalnya review `updated_at`, dan hasil query sering dipaksa dengan type assertion.
- Dampak: perubahan schema tidak terdeteksi TypeScript dan error muncul saat runtime.
- Rekomendasi: generate database types dari schema dan gunakan pada server/browser client.

### DB-11 — Seed belum dapat mereproduksi seluruh fungsi aplikasi

- Prioritas: **P2 reliability**
- Kepastian: **Terbukti**
- Bukti: seed hanya mengisi team dan layanan; tidak membuat Auth user, profile, bucket/policy Storage, blog, review, kontak, atau Q&A.
- Dampak: reset lokal tidak menghasilkan environment end-to-end untuk admin/blog/review.
- Rekomendasi: sediakan fixture non-rahasia dan script bootstrap Auth/profile/Storage untuk development.

### DB-12 — Policy blog select tumpang tindih

- Prioritas: **P2 clarity**
- Kepastian: **Terbukti**
- Bukti: ada policy public published dan policy authenticated read-all.
- Dampak: mungkin memang diinginkan untuk admin, tetapi semua authenticated user—termasuk contributor—dapat membaca draft/rejected melalui API.
- Rekomendasi: dokumentasikan keputusan ini atau batasi read-all ke staff yang benar-benar memerlukannya.

### DB-13 — Form kontak dapat diinsert langsung oleh anon tanpa anti-abuse di database

- Prioritas: **P1 abuse/cost**
- Kepastian: **Terbukti**
- Bukti: policy insert public adalah `WITH CHECK (true)`.
- Risiko: bot dapat melewati UI/Server Action dan insert langsung memakai anon key, menambah spam dan biaya.
- Rekomendasi: tambahkan rate limiting/CAPTCHA pada jalur publik, validasi server/database yang lebih ketat, monitoring, dan kebijakan retensi spam.

### DB-14 — Cache Storage upload hanya satu jam

- Prioritas: **P2 performa**
- Kepastian: **Terbukti**
- Bukti: file memakai nama UUID immutable tetapi `cacheControl` hanya `3600`.
- Dampak: browser/CDN lebih sering revalidate gambar yang secara praktik tidak berubah.
- Rekomendasi: setelah memastikan nama immutable, gunakan TTL panjang dan ganti URL saat file diganti.

### DB-15 — Callback menerima parameter `next` tanpa allowlist path lokal

- Prioritas: **P1 keamanan**
- Kepastian: **Terbukti dari kode; eksploitabilitas perlu uji**
- Bukti: callback membangun redirect dengan `new URL(next, url.origin)` dan tidak memastikan `next` adalah path internal.
- Risiko: open redirect setelah OAuth bila parameter callback dapat dikontrol.
- Rekomendasi: hanya izinkan relative path yang diawali `/` dan tolak protocol/host eksternal.

### DB-16 — Function publish lama merujuk kolom yang tidak ada

- Prioritas: **P2 correctness/cleanup**
- Kepastian: **Terbukti**
- Bukti: `set_blog_post_published` menjalankan update pada `blog_posts.is_published`, sedangkan tabel blog memakai kolom enum `status` dan tidak memiliki `is_published`.
- Dampak: RPC akan gagal bila dipanggil. Aplikasi saat ini tidak memakainya dan langsung mengubah `status`, sehingga masalah tersembunyi.
- Rekomendasi: hapus function bila obsolete atau ubah kontraknya agar memakai `status`, kemudian tambahkan test role dan transisi status.

## 7. Masalah operasional dan lingkungan lokal

### OPS-01 — Seed lokal masih bergantung pada asset Supabase production

- Kategori: **Reliability dan isolasi environment**
- Prioritas: **P2 local development**
- Kepastian: **Terbukti**
- Bukti: `supabase/seed.sql` mengisi `team_members.avatar_url` dengan URL project Supabase production; `next.config.ts` juga hanya mengizinkan hostname Storage production sebagai remote image source.
- Dampak: database lokal belum sepenuhnya mandiri, tampilan lokal tetap bergantung pada koneksi dan keberadaan asset cloud, serta pengujian Storage lokal belum merepresentasikan production secara end-to-end. Ketergantungan ini saat ini bersifat baca terhadap asset public, bukan bukti bahwa seed menulis ke database production.
- Rekomendasi:
  - Putuskan apakah fixture lokal memakai asset statis repository atau bucket Storage lokal.
  - Bila memakai Storage lokal, bootstrap bucket/fixture dan izinkan hostname lokal hanya pada development.
  - Jangan menghapus atau memindahkan asset production sebelum semua referensi seed/data dipetakan.

## 8. Urutan perbaikan yang disarankan

### Fase 0 — Keamanan sebelum optimasi

1. Tutup eskalasi role `profiles`.
2. Terapkan `is_active` pada semua policy staff.
3. Amankan `SECURITY DEFINER` search path.
4. Audit Storage policy dan OAuth `next` redirect.

### Fase 1 — Hilangkan bottleneck navigasi

1. Verifikasi dan selaraskan region Vercel Function dengan Supabase.
2. Pisahkan public data loader dari cookie-bound SSR client.
3. Cache/prerender data publik dan invalidasi setelah perubahan admin.
4. Dedup query metadata/page dan gabungkan query layanan berantai.
5. Tambahkan loading/Suspense untuk perceived performance.

Target awal yang masuk akal:

- cached public navigation TTFB p75 di bawah 300 ms dari target market,
- uncached dynamic TTFB p75 di bawah 800 ms,
- cache HIT/ISR terlihat pada route yang aman dicache.

### Fase 2 — Pulihkan kelancaran scroll

1. Perbaiki lifecycle RAF Lenis terlebih dahulu, lalu jadikan native scroll sebagai baseline pembanding.
2. Pastikan hanya satu sistem smooth scrolling aktif.
3. Uji tanpa Swiper Mousewheel.
4. Ganti CTA internal About dengan client-side navigation tanpa mengubah tampilan.
5. Kurangi jumlah Motion/observer dan Client Components hanya jika final state visual tetap sama.
6. Profil ulang pada mobile kelas menengah dengan CPU throttling.
7. Jangan mengurangi paint-heavy effect sebelum trace membuktikan bottleneck dan perubahan visual disetujui.

Target awal:

- tidak ada long task di atas 50 ms saat scroll biasa,
- frame rate stabil mendekati refresh rate perangkat,
- INP p75 di bawah 200 ms,
- dukungan `prefers-reduced-motion`.

### Fase 3 — Database dan maintainability

1. Generate Supabase types.
2. Tambah index hanya berdasarkan EXPLAIN/Index Advisor.
3. Lengkapi migration Storage dan seed development.
4. Perbaiki timestamp, typo Q&A, serta validasi RPC.
5. Tambahkan observability untuk Web Vitals, Vercel function duration, Supabase query latency/error, dan cache hit ratio.

## 9. Rencana verifikasi setelah implementasi

1. Jalankan build production dan bandingkan klasifikasi route.
2. Ukur TTFB minimal 20 kali dari lokasi target, pisahkan cold/warm.
3. Rekam Chrome Performance untuk home dan about sebelum/sesudah.
4. Jalankan Lighthouse mobile minimal tiga kali dan gunakan median.
5. Catat jumlah request Supabase per route.
6. Uji RLS dengan role anon, contributor, editor, admin, dan akun nonaktif.
7. Jalankan Supabase advisors dan `EXPLAIN ANALYZE` untuk query list/detail.
8. Uji upload, publish, delete media, submit kontak, token review valid/used/expired/revoked.
9. Pantau error dan Web Vitals minimal beberapa hari setelah deploy.
10. Pastikan navigasi internal tidak memicu document reload dan bandingkan scroll trace dengan tampilan halaman yang sama.
11. Simulasikan slug tidak ada dan gangguan Supabase secara terpisah; keduanya tidak boleh menghasilkan status/pesan yang sama.

## 10. Hal yang belum dapat dipastikan dalam audit ini

- Region Supabase production.
- Durasi setiap query Supabase dan query plan pada data production.
- Core Web Vitals real-user dan dropped-frame trace, karena browser interaktif tidak tersedia pada sesi audit.
- Isi Storage policy dan keberadaan orphan file production.
- Jumlah row serta distribusi data production.
- Apakah Vercel plan mendukung region yang dipilih dan apakah deployment setting mengoverride repository.

Kesimpulan diagnosis tetap kuat untuk jalur navigasi karena build, source, header cache, lokasi function, dan TTFB semuanya mengarah ke dynamic rendering tanpa cache yang menunggu beberapa round-trip Supabase. Untuk scroll, Lenis/RAF, Framer Motion, dan Swiper Mousewheel harus diuji satu per satu dengan Performance trace agar kontribusi masing-masing dapat diukur.
