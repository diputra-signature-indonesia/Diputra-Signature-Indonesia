# Optimization DB Context

Dokumen ini mencatat urutan pembahasan, keputusan, implementasi, dan verifikasi masalah Supabase/database Diputra Signature Indonesia setelah rangkaian optimasi frontend selesai.

Sumber masalah utama:

- bagian **6. Masalah Supabase/database yang ditemukan** pada `problem_V1.md`;
- migration baseline `supabase/migrations/20260814124226_remote_schema.sql`;
- pemakaian Supabase pada aplikasi Next.js saat ini.

## Peringatan penting

Project aktif di Production. Semua perubahan database harus dilakukan secara bertahap, dapat diaudit, dan diuji di Supabase lokal terlebih dahulu.

Aturan kerja:

1. Pastikan target environment sebelum menjalankan perintah Supabase atau SQL.
2. Jangan menampilkan anon key, service-role key, token, password, atau connection string di dokumentasi/log.
3. Jangan mengubah database Production tanpa persetujuan eksplisit.
4. Jangan mengedit migration baseline yang sudah merepresentasikan remote schema. Buat forward migration baru untuk setiap perubahan.
5. Jangan menggabungkan seluruh DB-01 sampai DB-16 ke satu migration/deployment besar.
6. Setiap perubahan policy harus diuji sebagai `anon`, `authenticated`, setiap role aplikasi, dan akun nonaktif.
7. Setiap destructive change seperti drop function/column/table membutuhkan pemeriksaan pemakaian, backup, dan rollback plan.
8. Perubahan source aplikasi yang menjadi pasangan migration harus berada pada deployment yang kompatibel dengan schema lama dan baru, atau dirilis secara atomik bila compatibility tidak mungkin.
9. Simpan perubahan yang sudah ada di worktree; jangan reset atau menimpa dokumentasi/pekerjaan FE.
10. Jangan commit kecuali diminta.

## Status awal — 6 September 2026

Status: **audit dan penyusunan urutan selesai; implementasi DB belum dimulai**.

Kondisi yang telah diverifikasi secara read-only:

- repository memiliki satu migration baseline hasil remote schema dan belum memiliki forward migration perbaikan DB;
- `Update Own Profile` masih memungkinkan user authenticated memperbarui row profilnya sendiri tanpa proteksi kolom `role` dan `is_active`;
- pemeriksaan `is_active` belum konsisten pada policy blog, review, review request, dan helper role;
- bucket `images` tidak dibuat oleh migration, sedangkan Storage policy write/delete hanya memeriksa status `authenticated` dan path;
- `check_review_request_status` dan `submit_review` masih `SECURITY DEFINER` tanpa fixed `search_path`;
- function lama `set_blog_post_published` masih menulis kolom `is_published` yang tidak ada pada `blog_posts` dan tidak dipakai oleh source aplikasi;
- `blog_posts.updated_at` belum memiliki trigger pembaruan;
- `submit_review` mengubah nama kosong menjadi `NULL`, sementara `reviews.name` adalah `NOT NULL`;
- kolom `question_answer.anwer` masih typo dan Q&A frontend masih membaca `src/data/dsi-qna.ts`;
- Supabase client belum memakai generated `Database` types;
- seed belum mereproduksi Auth, profile, Storage, blog, review, contact, dan Q&A secara end-to-end;
- public contact insert masih memakai `WITH CHECK (true)`;
- upload Storage memakai nama UUID dan `upsert: false`, tetapi `cacheControl` masih `3600`;
- OAuth callback masih menerima parameter `next` tanpa validasi path lokal;
- index yang tersedia belum mencakup pola filter + order query publik utama.

Catatan worktree saat dokumen dibuat:

- `V2_Baseline_Architecture.md` memiliki perubahan dokumentasi yang belum di-commit;
- tidak ada source atau migration database yang diubah pada tahap ini.

## Prinsip penentuan urutan

Urutan penyelesaian memakai aturan berikut:

1. **Eksploitabilitas dan kebocoran otorisasi lebih dahulu daripada performa.**
2. **Fondasi policy lebih dahulu daripada policy turunan.** DB-01 dan DB-02 harus selesai sebelum policy Storage/blog dirapikan.
3. **Function berprivilege diaudit sebelum correctness biasa.** `SECURITY DEFINER`, grant execute, dan function obsolete diperiksa sebagai satu permukaan serangan.
4. **Keputusan sumber data mendahului perubahan schema.** DB-09 harus diputuskan sebelum DB-08.
5. **Schema distabilkan sebelum generated types dan fixture final.** DB-10 dan DB-11 tidak dijadikan langkah pertama.
6. **Index ditambah berdasarkan bukti.** Cache frontend yang sudah aktif membuat penambahan index tanpa `EXPLAIN` semakin tidak tepat.
7. **Storage TTL dikerjakan setelah kontrak file immutable dan Storage policy aman.**

## Paket pembahasan dan urutan penyelesaian

Masalah dikelompokkan berdasarkan keputusan bersama dan dependency teknis. Satu paket dibahas sekaligus dengan format: diagnosis, opsi, rekomendasi, risiko, keputusan pemilik project, urutan implementasi, dan rencana pengujian.

| Paket | DB-ID | Tema dan keputusan bersama | Urutan |
| --- | --- | --- | ---: |
| Preflight | Tidak ada ID | Environment, baseline, backup, role-test matrix, dan rollback. | 0 |
| **DB-A — Core authorization** | DB-01, DB-02, DB-12 | Satu capability matrix untuk profile, akun aktif, role staff, dan akses seluruh status blog. | 1 |
| **DB-B — Function dan correctness** | DB-04, DB-06, DB-07, DB-16 | Audit function/trigger, fixed `search_path`, grant minimum, timestamp blog, validasi review, dan function obsolete. | 2 |
| **DB-C — Storage lifecycle** | DB-03, DB-14 | Bootstrap bucket, role Storage, path/MIME/size, immutable filename, dan cache TTL. | 3 |
| **DB-D — Public entry-point security** | DB-15, DB-13 | Validasi input publik pada OAuth redirect dan contact submission; anti-abuse serta jalur server tepercaya. | 4 |
| **DB-E — Q&A source of truth** | DB-09, DB-08 | Pilih sumber resmi Q&A lebih dahulu; rename schema hanya bila Supabase dipertahankan. | 5 |
| **DB-F — Query performance** | DB-05 | `EXPLAIN`, Index Advisor, row distribution, dan index yang terbukti berguna. | 6 |
| **DB-G — Type safety dan reproducibility** | DB-10, DB-11 | Generated Database types, Auth/Storage bootstrap, dan seed end-to-end setelah schema stabil. | 7 |

### Aturan penggabungan

- “Dibahas sekaligus” tidak otomatis berarti “satu migration besar”. Satu paket dapat menghasilkan beberapa forward migration atau commit kecil bila rollback dan deployment lebih aman.
- Setiap DB-ID tetap mempunyai acceptance criteria dan status sendiri meskipun keputusan diambil dalam satu sesi.
- DB-01 merupakan containment P0. Jika celah juga terkonfirmasi pada Production, perbaikannya tidak perlu menunggu seluruh DB-A/DB-B selesai.
- DB-15 dapat diimplementasikan tanpa menunggu desain anti-abuse DB-13 karena perubahan callback bersifat terisolasi.
- DB-14 hanya diterapkan sesudah policy dan kontrak immutable file DB-03 lulus.
- DB-08 tidak dikerjakan sebelum keputusan DB-09.
- DB-05 tetap berdiri sendiri agar pengukuran index tidak tercampur dengan perubahan schema/correctness.
- DB-10 dan penyelesaian penuh DB-11 dilakukan paling akhir. Fixture minimum khusus role-test tetap boleh dibuat pada Preflight.

### Urutan internal setiap paket

1. **DB-A:** DB-01 → DB-02 → DB-12.
2. **DB-B:** inventaris function/grant DB-04 → audit caller dan keputusan DB-16 → trigger DB-06 → validasi serta concurrency test DB-07.
3. **DB-C:** bucket/policy DB-03 → bukti immutable URL → TTL DB-14.
4. **DB-D:** allowlist redirect DB-15 → desain jalur server/anti-bot → penutupan direct anon insert DB-13.
5. **DB-E:** keputusan sumber Q&A DB-09 → migration DB-08 hanya bila diperlukan.
6. **DB-F:** baseline plan → kandidat index → before/after plan DB-05.
7. **DB-G:** schema freeze → generated types DB-10 → fixture/bootstrap lengkap DB-11 → reset dan test end-to-end.

## Keputusan yang dikunci per paket

### Paket DB-A — DB-01, DB-02, dan DB-12

Keputusan bersama yang perlu diberikan:

1. Apakah user biasa perlu mengubah field apa pun pada `profiles`.
2. Capability setiap role: contributor, editor, admin, dan super_admin.
3. Apakah contributor tetap boleh memasuki `/admin`.
4. Siapa yang boleh membaca draft/pending/rejected serta create/edit/publish/delete blog.
5. Apakah perubahan role untuk sekarang tetap dilakukan melalui Supabase Dashboard atau memerlukan RPC/admin UI khusus.
6. Apakah audit trail perubahan role dibuat sekarang atau setelah containment.

Rekomendasi paket:

- cabut self-update profile;
- `is_active = true` wajib untuk seluruh capability staff;
- authenticated non-staff hanya dapat membaca blog published;
- role matrix yang sama dipakai middleware dan RLS;
- audit trail boleh menjadi migration lanjutan, tetapi audit kondisi Production dilakukan sebelum DB-A ditutup.

### Paket DB-B — DB-04, DB-06, DB-07, dan DB-16

Keputusan bersama yang perlu diberikan:

1. Apakah ada caller eksternal untuk `set_blog_post_published`.
2. Apakah RPC review perlu dapat dipanggil oleh `anon` saja atau juga `authenticated`.
3. Apakah nama dan email review wajib.
4. Batas panjang nama, email, dan message serta error publik yang digunakan.
5. Apakah `blog_posts.updated_at` berubah pada setiap SQL `UPDATE`.

Rekomendasi paket:

- hapus function publish lama setelah audit caller membuktikan tidak dipakai;
- pertahankan akses `anon` hanya pada RPC review yang memang diperlukan;
- nama dan message wajib, email divalidasi bila diisi;
- `updated_at` berubah pada setiap update;
- semua function berprivilege memakai fixed `search_path`, object ter-qualify, dan grant minimum.

### Paket DB-C — DB-03 dan DB-14

Keputusan bersama yang perlu diberikan:

1. Apakah bucket image tetap public.
2. Role aktif yang boleh upload, update, dan delete.
3. Path, MIME, dan batas ukuran file.
4. Apakah TTL satu tahun diterima untuk upload UUID baru.

Rekomendasi paket:

- public read tetap dipertahankan untuk asset blog;
- write/delete hanya untuk staff aktif yang mengelola blog;
- pertahankan UUID + `upsert: false` dan gunakan URL baru saat mengganti file;
- gunakan TTL panjang untuk upload baru setelah policy dan delete flow lulus.

### Paket DB-D — DB-15 dan DB-13

Keputusan bersama yang perlu diberikan:

1. Provider CAPTCHA/rate limiting untuk contact.
2. Jalur insert server-only: service role atau RPC terbatas setelah verifikasi anti-bot.
3. Batas request, validasi field, monitoring, dan retensi contact.

Rekomendasi paket:

- OAuth `next` hanya menerima path internal dan fallback ke `/admin`;
- tutup direct anon insert hanya setelah jalur server pengganti siap;
- service-role credential, bila dipilih, hanya tersedia di server dan tidak pernah masuk browser bundle.

### Paket DB-E — DB-09 dan DB-08

Keputusan bersama yang perlu diberikan:

1. Apakah Q&A perlu dikelola admin tanpa deployment.
2. Jika Supabase dipilih, apakah ada consumer eksternal yang masih memakai kolom `anwer`.

Rekomendasi paket:

- pertahankan `src/data/dsi-qna.ts` sebagai sumber resmi selama belum ada kebutuhan CMS;
- jangan rename atau mengaktifkan tabel dormant tanpa manfaat product;
- bila Supabase dipilih, gunakan migration kompatibel dan migrasikan data/query/cache secara atomik.

### Paket DB-F — DB-05

Keputusan yang perlu diberikan setelah hasil pengukuran:

1. Index mana yang menunjukkan perbaikan plan/latency nyata.
2. Apakah write overhead dan risiko migration lock dapat diterima.
3. Strategi rollout index pada ukuran data Production saat itu.

Tidak ada index yang dipilih sebelum `EXPLAIN` dan distribusi data tersedia.

### Paket DB-G — DB-10 dan DB-11

Keputusan bersama yang perlu diberikan:

1. Apakah generated `Database` types di-commit ke repository.
2. Mekanisme bootstrap Auth user lokal.
3. Apakah fixture asset memakai repository atau local Storage.
4. Dataset dummy minimum dan role test yang dipertahankan permanen.

Rekomendasi paket:

- commit generated types dan sediakan command regenerasi/drift check;
- seluruh fixture non-rahasia, deterministic, dan lokal;
- reset lokal tidak boleh bergantung pada data, URL asset, atau credential Production.

## Fase 0 — Preflight wajib

Tujuan: memastikan perubahan dapat diuji dan dipulihkan tanpa menyentuh data Production secara tidak sengaja.

Yang dilakukan secara read-only:

- verifikasi Docker Supabase lokal sehat dan project aplikasi benar-benar memakai URL lokal;
- catat versi Supabase CLI/Postgres serta daftar migration yang diterapkan;
- ambil snapshot schema, policy, function, grant, trigger, bucket, dan index lokal;
- bandingkan migration repository dengan schema lokal;
- buat role-test matrix untuk `anon`, `contributor`, `editor`, `admin`, `super_admin`, dan akun `is_active = false`;
- siapkan fixture minimum untuk menguji policy tanpa menjadikan DB-11 sebagai perubahan besar pertama;
- tentukan cara backup/restore dan rollback migration sebelum rollout Production;
- audit riwayat perubahan role Production secara read-only sebelum DB-01 dianggap selesai.

Exit gate:

- tidak ada environment ambiguity;
- test identity dan expected permission matrix terdokumentasi;
- migration berikutnya hanya menargetkan Supabase lokal;
- rollback SQL atau rollback deployment telah dirancang.

## Rincian masalah keamanan dan otorisasi

### DB-01 — User dapat mengubah role profilnya sendiri

Prioritas: **P0 keamanan/kritis**.

Masalah:

- RLS `Update Own Profile` hanya membatasi row dengan `auth.uid() = id`;
- policy tidak mencegah user mengubah `role` atau `is_active` miliknya;
- jika role berhasil dinaikkan, policy lain yang percaya pada `profiles.role` dapat ikut terbuka.

Solusi yang direkomendasikan:

- hapus policy update profil umum untuk authenticated user;
- karena tabel saat ini tidak memiliki field profil non-otorisasi yang perlu diedit user, jangan memberi direct update ke `profiles`;
- perubahan `role` dan `is_active` dilakukan oleh jalur admin tepercaya dengan role check eksplisit dan audit trail;
- tambahkan test negatif yang mencoba menaikkan contributor menjadi admin melalui Supabase API langsung.

Keputusan yang perlu dikunci sebelum implementasi:

1. Apakah user biasa memang perlu mengubah field profil apa pun?
2. Apakah pengelolaan role tetap melalui Supabase Dashboard untuk sekarang, atau perlu RPC/admin UI khusus?
3. Apakah audit trail perubahan role dibuat pada fase ini atau sebagai migration terpisah sesudah containment?

Rekomendasi keputusan awal:

- cabut seluruh self-update `profiles`;
- pertahankan pengelolaan role melalui jalur admin tepercaya yang sudah tersedia;
- containment dan audit riwayat didahulukan, audit table dapat dirancang terpisah bila belum ada kebutuhan UI.

Verifikasi selesai bila:

- user dapat membaca profilnya sesuai kebutuhan tetapi tidak dapat mengubah `role`, `is_active`, atau identitas otorisasi;
- hanya actor yang disetujui dapat mengubah role/active state;
- akun yang sebelumnya mungkin berubah telah diaudit.

### DB-02 — Policy role tidak konsisten memeriksa `is_active`

Prioritas: **P0 keamanan**.

Masalah:

- middleware memeriksa `is_active`, tetapi API Supabase dilindungi oleh RLS, bukan middleware;
- beberapa policy blog sudah memeriksa `is_active`, sedangkan review, review request, update blog, dan helper role belum konsisten;
- session user nonaktif masih dapat memanggil Supabase API secara langsung.

Solusi yang direkomendasikan:

- tetapkan satu role capability matrix terlebih dahulu;
- perbarui helper `is_admin_role()` dan `is_staff_role()` agar selalu mensyaratkan `is_active = true`;
- gunakan helper atau ekspresi policy yang konsisten untuk `USING` dan `WITH CHECK`;
- audit semua tabel/function/Storage policy, tidak hanya route yang terlihat di admin UI;
- jangan mengandalkan JWT role lama bila sumber kebenaran role adalah `profiles`.

Keputusan yang perlu dikunci:

1. Capability pasti untuk `contributor`, `editor`, `admin`, dan `super_admin`.
2. Apakah contributor memang boleh masuk seluruh `/admin` seperti konfigurasi middleware sekarang.
3. Aksi publish, delete, review moderation, contact access, team management, dan Storage write untuk masing-masing role.

Rekomendasi keputusan awal:

- `is_active = true` wajib untuk semua capability staff;
- gunakan database `profiles` sebagai sumber role otorisasi;
- jangan lanjut ke DB-03/DB-12 sebelum role matrix disetujui.

Verifikasi selesai bila:

- seluruh test matrix lulus untuk tiap operasi `select/insert/update/delete`;
- akun nonaktif ditolak oleh RLS walaupun session/JWT masih valid;
- middleware dan RLS menghasilkan keputusan role yang konsisten.

### DB-04 — `SECURITY DEFINER` tanpa fixed `search_path`

Prioritas: **P1 keamanan**.

Masalah:

- `check_review_request_status` dan `submit_review` berjalan sebagai `SECURITY DEFINER` tanpa `SET search_path`;
- function berprivilege memerlukan resolusi object yang deterministik dan grant execute minimum.

Solusi yang direkomendasikan:

- gunakan fixed `search_path` yang aman, idealnya kosong, lalu schema-qualify seluruh table/function/operator yang relevan;
- audit owner dan `EXECUTE` grant setiap function;
- revoke dari `PUBLIC` dan hanya grant kepada role yang benar-benar memanggil function;
- pertahankan transaksi/row lock pada `submit_review` untuk mencegah token dipakai dua kali;
- uji token valid, used, expired, revoked, invalid, dan concurrent submission.

Keputusan yang perlu dikunci:

- `check_review_request_status` dan `submit_review` tetap dapat dipanggil `anon` karena merupakan jalur review publik berbasis token;
- `authenticated` hanya dipertahankan bila jalur tersebut memang dibutuhkan saat user memiliki session.

Rekomendasi: pertahankan akses minimum yang dibutuhkan alur publik dan hapus grant yang tidak memiliki caller nyata.

### DB-16 — Function publish obsolete

Prioritas: **P1 hardening/correctness** dalam urutan baru.

Masalah:

- `set_blog_post_published` menulis `blog_posts.is_published`, padahal blog memakai enum `status`;
- source aplikasi tidak memanggil RPC tersebut;
- function masih `SECURITY DEFINER` dan memiliki grant execute luas.

Solusi yang direkomendasikan:

- cari caller di source, log, integration, dan client eksternal;
- sesuai keputusan pemilik project, pertahankan signature lama sebagai compatibility/admin RPC yang memetakan boolean ke enum `status`;
- gunakan `true → published` dan `false → draft`, tanpa mengambil alih transisi `pending` atau `reject`;
- wajibkan active admin/super_admin, fixed empty `search_path`, schema-qualified object, grant minimum, serta transition test;
- aplikasi tetap menggunakan jalur direct update yang sudah dilindungi RLS dan menjalankan invalidasi cache.

Keputusan yang dikunci:

- function dipertahankan dan diperbaiki agar memakai `status`;
- audit integrasi di luar repository tetap wajib dilakukan sebelum rollout Production.

Catatan: repository dan dokumentasi V1 tidak menunjukkan caller aktif. Function dipertahankan sebagai compatibility RPC sesuai keputusan pemilik project, bukan karena menjadi dependency aplikasi sekarang.

### DB-03 — Bucket Storage dan policy object terlalu luas

Prioritas: **P1 reliability/security**.

Masalah:

- migration tidak membuat bucket `images`;
- setiap authenticated user dapat upload/update/delete pada path blog tertentu tanpa role dan `is_active` check;
- environment baru tidak reproducible dan akun nonaktif dapat mencoba Storage API langsung.

Solusi yang direkomendasikan:

- buat bucket melalui migration/config yang idempotent;
- pertahankan public read hanya jika asset memang public;
- batasi insert/update/delete ke capability staff aktif yang sudah ditentukan DB-02;
- gunakan path allowlist `blog/` dan `blog_cover/` dengan pemeriksaan yang konsisten;
- validasi MIME serta ukuran di aplikasi dan konfigurasi bucket; extension file tidak boleh menjadi satu-satunya validasi;
- uji orphan cleanup dan larang overwrite karena filename menggunakan UUID + `upsert: false`.

Keputusan yang perlu dikunci:

1. Role mana yang boleh upload, replace, dan delete image.
2. Batas ukuran dan MIME yang diperbolehkan.
3. Apakah bucket tetap public atau asset perlu signed URL.

Rekomendasi awal: bucket tetap public untuk asset blog, sedangkan seluruh write/delete hanya untuk staff aktif yang memang mengelola blog.

### DB-15 — OAuth callback `next` tanpa allowlist

Prioritas: **P1 keamanan**.

Masalah:

- callback memakai `new URL(next, url.origin)` tanpa memastikan `next` adalah path internal;
- input yang dapat dikontrol berpotensi menjadi redirect eksternal setelah login.

Solusi yang direkomendasikan:

- terima hanya path relatif yang dimulai dengan satu `/`;
- tolak `//host`, protocol, backslash, control character, dan URL eksternal;
- fallback selalu ke `/admin`;
- tambahkan unit/table test untuk input valid dan malicious.

Keputusan: tidak diperlukan bila seluruh redirect setelah login memang hanya menuju route internal. Gunakan allowlist path lokal sebagai baseline.

### DB-13 — Direct anon insert pada contact messages

Prioritas: **P1 abuse/cost**.

Masalah:

- anon key bersifat publik dan policy insert adalah `WITH CHECK (true)`;
- bot dapat melewati form dan Server Action lalu menulis langsung ke REST API Supabase;
- validasi aplikasi saja tidak menutup jalur direct insert.

Solusi yang direkomendasikan:

- pilih satu jalur tulis resmi melalui server;
- verifikasi CAPTCHA/Turnstile dan rate limit sebelum insert;
- tutup direct anon table insert setelah server memiliki jalur credential yang tepat;
- tambahkan constraint database untuk panjang/format minimum dan normalisasi data;
- catat monitoring, deduplication, serta retention policy untuk spam;
- jangan memasukkan service-role key ke browser atau public bundle.

Keputusan yang perlu dikunci:

1. Provider anti-bot/rate-limit yang akan digunakan.
2. Apakah insert dilakukan dengan server-only service role atau RPC terbatas setelah token anti-bot diverifikasi.
3. Batas request, panjang field, dan retensi data contact.

Catatan: ini bukan perbaikan RLS satu baris. Menutup anon policy sebelum jalur server pengganti siap akan merusak form contact.

### DB-12 — Policy blog select tumpang tindih

Prioritas: **P1 confidentiality/authorization** dalam urutan baru.

Masalah:

- public policy membaca post published;
- policy authenticated read-all menggunakan `USING (true)` sehingga setiap authenticated user dapat membaca draft, pending, dan rejected;
- keputusan ini lebih luas daripada kebutuhan UI yang sudah terbukti.

Solusi yang direkomendasikan:

- public/anon dan authenticated tetap dapat membaca published;
- draft/pending/rejected hanya dapat dibaca role aktif yang membutuhkan editorial workflow;
- gunakan capability matrix DB-02, bukan sekadar status authenticated;
- uji direct REST query untuk setiap role dan status post.

Keputusan yang perlu dikunci:

- apakah contributor perlu membaca semua draft atau hanya post tertentu; schema saat ini belum memiliki ownership/author user id yang cukup untuk pembatasan “milik sendiri”.

Rekomendasi awal: staff aktif yang disetujui dapat read-all; authenticated user lain hanya memperoleh published. Ownership-based access ditunda sampai kontrak author dibuat dengan benar.

Acceptance gabungan masalah keamanan:

- self-escalation tertutup;
- akun nonaktif ditolak pada seluruh capability staff;
- function berprivilege memakai fixed `search_path` dan grant minimum;
- Storage write/delete dibatasi role aktif;
- open redirect tertutup;
- contact memiliki rancangan abuse protection yang lulus uji;
- draft/rejected tidak terbaca role yang tidak berhak.

## Rincian masalah data correctness dan kontrak schema

### DB-06 — `updated_at` blog tidak otomatis diperbarui

Prioritas: **P1 data correctness**.

Masalah: `blog_posts.updated_at` memiliki default tetapi tidak memiliki trigger update, sementara metadata artikel membaca field tersebut.

Solusi yang direkomendasikan:

- pasang trigger `BEFORE UPDATE` yang memakai helper timestamp ter-schema-qualify;
- pastikan perubahan status maupun konten memperbarui `updated_at`;
- jangan mengubah `created_at`;
- verifikasi interaction dengan trigger `set_published_at`.

Keputusan yang perlu dikunci:

- apakah `updated_at` berubah untuk setiap update row atau hanya perubahan konten tertentu.

Rekomendasi: perbarui pada setiap SQL `UPDATE`; perilakunya konsisten, mudah diaudit, dan tidak bergantung pada semua caller aplikasi.

### DB-07 — Validasi review tidak sinkron dengan constraint

Prioritas: **P1 correctness**.

Masalah: RPC mengubah nama kosong menjadi `NULL`, tetapi `reviews.name` adalah `NOT NULL`; hasilnya error database generik.

Solusi yang direkomendasikan:

- validasi dan trim token, nama, email, serta message sebelum insert;
- tetapkan batas panjang dan format yang konsisten antara UI, Server Action, RPC, dan constraint;
- kembalikan error domain yang aman tanpa membocorkan detail database;
- pertahankan one-time token lock dan atomic update `used_at`.

Keputusan yang perlu dikunci:

1. Apakah nama dan email wajib.
2. Batas panjang nama/message dan format email.
3. Copy error publik yang diperbolehkan.

Rekomendasi awal: nama dan message wajib; email mengikuti keputusan product saat ini tetapi formatnya divalidasi bila diisi.

### DB-09 — Dua sumber kebenaran Q&A

Prioritas: **P2 data drift/architecture**.

Masalah: frontend membaca `src/data/dsi-qna.ts`, sedangkan tabel `question_answer` tidak digunakan.

Solusi yang mungkin:

- **Opsi A — file statis tetap canonical:** dokumentasikan tabel sebagai dormant/obsolete dan jangan membuat query/cache/admin baru;
- **Opsi B — Supabase menjadi CMS:** buat public loader, cache tag, invalidasi, admin workflow, generated type, loading/error test, dan migrasikan data statis;
- jangan mempertahankan dua sumber yang sama-sama dianggap resmi.

Keputusan yang perlu dikunci: apakah Q&A harus dapat dikelola admin tanpa deployment.

Rekomendasi saat ini: gunakan Opsi A selama belum ada kebutuhan product untuk CMS Q&A. Ini menjaga scope dan tidak menambah query/cache baru setelah optimasi FE selesai.

### DB-08 — Typo `question_answer.anwer`

Prioritas: **P2 maintainability**, conditional terhadap DB-09.

Masalah: nama kolom typo meningkatkan risiko type/query mismatch.

Solusi yang direkomendasikan bila Supabase menjadi sumber resmi:

- rename `anwer` menjadi `answer` melalui forward migration;
- update query, generated type, seed, dan admin/public consumer secara terkoordinasi;
- gunakan compatibility window bila ada external consumer.

Jika file statis dipilih sebagai canonical, jangan melakukan rename hanya untuk merapikan tabel dormant. Catat cleanup/drop sebagai perubahan schema terpisah setelah retention dan dependency audit.

Acceptance gabungan data correctness:

- timestamp blog akurat;
- review invalid input menghasilkan error domain yang konsisten;
- Q&A hanya memiliki satu sumber resmi;
- typo schema diselesaikan atau didefer dengan alasan yang eksplisit.

## Rincian masalah performa berdasarkan bukti

### DB-05 — Index filter + order

Prioritas: **P1 saat data tumbuh; implementasi tetap berbasis bukti**.

Masalah: pola query publik memfilter published/visible lalu mengurutkan tanggal atau `sort_order`, sedangkan index saat ini terutama berasal dari primary/unique constraint.

Kandidat yang harus diukur:

- `blog_posts(status, published_at desc)` atau partial index published;
- `reviews(is_published, created_at desc)` atau partial index published;
- `services_categories(is_published, sort_order)`;
- `services_items(category_id, is_published, sort_order)`;
- `services_item_details(service_item_id, is_published, sort_order)`;
- `team_members(is_visible, display_order)`.

Solusi yang direkomendasikan:

- ambil jumlah row dan distribusi status secara read-only;
- rekam `EXPLAIN (ANALYZE, BUFFERS)` di lokal dengan data representatif;
- gunakan Index Advisor Production secara read-only sebagai pembanding;
- tambahkan hanya index yang menurunkan cost/latency query nyata;
- evaluasi write overhead dan duplicate index sebelum rollout.

Keputusan: tidak ada index yang disetujui hanya berdasarkan daftar kandidat. Hasil plan menjadi dasar keputusan per index.

Verifikasi selesai bila:

- before/after plan tersimpan;
- index dipakai oleh query target saat relevan;
- write/migration lock risk diterima;
- cache warm tidak dipakai untuk menyamarkan pengukuran database.

## Rincian masalah Storage delivery, types, dan reproducibility

### DB-14 — Cache Storage hanya satu jam

Prioritas: **P2 performa**.

Masalah: UUID filename + `upsert: false` sudah mendekati immutable asset, tetapi upload menetapkan `cacheControl: '3600'`.

Solusi yang direkomendasikan:

- setelah DB-03 lulus, pastikan file replacement selalu menghasilkan nama/URL baru;
- naikkan TTL asset baru ke nilai panjang, misalnya satu tahun;
- jangan mengandalkan overwrite pada URL lama;
- tetapkan cleanup untuk file yatim dan uji delete flow;
- pahami bahwa perubahan hanya berlaku pada upload baru kecuali metadata object lama diubah secara eksplisit.

Keputusan yang perlu dikunci:

- apakah satu tahun diterima untuk semua image di `blog/` dan `blog_cover/`.

Rekomendasi: gunakan TTL panjang untuk upload baru karena nama UUID dan `upsert: false` sudah menyediakan cache busting berbasis URL.

### DB-10 — Generated Supabase types

Prioritas: **P2 maintainability/correctness**.

Masalah: client tidak memakai generic `Database`; type manual dan type assertion dapat menyembunyikan drift schema.

Solusi yang direkomendasikan:

- generate `Database` types dari schema lokal setelah migration utama stabil;
- simpan hasil generated di satu file yang tidak diedit manual;
- gunakan generic tersebut pada browser, server, dan public server client;
- turunkan type domain/UI dari generated row/select bila masuk akal;
- tambahkan command generate/check yang reproducible;
- regenerate dan typecheck setiap kali schema berubah.

Keputusan yang perlu dikunci:

- generated file di-commit ke repository agar build tidak memerlukan koneksi Supabase.

Rekomendasi: commit generated types dan jadikan drift check bagian workflow migration.

### DB-11 — Seed belum end-to-end

Prioritas: **P2 reliability/local development**.

Masalah: reset lokal belum menghasilkan Auth/profile/bucket/blog/review/contact/Q&A yang cukup untuk menguji seluruh flow.

Solusi yang direkomendasikan:

- pisahkan deterministic SQL fixtures dari bootstrap Auth/Storage yang memerlukan tooling;
- jangan menyimpan password nyata, token Production, atau PII;
- sediakan akun/role test lokal untuk capability matrix;
- buat bucket dan asset fixture lokal atau gunakan asset repository;
- tambahkan sample published/draft blog, review state, review request valid/used/expired/revoked, dan contact dummy;
- Q&A fixture mengikuti keputusan DB-09;
- pastikan reset dapat dijalankan berulang tanpa bergantung pada Supabase Production.

Keputusan yang perlu dikunci:

1. Mekanisme bootstrap Auth user lokal.
2. Strategi asset: repository fixture atau local Storage bucket.
3. Data dummy minimum yang dipertahankan permanen.

Rekomendasi: gunakan fixture non-rahasia, deterministic, dan sepenuhnya lokal; tidak boleh membaca asset/data Production.

Acceptance gabungan Storage, types, dan reproducibility:

- upload baru memakai cache policy yang disetujui;
- seluruh Supabase client memakai generated types;
- reset lokal menghasilkan environment yang cukup untuk test role, admin, blog, review, contact, dan Storage;
- tidak ada secret atau dependency Production di fixture.

## Strategi migration dan rollout

Setiap fase mengikuti urutan:

1. Jelaskan diagnosis, opsi, keputusan, dan blast radius.
2. Kunci keputusan pemilik project.
3. Buat forward migration/source change minimum.
4. Jalankan reset atau apply hanya pada Supabase lokal.
5. Jalankan test SQL role matrix dan test aplikasi terkait.
6. Jalankan lint/typecheck/build bila source TypeScript berubah.
7. Review `supabase db diff` agar tidak membawa perubahan di luar scope.
8. Commit satu unit perubahan dengan message bahasa Inggris setelah diminta.
9. Deploy aplikasi kompatibel ke Preview bila diperlukan.
10. Terapkan migration Production hanya dengan backup, approval, urutan deployment, dan rollback yang telah disepakati.
11. Jalankan smoke test serta monitoring segera setelah rollout.

Migration yang menyempitkan akses perlu memperhatikan urutan deployment:

- jika source lama masih membutuhkan policy lama, deploy source kompatibel lebih dahulu;
- jika policy lama merupakan celah kritis seperti DB-01, containment diprioritaskan dan dampak fitur yang sah harus diuji sebelum Production apply;
- perubahan rename/drop memakai expand-migrate-contract bila ada kemungkinan consumer eksternal.

## Rencana verifikasi gabungan

### Security matrix

Uji minimal:

- anon;
- authenticated tanpa profile;
- contributor aktif/nonaktif;
- editor aktif/nonaktif;
- admin aktif/nonaktif;
- super_admin aktif/nonaktif.

Operasi yang diuji:

- read/update profile;
- read semua status blog, create/edit/publish/delete blog;
- read/moderate review dan manage review request;
- read/update/delete contact;
- manage team;
- Storage select/upload/update/delete;
- execute function/RPC yang di-expose.

### Correctness

- timestamp blog berubah sesuai keputusan;
- publish transition tetap benar;
- review token valid/used/expired/revoked/invalid bekerja;
- nama/message invalid ditolak dengan error yang diharapkan;
- concurrent review submit hanya menghasilkan satu review;
- Q&A membaca satu sumber resmi.

### Performance

- plan dan latency query direkam sebelum/sesudah index;
- jumlah row serta selectivity dicatat;
- cache frontend dipisahkan dari pengukuran query database;
- upload image baru mengirim cache metadata yang disetujui.

### Reliability

- `supabase db reset` berhasil;
- bootstrap Auth/Storage lokal berhasil;
- aplikasi lokal dapat login dan menjalankan flow admin;
- public blog/service/team/review tetap dapat dibaca;
- tidak ada URL asset Production dalam fixture final.

## Definition of done seluruh fase DB

Pekerjaan `[DB]` dianggap selesai hanya bila:

- seluruh DB-01 sampai DB-16 memiliki keputusan dan status akhir;
- semua perubahan tersimpan sebagai forward migration/source change yang dapat direproduksi;
- local reset dan seluruh role-test matrix lulus;
- generated types sinkron dengan schema;
- tidak ada self-escalation, akses akun nonaktif, Storage write luas, atau open redirect;
- function berprivilege memiliki fixed `search_path` dan grant minimum;
- correctness timestamp/review/Q&A sesuai kontrak;
- index memiliki bukti plan, bukan asumsi;
- Preview/application smoke test lulus;
- Production migration memperoleh persetujuan eksplisit dan memiliki backup/rollback;
- monitoring pascadeploy tidak menemukan authorization error, 5xx, spam spike, atau regression data.

## Template progress per masalah

Bagian berikut digunakan ketika pembahasan dan implementasi setiap DB dimulai.

```md
## Progress DB-XX — Judul (tanggal)

Status: **analisis / menunggu keputusan / implementasi lokal / Preview / Production selesai**.

### Kondisi awal

- Bukti source/schema.
- Environment yang diperiksa.
- Dependency.

### Keputusan

- Keputusan yang disetujui.
- Hal yang sengaja tidak diubah.

### Implementasi

- Forward migration/source file.
- Dampak dan compatibility.

### Verifikasi

- SQL role matrix.
- Test aplikasi/build.
- Hasil local/Preview/Production.

### Rollback dan catatan lanjutan

- Cara rollback.
- Risiko atau pekerjaan yang masih terbuka.
```

## Langkah berikutnya

Mulai dari **Preflight**, kemudian bahas **Paket DB-A: DB-01, DB-02, dan DB-12** dalam satu sesi keputusan. Jangan membuat migration paket DB-A sebelum capability matrix, self-edit profile, akses seluruh status blog, jalur pengelolaan role, dan kebutuhan audit trail dikunci.

## Progress DB-A — Analisis core authorization (6 September 2026)

Status: **audit source dan policy selesai; implementasi belum dimulai dan menunggu keputusan pemilik project**.

### Scope paket

- DB-01 — user dapat mengubah `profiles.role` dan `profiles.is_active` miliknya sendiri;
- DB-02 — policy berbasis role belum konsisten mensyaratkan `is_active = true`;
- DB-12 — seluruh user authenticated dapat membaca semua status blog.

Tidak ada SQL, migration, source aplikasi, Supabase lokal, atau Supabase Production yang diubah pada tahap analisis ini.

### Kondisi saat ini

#### Profile dan self-escalation

- Policy `Update Own Profile` mengizinkan `UPDATE` ketika `auth.uid() = profiles.id` pada `USING` dan `WITH CHECK`.
- RLS membatasi row, bukan kolom. Karena itu user dapat mencoba mengubah `role` dan `is_active` pada row sendiri.
- Tabel `profiles` saat ini hanya berisi `id`, `email`, `role`, `is_active`, `updated_at`, dan `created_at`; belum ada field profil non-otorisasi yang perlu diedit langsung oleh user.
- Tidak ditemukan admin UI khusus untuk mengelola role/profile pada source saat ini.

#### Role dan akun nonaktif

- Middleware `/admin` sudah membaca `role, is_active`, tetapi middleware tidak melindungi direct Supabase API.
- `ADMIN_ROLES` pada middleware masih berisi `super_admin`, `admin`, `editor`, dan `contributor`.
- Policy insert/delete blog tertentu sudah memeriksa `is_active`, tetapi policy update admin/editor tidak konsisten.
- Policy review dan review request memeriksa role tanpa memeriksa `is_active`.
- Helper `is_admin_role()` dan `is_staff_role()` belum mensyaratkan akun aktif.
- Akibatnya, akun yang dinonaktifkan pada UI masih berpotensi memiliki capability database selama session belum berakhir.

#### Akses seluruh status blog

- Policy public hanya mengizinkan post berstatus `published`.
- Policy `auth read blog posts` memakai `USING (true)` untuk seluruh authenticated user.
- Karena policy bersifat permissive, authenticated user mana pun dapat membaca draft, pending, published, dan rejected melalui Supabase API.
- Schema blog belum memiliki kolom ownership seperti `author_user_id`; pembatasan “contributor hanya boleh melihat/mengubah post miliknya” belum dapat diterapkan secara benar.

### Masalah inti

Ketiga masalah membentuk satu rantai:

```text
User authenticated
        |
        +-- dapat update row profile sendiri
        |       |
        |       +-- berpotensi mengubah role/is_active
        |
        +-- role dipercaya oleh policy lain
        |       |
        |       +-- beberapa policy tidak memeriksa is_active
        |
        +-- policy blog read-all hanya memeriksa authenticated
                |
                +-- draft/pending/rejected dapat dibaca langsung
```

Karena itu solusi DB-A harus mengunci sumber otorisasi, status aktif, dan capability blog dalam satu matrix.

### Rancangan penyelesaian yang direkomendasikan

#### 1. Profiles

- Drop policy `Update Own Profile`.
- Pertahankan self-read profile bila masih dibutuhkan aplikasi.
- Jangan memberi column-level update kepada user karena belum ada field aman yang perlu diedit.
- Untuk saat ini, perubahan role dan active state dilakukan melalui jalur operator tepercaya, bukan browser client biasa.
- Jika admin UI pengelolaan user dibuat kemudian, gunakan RPC/action khusus dengan aturan super_admin, validasi transisi role, dan audit trail.

#### 2. Active-role capability

- `is_active = true` menjadi syarat wajib seluruh operasi staff/admin.
- Database `profiles` tetap menjadi sumber kebenaran role.
- Policy harus melindungi direct API; middleware tetap menjadi UX gate, bukan security boundary utama.
- Helper role yang dipakai policy diperbarui agar memeriksa role dan status aktif secara konsisten.
- `USING` dan `WITH CHECK` harus menerapkan capability yang sama agar row lama dan row baru sama-sama aman.

#### 3. Blog visibility dan mutation

- `anon`, user tanpa profile, contributor yang belum diberi workflow khusus, serta akun nonaktif hanya membaca post published melalui policy public.
- Active editor, admin, dan super_admin dapat membaca seluruh status blog untuk editorial workflow.
- Active admin dan super_admin dapat publish/unpublish serta mengelola seluruh status.
- Editor tidak diberi publish/unpublish.
- Hak delete editor perlu diputuskan khusus karena schema belum memiliki ownership.
- Policy `auth read blog posts USING (true)` dihapus dan diganti policy read-all berbasis active role.

#### 4. Middleware dan server rendering

- Jika contributor belum mempunyai capability admin yang nyata, hapus contributor dari `ADMIN_ROLES` agar UI route konsisten dengan RLS.
- Halaman admin dan Server Action tetap bergantung pada RLS untuk pertahanan utama.
- Redirect middleware tidak boleh dianggap sebagai pengganti policy database.

### Capability matrix rekomendasi

| Actor | Self-read profile | Self-update authorization fields | Masuk `/admin` | Read published blog | Read draft/pending/rejected | Create draft | Edit draft/pending | Publish/unpublish | Delete blog |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Anon | Tidak | Tidak | Tidak | Ya | Tidak | Tidak | Tidak | Tidak | Tidak |
| Authenticated tanpa profile | Tidak | Tidak | Tidak | Ya | Tidak | Tidak | Tidak | Tidak | Tidak |
| Contributor aktif | Ya | Tidak | Tidak untuk baseline | Ya | Tidak | Tidak | Tidak | Tidak | Tidak |
| Editor aktif | Ya | Tidak | Ya | Ya | Ya | Ya | Ya | Tidak | Menunggu keputusan |
| Admin aktif | Ya | Tidak | Ya | Ya | Ya | Ya | Ya | Ya | Ya |
| Super admin aktif | Ya | Tidak | Ya | Ya | Ya | Ya | Ya | Ya | Ya |
| Role apa pun, nonaktif | Ya | Tidak | Tidak | Ya sebagai public content | Tidak | Tidak | Tidak | Tidak | Tidak |

Catatan:

- Matrix di atas mempertahankan public published content bagi user logged-in karena policy public berlaku untuk `anon` dan `authenticated`.
- Contributor sengaja tidak diberi editorial capability sampai ownership/workflow contributor dirancang.
- Role management melalui aplikasi, jika dibuat, direkomendasikan hanya untuk super_admin dan tidak termasuk implementasi minimum DB-A.

### Opsi keputusan

#### Keputusan 1 — Self-update profile

- **Opsi A — Cabut seluruh self-update (direkomendasikan):** paling sesuai dengan schema sekarang karena semua field yang dapat diubah bersifat identitas/otorisasi.
- **Opsi B — Column-level update terbatas:** hanya masuk akal setelah ada field non-otorisasi seperti display name; membutuhkan grant/RPC tambahan.

#### Keputusan 2 — Pengelolaan role

- **Opsi A — Jalur operator tepercaya/Supabase Dashboard dahulu (direkomendasikan):** scope minimum untuk menutup celah tanpa membuat fitur admin baru.
- **Opsi B — Buat RPC/admin workflow sekarang:** lebih lengkap tetapi memperbesar scope, membutuhkan audit table, permission transition, dan UI/Server Action.

#### Keputusan 3 — Contributor

- **Opsi A — Keluarkan dari akses admin untuk sementara (direkomendasikan):** aman karena schema belum memiliki ownership dan capability contributor yang konsisten.
- **Opsi B — Pertahankan akses admin read-only:** memerlukan UI read-only dan policy khusus; contributor tetap tidak boleh membaca draft semua orang tanpa keputusan eksplisit.
- **Opsi C — Jadikan contributor bagian workflow editorial:** membutuhkan `author_user_id`, ownership policy, assignment, dan migration terpisah; tidak direkomendasikan sebagai DB-A minimum.

#### Keputusan 4 — Hak editor terhadap delete

- **Opsi A — Delete hanya admin/super_admin (direkomendasikan):** paling aman selama ownership blog belum tersedia.
- **Opsi B — Editor boleh delete draft/pending siapa pun:** lebih dekat dengan workflow tim bersama tetapi tetap memiliki blast radius antar-editor.
- **Opsi C — Editor hanya delete post miliknya:** tidak dapat diterapkan dengan benar sebelum ada ownership column.

#### Keputusan 5 — Audit trail role

- **Opsi A — Containment dahulu, audit table sebagai paket lanjutan (direkomendasikan):** lakukan one-time audit kondisi Production dan tutup celah secepatnya.
- **Opsi B — Buat audit table/trigger dalam DB-A:** riwayat ke depan lebih lengkap tetapi menambah schema, retention, dan akses audit yang harus dirancang.

#### Keputusan 6 — Akses seluruh status blog

- **Opsi A — Hanya active editor/admin/super_admin (direkomendasikan):** sesuai kebutuhan editorial yang terlihat dan menutup akses authenticated umum.
- **Opsi B — Semua active profile termasuk contributor:** mempertahankan akses luas dan tidak direkomendasikan tanpa alasan bisnis.
- **Opsi C — Admin/super_admin saja:** paling ketat, tetapi editor tidak dapat menjalankan workflow draft yang saat ini tersirat dari policy.

### Rencana implementasi setelah keputusan

1. Selesaikan Preflight dan audit role/profile Production secara read-only.
2. Buat forward migration DB-A; jangan mengubah migration baseline.
3. Drop self-update profile policy.
4. Perbarui helper/policy role agar seluruh capability staff mensyaratkan `is_active = true`.
5. Ganti blog read-all policy dengan active-role policy sesuai matrix.
6. Sempitkan policy blog insert/update/delete sesuai role dan status yang disetujui.
7. Selaraskan `ADMIN_ROLES` middleware bila contributor dikeluarkan.
8. Terapkan migration hanya pada Supabase lokal.
9. Jalankan SQL/API test matrix dan smoke test admin/blog.
10. Review diff migration serta compatibility sebelum commit atau Preview.

### Risiko dan mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Admin sah kehilangan akses karena profile/role tidak sesuai | Audit profile Production secara read-only sebelum migration dan siapkan rollback policy. |
| UI admin masih menampilkan aksi yang kemudian ditolak RLS | Cocokkan middleware/UI capability dan uji semua Server Action. |
| Editor kehilangan workflow yang saat ini dipakai | Kunci matrix dengan pemilik project dan uji menggunakan akun editor representatif. |
| Policy helper menimbulkan recursion atau hasil berbeda | Uji helper pada local RLS dengan setiap role dan gunakan fungsi/policy yang tidak membaca dirinya secara rekursif. |
| Migration security dicampur perubahan fitur | DB-A hanya mengubah authorization contract; ownership contributor dan admin user management menjadi paket terpisah. |

### Rencana pengujian DB-A

- user tidak dapat mengubah `role`, `is_active`, `email`, atau timestamp otorisasi melalui direct Supabase client;
- setiap role aktif/nonaktif diuji terhadap profile dan operasi blog;
- akun nonaktif ditolak untuk read-all, insert, update, publish, dan delete;
- anon dan authenticated biasa tetap dapat membaca published blog;
- draft/pending/rejected tidak dapat dibaca contributor atau authenticated umum;
- editor/admin/super_admin memperoleh capability persis sesuai matrix yang disetujui;
- direct REST/Supabase API dan UI admin memberikan hasil authorization yang konsisten;
- route publik, metadata blog, cache, dan `updateTag()` tetap bekerja setelah policy berubah;
- production build dan smoke test lokal lulus;
- tidak ada perubahan Production sebelum approval terpisah.

### Pembaruan keputusan DB-A — Model tiga role (6 September 2026)

Status: **seluruh keputusan DB-A disetujui; model role final adalah `super_admin`, `admin`, dan `staff`; implementasi belum dimulai**.

Keputusan yang sudah dikunci:

- seluruh self-update `profiles` dicabut;
- role untuk sementara dikelola melalui Supabase Dashboard/operator tepercaya;
- delete blog hanya untuk admin dan super_admin;
- containment self-escalation dilakukan lebih dahulu; audit table permanen dapat dirancang kemudian;
- seluruh status blog hanya dapat dibaca role aktif yang mempunyai capability editorial;
- role `editor` dan `contributor` tidak menjadi bagian model role akhir.

#### Dampak perubahan model role

Target akhir enum/application role:

```text
super_admin
admin
staff
```

Perubahan ini menyentuh:

- enum `public.role` pada PostgreSQL;
- setiap row `profiles.role` yang masih bernilai `editor` atau `contributor`;
- policy blog, review, review request, contact, team, dan Storage;
- helper role database;
- `ADMIN_ROLES` pada middleware;
- TypeScript `UserRole` serta perbandingan role lain di source;
- fixture/seed dan test matrix;
- generated Supabase types pada DB-10 nanti.

#### Kondisi data dan penyatuan role

Pemilik project mengonfirmasi bahwa profile Production saat ini hanya memakai `admin` dan `super_admin`. Tidak ada profile Production bernilai `editor` atau `contributor`.

Keputusan final:

- tidak diperlukan data mapping, deaktivasi, atau penghapusan Auth user untuk role lama;
- `editor` dan `contributor` dipensiunkan dari enum serta source;
- seluruh fungsi yang memang direncanakan untuk editor/contributor disatukan di bawah role baru `staff`;
- penyatuan tersebut mengikuti capability matrix aman di bawah, bukan mewarisi policy lama yang sudah dikategorikan sebagai celah;
- akses luas yang terjadi hanya karena `authenticated`, tidak adanya pemeriksaan `is_active`, atau Storage policy terlalu longgar tidak dianggap sebagai capability staff yang sah.

#### Capability matrix tiga role yang direkomendasikan

| Area | Staff aktif | Admin aktif | Super admin aktif |
| --- | --- | --- | --- |
| Masuk `/admin` | Ya | Ya | Ya |
| Read seluruh status blog | Ya | Ya | Ya |
| Create/edit draft atau pending blog | Ya | Ya | Ya |
| Publish/unpublish blog | Tidak | Ya | Ya |
| Delete blog | Tidak | Ya | Ya |
| Read review dan review request internal | Ya | Ya | Ya |
| Membuat review request | Ya | Ya | Ya |
| Publish/unpublish review | Ya | Ya | Ya |
| Delete review/review request | Tidak | Ya | Ya |
| Read/update status contact | Ya | Ya | Ya |
| Delete contact | Tidak | Ya | Ya |
| Manage team | Tidak | Ya | Ya |
| Upload image untuk workflow blog | Ya, setelah DB-C | Ya | Ya |
| Delete image Storage | Tidak | Ya | Ya |
| Mengubah role/is_active melalui aplikasi | Tidak | Tidak untuk baseline | Tidak untuk baseline; Dashboard/operator dahulu |

Prinsip matrix:

- `staff` menangani pekerjaan editorial dan operasional non-destruktif;
- `admin` dan `super_admin` menangani publish serta operasi destructive;
- perbedaan tambahan super_admin/admin baru dibuat jika kebutuhan bisnisnya jelas;
- akun nonaktif kehilangan seluruh capability internal, tetapi tetap dapat membaca konten published seperti pengunjung umum.

#### Strategi migrasi final

Karena tidak ada row legacy di Production, compatibility window untuk memigrasikan akun editor/contributor tidak diperlukan. DB-A tetap memakai langkah terpisah yang dapat diverifikasi:

1. Verifikasi ulang distribusi role Production secara read-only tepat sebelum rollout.
2. Buat forward migration lokal yang mencabut self-update, mewajibkan active-role policy, menutup blog read-all, serta mengubah kontrak enum ke tiga role.
3. Perbarui middleware dan TypeScript source agar hanya mengenal `super_admin`, `admin`, dan `staff`.
4. Jalankan local reset, role matrix, build, dan smoke test.
5. Simpan perubahan source dan migration sebagai unit DB-A yang terukur, tetapi tetap dengan rollback terpisah.
6. Deploy source yang tetap aman untuk profile `admin`/`super_admin`, lalu terapkan migration dalam rollout terkoordinasi.
7. Jalankan smoke test admin dan direct API setelah migration.

Tidak ada keputusan role yang masih terbuka untuk DB-A. Capability `staff`, pemensiunan editor/contributor, pengelolaan role melalui operator tepercaya, serta strategi rollout di atas dianggap telah disetujui.

## Progress DB-A — Implementasi core authorization lokal (6 September 2026)

Status: **implementasi source dan forward migration selesai; migration sudah diterapkan serta terverifikasi pada Supabase Docker lokal; belum di-commit, belum di-Preview, dan Production tidak diubah**.

### Perubahan database

Forward migration:

- `supabase/migrations/20260906153000_harden_core_authorization.sql`

Isi perubahan:

- menghapus policy `Update Own Profile` sehingga user tidak dapat mengubah row otorisasinya sendiri;
- mengganti enum role menjadi hanya `super_admin`, `admin`, dan `staff`;
- memetakan legacy `editor`/`contributor` ke `staff` bila migration diterapkan pada environment yang memilikinya;
- menghapus default role agar pembuatan profile wajib menetapkan role secara eksplisit;
- mengubah default `is_active` menjadi `false`; existing profile tidak diubah;
- mengubah helper role agar memakai `profiles` dan selalu mensyaratkan akun aktif;
- menutup policy blog read-all untuk authenticated umum;
- memberi active staff akses editorial draft/pending tanpa publish/delete blog;
- membatasi delete blog, review, review request, contact, dan pengelolaan team kepada admin/super_admin sesuai capability matrix;
- mempertahankan public read terhadap blog/review published.

### Perubahan source aplikasi

Role aplikasi diperbarui dari `editor`/`contributor` menjadi `staff` pada:

- `src/types/auth-role.ts`;
- `src/middleware.ts`;
- `src/app/admin/page.tsx`;
- `src/app/admin/reviews/page.tsx`;
- komponen capability blog, review, dan review request di `src/components/ui`.

Hasil capability UI:

- staff dapat masuk admin, mengedit workflow draft/pending, memoderasi review, dan mengelola review request;
- publish/delete blog tetap admin/super_admin;
- delete review/review request tetap admin/super_admin.

### Automated authorization test

File test:

- `supabase/tests/database/db_a_authorization.test.sql`

Test memakai fixture transaksi untuk active staff, inactive staff, active admin, dan authenticated user tanpa profile. Seluruh fixture diakhiri dengan `ROLLBACK`.

Hasil:

- `npx supabase test db --local`: **PASS**;
- 1 file test;
- 32 assertion lulus;
- self-update role ditolak;
- staff hanya memperoleh capability yang disetujui;
- inactive staff kehilangan capability internal;
- authenticated tanpa profile hanya melihat public published content;
- admin dapat menjalankan operasi destructive yang diuji;
- tidak ada profile/blog fixture DB-A yang tertinggal setelah test.

### Verifikasi Supabase lokal

- seluruh container Supabase Docker terdeteksi aktif; PostgreSQL berstatus healthy;
- akses langsung ke PostgreSQL lokal melalui container berhasil;
- migration `20260906153000` tercatat pada `supabase_migrations.schema_migrations`;
- enum lokal terverifikasi hanya berisi `super_admin`, `admin`, dan `staff`;
- dua profile lokal yang sudah ada tetap `super_admin` aktif;
- `profiles.role` tidak memiliki default dan tetap `NOT NULL`;
- `profiles.is_active` memiliki default `false`;
- helper role adalah security invoker dengan fixed empty `search_path`;
- `npx supabase db diff --local --schema public` menghasilkan **No schema changes found**, sehingga schema lokal sama dengan migration repository.

### Verifikasi aplikasi

- `npx tsc --noEmit`: berhasil;
- targeted ESLint: tidak ada error; satu warning lama `error` tidak digunakan pada `src/app/admin/reviews/page.tsx` tetap dibiarkan agar perubahan tidak melebar;
- `npm run build`: berhasil dengan warning lama `baseline-browser-mapping` dan deprecation convention `middleware`;
- production-mode smoke test lokal:
  - `/`, `/about`, `/services`, `/blog`, dan `/contact`: HTTP `200`;
  - anonymous `/admin`: HTTP `307` ke `/login`.

### Temuan lint di luar DB-A

`npx supabase db lint --local --level warning` masih menemukan error lama pada `set_blog_post_published`: function merujuk `blog_posts.is_published` yang tidak ada. Temuan ini adalah DB-16 dan tetap dikerjakan pada Paket DB-B; bukan regresi migration DB-A.

### Gate sebelum Production

- verifikasi ulang bahwa Production hanya mempunyai role `admin` dan `super_admin` melalui query read-only;
- ambil backup dan catat policy/enum sebelumnya;
- gunakan commit/deployment yang sama dengan source yang telah diuji;
- terapkan migration dalam rollout terkoordinasi;
- ulangi role matrix, login admin/super_admin, direct API, dan smoke test segera setelah apply;
- jangan membuat profile staff Production sebelum policy dan UI hasil DB-A terverifikasi.

## Progress DB-B — Analisis function dan data correctness (6 September 2026)

Status: **analisis lokal dan audit caller repository selesai; keputusan 2–6 telah dikunci; keputusan DB-16 adalah mempertahankan dan memperbaiki function, dengan kontrak detail hasil audit di bawah; belum ada migration atau source DB-B yang diubah; Production tidak disentuh**.

Paket ini menggabungkan DB-04, DB-06, DB-07, dan DB-16 karena semuanya menyentuh kontrak function/trigger PostgreSQL dan dapat diuji dalam satu matriks regresi. Implementasi tetap akan memakai forward migration baru dan tidak mengubah migration baseline.

### Bukti kondisi lokal

Pemeriksaan read-only pada Supabase Docker lokal menemukan:

- `check_review_request_status(text)` dan `submit_review(text,text,text,text)` adalah `SECURITY DEFINER`, tetapi belum mempunyai fixed `search_path`;
- kedua RPC review sudah mencabut akses `PUBLIC`, lalu memberi execute kepada `anon`, `authenticated`, dan `service_role`;
- `set_blog_post_published(uuid,boolean)` mempunyai `search_path=public`, tetapi execute masih tersedia bagi `PUBLIC`, `anon`, `authenticated`, dan `service_role`;
- `set_blog_post_published` menulis kolom `blog_posts.is_published` yang tidak ada;
- tidak ditemukan caller `set_blog_post_published` di source aplikasi, migration lanjutan, maupun test repository;
- aplikasi mengubah status blog langsung melalui tabel dan menjalankan invalidasi cache Next.js, sehingga mempertahankan RPC publish terpisah dapat membuat jalur mutasi yang melewati invalidasi cache;
- `blog_posts` hanya mempunyai trigger `trg_set_published_at`; belum ada trigger untuk memperbarui `updated_at`;
- `set_updated_at()` dan `set_published_at()` merupakan trigger helper, tetapi masih memperoleh execute luas akibat default function grant;
- `reviews.name` dan `reviews.message` adalah `NOT NULL`, tetapi belum memiliki batas panjang atau validasi format;
- `submit_review` hanya memvalidasi message dan mengubah nama kosong menjadi `NULL`, sehingga nama kosong gagal sebagai error constraint generik;
- UI hanya memvalidasi message, belum memberi `required`/`maxLength` yang sesuai untuk semua field, dan masih menampilkan `error.message` mentah;
- token review yang dibuat aplikasi selalu berupa 64 karakter hexadecimal dari `randomBytes(32)`;
- enam review lokal yang tersedia tidak memiliki nama kosong; panjang maksimum lokal saat audit adalah nama 28 karakter dan message 149 karakter. Data lokal ini hanya bukti compatibility awal, bukan dasar tunggal penetapan batas Production.

### DB-04 — Hardening function dan grant

Rancangan yang direkomendasikan:

1. Pertahankan `SECURITY DEFINER` hanya pada dua RPC review karena pengunjung perlu memeriksa dan menggunakan token tanpa memperoleh akses tabel langsung.
2. Tetapkan `SET search_path = ''` dan schema-qualify seluruh dependency, termasuk `public.review_requests`, `public.reviews`, `extensions.digest`, serta function PostgreSQL yang relevan.
3. `REVOKE ALL ... FROM PUBLIC` pada setiap function yang disentuh.
4. Beri `EXECUTE` eksplisit pada `anon` dan `authenticated` untuk dua RPC review. `authenticated` dipertahankan agar link tetap bekerja jika browser kebetulan mempunyai session login.
5. Pertahankan grant eksplisit `service_role` untuk penggunaan server/operasional yang sah.
6. Cabut execute `anon`/`authenticated` dari `set_updated_at()` dan `set_published_at()` karena keduanya hanya boleh dipakai sebagai trigger helper, bukan endpoint RPC.
7. Pertahankan row lock `FOR UPDATE` pada `submit_review` agar satu token tidak dapat menghasilkan dua review melalui request bersamaan.

### DB-16 — Function publish obsolete

Pilihan:

- **Opsi A — Drop function lama setelah audit Production read-only (direkomendasikan).** Repository tidak mempunyai caller, function sudah rusak, dan aplikasi saat ini mempunyai jalur update status plus invalidasi cache yang benar.
- **Opsi B — Ubah function agar memakai enum `status`.** Menambah dua jalur publish dan berisiko melewati `updateTag()` pada aplikasi; tidak direkomendasikan tanpa integrasi eksternal nyata.
- **Opsi C — Cabut semua grant dahulu, drop pada migration berikutnya.** Rollout paling konservatif jika pemakaian eksternal belum dapat dipastikan, tetapi menyisakan object mati sementara.

Sebelum perubahan function diterapkan pada Production, periksa integrasi di luar repository, API log/observability yang tersedia, dan statistik pemakaian function bila logging Production merekamnya. Tidak adanya caller lokal tidak membuktikan tidak adanya caller eksternal; audit ini memastikan signature dan mapping compatibility yang dipertahankan tidak memutus caller tersembunyi.

#### Hasil audit kegunaan dan keputusan pemilik project

Pemilik project memilih mempertahankan serta memperbaiki function agar memakai kolom `status`, bukan menghapusnya.

Riwayat yang dapat dibuktikan:

- function pertama kali masuk repository melalui commit baseline yang mengimpor snapshot remote schema Supabase;
- tidak ada commit aplikasi yang pernah menambahkan caller `set_blog_post_published`;
- dokumentasi V1 juga mengategorikannya sebagai function lama yang tidak dipakai aplikasi;
- komentar dan pemeriksaan role di dalam SQL menunjukkan maksud asalnya: RPC khusus admin/super_admin untuk publish atau unpublish blog;
- parameter boolean cocok dengan schema lama yang diduga memakai `is_published`, tetapi tidak cukup untuk merepresentasikan workflow enum sekarang: `draft`, `pending`, `published`, dan `reject`;
- workflow aktif memakai direct table update melalui `setBlogStatusAction`, dengan `approve` memindahkan `pending` ke `published` dan `unpublish` memindahkan `published` ke `draft`;
- karena function tidak tercatat pembuatannya sebelum snapshot remote schema, alasan historis di luar repository tidak dapat dibuktikan lebih jauh tanpa log atau catatan Supabase lama.

Kontrak perbaikan yang direkomendasikan sesuai keputusan tersebut:

- pertahankan nama dan signature `set_blog_post_published(uuid, boolean)` untuk compatibility;
- `p_is_published = true` memindahkan row ke `status = 'published'`;
- `p_is_published = false` memindahkan row ke `status = 'draft'`, konsisten dengan aksi Unpublish saat ini;
- hanya active `admin` dan `super_admin` yang boleh memanggilnya;
- function memakai `SECURITY DEFINER`, empty fixed `search_path`, seluruh object ter-schema-qualify, dan execute hanya untuk `authenticated` serta `service_role`; `anon` dan `PUBLIC` dicabut;
- UUID yang tidak ditemukan harus menghasilkan error domain yang jelas, bukan terlihat seperti update berhasil;
- function tidak akan dipakai untuk transisi `draft` ↔ `pending` atau `pending` → `reject`;
- source aplikasi tidak otomatis dialihkan ke RPC ini dalam DB-B. Direct update yang sudah dilindungi RLS tetap menjadi jalur utama dan tetap menjalankan `updateTag()`;
- bila kelak function dipakai oleh integrasi eksternal, perubahan tersebut tidak otomatis memanggil invalidasi cache Next.js. Integrasi wajib memakai endpoint aplikasi atau mekanisme revalidation terpisah agar freshness langsung terjaga.

Dengan kontrak ini, function berperan sebagai compatibility/admin RPC sempit, bukan pengganti seluruh state machine blog. Keberadaannya tidak diperlukan oleh aplikasi saat ini, tetapi tidak lagi rusak bila dipertahankan.

### DB-06 — Timestamp blog

Rancangan yang direkomendasikan:

- pasang trigger `BEFORE UPDATE` pada `public.blog_posts` menggunakan `public.set_updated_at()`;
- perbarui `updated_at` pada setiap SQL `UPDATE`, termasuk perubahan konten dan status;
- jangan mengubah `created_at` dan jangan melakukan backfill row lama pada paket ini;
- uji trigger `updated_at` bersama `trg_set_published_at` agar keduanya mengubah kolom masing-masing tanpa saling menimpa;
- pertahankan perilaku `published_at` saat ini pada DB-B. Keputusan apakah re-publish harus mempertahankan tanggal publikasi pertama adalah pembahasan terpisah karena bukan akar DB-06.

### DB-07 — Kontrak input review

Rancangan yang direkomendasikan:

- token wajib tepat 64 karakter hexadecimal sebelum proses hash;
- nama wajib setelah `trim`, panjang 1–100 karakter;
- email opsional; bila diisi harus lolos validasi format dasar dan maksimum 254 karakter;
- message wajib setelah `trim`, panjang 1–2.000 karakter;
- lakukan validasi yang sama pada UI, Server Action, dan RPC. RPC tetap menjadi enforcement terakhir untuk caller yang melewati UI;
- simpan nilai nama, email, dan message yang sudah di-trim;
- jangan menambah global table constraint format/panjang pada paket ini sebelum data Production diaudit, agar insert internal/legacy tidak tiba-tiba gagal;
- gunakan error domain stabil dan petakan di Server Action menjadi pesan publik yang aman; jangan meneruskan detail error Supabase/PostgreSQL mentah ke browser;
- pertahankan transaksi atomik: validasi token, lock request, insert review, dan tandai request terpakai harus berhasil atau gagal sebagai satu unit.

### Keputusan yang perlu dikunci sebelum implementasi

1. **Function publish lama:** **dikunci — perbaiki dan pertahankan sebagai compatibility/admin RPC sempit** dengan mapping `true → published` dan `false → draft`; tidak menjadi state machine seluruh workflow blog.
2. **Grant RPC review:** **dikunci — `anon` dan `authenticated`**, karena Supabase server client dapat membawa session yang sudah ada; token tetap menjadi otorisasi utama.
3. **Kontrak field:** **dikunci — nama wajib, email opsional, dan message wajib**.
4. **Batas input:** **dikunci — token 64 hexadecimal, nama 100, email 254, dan message 2.000 karakter**.
5. **Timestamp:** **dikunci — `blog_posts.updated_at` berubah pada setiap SQL `UPDATE`**.
6. **Error publik:** **dikunci — pesan domain yang ramah dan generik ditampilkan ke user; detail database hanya dicatat pada server**.

Tidak ada keputusan desain DB-B yang masih terbuka. Audit caller eksternal Production tetap menjadi deployment gate, bukan perubahan kontrak implementasi lokal.

### Urutan implementasi setelah keputusan

1. Audit read-only caller/integrasi `set_blog_post_published` pada Production.
2. Buat forward migration DB-B tanpa mengubah baseline.
3. Hardening RPC review dan trigger helper: empty `search_path`, schema-qualified object, serta grant minimum.
4. Perbaiki function publish lama sebagai compatibility/admin RPC dengan mapping boolean ke status dan grant minimum sesuai keputusan.
5. Tambahkan trigger `blog_posts.updated_at`.
6. Tambahkan validasi RPC serta validasi identik pada Server Action dan UI tanpa mengubah desain visual.
7. Tambahkan pgTAP test untuk grant, token states, batas input, dan timestamp; jalankan test concurrency terpisah dengan dua koneksi database untuk membuktikan satu token hanya menghasilkan satu review.
8. Terapkan migration hanya pada Supabase lokal, lalu jalankan lint, schema diff, typecheck, build, dan smoke test.
9. Uji manual link review valid/expired/used/invalid, termasuk browser tanpa session dan dengan session login.
10. Review hasil dan rollback plan sebelum meminta approval Production terpisah.

### Acceptance criteria DB-B

- semua `SECURITY DEFINER` yang dipertahankan mempunyai empty fixed `search_path` dan seluruh object penting ter-schema-qualify;
- tidak ada public execute yang tidak diperlukan pada RPC/trigger helper DB-B;
- pengunjung anonymous dan browser authenticated sama-sama dapat memakai link review valid;
- token invalid, expired, revoked, used, dan dua submit bersamaan menghasilkan perilaku deterministik;
- nama/email/message ditolak dengan error domain yang aman jika melanggar kontrak;
- `blog_posts.updated_at` berubah pada setiap update dan `published_at` tetap mengikuti trigger existing;
- `set_blog_post_published` memakai kolom `status`, hanya menerima caller berhak, memetakan `true → published` dan `false → draft`, serta memberi error bila post tidak ditemukan;
- `supabase db lint`, pgTAP, schema diff, TypeScript, build, dan smoke test lulus;
- tidak ada perubahan Production tanpa approval eksplisit.

## Progress DB-B — Implementasi lokal selesai (6 September 2026)

Status: **forward migration, source validation, dan automated test selesai; migration telah diterapkan dan diverifikasi pada Supabase Docker lokal; belum di-commit, belum di-Preview, dan Production tidak diubah**.

### Perubahan database

Forward migration:

- `supabase/migrations/20260906170000_harden_functions_and_review_contract.sql`

Isi perubahan:

- menetapkan empty fixed `search_path` serta schema-qualified dependency pada `check_review_request_status`, `submit_review`, dan `set_blog_post_published`;
- mempertahankan akses RPC review untuk `anon`, `authenticated`, dan `service_role` dengan grant `EXECUTE` eksplisit;
- mencabut akses `PUBLIC` dan `anon` dari compatibility RPC publish;
- mencabut execute langsung dari `set_updated_at()` dan `set_published_at()` untuk role API karena keduanya hanya trigger helper;
- memperbaiki `set_blog_post_published`: `true` menjadi `published`, `false` menjadi `draft`, hanya active admin/super_admin, input `NULL` ditolak, dan UUID yang tidak ada menghasilkan error domain;
- menambahkan trigger `blog_posts_update_at` sehingga setiap update blog memperbarui `updated_at`;
- mempertahankan trigger `published_at` existing dan memperketat definisi helper-nya;
- memvalidasi format token, nama, email opsional, dan message di dalam `submit_review`;
- mempertahankan `FOR UPDATE` dan transaksi atomik agar token tetap sekali pakai;
- mengganti error database generik dengan error domain stabil.

### Perubahan source aplikasi

File terkait:

- `src/lib/review-validation.ts`;
- `src/app/review-request/[token]/actions.ts`;
- `src/components/layout/review-request-client.tsx`.

Perubahan perilaku:

- satu helper validasi dipakai oleh client dan Server Action;
- nama wajib maksimum 100 karakter;
- email tetap opsional, divalidasi bila diisi, maksimum 254 karakter;
- message wajib maksimum 2.000 karakter;
- token harus tepat 64 karakter hexadecimal;
- input disimpan setelah trim;
- Server Action memetakan error RPC ke pesan publik yang aman dan hanya mencatat code/message teknis di server;
- client tidak lagi menampilkan raw error object;
- atribut native `required` dan `maxLength` ditambahkan tanpa mengubah layout, warna, atau style form.

### Automated database test

File:

- `supabase/tests/database/db_b_functions_and_correctness.test.sql`

Hasil final `npx supabase test db --local`:

- **PASS**;
- 2 file test DB-A + DB-B;
- 78 assertion total: 32 DB-A dan 46 DB-B;
- fixed `search_path` dan grant matrix terverifikasi;
- status token valid, expired, used, revoked, serta malformed terverifikasi;
- validasi nama/email/message dan trimming terverifikasi;
- email kosong berhasil disimpan sebagai `NULL`;
- token yang sudah terpakai ditolak;
- compatibility RPC publish/unpublish, role aktif, akun nonaktif, missing UUID, `published_at`, dan `updated_at` terverifikasi.

### Uji concurrency dua koneksi

Uji terisolasi memakai satu fixture token lokal dan dua koneksi PostgreSQL nyata:

- koneksi A mengunci row request lalu melakukan submit: berhasil;
- koneksi B mencoba token yang sama saat lock masih ditahan: menunggu lalu gagal dengan `review_request_unavailable`;
- hasil akhir hanya satu review untuk satu request;
- `used_at` terisi;
- fixture concurrency langsung dibersihkan setelah pengujian.

### Verifikasi schema dan aplikasi

- `npx supabase db lint --local --level warning`: **No schema errors found**;
- `npx supabase db diff --local --schema public`: **No schema changes found**;
- targeted ESLint untuk tiga source DB-B: berhasil tanpa output error/warning;
- `npx tsc --noEmit`: berhasil;
- `npm run build`: berhasil;
- production-mode HTTP smoke test lokal:
  - `/`: HTTP `200`;
  - review token valid menampilkan form;
  - review token malformed menampilkan state `Invalid link`;
  - form hasil server render memuat batas nama 100, email 254, message 2.000, serta field wajib yang disetujui.

Build masih menampilkan warning lama `baseline-browser-mapping` dan deprecation convention `middleware`; keduanya bukan regresi DB-B.

### Gate sebelum Preview/Production

- commit DB-A dan DB-B perlu diatur sebagai unit yang dependency-nya jelas karena DB-B memakai enum/helper authorization hasil DB-A;
- audit read-only integration/log Production untuk memastikan tidak ada caller tersembunyi dengan ekspektasi mapping boolean berbeda;
- backup schema/data relevan dan simpan definisi function/trigger/grant sebelumnya;
- deploy source yang kompatibel, lalu apply migration dalam rollout terkoordinasi;
- ulangi review flow anonymous dan authenticated, publish/unpublish admin, role denial, cache freshness, serta monitoring error setelah apply;
- Production hanya boleh diubah setelah approval eksplisit.
