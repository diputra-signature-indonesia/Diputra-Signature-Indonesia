# ORIGINAL SYSTEM DESIGN

untuk update fitur yang akan dilakukanm diputra ingin melakukan tracking terhadap task yang sedang dikerjakan oleh pekerja saat ini sekaligus mencatat progress pada perkerjaannya. untuk flownya seperti ini

[Nama KLIEN]: bisa memiliki lebih dari satu task yang berjalan, masing masing task nantinya memiliki:

- tanggal (manual input) terdiri dari:
  - [tanggal mulai] (diinput pertama kali ketika diputra mendapatkan berkas untuk pertamakalinya
  - [tanggal akhir] sebagai estimasi (diinput berdasarkan perkiraan diputra atas task tersebut dan bisa diubah sewaktu waktu)
- [PIC] diisi oleh 1 user nantinya sebagai penanggung jawab
- [Task] diisi secara deskriptif (manual input, tidak berdasarkan services yang ada)
- [Task\_Kategori] ini sepertinya tidak berdasarkan services yang ada difrontend, jadi ini akan dikhusus kan ke bagian admin dashboard (berupa dropdown). kemudian berdasarkan pilihan dropdown nantinya, akan langsung mengenerate tahapan (ada dua jenis):
  - Visa => Analisis, Apply, Issue
  - Sisanya => Analisis, Drafting, Revision, Finalisasi, Issue
  - Kemungkinan akan berupa checkbox atau fitur lainnya per tahapan untuk menandakan bahwa tahapan sudah selesai
- [Prioritas] terdiri dari High, Medium, dan Low yang hanya digunakan sebagai penanda urgensi
- [Status] ini nantinya ditentukan berdasarkan jumlah tahapan yang selesai
  - Belum Dimulai => jika belum ada Tahapan yang di check pada checkbox
  - Dalam Proses => ketika salah satu checkbox sudah mulai di check
  - Tertunda => diganti secara manual jika task tersebut tertunda
  - Selesai => jika semua checklist tahapan sudah tercheck
- [Deadline] mungkin akan terdiri dari
  - Selesai => jika semua checklist tahapan sudah selesai
  - Deadline => jika sudah mendekati tanggal akhir
  - Sudah Lewat 'n' hari => tergantung melebihi tanggal akhir
- [Remarks] nantinya akan seperti logging yang masing masingnya terdiri dari
  - Tanggal => diputra melakukan progress
  - Deskripsi => deksripsi progress yang dilakukan diputra
  - Status => Selesai, Belum Mulai, Kendala, Tertunda
  - Dibuat Oleh => Default User yang mengisi, namun bisa diganti terhadap team/member/user lainnya

---

nantinya akan ditampilkan Progress Bar atau mungkin Progress Flow berdasarkan jumlah Checklist yang sudah dicheck.

remarks nantinya akan diurutkan dari yang terbaru, lalu bisa dibuka untuk melihat lebih banyak terkait progress atau log sebelumnya

menampilkan Estimasi dalam bentuk hari, misal tanggal mulai -> tanggal akhir berapa hari.

berdasarkan hal hal yang telah disebutkan diatas, nantinya aku mungkin harus memperoleh:

- jumlah task per PIC
- Jumlah Status Tertunda, Belum mulai, dalam proses, selesai
- jumlah tugas berdasarkan kategori
- jumlah tugas yang deadline seperti sudah Deadline dan melewati Deadline

---

# GPT SYSTEM DESIGN UPDATE

Rancangan ini sudah cukup kuat untuk dijadikan fitur MVP. Konsep utamanya jelas: satu klien memiliki banyak task, setiap task mempunyai PIC, tahapan, progres, deadline, dan riwayat pekerjaan.

Masalah utama yang perlu dibereskan sebelum coding adalah memisahkan:

- Data yang disimpan, seperti tanggal, PIC, kategori, prioritas, dan checklist.
- Nilai yang dihitung otomatis, seperti status task, persentase progres, estimasi hari, dan kondisi deadline.

## Struktur data yang disarankan

| Data                 | Fungsi utama                                                    |
| -------------------- | --------------------------------------------------------------- |
| `clients`            | Menyimpan data klien                                            |
| `profiles`           | Menyimpan anggota tim yang dapat menjadi PIC                    |
| `task_categories`    | Pilihan kategori task dan jenis alurnya                         |
| `tasks`              | Informasi utama task                                            |
| `task_stages`        | Tahapan yang dihasilkan ketika task dibuat                      |
| `task_remarks`       | Catatan perkembangan pekerjaan                                  |
| `task_activity_logs` | Riwayat otomatis seperti perubahan PIC, deadline, dan checklist |

Relasinya:

- Satu klien dapat memiliki banyak task.
- Satu task hanya memiliki satu PIC aktif.
- Satu task memiliki beberapa tahapan.
- Satu task memiliki banyak remarks.
- Satu user dapat menjadi PIC dari banyak task.

## 1. Task sebaiknya memiliki judul dan deskripsi

Saat ini `[Task]` direncanakan sebagai input deskriptif. Sebaiknya dipisahkan menjadi:

- `title`: nama pendek task untuk tabel.
- `description`: penjelasan lengkap pekerjaan.

Contoh:

- Judul: `Perpanjangan KITAS John Doe`
- Deskripsi: `Mengurus perpanjangan KITAS investor beserta perubahan alamat sponsor.`

Kalau hanya memakai satu kolom deskripsi, daftar task nantinya lebih sulit dipindai.

## 2. Kategori dan tahapan

Sebaiknya tahapan tidak ditentukan langsung dari nama kategori menggunakan kondisi seperti:

```ts
if (category === 'Visa') {
  // ...
} else {
  // ...
}
```

Minimal, kategori mempunyai `workflow_type`:

| Workflow  | Tahapan                                         |
| --------- | ----------------------------------------------- |
| `VISA`    | Analisis, Apply, Issue                          |
| `GENERAL` | Analisis, Drafting, Revision, Finalisasi, Issue |

Ketika task dibuat, tahapannya disalin ke `task_stages`. Jadi tahapan task menjadi snapshot dan tidak ikut berubah jika template kategori diperbarui di kemudian hari.

Contoh data `task_stages`:

- `task_id`
- `name`
- `position`
- `completed_at`
- `completed_by`

Progress dihitung dengan:

```text
Jumlah tahapan selesai / jumlah seluruh tahapan × 100%
```

Contohnya 2 dari 5 tahapan selesai berarti progres 40%.

Sebaiknya kategori dikunci setelah progres dimulai. Jika belum ada tahapan yang selesai, kategori masih boleh diganti dan tahapan dapat dibuat ulang.

## 3. Status task

Status utama sebaiknya tidak dipilih bebas oleh user, kecuali `Tertunda`.

Urutan perhitungannya:

```text
Jika seluruh tahap selesai
→ Selesai

Jika task sedang ditandai tertunda
→ Tertunda

Jika belum ada tahap selesai
→ Belum Dimulai

Jika minimal satu tahap selesai
→ Dalam Proses
```

Untuk menyimpan kondisi tertunda, lebih aman menggunakan:

- `is_on_hold`
- `hold_reason`
- `held_at`
- `held_by`

Ketika task diteruskan kembali, `is_on_hold` menjadi `false` dan aktivitas tersebut dicatat.

Dengan pendekatan ini, database tidak mengalami ketidaksesuaian seperti status `Selesai`, tetapi masih ada tahapan yang belum dicentang.

## 4. Kondisi deadline harus dipisahkan dari status task

`Status` dan `Deadline` merupakan dua hal berbeda.

Contohnya, task dapat berstatus `Dalam Proses`, tetapi kondisi deadlinenya sudah `Lewat 2 Hari`.

Kondisi deadline yang lebih jelas:

| Kondisi            | Aturan                             |
| ------------------ | ---------------------------------- |
| Aman               | Masih jauh dari tanggal akhir      |
| Mendekati Deadline | Sudah masuk batas peringatan       |
| Deadline Hari Ini  | Tanggal akhir sama dengan hari ini |
| Lewat n Hari       | Hari ini melewati tanggal akhir    |
| Selesai            | Semua tahapan telah selesai        |

Batas “mendekati deadline” harus ditentukan. Rekomendasi awal: tiga hari sebelum tanggal akhir.

Kondisi tersebut tidak perlu disimpan karena dapat dihitung berdasarkan tanggal saat ini. Scheduler juga belum diperlukan hanya untuk menampilkan task yang terlambat. Scheduler baru dibutuhkan jika nanti sistem harus mengirim notifikasi atau reminder otomatis.

## 5. Tanggal dan estimasi hari

Nama kolom yang disarankan:

- `start_date`
- `estimated_end_date`

Karena tanggal mulai sebenarnya menandakan kapan berkas pertama kali diterima, nama `received_date` mungkin lebih akurat. Namun, `start_date` tetap bisa dipakai apabila tim Diputra sudah memahami artinya.

Perlu diputuskan cara menghitung estimasi:

- 1 Agustus sampai 5 Agustus = 4 hari berdasarkan selisih tanggal.
- 1 Agustus sampai 5 Agustus = 5 hari jika kedua tanggal dihitung sebagai hari pengerjaan.

Untuk tampilan pekerjaan, saya lebih menyarankan perhitungan inklusif sehingga hasilnya 5 hari kalender. Perhitungan hari kerja dapat ditambahkan kemudian apabila diperlukan.

## 6. Remarks dan identitas pembuat

Bagian ini perlu sedikit diperbaiki. `Dibuat Oleh` sebaiknya tidak boleh diganti karena merupakan informasi audit.

Pisahkan menjadi:

- `created_by`: user yang benar-benar memasukkan catatan, otomatis dari user login.
- `performed_by`: anggota tim yang melakukan pekerjaan dan boleh dipilih manual.
- `progress_date`: tanggal pekerjaan dilakukan.
- `created_at`: waktu catatan dimasukkan ke sistem.

Contoh:

> Rhea memasukkan catatan pada 16 Agustus, tetapi pekerjaan sebenarnya dilakukan oleh Putra pada 15 Agustus.

Maka:

- `created_by`: Rhea
- `performed_by`: Putra
- `progress_date`: 15 Agustus
- `created_at`: 16 Agustus

Status pada remarks sebaiknya disebut `Jenis Update` agar tidak tertukar dengan status task:

- Progress
- Selesai
- Kendala
- Tertunda
- Dilanjutkan Kembali

Status remarks tidak langsung menentukan status keseluruhan task, kecuali aksi khusus `Tertunda` dan `Dilanjutkan Kembali`.

## 7. Timeline aktivitas

Selain remarks manual, perubahan penting sebaiknya otomatis dicatat:

- PIC berubah dari A menjadi B.
- Tanggal akhir diubah.
- Prioritas diubah.
- Tahapan dicentang atau dibatalkan.
- Task ditunda atau dilanjutkan.
- Task dinyatakan selesai.

Remarks dan aktivitas sistem dapat ditampilkan dalam satu timeline, tetapi tetap dibedakan secara visual.

Urutannya:

```text
created_at terbaru → created_at terlama
```

Tampilkan tiga sampai lima aktivitas terbaru, lalu sediakan tombol `Lihat Semua Aktivitas`.

## 8. Tampilan task

Pada halaman detail klien, setiap task dapat menampilkan:

- Judul task
- PIC
- Kategori
- Prioritas
- Status
- Tanggal mulai dan estimasi selesai
- Estimasi durasi
- Kondisi deadline
- Progress bar
- Tahapan aktif
- Remarks terbaru

Untuk progres, saya lebih menyarankan `Progress Stepper` daripada checkbox biasa karena pengguna langsung memahami posisi pekerjaan:

```text
Analisis ✓ → Drafting ✓ → Revision aktif → Finalisasi → Issue
```

Namun, pada layar kecil dapat ditampilkan sebagai progress bar dan teks `2 dari 5 tahap selesai`.

## 9. Dashboard

Definisi metrik harus dibuat konsisten.

### Jumlah task per PIC

Untuk mengukur beban kerja, default-nya hanya menghitung task aktif:

- Belum Dimulai
- Dalam Proses
- Tertunda

Task selesai ditampilkan sebagai angka terpisah.

### Jumlah task berdasarkan status

- Belum Dimulai
- Dalam Proses
- Tertunda
- Selesai

### Jumlah task berdasarkan kategori

Dikelompokkan berdasarkan `task_category_id`, bukan berdasarkan teks kategori.

### Kondisi deadline

- Mendekati deadline
- Deadline hari ini
- Melewati deadline
- Selesai tepat waktu
- Selesai terlambat, jika nantinya `completed_at` disimpan

Dashboard sebaiknya menyediakan filter:

- Periode
- PIC
- Kategori
- Prioritas
- Status
- Klien

## 10. Keamanan pada Supabase

Karena PIC berasal dari `profiles`, policy saat ini yang hanya memperbolehkan user membaca profilnya sendiri akan menghambat dropdown PIC. Admin tidak akan dapat mengambil daftar anggota tim lainnya.

Nantinya diperlukan policy khusus agar:

- Admin dapat melihat profil anggota tim yang aktif.
- Admin dapat membuat dan mengalihkan task.
- PIC hanya dapat mengubah task yang ditugaskan kepadanya, jika memang itu aturan bisnisnya.
- `created_by` selalu berasal dari user yang login.
- User tidak dapat mengaku sebagai pembuat remarks orang lain.

Supabase tetap dapat menangani fitur ini tanpa backend Laravel, asalkan Auth dan RLS dirancang dengan benar. Secret/service-role key juga tidak boleh ditempatkan di frontend.

## Rekomendasi cakupan MVP

Untuk versi pertama, cukup bangun:

1. Daftar klien dan task.
2. Form pembuatan task.
3. Dua jenis workflow: Visa dan General.
4. Checklist atau stepper tahapan.
5. Status otomatis dan status tertunda manual.
6. Perhitungan progres dan deadline.
7. Remarks beserta timeline.
8. Dashboard ringkas.
9. RLS untuk Admin dan PIC.

Fitur notifikasi, histori perubahan lengkap, perhitungan hari kerja, bobot progres berbeda per tahapan, dan multi-PIC dapat ditambahkan setelah alur utama stabil.

Secara keseluruhan, rancangan ini sudah tepat. Perbaikan paling penting adalah memisahkan status task dari kondisi deadline, memisahkan `created_by` dari orang yang melakukan pekerjaan, dan menyimpan tahapan sebagai snapshot pada setiap task.
