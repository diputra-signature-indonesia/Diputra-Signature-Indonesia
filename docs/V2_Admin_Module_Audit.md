# Audit Kesiapan Modul Admin V2

Tanggal audit: 23 September 2026

## Ruang Lingkup

Audit ini mencakup modul berikut:

- My Tasks
- All Jobs dan Job Detail
- Task Assignment
- SOP
- Master Data

Pemeriksaan dilakukan terhadap implementasi frontend, query Supabase, RPC/RLS, pengujian database, build aplikasi, dan perilaku halaman pada browser lokal. Audit tidak melakukan perubahan ke production.

## Kesimpulan

Secara keseluruhan, keempat area utama sudah dapat digunakan untuk internal pilot. Implementasi otorisasi dan operasi database utama sudah berjalan sesuai role dan tidak ditemukan masalah keamanan kritis baru.

Namun, aplikasi belum ideal untuk penggunaan production dengan jumlah data besar. Masalah yang paling penting berada pada pola pengambilan data All Jobs dan My Tasks, query Job Detail, validasi hubungan Internal Service dengan Workflow, serta pengelolaan file SOP.

| Modul | Kondisi | Catatan utama |
| --- | --- | --- |
| Master Data | Hampir siap | Perlu memastikan service aktif selalu mempunyai workflow valid |
| SOP | Siap untuk data terbatas | Perlu hardening signed URL dan Download All |
| My Tasks | Fungsional | Query belum scalable untuk banyak Job dan Task |
| All Jobs | Fungsional | Paling membutuhkan optimasi query dan pagination server-side |

## Temuan Prioritas Tinggi

### 1. All Jobs dan My Tasks mengambil terlalu banyak data

Filter, pencarian, pengurutan, dan pagination masih banyak dilakukan di browser setelah data dimuat dari database.

Pada All Jobs, aplikasi mengambil semua Job aktif beserta data pendukung dan Job Update. Pada My Tasks, aplikasi mencari seluruh Job terkait pengguna, kemudian mengambil Task dan kolom status dari seluruh Job tersebut.

Dampak:

- Waktu muat bertambah seiring pertumbuhan data.
- Payload Supabase menjadi semakin besar.
- Browser melakukan pekerjaan filter dan pagination yang seharusnya dapat dilakukan database.
- Membuka halaman dapat menghasilkan beberapa request berulang untuk mengambil seluruh halaman data.

Rekomendasi:

- Pindahkan search, filter, sort, dan pagination ke query atau RPC database.
- Kembalikan `total_count` dari database untuk kebutuhan pagination.
- My Tasks hanya memuat ringkasan Job terlebih dahulu.
- Daftar Task lengkap hanya dimuat untuk Job yang sedang dipilih.
- Gunakan query agregasi untuk jumlah Task per status.

Referensi implementasi:

- `src/lib/supabase/queries/all-jobs.ts`
- `src/lib/supabase/queries/my-tasks.ts`
- `src/components/admin-all-jobs/all-jobs-workspace.tsx`
- `src/components/admin-my-tasks/my-tasks-workspace.tsx`

### 2. Job Detail menggunakan query seluruh All Jobs

Saat satu Job Detail dibuka, implementasi saat ini menggunakan data dari query All Jobs. Akibatnya, halaman satu Job ikut memuat seluruh daftar Job dan seluruh Job Update yang tersedia.

Rekomendasi:

- Buat query khusus `getJobDetail(jobId)`.
- Ambil Job, Client, PIC, Service, Priority, Status, dan Workflow hanya untuk `job_id` terkait.
- Buat query terbatas untuk bagian `More from this Client`.
- Batasi jumlah Job terkait yang ditampilkan sebelum modal View All dibuka.

Referensi implementasi:

- `src/lib/supabase/queries/job-detail.ts`

### 3. Internal Service aktif dapat tidak mempunyai Workflow

Master Data mengizinkan Internal Service disimpan tanpa Workflow. Namun, form Add Job hanya dapat menggunakan service yang mempunyai Workflow aktif dan minimal satu step.

Akibatnya, sebuah service dapat terlihat aktif dan valid di Master Data, tetapi tidak muncul ketika pengguna membuat Job.

Rekomendasi:

- Internal Service aktif wajib mempunyai Workflow aktif dengan minimal satu step.
- Pilihan tanpa Workflow hanya diperbolehkan ketika service masih nonaktif.
- Tampilkan label `Belum lengkap` untuk service yang tidak mempunyai Workflow.
- Terapkan validasi yang sama pada RPC/database agar tidak hanya bergantung pada form frontend.

### 4. Pengelolaan signed URL dan Download All pada SOP

Halaman SOP membuat signed URL untuk seluruh file ketika halaman dimuat. Signed URL tersebut berlaku satu jam, sehingga preview atau download dapat gagal jika halaman dibiarkan terbuka terlalu lama.

Download All juga mengambil seluruh file secara bersamaan ke memori browser sebelum membuat ZIP. Walaupun setiap file dibatasi 10 MiB, jumlah file yang besar tetap dapat menghabiskan memori browser.

Rekomendasi:

- Buat signed URL ketika pengguna membuka preview, View, atau Download.
- Sediakan mekanisme refresh signed URL tanpa me-reload seluruh halaman.
- Batasi total jumlah atau ukuran file yang dapat diunduh sekaligus.
- Untuk volume besar, buat ZIP secara server-side atau proses file secara berurutan.
- Pertimbangkan validasi magic bytes dan pemindaian file untuk dokumen production.

Referensi implementasi:

- `src/lib/supabase/queries/sop.ts`
- `src/components/admin-sop/sop-requirement-files-card.tsx`

### 5. Satu test SOP tidak terisolasi dari data lokal

Hasil pengujian pgTAP adalah 153 dari 154 assertion berhasil. Satu assertion gagal karena test menghitung seluruh object dalam bucket `sop-documents`, termasuk file valid yang sudah tersimpan sebelumnya di database lokal.

Hasil pemeriksaan policy menunjukkan akses staff tetap ditolak sebagaimana mestinya. Kegagalan tersebut tidak menunjukkan kebocoran RLS, tetapi menunjukkan test yang bergantung pada bucket kosong.

Rekomendasi:

- Ubah assertion agar memeriksa exact storage path yang dibuat oleh test.
- Jangan menghitung seluruh object dalam bucket.
- Pastikan test tetap dapat dijalankan pada database lokal yang sudah memiliki data.

Referensi implementasi:

- `supabase/tests/database/db_j_v2_sop_storage.test.sql`

## Audit My Tasks

### Yang sudah berjalan

- Hanya menampilkan Job dan Task yang relevan dengan pengguna.
- Search dan filter dapat digunakan.
- Pemilihan Job dan daftar Task tampil dengan benar.
- Link menuju detail Task/Job tersedia.
- Route memiliki loading state.
- Otorisasi database tetap menjadi perlindungan utama.

### Kekurangan penting

- Pengambilan data belum server-side paginated.
- Semua filter dan sorting dilakukan di browser.
- Belum ada route-level error state dengan tombol retry.
- Judul halaman menggunakan `My Task`, sedangkan navigasi menggunakan `My Tasks`.
- Label `PIC` pada filter Task Assignment sebenarnya memfilter `assignee_id`; label sebaiknya menjadi `Assignee`.

### Status kesiapan

Layak untuk internal pilot dengan jumlah Job dan Task terbatas. Optimasi query diperlukan sebelum digunakan pada data besar.

## Audit All Jobs dan Job Detail

### Yang sudah berjalan

- Daftar Job berasal dari database.
- Search, filter, group by Client, dan pagination dapat digunakan.
- Row accordion dan detail ringkas Job bekerja.
- Add Job sudah terhubung ke database.
- Job Detail, Job Information, Workflow, Remarks, Contributor, dan More from this Client dapat dimuat.
- Task Assignment sudah terhubung ke Job sebenarnya.
- Lima data dummy hanya ditampilkan pada mode development atau ketika diaktifkan secara eksplisit.

### Kekurangan penting

- Seluruh Job dimuat sebelum filter dan pagination.
- Job Detail ikut memuat seluruh dataset All Jobs.
- Tab Jobs Logging masih berupa placeholder.
- Tombol tiga titik pada row All Jobs belum mempunyai menu atau aksi.
- Pesan sukses Add Job masih menyebut tabel dummy.
- Loading filter memakai delay buatan, bukan state request sebenarnya.
- Pagination menampilkan seluruh nomor halaman dan dapat menjadi terlalu panjang.
- Belum ada `error.tsx` khusus untuk kegagalan query.

### Catatan data dummy

Data dummy masih berguna untuk development dan tunneling. Pastikan environment production tidak mengaktifkan `SHOW_DEMO_JOBS`.

### Status kesiapan

Fungsional untuk internal pilot, tetapi optimasi query harus menjadi prioritas sebelum penggunaan luas.

## Audit Task Assignment

### Yang sudah berjalan

- Kolom status Job dapat dikonfigurasi.
- Task dapat dibuat dengan input judul cepat.
- Card Task dapat dibuka untuk mengubah detail.
- Drag and drop antarstatus dan pengurutan Task bekerja.
- Board dapat di-scroll horizontal tanpa mengecilkan panel secara berlebihan.
- Loading overlay tersedia saat operasi berlangsung.
- Hak Admin, PIC, dan Staff dibatasi melalui RPC/RLS.

### Kekurangan penting

- Filter masih dijalankan pada data yang sudah dimuat di browser.
- Label filter PIC perlu diganti menjadi Assignee.
- Perlu pengujian sentuh pada beberapa browser/perangkat mobile nyata, tidak hanya pointer desktop.
- Perlu memastikan konflik optimistic locking ditampilkan dengan pesan yang jelas ketika dua pengguna mengubah Task yang sama.

### Status kesiapan

Siap untuk internal pilot. Pengujian lintas perangkat dan concurrency tetap diperlukan.

## Audit SOP

### Yang sudah berjalan

- Service List berasal dari Internal Service admin, bukan service landing page.
- CRUD Description, Flow, Requirement Files, dan Price List terhubung ke database.
- PDF Flow dapat dilihat, di-scroll, dan diperbesar dalam panel.
- PDF dapat dibuka di tab baru.
- Requirement file menggunakan private Supabase Storage.
- Download All menghasilkan ZIP.
- View All Services mempunyai pencarian.
- Mutasi dibatasi untuk Admin dan Super Admin.
- Staff hanya memperoleh akses baca sesuai policy.

### Kekurangan penting

- Signed URL dibuat terlalu awal dan dapat kedaluwarsa.
- Download All belum memiliki batas ukuran total.
- Belum ada mekanisme retry khusus ketika preview file gagal.
- Test storage perlu dibuat independen dari data lokal.
- Validasi file masih bergantung pada MIME dan metadata upload.

### Status kesiapan

Siap untuk internal pilot dengan jumlah dan ukuran file terbatas. Hardening file diperlukan sebelum penggunaan dokumen dalam jumlah besar.

## Audit Master Data

### Yang sudah berjalan

- Priorities terhubung ke database dan mendukung CRUD.
- Internal Services terhubung ke database dan mendukung CRUD.
- Job Statuses terhubung ke database.
- Task Statuses terhubung ke database dan mendukung CRUD sesuai aturan sistem.
- Workflow Templates dan Workflow Steps mendukung CRUD serta drag and drop urutan step.
- Service Categories membaca tabel landing page secara read-only.
- Internal Services tidak terhubung ke Service Categories landing page.
- CRUD dibatasi untuk Admin dan Super Admin melalui database.
- Optimistic versioning tersedia untuk mencegah update data lama menimpa perubahan terbaru.

### Kekurangan penting

- Service aktif belum diwajibkan mempunyai Workflow lengkap.
- Ikon sort tampil pada header tabel tetapi belum dapat diklik.
- Belum tersedia search, filter status, atau pagination.
- Pengelolaan data nonaktif belum konsisten: Workflow mempunyai Trash, sementara kategori lain masih mencampur data aktif dan nonaktif.
- Belum ada loading dan error boundary khusus route Master Data.

### Status kesiapan

Modul yang paling dekat dengan production-ready. Validasi Service–Workflow merupakan perbaikan terpenting.

## Temuan Lintas Modul

### Error handling

Tambahkan `error.tsx` atau error state per modul dengan:

- Pesan yang dapat dipahami pengguna.
- Tombol retry.
- Error teknis dicatat tanpa menampilkan detail database kepada pengguna.
- Empty state dibedakan dari failed state.

### Loading state

Loading sebaiknya berasal dari request atau transition sebenarnya. Hindari delay buatan yang tidak mewakili aktivitas database.

### Aksesibilitas

Perlu pengujian tambahan untuk:

- Navigasi keyboard pada modal.
- Focus trap dan pengembalian focus setelah modal ditutup.
- Drag and drop tanpa mouse.
- Label tombol ikon.
- Kontras status badge.
- Preview PDF menggunakan keyboard.

### Warning frontend

Browser tidak menunjukkan runtime error pada route yang diperiksa. Warning yang ditemukan:

- Logo `/icon/dsi-logo.png` mengubah salah satu dimensi tanpa menjaga aspect ratio secara eksplisit.
- Konvensi `middleware.ts` deprecated pada Next.js 16 dan sebaiknya direncanakan untuk dipindahkan ke `proxy`.
- Data paket `baseline-browser-mapping` sudah kedaluwarsa; ini bukan blocker fitur.

## Hasil Verifikasi

| Pemeriksaan | Hasil |
| --- | --- |
| TypeScript typecheck | Berhasil |
| ESLint area terkait | Berhasil |
| Production build | Berhasil |
| `git diff --check` | Berhasil, hanya terdapat warning line ending |
| Supabase database lint lokal | Berhasil tanpa error schema |
| pgTAP V2 tracking schema | Berhasil |
| pgTAP Master Data CRUD | Berhasil |
| pgTAP Add Job | Berhasil |
| pgTAP Task Board | Berhasil |
| pgTAP SOP Storage | 23 dari 24 assertion berhasil; satu test tidak terisolasi |
| Browser My Tasks | Berhasil dimuat tanpa console error |
| Browser All Jobs | Berhasil dimuat tanpa console error |
| Browser Job Detail | Berhasil dimuat tanpa console error |
| Browser Task Assignment | Berhasil dimuat tanpa console error |
| Browser SOP | Berhasil dimuat tanpa console error |
| Browser Master Data | Berhasil dimuat tanpa console error |

## Urutan Perbaikan yang Direkomendasikan

1. Membuat query/RPC server-side untuk pagination, filter, dan search All Jobs.
2. Membuat query terfokus untuk Job Detail.
3. Mengoptimalkan query My Tasks dan memuat Task berdasarkan Job terpilih.
4. Memastikan Internal Service aktif wajib memiliki Workflow valid.
5. Memperbaiki isolasi test SOP Storage.
6. Mengubah signed URL SOP menjadi on-demand dan membatasi Download All.
7. Menambahkan error boundary dan retry state per modul.
8. Mengaktifkan atau menghapus kontrol UI yang belum berfungsi, seperti action menu dan ikon sorting.
9. Menghubungkan Jobs Logging ketika fitur tersebut dilanjutkan.
10. Menjalankan pengujian end-to-end untuk matriks role Super Admin, Admin, PIC, dan Staff dengan volume data yang mendekati production.

## Catatan Keamanan dan Production

- Tidak ditemukan secret key Supabase pada frontend dalam ruang lingkup audit ini.
- Otorisasi penting tetap dilakukan melalui RLS/RPC dan tidak hanya melalui UI.
- Tidak ada migration, perubahan schema remote, atau operasi tulis ke production yang dilakukan selama audit.
- File konfigurasi dan perubahan lokal untuk kebutuhan tunnel tidak diubah dalam audit ini.
