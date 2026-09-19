# DB Documentation — Diputra Signature Indonesia V2

Tanggal: 16 September 2026.
Status: **rancangan untuk review**, bukan migration dan bukan schema yang sudah diterapkan.

Dokumen ini memisahkan tabel baru, perubahan yang diusulkan terhadap tabel lama, dan kondisi existing berdasarkan source lokal. Tidak menyatakan bahwa seluruh migration lokal sudah aktif di Production.

Sumber review:

- Riwayat desain setelah commit `0bc096c59e2ea5c2dc496edfcb37b0c31a2306a2` sampai `30cd399`.
- `V2_Baseline_Architecture.md`, `rancangan-fitur-tracking-task-diputra.md`.
- `src/data/admin-*`, `src/types/database.generated.ts`, seluruh migration existing.
- Audit Excel sebelumnya: `_July Progres Diputra Signature Indonesia 2026.xlsx`, digunakan hanya untuk memahami istilah, bentuk data, dan kebutuhan produk. Workbook tidak diimpor/diubah oleh dokumentasi ini.

## ===== Rancangan DB Baru

### 1. Ringkasan tabel

- Master Data: `priorities`, `internal_service_categories`, `internal_services`, `job_statuses`, `task_statuses`, `workflow_templates`, `workflow_template_steps`.
- Operasional: `clients`, `jobs`, `job_steps`, `job_task_statuses`, `tasks`, `job_updates`, `job_activity_logs`.
- SOP: `sops`, `sop_files`, `sop_price_items`.
- Total inti: **17 tabel baru**.
- Existing tetap dipakai: `profiles`, `admin_access_requests`; tidak membuat sistem role atau tabel akun baru.
- Opsional, belum masuk MVP: `job_contributors`, notification, task template, lampiran Job/Task.

### 2. Definisi domain dan keputusan yang sudah disepakati

- Client: perusahaan atau individu penerima pekerjaan. Bukan akun Supabase Auth dan tidak mempunyai hak admin karena keberadaannya di tabel Client.
- Job: pekerjaan utama untuk satu Client, misalnya Registrasi NPWP. Bentuk baris pekerjaan Excel membantu memvalidasi konsep Job, tetapi Excel bukan sumber impor MVP.
- Task: catatan pekerjaan kecil dalam Job, misalnya verifikasi dokumen NPWP. Task berdiri sendiri dan tidak mempunyai hubungan dengan progres workflow.
- Workflow template: Master Data berisi nama template dan daftar step berurutan. Satu template dapat ditetapkan ke banyak Service; satu Service memakai maksimal satu template aktif untuk pembuatan Job baru.
- Step: penanda progres Job yang disalin dari Workflow Service ketika Job dibuat. Current step adalah step pertama yang belum selesai; pengguna menandainya hanya setelah pekerjaan tahap tersebut selesai.
- Job mempunyai satu PIC utama. Task mempunyai maksimal satu assignee dan boleh belum di-assign bila dibuat PIC/admin. Task yang dibuat staff otomatis di-assign kepada staff tersebut.
- `job_statuses` dan `task_statuses` tetap terpisah. Keduanya diawali dengan `NOT_STARTED`, `IN_PROGRESS`, `ON_HOLD`, `OBSTACLE`, `COMPLETED`.
- Job baru default `NOT_STARTED`. Nol step selesai tidak berarti pekerjaan belum dimulai.
- Status Job tidak berubah ketika step selain step terakhir diselesaikan. User berwenang memilih `IN_PROGRESS` secara manual walaupun belum ada step selesai.
- Menyelesaikan step terakhir menghasilkan Job `COMPLETED` otomatis; perlu setidaknya satu step, bukan menganggap workflow kosong selesai.
- Status Task tidak otomatis mengganti status Job. Kendala Task tidak selalu menjadi kendala keseluruhan Job.
- Persentase Job dihitung dari step selesai. Pekerjaan yang sedang berlangsung dapat berstatus Job `IN_PROGRESS` dengan progres Workflow `0%`.
- Remarks direpresentasikan sebagai `job_updates` untuk catatan manual dengan progress date wajib dan pelaksana opsional; bukan daftar Task selesai.
- Contributor diturunkan dari PIC Job dan assignee unik Task; tidak perlu tabel contributor untuk MVP.
- Katalog internal dipisahkan sepenuhnya dari katalog layanan website publik existing.

### 3. Konvensi kolom, tipe, dan lifecycle

- Semua tabel baru mempunyai `id uuid PK DEFAULT gen_random_uuid()`.
- `NN` berarti `NOT NULL`; `NULL` berarti opsional. Tipe `text` tetap mempunyai validasi panjang yang ditetapkan saat migration.
- Semua tabel baru kecuali log append-only mempunyai `created_at timestamptz NN DEFAULT now()` dan `updated_at timestamptz NN DEFAULT now()`.
- Tabel Master Data yang dapat diisi migration (`priorities`, kedua tabel status, kategori/service, dan workflow template/step) mempunyai `created_by uuid NULL FK profiles.id` dan `updated_by uuid NULL FK profiles.id`; NULL hanya untuk data bawaan migration/system tanpa session pengguna. Tabel operasional dan SOP mewajibkan kedua kolom tersebut (`NN`). Semua mutation aplikasi mengisinya dari `auth.uid()`, bukan parameter frontend. Tidak ada `created_source` dan tidak ada profile sistem palsu.
- Seluruh kolom audit tersebut termasuk rancangan kolom walaupun tidak diulang dalam setiap tabel berikut.
- Waktu audit UTC (`timestamptz`); tanggal bisnis `date`. Zona bisnis deadline harus dipilih eksplisit, usulan `Asia/Makassar`, bukan mengikuti timezone browser.
- Kolom `version integer NN DEFAULT 1` pada entitas mutable penting digunakan untuk optimistic concurrency; RPC menerima `expected_version` dan menolak perubahan berdasarkan data lama.
- Master Data tidak dihapus ketika sudah direferensikan. `is_active=false` menghentikan penggunaan baru tetapi tidak menyembunyikan histori referensi.
- Job dan Client menggunakan archive, bukan delete fisik rutin. Task menggunakan soft delete. Remark dapat dihapus fisik oleh PIC/admin setelah snapshot penghapusannya dicatat ke activity log.
- FK ke user, Client, kategori, service, status, template memakai `ON DELETE RESTRICT` pada rancangan baru, kecuali dijelaskan berbeda. UUID stabil; gunakan `NO ACTION` untuk update ID.
- Pengguna existing tidak dihapus fisik. `is_active=false` berarti dinonaktifkan sementara dan tetap dapat ditampilkan pada User Management; `deleted_at IS NOT NULL` berarti soft-deleted dan tidak muncul pada daftar aktif maupun pilihan assignee. Akses aplikasi mensyaratkan `is_active=true AND deleted_at IS NULL`.
- Default status berbasis lookup `code` dilakukan RPC/trigger, bukan UUID hardcoded atau default SQL subquery.

### 4. Master Data

#### 4.1 `priorities`

| Kolom tambahan | Tipe / aturan | Tujuan |
| --- | --- | --- |
| `code` | text NN UNIQUE | HIGH, MEDIUM, LOW; identitas permanen |
| `name` | text NN | Nama tampilan |
| `color` | text NN | Warna HEX tervalidasi |
| `sort_order` | integer NN DEFAULT 0 | Urutan UI, juga ranking urgensi awal |
| `is_active` | boolean NN DEFAULT true | Boleh dipakai untuk assignment baru |
| `is_system` | boolean NN DEFAULT false | Penanda seed sistem yang dilindungi |

Seed awal: HIGH, MEDIUM, LOW. Admin boleh menambah prioritas serta mengubah nama/warna/urutan. `code` dan `is_system` tidak dapat diubah lewat UI/RPC umum; logika memakai ranking, bukan label. Urutan awal HIGH=10, MEDIUM=20, LOW=30.

#### 4.2 `job_statuses` dan 4.3 `task_statuses`

Kedua tabel mempunyai struktur sama tetapi ID, FK, dan siklus pengelolaan berbeda.

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `code` | text NN UNIQUE pada masing-masing tabel |
| `name` | text NN |
| `color` | text NN |
| `sort_order` | integer NN DEFAULT 0 |
| `is_active` | boolean NN DEFAULT true |
| `is_system` | boolean NN DEFAULT false |

Seed pada masing-masing tabel:

| code | name | is_system |
| --- | --- | --- |
| NOT_STARTED | Not Started | true |
| IN_PROGRESS | In Progress | true |
| ON_HOLD | On Hold | true |
| OBSTACLE | Obstacle | true |
| COMPLETED | Completed | true |

Kelima status sistem tersedia pada kedua tabel, tetapi penggunaannya berbeda:

- Job memakai lima status sistem tersebut dan belum mendukung status tambahan pada MVP. Hanya status sistem `COMPLETED` yang dapat ditetapkan otomatis oleh penyelesaian final step; frontend tidak boleh memilihnya langsung.
- Task Status merupakan Master Data global. Admin/super admin dapat membuat status Task tambahan. Setiap Job menentukan status Task mana yang menjadi kolom board melalui `job_task_statuses`.
- Job baru hanya memasang tiga status Task default: `NOT_STARTED`, `IN_PROGRESS`, dan `COMPLETED`. `ON_HOLD`, `OBSTACLE`, atau status global tambahan dapat dipasang kemudian oleh PIC/admin.
- `code` status sistem permanen. Status sistem tidak dapat dihapus atau dinonaktifkan. Status tambahan dapat dinonaktifkan agar tidak dipakai pada konfigurasi baru, tetapi histori tetap terbaca.

#### 4.4 `internal_service_categories`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `code` | text NN UNIQUE, permanen |
| `name` | text NN |
| `description` | text NULL |
| `color` | text NULL |
| `sort_order` | integer NN DEFAULT 0 |
| `is_active` | boolean NN DEFAULT true |

Kandidat berdasarkan nilai aktual Excel: SET UP PMA, VISA, ITAS, REVISION PT PMA, REAL ESTATE, EXECUTIVE SUMMARY, SET UP PT PMDN, OTHER. Daftar Setup juga mempunyai nilai yang belum dipakai pada pekerjaan aktual. Normalisasi/seed final memerlukan review; tidak otomatis mengganti kategori Excel dengan kategori dummy UI.

#### 4.5 `workflow_templates`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `code` | text NN UNIQUE |
| `name` | text NN |
| `description` | text NULL |
| `is_active` | boolean NN DEFAULT true |

Template dibuat lengkap dalam satu transaksi bersama seluruh step-nya. Frontend boleh mengirim array/JSON sebagai payload RPC, tetapi penyimpanan tetap relasional. Template dapat dipakai banyak Service. Template yang belum pernah dipakai Job boleh diedit melalui RPC atomik. Setelah pernah dipakai Job, template dan seluruh step immutable; perubahan dilakukan dengan membuat template baru, memindahkan assignment Service, lalu menonaktifkan template lama.

`is_active=false` menempatkan template di Trash tanpa menghapus referensi Job lama. Template yang masih menjadi assignment Service aktif harus diganti lebih dahulu sebelum dinonaktifkan. Template dapat direstore selama tidak melanggar constraint. Tidak ada status draft, submit/publish, atau revision workflow.

#### 4.6 `workflow_template_steps`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `workflow_template_id` | uuid NN FK workflow_templates.id |
| `name` | text NN |
| `description` | text NULL |
| `position` | integer NN CHECK > 0 |

UNIQUE `(workflow_template_id, position)`. Admin menambah row step pada form dan urutan teratas menjadi posisi 1. Tidak ada kolom tetap analysis/drafting/revision atau batas 3/5 step. Semua step mempunyai bobot sama; weighted progress belum MVP. RPC Save membuat template dan seluruh step atomik serta menolak posisi kosong/duplikat.

Seed awal:

- Workflow Umum: ANALISIS, DRAFTING, REVISION, FINALISASI, ISSUED.
- Workflow Visa: ANALISIS, APPLY, ISSUE.

#### 4.7 `internal_services`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `category_id` | uuid NN FK internal_service_categories.id |
| `code` | text NN UNIQUE |
| `name` | text NN |
| `summary` | text NULL |
| `workflow_template_id` | uuid NULL FK workflow_templates.id |
| `sort_order` | integer NN DEFAULT 0 |
| `is_active` | boolean NN DEFAULT true |

Contoh: Investor KITAS Renewal merupakan Service; ITAS merupakan kategori. Assignment Workflow dilakukan terpisah setelah template dibuat. Service boleh tersimpan tanpa Workflow selama konfigurasi Master Data berlangsung, tetapi tidak dapat dipilih untuk membuat Job sebelum mempunyai template aktif.

Mengubah kategori atau assignment Workflow Service hanya berlaku untuk Job baru. Job lama mempertahankan referensi dan snapshot Workflow yang dipakai saat dibuat. Service dan kategori baru harus aktif; reference histori tetap dapat dibaca ketika master inactive.

### 5. Tabel operasional

#### 5.1 `clients`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `client_type` | text NN CHECK COMPANY / INDIVIDUAL |
| `name` | text NN |
| `contact_person` | text NULL |
| `email` | text NULL |
| `phone` | text NULL |
| `address` | text NULL |
| `notes` | text NULL |
| `archived_at` | timestamptz NULL |
| `archived_by` | uuid NULL FK profiles.id |
| `version` | integer NN DEFAULT 1 |

Nama, email, dan telepon tidak UNIQUE karena orang/perusahaan dapat mempunyai nama/kontak sama. UUID menjadi identitas relasi; tidak ada reference code. Tidak menambahkan passport/KTP/tax ID pada MVP tanpa kebutuhan eksplisit dan kebijakan retensi data sensitif.

#### 5.2 `jobs`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `client_id` | uuid NN FK clients.id |
| `title` | text NN |
| `description` | text NULL |
| `pic_id` | uuid NN FK profiles.id |
| `category_id` | uuid NN FK internal_service_categories.id |
| `internal_service_id` | uuid NN FK internal_services.id |
| `workflow_template_id` | uuid NN FK workflow_templates.id |
| `priority_id` | uuid NN FK priorities.id |
| `status_id` | uuid NN FK job_statuses.id |
| `status_reason` | text NULL |
| `start_date` | date NULL, tanggal bisnis/manual |
| `estimated_end_date` | date NULL |
| `started_at` | timestamptz NULL, awal pekerjaan terdeteksi sistem |
| `completed_at` | timestamptz NULL |
| `archived_at` | timestamptz NULL |
| `archived_by` | uuid NULL FK profiles.id |
| `version` | integer NN DEFAULT 1 |

Aturan:

- Semua Job wajib mempunyai Client dan Service. Tidak ada `job_type`, Job internal tanpa Client, atau reference code Job/Task/Client.
- `start_date` dan `estimated_end_date` boleh diisi setelah Job dibuat. Bila keduanya terisi, `estimated_end_date >= start_date`.
- Assignment PIC baru wajib profile dengan role existing yang valid, `is_active=true`, dan `deleted_at IS NULL`. Penonaktifan/soft delete user tidak menghapus histori/PIC; Job aktifnya perlu di-reassign admin.
- Staff yang membuat Job menjadi PIC otomatis dan tidak dapat memilih PIC lain. Admin/super admin dapat memilih PIC ketika membuat Job. Hanya admin/super admin yang dapat mengganti `pic_id` setelahnya.
- PIC boleh mengubah title, description, Client, Service/category, priority, tanggal, dan status Job miliknya. Admin/super admin dapat mengelola semua Job.
- `category_id`, `internal_service_id`, dan `workflow_template_id` merupakan referensi master. Saat Job dibuat, kategori dan Workflow diambil dari Service aktif yang dipilih; Job tidak meminta pengguna memilih Workflow.
- Mengganti assignment Workflow pada Master Data Service hanya memengaruhi Job baru. Job lama mempertahankan `workflow_template_id` dan snapshot `job_steps` lama.
- Mengganti Service pada Job me-restart Workflow: current step lama ditandai replaced untuk histori, kategori/template diperbarui, dan snapshot step baru dibuat seluruhnya belum selesai dalam satu transaksi. Status Job tetap. Job completed harus di-reopen sebelum datanya dapat diubah.
- `progress_percentage`, `current_step_name`, `estimated_duration_days`, `deadline_state`, `overdue_days`, jumlah task, contributor, dan latest update **tidak disimpan** di jobs.
- Tidak ada kolom deadline terpisah. `estimated_end_date` adalah batas estimasi/deadline, sedangkan `start_date` dipakai bersama tanggal tersebut untuk menghitung estimasi durasi.
- `status_id`, started_at, completed_at, audit, dan version dilindungi; mutation memakai RPC, bukan write langsung.
- Hanya penyelesaian final step yang memengaruhi status Job secara otomatis. Final step menetapkan Job `COMPLETED` dan `completed_at`; step sebelumnya tidak mengubah status Job.

#### 5.3 `job_steps`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `job_id` | uuid NN FK jobs.id |
| `template_step_id` | uuid NN FK workflow_template_steps.id |
| `name` | text NN, snapshot |
| `description` | text NULL, snapshot |
| `position` | integer NN CHECK > 0 |
| `is_completed` | boolean NN DEFAULT false |
| `completed_at` | timestamptz NULL |
| `completed_by` | uuid NULL FK profiles.id |
| `replaced_at` | timestamptz NULL |
| `replaced_by` | uuid NULL FK profiles.id |
| `version` | integer NN DEFAULT 1 |

Partial UNIQUE `(job_id, position) WHERE replaced_at IS NULL`, partial UNIQUE `(job_id, template_step_id) WHERE replaced_at IS NULL`, dan UNIQUE `(job_id, id)` untuk composite FK activity log. Row lama tetap disimpan saat Workflow direstart, tetapi tidak dihitung sebagai Workflow aktif.

Constraint row-state memastikan `is_completed=true` mempunyai `completed_at/completed_by`, sedangkan step belum selesai tidak mempunyainya. Step replaced immutable. Snapshot nama/deskripsi tidak mengikuti perubahan template.

Current step adalah step aktif dengan posisi terkecil yang belum selesai. Hanya current step yang dapat diselesaikan. Hanya completed step terakhir yang dapat dikembalikan menjadi belum selesai; dengan demikian kumpulan step selesai selalu berbentuk prefix berurutan. Tidak ada state/start action step, reset seluruh progres, atau hubungan antara Task dan step.

Final step tidak dapat diselesaikan ketika Job ON_HOLD/OBSTACLE. Setelah status Job dikembalikan ke IN_PROGRESS, final step dapat diselesaikan dan otomatis menjadikan Job COMPLETED. Reopen Job completed mengembalikan final step menjadi belum selesai dan Job menjadi IN_PROGRESS dengan alasan wajib.

#### 5.4 `job_task_statuses`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `job_id` | uuid NN FK jobs.id |
| `task_status_id` | uuid NN FK task_statuses.id |
| `column_order` | integer NN CHECK > 0 |
| `version` | integer NN DEFAULT 1 |

UNIQUE `(job_id, task_status_id)`, UNIQUE `(job_id, column_order)`, dan UNIQUE `(job_id, id)` untuk composite FK Task. Saat Job dibuat, database memasang status sistem NOT_STARTED, IN_PROGRESS, dan COMPLETED dengan urutan 1–3.

Admin/super admin dapat mengonfigurasi kolom pada semua Job. PIC dapat memasang status global aktif, melepas status yang tidak digunakan Task, dan mengurutkan kolom pada Job miliknya. Hanya admin/super admin yang dapat membuat atau mengubah status global pada Master Data.

#### 5.5 `tasks`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `job_id` | uuid NN FK jobs.id |
| `job_task_status_id` | uuid NN, composite FK ke job_task_statuses(job_id, id) |
| `title` | text NN |
| `description` | text NULL |
| `assignee_id` | uuid NULL FK profiles.id |
| `priority_id` | uuid NULL FK priorities.id |
| `due_date` | date NULL |
| `position` | bigint NN DEFAULT 0 |
| `deleted_at` | timestamptz NULL |
| `deleted_by` | uuid NULL FK profiles.id |
| `version` | integer NN DEFAULT 1 |

UNIQUE `(job_id, id)` disediakan untuk composite FK activity log. Task langsung disimpan setelah form valid; tidak ada status penyimpanan sementara, submit terpisah, reference code, completion note, atau hubungan dengan `job_steps`.

- Tombol tambah membuat form/card lokal. INSERT baru dilakukan saat Save; state form yang belum disimpan tidak menjadi row database.
- Jika pengguna tidak mengisi title, RPC membentuk title dari beberapa kata awal description. Jika title dan description kosong, gunakan teks fallback agar title database tetap valid.
- Task baru ditempatkan paling atas pada kolomnya. `position` disiapkan untuk drag-and-drop dalam maupun antar-kolom; perpindahan antar-kolom mengganti `job_task_status_id`.
- `priority_id` tidak mewarisi priority Job dan boleh NULL. `due_date` juga boleh NULL.
- Task buatan staff selalu memaksa `assignee_id=auth.uid()`. Task buatan PIC/admin boleh unassigned atau ditetapkan kepada profile active/non-deleted. Staff tidak boleh mengosongkan atau mengganti assignee dan kehilangan hak mutation ketika Task dipindahkan kepada orang lain.
- Admin mengelola seluruh Task; PIC mengelola seluruh Task dalam Job miliknya; staff mengubah dan soft-delete hanya Task yang sedang di-assign kepadanya.

Job completed read-only untuk perubahan Task/step sampai Job dibuka kembali oleh PIC Job atau admin dengan alasan wajib.

#### 5.6 `job_updates`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `job_id` | uuid NN FK jobs.id |
| `message` | text NN |
| `progress_date` | date NN, wajib dipilih user |
| `performed_by` | uuid NULL FK profiles.id |
| `version` | integer NN DEFAULT 1 |

`created_by` adalah audit user yang memasukkan Remark dan tidak dapat dipilih/diubah frontend. `performed_by` adalah pelaksana opsional. Tidak ada author, assigned_to, update_type, atau relasi Remark ke Task.

PIC mengelola Remark pada Job miliknya; admin/super admin mengelola semua Remark; staff non-PIC hanya membaca. Remark dihapus fisik. RPC wajib menulis activity log berisi snapshot Remark sebelum DELETE.

UNIQUE `(job_id, id)` disediakan untuk composite FK activity log. Card Remarks diurutkan `progress_date DESC`, lalu `created_at DESC`, kemudian `id DESC` sebagai tie-breaker deterministik. Activity feed tetap diurutkan `created_at DESC`.

#### 5.7 `job_activity_logs`

Tidak menggunakan seluruh kolom common audit. Daftar lengkap:

| Kolom | Tipe / aturan |
| --- | --- |
| `id` | uuid PK DEFAULT gen_random_uuid() |
| `job_id` | uuid NN FK jobs.id |
| `task_id` | uuid NULL FK tasks.id |
| `job_step_id` | uuid NULL FK job_steps.id |
| `job_update_id` | uuid NULL FK job_updates.id |
| `actor_id` | uuid NN FK profiles.id |
| `action` | text NN; code stabil seperti JOB_STATUS_CHANGED, TASK_COMPLETED |
| `old_values` | jsonb NN DEFAULT '{}' |
| `new_values` | jsonb NN DEFAULT '{}' |
| `reason` | text NULL |
| `created_at` | timestamptz NN DEFAULT now() |

Append-only. Tidak mempunyai updated_at/update/delete grant frontend. Constraint eksplisit `CHECK (num_nonnulls(task_id, job_step_id, job_update_id) <= 1)` memastikan maksimal satu target child; ketiganya boleh NULL untuk activity tingkat Job. Composite FK memastikan target Task/Step/Remark berasal dari Job yang sama. FK Remark menggunakan ON DELETE SET NULL hanya pada `job_update_id`, sehingga hard delete Remark tidak menghapus activity atau `job_id`; snapshot lama tetap berada di JSON log.

Hanya database/RPC memasukkan log. Actor berasal dari `auth.uid()` dan tidak diterima sebagai parameter frontend. JSON hanya memuat field berubah yang relevan; tidak menyimpan JWT, secret, isi dokumen, atau PII tak perlu. Log mencakup seluruh perubahan Job, Task, Step, Remark, konfigurasi kolom Task, restart Workflow, dan penghapusan. Seluruh staff aktif/non-deleted dapat membacanya melalui projection/view atau RPC read-only; raw table tidak diberi direct write.

### 6. Tabel SOP

#### 6.1 `sops`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `internal_service_id` | uuid NN UNIQUE FK internal_services.id |
| `description` | text NULL |
| `version` | integer NN DEFAULT 1 |

Satu Service mempunyai maksimal satu SOP. SOP merupakan CRUD langsung tanpa status DRAFT/IN_REVIEW/READY, submit, publish, atau lifecycle bisnis lain. Riwayat perubahan penting tetap masuk audit; version dokumen historis terpisah belum MVP.

#### 6.2 `sop_files`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `sop_id` | uuid NN FK sops.id |
| `file_type` | text NN CHECK FLOW / REQUIREMENT |
| `title` | text NN |
| `original_filename` | text NN |
| `bucket_id` | text NN DEFAULT sop-documents, CHECK nilai bucket yang diizinkan |
| `storage_path` | text NN |
| `mime_type` | text NN |
| `size_bytes` | bigint NN CHECK > 0 |
| `sort_order` | integer NN DEFAULT 0 |
| `upload_status` | text NN DEFAULT PENDING CHECK PENDING / READY / FAILED |
| `uploaded_at` | timestamptz NULL |
| `deleted_at` | timestamptz NULL |
| `deleted_by` | uuid NULL FK profiles.id |
| `version` | integer NN DEFAULT 1 |

UNIQUE `(bucket_id, storage_path)`. Partial UNIQUE `(sop_id) WHERE file_type='FLOW' AND upload_status='READY' AND deleted_at IS NULL`: hanya satu flow current. Requirement boleh banyak. File pengganti berstatus teknis PENDING boleh ada bersamaan dengan flow READY lama sampai finalize berhasil.

FLOW menerima application/pdf atau image/jpeg,image/png,image/webp. REQUIREMENT hanya application/pdf. Batas maksimal **10 MiB per file**, diterapkan juga pada bucket. Metadata ukuran/MIME diverifikasi dari object Storage pada finalize, bukan dipercaya dari frontend. `upload_status` adalah state teknis proses upload, bukan status SOP.

Path usulan `sops/<sop_uuid>/<file_uuid>.<ext>`, nama file asli bukan path otorisasi. Jangan menyimpan signed URL di tabel.

#### 6.3 `sop_price_items`

| Kolom tambahan | Tipe / aturan |
| --- | --- |
| `sop_id` | uuid NN FK sops.id |
| `item_name` | text NN |
| `amount` | numeric(18,2) NN CHECK >= 0 |
| `currency` | text NN DEFAULT IDR CHECK = IDR untuk MVP |
| `notes` | text NULL |
| `sort_order` | integer NN DEFAULT 0 |
| `version` | integer NN DEFAULT 1 |

Harga disimpan angka, bukan string `Rp 2,500,000`. Price List hanya menggunakan IDR pada MVP; UI IDR menampilkan bilangan bulat. Ini price list referensi SOP, bukan invoice atau harga kontrak Job. Perubahan price list tidak memodifikasi tagihan historis karena domain billing belum dibuat.

### 7. Relasi dan snapshot

```text
profiles (existing UUID Auth, active approval)
  |-- jobs.pic_id
  |-- tasks.assignee_id
  `-- audit / performed_by / completion actors

internal_service_categories 1 -- N internal_services
internal_services N -- 0..1 workflow_templates (assignment untuk Job baru)
workflow_templates 1 -- N workflow_template_steps
internal_services 1 -- 0..1 sops
sops 1 -- N sop_files
sops 1 -- N sop_price_items

clients 1 -- N jobs (wajib)
jobs N -- 1 category / service / workflow template
jobs 1 -- N job_steps (snapshot)
jobs 1 -- N job_task_statuses N -- 1 task_statuses
jobs 1 -- N tasks
tasks N -- 1 job_task_statuses
jobs 1 -- N job_updates
jobs 1 -- N job_activity_logs
```

Service/category/template yang inactive tetap terlihat jika direferensikan Job lama. Workflow tanpa step tidak dapat di-assign untuk membuat Job. Template lama dinonaktifkan setelah Service dipindahkan ke template pengganti; snapshot Job lama tidak ikut berubah.

### 8. Aturan status dan transaksi

#### 8.1 Job dan step

| Aksi | Hasil |
| --- | --- |
| Create Job | Status Job NOT_STARTED, semua step belum selesai, tiga kolom Task default |
| Manual Job IN_PROGRESS tanpa step | Sah; isi started_at Job; persentase Workflow bisa 0% |
| Complete current step non-final | Step selesai dan progres naik; status Job tidak berubah |
| Complete step terakhir | Hanya sah saat Job tidak ON_HOLD/OBSTACLE; Job otomatis COMPLETED dan completed_at terisi |
| Revert completed step terakhir | Step tersebut kembali belum selesai; status Job non-completed tidak berubah |
| Job ON_HOLD / OBSTACLE manual | Alasan wajib; langkah/tanggal tidak dihapus |
| Resume Job | Pilih IN_PROGRESS melalui RPC, jangan menebak dari jumlah step selesai |
| Ganti Service Job | Workflow lama menjadi histori, snapshot baru belum selesai; status Job tetap |

Job ON_HOLD/OBSTACLE tetap boleh mempertahankan progres yang sudah ada. Step terakhir dikunci dan tidak dapat diselesaikan selama salah satu status tersebut aktif. Pengguna harus menyelesaikan masalah, mengubah Job kembali ke IN_PROGRESS, lalu menyelesaikan step terakhir. Ini menjaga invariant bahwa seluruh step selesai selalu berarti Job benar-benar COMPLETED.

`status_reason` wajib untuk ON_HOLD/OBSTACLE. Saat resume ke IN_PROGRESS, alasan aktif dikosongkan, tetapi nilai lama tetap tercatat pada `job_activity_logs`. Step selain step terakhir masih dapat dipertahankan atau diproses sesuai urutan selama override aktif. Tidak ada penghentian progres otomatis karena deadline lewat.

#### 8.2 Reopen dan perubahan workflow

- Job completed tidak dapat diubah step/statusnya melalui RPC biasa. PIC Job atau admin dapat melakukan reopen dengan alasan wajib.
- Reopen mengembalikan final step menjadi belum selesai, mengosongkan completion marker aktifnya, dan mengubah Job menjadi IN_PROGRESS. Nilai sebelum perubahan dan alasan tetap tersimpan pada activity log.
- Tidak ada fitur reset Job ke NOT_STARTED dan tidak ada reset progres/step arbitrer. Koreksi data di luar kontrak normal memerlukan prosedur admin terpisah yang diaudit, bukan RPC produk umum.
- Template yang sudah digunakan immutable. Perubahan urutan/nama/jumlah step dilakukan dengan membuat template baru, reassign Service, dan menonaktifkan template lama.
- Edit tanggal/kategori/PIC memerlukan expected_version. Job dikunci lebih dahulu, kemudian task/step dengan urutan lock yang konsisten.
- Completion Job tidak wajib semua Task selesai pada MVP; UI memberi warning jika masih ada Task belum completed, tetapi tidak memblokir completion final step.

#### 8.3 Konsistensi database

- Semua mutation status/step/task dan audit berjalan dalam satu transaksi database.
- `SELECT FOR UPDATE` pada Job serialisasi perubahan anak dan completion; re-check `is_active=true AND deleted_at IS NULL` setelah lock bila relevan.
- RPC untuk completion berulang no-op jika state tujuan sudah sama, bukan membuat audit completion duplikat. Perubahan lain dengan expected_version lama ditolak.
- Constraint row-state dan FK tidak cukup untuk aturan lintas baris; guarded trigger/RPC memvalidasi aggregate Job dan urutan step.
- Authenticated tidak memperoleh INSERT/UPDATE/DELETE langsung pada tabel domain baru. SELECT melalui RLS; mutation hanya RPC.
- Server Action membungkus RPC dengan cookie-bound client; Server Action bukan pengganti validasi database.
- Data awal master dibuat migration dengan `created_by`/`updated_by` NULL karena tidak ada session `auth.uid()`. Mutation operasional dan perubahan dari aplikasi selalu wajib mengisi actor current user melalui RPC. Tidak membuat UUID profile sistem palsu.

### 9. Nilai turunan, dashboard, dan view

- progress_percentage = completed_step_count / total_step_count * 100; workflow valid minimal satu step. Simpan precision numerik, pembulatan hanya di UI.
- current step = step aktif dengan posisi terkecil yang `is_completed=false`. Job completed menampilkan seluruh tahap selesai.
- estimated_duration_days = estimated_end_date - start_date + 1, inklusif sesuai formula Excel; NULL bila salah satu tanggal kosong. Bukan hari kerja.
- Deadline Job menggunakan `estimated_end_date`; tidak ada kolom due_date Job terpisah. Nilainya boleh diisi setelah Job dibuat.
- deadline_state: COMPLETED / NO_DEADLINE / OVERDUE / DUE_TODAY / NEAR_DEADLINE / SAFE.
- near deadline usulan tiga hari kalender; parameter query/config, bukan hardcode dalam banyak komponen. Zone bisnis eksplisit. Status overdue tidak menjadi master status pekerjaan.
- Contributor = union PIC Job + assignee Task non-deleted; deduplicate UUID. Contributor tidak menentukan read access karena seluruh staff aktif boleh membaca seluruh Job.
- Latest update = activity/Remark paling baru yang memang diizinkan user lihat.
- Dashboard Job dan dashboard Task harus membedakan label; UI sekarang menggunakan label Task untuk sebagian angka tingkat Job. Usulan statistik utama berdasarkan Job, workload Task sebagai angka terpisah; perlu persetujuan sebelum cutover dummy UI.
- Group By Client mengelompokkan seluruh Job berdasarkan Client wajib; grouped pagination jangan memecah tanpa label lanjutan atau menampilkan total page yang keliru.

View kandidat: `job_summary`, `task_summary`, `job_contributor_summary`. View menggunakan `security_invoker=true` supaya SELECT memakai RLS tabel dasar, tidak menjadi bypass. Aggregate/pagination dapat memakai read-only security-invoker RPC.

Referensi teknis view/RLS: [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 10. RLS, privileges, dan matriks akses

Tidak menambah role; tetap super_admin/admin/staff. Semua pemeriksaan berbasis profile UUID dengan `is_active=true AND deleted_at IS NULL`, bukan email, nama Google, atau role kiriman browser.

| Domain | Super admin / admin aktif | Staff aktif | Pending / rejected / inactive / anon |
| --- | --- | --- | --- |
| Master Data | Baca + mutation lewat RPC | Baca, termasuk reference inactive yang dibutuhkan | Tidak ada akses |
| Jobs | Semua Job + kelola, termasuk ganti PIC | Baca semua; boleh membuat dengan PIC diri sendiri; edit Job miliknya kecuali mengganti PIC | Tidak ada akses |
| Clients | Semua + kelola | Baca Client yang direferensikan Job; tidak mengubah | Tidak ada akses |
| Job steps | Baca + Complete/Revert | Baca semua; Complete/Revert hanya jika PIC Job | Tidak ada akses |
| Kolom status Task per Job | Semua + kelola | Baca semua; PIC mengatur Job miliknya | Tidak ada akses |
| Tasks | Semua + kelola | Baca semua Task non-deleted; PIC kelola Task Job miliknya; staff lain kelola Task yang di-assign kepadanya | Tidak ada akses |
| Job updates / Remarks | Semua + kelola | Baca semua; PIC mengelola Remark Job miliknya | Tidak ada akses |
| Activity logs | Baca melalui projection; tidak direct write | Baca seluruh activity melalui projection; tidak direct write | Tidak ada akses |
| SOP / files / price | Baca + kelola | Baca layanan internal | Tidak ada akses |
| Approval / role pengguna | Super admin saja | Tidak boleh | Hanya request sendiri saat authenticated sesuai existing |

Detail:

- Seluruh staff aktif boleh membaca semua Job dan Task non-deleted. Hak mutation tetap berbasis admin, PIC Job, atau assignee Task saat ini.
- Saat staff biasa membuat Task, RPC mengabaikan/menolak assignee kiriman dan memaksa `assignee_id=auth.uid()`. Staff hanya dapat mengubah Task miliknya serta tidak dapat reassign. PIC dapat membuat, mengubah, dan reassign Task dalam Job miliknya; admin dapat melakukannya pada semua Job.
- PIC/admin dapat mengatur kolom status Task per Job. Pembuatan/perubahan status global pada Master Data hanya untuk admin/super admin.
- Tidak ada hak berbasis `created_by` untuk Job, Task, atau Remark. Kolom tersebut hanya audit. Remark hanya dapat dimutasi PIC Job atau admin.
- Helper capability internal menggunakan schema non-exposed seperti `private`, SECURITY DEFINER hanya bila perlu memutus recursive RLS. Selalu validasi `is_active=true AND deleted_at IS NULL`.
- Policy profiles tidak memanggil is_admin_role() security-invoker yang membaca profiles lagi. Gunakan definer helper kecil untuk directory access guna menghindari recursion.
- Directory PIC/assignee RPC hanya mengeluarkan UUID, display name, avatar, dan active flag user non-deleted yang diperlukan; tidak memberi arbitrary lookup auth.users atau email seluruh user kepada staff. User inactive boleh tampil di User Management tetapi tidak masuk picker assignment baru.
- Audit, status, PIC, assignee, version, storage path, file state dilindungi dengan pencabutan write grants dan RPC terbatas; RLS row saja tidak melindungi kolom.
- Functions mutation: `search_path=''`, object schema-qualified, revoke EXECUTE PUBLIC/anon, grant hanya authenticated yang diperlukan, validation database setiap panggilan. Private helper tidak jadi endpoint Data API.
- Functions trigger internal tidak diberi direct EXECUTE browser. SELECT RLS tetap berlaku bahkan jika endpoint Next.js dilewati.
- Jangan memberi authenticated akses execute system operation tanpa pemeriksaan admin yang sesuai. Semua function definer harus ditinjau karena dapat bypass RLS.

Referensi grants dan RPC: [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api), [Supabase security-definer helpers](https://supabase.com/docs/guides/troubleshooting/do-i-need-to-expose-security-definer-functions-in-row-level-security-policies-iI0uOw).

### 11. Kandidat RPC dan tanggung jawabnya

Nama berikut rancangan, belum function existing. Semua write memakai auth.uid() untuk actor, memvalidasi hak akses dan expected_version bila mutable.

| RPC | Tanggung jawab |
| --- | --- |
| `create_client`, `update_client`, `archive_client` | Validasi data dan lifecycle Client |
| `save_master_data` | Endpoint khusus masing-masing master; bukan dynamic SQL/table name arbitrer |
| `create_workflow_template`, `update_unused_workflow_template` | Buat/edit template yang belum dipakai beserta ordered steps secara atomik |
| `assign_service_workflow`, `set_workflow_active` | Assignment Service; Trash/restore template dengan perlindungan referensi |
| `create_job` | Validasi Client/Service/PIC; PIC staff dipaksa current user; snapshot step + tiga kolom Task default; log atomik |
| `update_job` | Field allowlist; perubahan Service me-restart Workflow; hanya admin mengganti PIC |
| `change_job_status` | Manual IN_PROGRESS/ON_HOLD/OBSTACLE; alasan wajib untuk override; menolak COMPLETED/NOT_STARTED |
| `complete_job_step`, `revert_last_job_step` | Complete current/revert completed terakhir; final step dapat menutup Job |
| `reopen_job` | PIC/admin membuka Job completed; alasan wajib; final step kembali belum selesai |
| `archive_job` | Archive tanpa menghilangkan histori |
| `configure_job_task_statuses` | PIC/admin memasang, melepas yang tidak digunakan, dan mengurutkan kolom status Job |
| `create_task`, `update_task`, `move_task`, `delete_task` | Create/update/drag-drop/soft-delete sesuai admin/PIC/assignee; tanpa draft |
| `create_job_update`, `update_job_update`, `delete_job_update` | CRUD Remark PIC/admin; delete mencatat snapshot sebelum hard delete |
| `save_sop`, `save_sop_price_items` | Edit SOP, price rows dengan transaksi/version |
| `prepare_sop_file_upload`, `finalize_sop_file_upload`, `mark_sop_file_deleted` | Metadata reservasi, object validation, replacement flow, lifecycle delete |
| `list_assignable_profiles` | Directory projection minimal untuk picker |
| `get_dashboard_summary`, `list_jobs`, `list_job_activity` | Read-only, filter allowlist, pagination dan RLS |
| `set_profile_active`, `soft_delete_profile`, `restore_profile` | Super admin saja; restore mengosongkan deleted_at tetapi mempertahankan is_active=false |

RPC tidak menerima user_id untuk menjadikan seseorang admin; akses approval tetap memakai function existing super admin.

### 12. Storage dan Download All

- Bucket baru `sop-documents` private; jangan memakai bucket public `images` untuk dokumen internal.
- Private object diakses melalui authenticated download atau signed URL singkat yang dibuat sesudah RLS/permission check. Signed URL adalah bearer capability hingga expiry; jangan dicache bersama/public, disimpan dalam DB, atau ditulis log.
- Prepare upload mereservasi file_uuid/path PENDING. Storage INSERT policy hanya menerima reservasi milik operator active/admin yang sah; path SOP harus cocok.
- Upload `upsert=false`. Finalize memeriksa object melalui Storage API server dengan session user/metadata yang terotorisasi lalu transaksi database menandai READY. Object existence/size/type tidak boleh sekadar parameter frontend.
- Flow replacement: upload baru dulu; setelah valid, lock SOP dan ganti flow READY lama menjadi deleted, aktifkan baru. Jika finalize gagal, flow lama tetap bisa dibaca.
- Penghapusan: mark deleted dulu untuk menutup akses baru, hapus object lewat Storage API, retry bila gagal. Tidak menghapus row storage.objects lewat SQL. Policy cleanup memperbolehkan admin menghapus object yang telah ditandai deleted atau orphan reservasi yang sah.
- Transaksi PostgreSQL tidak bisa membuat upload/delete Storage HTTP atomik; gunakan lifecycle/retry/cleanup. Jika diperlukan, tambahkan cleanup worker pada fase implementasi, bukan klaim rollback DB dapat mengembalikan object.
- Download All mengambil requirement READY/non-deleted yang terotorisasi lalu membangun satu ZIP. Deduplicate entry filename agar PDF dengan nama sama tidak menimpa hasil ekstraksi. Untuk ukuran besar, gunakan streaming server dengan cookie user, bukan service-role endpoint publik.
- Edit/Add card adalah state UI; tidak perlu kolom is_editing database. Row Price List yang belum lengkap tetap lokal dan baru disimpan setelah valid.

Referensi: [Private Storage buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).

### 13. Kandidat index — verifikasi dengan query plan sebelum final

PK/UNIQUE membuat index terkait; jangan membuat ulang index identik. FK lain dipilih sesuai query dan authorization. Nama/DDL final belum diputuskan.

| Tabel | Kandidat |
| --- | --- |
| jobs | `(client_id, created_at DESC, id)` untuk Group Client/detail |
| jobs | `(pic_id, status_id, estimated_end_date, id)` untuk beban PIC |
| jobs | `(status_id, estimated_end_date, id)` WHERE archived_at IS NULL |
| jobs | `(category_id, created_at DESC, id)` jika filter kategori terbukti membutuhkan |
| job_task_statuses | UNIQUE `(job_id, task_status_id)` dan UNIQUE `(job_id, column_order)` |
| tasks | `(assignee_id, job_id)` WHERE deleted_at IS NULL untuk My Tasks |
| tasks | `(job_id, job_task_status_id, position, id)` WHERE deleted_at IS NULL untuk board |
| job_steps | partial UNIQUE `(job_id, position)` WHERE replaced_at IS NULL |
| job_updates | `(job_id, progress_date DESC, created_at DESC, id)` untuk Remarks |
| job_activity_logs | `(job_id, created_at DESC, id)` |
| sop_files | `(sop_id, file_type, sort_order, id)` WHERE deleted_at IS NULL |
| sop_price_items | `(sop_id, sort_order, id)` |

Query pencarian lintas Job title/Client memerlukan desain server projection/search khusus; pilih trigram/full-text setelah benchmark, tidak langsung menambah semua index. Pagination memakai order deterministik dengan id tie-breaker, filter sebelum count/grouping. Tidak memakai index berpredicate tanggal now() untuk deadline dinamis.

### 14. Posisi Excel dalam MVP

- Workbook hanya menjadi referensi untuk memahami istilah, contoh Client/Job/PIC/kategori, serta bentuk workflow yang digunakan tim.
- MVP tidak mempunyai tabel staging, importer permanen, `completion_source`, atau timestamp provenance impor.
- Data Excel tidak otomatis dimasukkan saat migration/seed dan tidak digunakan untuk menebak identitas Client, profile, Task, status, maupun tanggal completion.
- Jika kemudian diputuskan bahwa data lama harus dimigrasikan, buat script one-time terpisah setelah schema final. Mapping dan rekonsiliasi dilakukan dengan review operator; kebutuhan itu harus mempunyai rancangan serta verifikasi tersendiri dan tidak mengubah kontrak schema inti secara diam-diam.

### 15. Verifikasi yang diperlukan sebelum migration dianggap siap

- Schema review: semua 17 tabel, FK composite, nullable audit untuk seed, soft-delete profile/Task, hard-delete Remark dengan log snapshot, privileges, constraint/trigger lintas baris, dan kontrak RPC.
- pgTAP: role active/inactive/soft-deleted/no profile, seluruh staff read Job/log, direct write denied, master immutable code, Workflow immutable setelah dipakai, Job default, urutan complete/revert step, final-step lock saat hold/obstacle, hanya final step menutup Job, restart Workflow saat ganti Service tanpa mengubah status, reopen PIC/admin dengan alasan, konfigurasi kolom Task, self-assignment staff, unassigned Task PIC/admin, reassign, drag/drop position, soft-delete Task, hard-delete Remark terlog, child Job mismatch, race/version stale, dan status Task independen.
- Storage HTTP lokal: private access denied anon/pending, unauthorized path upload, file type/size, flow replacement/race, delete failure retry, signed URL scope, ZIP duplicate filenames.
- FE: My Tasks/PIC, Group Client, dashboard Job vs Task, form lokal Task sebelum Save, dynamic status columns, loading/error/empty states, PDF dan Price List mutations.
- Type generation/typecheck/lint/test lokal; schema lint/diff lokal setelah migration dibuat.
- Tidak reset data lokal penting tanpa memeriksa seed/backups. Tidak menjalankan db push/reset linked/remote migration dalam fase rancangan ini.

### 16. Keputusan produk

Keputusan yang sudah dikunci dalam revisi ini:

1. Semua Job wajib mempunyai Client, Service aktif dengan Workflow, dan satu PIC. Tidak ada Job internal tanpa Client atau reference code.
2. Staff yang membuat Job menjadi PIC; admin dapat memilih/mengganti PIC. PIC dapat mengubah data Job selain `pic_id`.
3. Workflow disimpan pada `workflow_templates` + ordered `workflow_template_steps`, dibuat atomik tanpa draft/revision. Banyak Service dapat memakai template yang sama.
4. Template yang sudah dipakai Job immutable. Penggantinya dibuat sebagai template baru; template lama masuk Trash melalui `is_active=false`. Job selalu memakai snapshot.
5. `job_steps` hanya selesai/belum selesai. Current step adalah incomplete pertama; complete hanya current dan revert hanya completed terakhir.
6. Hanya final step yang mengubah status Job otomatis menjadi COMPLETED. Final step dikunci saat Job ON_HOLD/OBSTACLE.
7. Mengganti Service pada Job me-restart Workflow tetapi mempertahankan status Job; progress lama tersimpan sebagai histori/Job Logging.
8. Job completed boleh memiliki Task terbuka; UI memberi warning tanpa memblokir final step. PIC/admin dapat reopen dengan alasan wajib.
9. Status Job dan Task memakai tabel terpisah dengan lima status sistem awal. Job baru memasang tiga kolom Task default; admin/PIC dapat memasang status lain melalui `job_task_statuses`.
10. Task langsung tersimpan setelah form valid. Task mempunyai title tersimpan, description/assignee/priority/due date opsional, posisi board, dan soft delete. Staff-created Task selalu self-assigned.
11. Seluruh staff aktif/non-deleted membaca semua Job, Task non-deleted, Remarks, dan Job Logging. Mutation mengikuti admin/PIC/current assignee.
12. Remark adalah catatan manual dengan progress_date wajib dan performed_by opsional. PIC/admin mengelola; delete fisik wajib meninggalkan snapshot activity log.
13. User/profile menggunakan soft delete. Restore tidak otomatis mengaktifkan akses kembali.
14. Satu Service maksimal satu SOP. SOP CRUD langsung tanpa status bisnis; file maksimal 10 MiB dan Price List IDR-only.
15. `start_date` dan `estimated_end_date` boleh diisi belakangan. Deadline memakai estimated_end_date dan durasi memakai kedua tanggal bila tersedia.
16. Excel hanya referensi desain dan bukan importer MVP.

Urutan implementasi yang direkomendasikan:

1. Perubahan lifecycle `profiles`, Master Data, Client, dan workflow template.
2. Jobs serta snapshot `job_steps` berikut transaksi status/step.
3. Tasks, updates, activity logs, read views, dan matriks RLS/RPC.
4. SOP, private Storage, dan lifecycle file.
5. Hardening lintas role, pgTAP/Storage test, schema lint/diff lokal, lalu integrasi frontend.

Setiap fase dibuat sebagai migration lokal terpisah agar dapat direview dan diuji dari kondisi bersih. Tidak ada migration yang dibuat sebagai bagian dari revisi dokumentasi ini.

## ===== Rancangan DB yang sudah ada / lama

### 17. Batas pembacaan existing

- Bagian ini mendokumentasikan kontrak source/migration lokal saat review, bukan audit langsung schema Production.
- Baseline tidak diedit: `supabase/migrations/20260814124226_remote_schema.sql`.
- Forward migrations existing: harden_core_authorization, harden_functions_and_review_contract, harden_blog_image_storage, harden_contact_submission, rename_question_answer_column, add_admin_access_approval.
- Generated types membantu daftar kolom, tetapi bukan bukti lengkap PK/check/grants atau bahwa deployment Production sudah dilakukan.
- `auth.users` dan `storage.*` dimiliki Supabase. Tidak mendefinisikan ulang seluruh kolom internal Auth/Storage.

### 18. Tabel dan seluruh kolom existing schema public

#### 18.1 `profiles`

- `id uuid NN PK`, FK auth.users.id, cascade update/delete existing.
- `email text NN UNIQUE`.
- `role public.role NN`, tanpa default setelah hardening; super_admin/admin/staff.
- `is_active boolean NN DEFAULT false` setelah hardening.
- `created_at timestamptz NN DEFAULT now()`.
- `updated_at timestamptz NULL DEFAULT now()`.
- Tidak ada full_name/avatar_url pada profiles saat ini. Google name/avatar header diambil dari metadata auth user, bukan kolom profiles.
- SELECT sendiri; super admin aktif SELECT semua. Write authenticated/anon dicabut; approval RPC membuat profile aktif. Tidak ada fitur edit role/is_active langsung pengguna.

Perubahan V2 yang diusulkan terhadap profiles, belum diterapkan:

- Tambahkan `display_name text NULL`, `avatar_url text NULL` untuk directory PIC/assignee; sinkronisasi metadata user sendiri melalui RPC yang tidak bisa mengubah role/is_active.
- Tambahkan `deleted_at timestamptz NULL` untuk soft delete. `is_active=false` tetap berarti penonaktifan sementara dan user masih dapat ditampilkan pada User Management; `deleted_at IS NOT NULL` menyembunyikan user dari daftar aktif/picker assignment dan menolak akses dashboard/RLS.
- `restore_profile` hanya menetapkan `deleted_at=NULL`; `is_active` tetap false. Super admin harus mengaktifkan profile melalui aksi terpisah. User soft-deleted tersedia melalui filter khusus Deleted Users.
- Sync dilakukan hanya jika profile sudah approved, bukan trigger membuat profile seluruh auth.users. Metadata Google hanya tampilan, bukan otorisasi.
- Backfill terbatas profile existing melalui workflow operator aman; nama lama di Excel tetap dipetakan manual ke UUID.
- Directory RPC hanya projection minimal. Super admin tetap memakai approval existing; staff/admin tidak memperoleh akses Auth Admin API.
- Pertahankan semua existing profile/bootstrap. Tidak menambah role baru atau mengganti UUID. Profile dengan histori operasional tidak dihapus fisik; hard delete `auth.users` bukan alur lifecycle aplikasi.
- Ubah FK `profiles.id -> auth.users.id` dari ON DELETE CASCADE menjadi RESTRICT/NO ACTION agar penghapusan Auth user tidak menghapus identitas histori secara tidak sengaja. Validasi kompatibilitas schema Auth lokal wajib dilakukan saat migration dirancang.

#### 18.2 `admin_access_requests`

- `user_id uuid NN PK`, FK auth.users.id ON UPDATE/DELETE CASCADE.
- `email text NN`, tidak boleh blank.
- `full_name text NULL`, `avatar_url text NULL`.
- `status admin_access_request_status NN DEFAULT pending`.
- `requested_at timestamptz NN DEFAULT now()`.
- `reviewed_at timestamptz NULL`.
- `reviewed_by uuid NULL FK profiles.id ON UPDATE CASCADE ON DELETE SET NULL`.
- `rejection_reason text NULL`, maksimal 1000 karakter.
- `created_at`, `updated_at timestamptz NN DEFAULT now()`.
- CHECK review_state: pending reviewer/waktu/alasan NULL; approved reviewer/waktu wajib dan alasan NULL; rejected reviewer/waktu wajib, alasan opsional.
- Pending index `(requested_at)` partial status pending; trigger updated_at.
- User SELECT request sendiri; active super admin SELECT semua. Mutation hanya ensure/approve/reject RPC.
- Satu row per UUID, creation idempotent. Ensure tidak mengubah rejected/approved menjadi pending.

Perubahan V2 yang diusulkan: ubah FK `reviewed_by` menjadi ON DELETE RESTRICT/NO ACTION. Ini selaras dengan CHECK review state dan kebijakan profile tidak dihapus fisik. Snapshot nama/email reviewer tidak diperlukan selama identitas profile dipertahankan.

#### 18.3 `team_members`

- `id uuid NN PK DEFAULT gen_random_uuid()`.
- `profile_id uuid NULL FK profiles.id`, update/delete cascade existing; bukan relasi UNIQUE 1:1 yang dapat diasumsikan.
- `full_name text NN`, `job_title text NN`.
- `short_bio text NULL`, `avatar_url text NULL`, `nickname text NULL`.
- `is_visible boolean NN DEFAULT true`.
- `display_order bigint NULL`.
- `created_at`, `updated_at timestamptz NULL DEFAULT now()`.
- Anggota tim website publik, bukan directory hak akses operasional. Public read hanya visible; user terkait baca sendiri; admin aktif manage.
- V2 tidak mengharuskan setiap PIC muncul sebagai team website; profiles tetap sumber identitas assignment.

#### 18.4 `services_categories`

- `id uuid NN PK DEFAULT gen_random_uuid()`, `slug text NN UNIQUE`.
- `title`, `short_description`, `description text NULL`.
- `seo_title`, `seo_description`, `og_image text NULL`.
- `hero_heading`, `hero_image`, `card_image`, `card_icon_key text NULL`.
- `type categories_type NN DEFAULT primary`: primary/secondary.
- `sort_order bigint NULL DEFAULT 0`, `is_published boolean NULL` tanpa default pada baseline.
- `created_at`, `updated_at timestamptz NULL DEFAULT now()`.
- Konten/kategori website publik. Public SELECT published; trigger updated_at.
- Tidak dipakai sebagai kategori operasional V2 dan tidak diubah dalam rancangan ini.

#### 18.5 `services_items`

- `id uuid NN PK DEFAULT gen_random_uuid()`.
- `category_id uuid NN FK services_categories.id`, cascade update/delete existing.
- `slug text NN`, UNIQUE `(category_id, slug)`.
- `title`, `description`, `icon_key text NULL`.
- `seo_title`, `seo_description`, `og_image text NULL`.
- `cta_label text NULL DEFAULT contact`, `cta_type cta_type NN DEFAULT contact`.
- `sort_order bigint NULL DEFAULT 0`, `is_published boolean NULL` tanpa default pada baseline.
- `created_at`, `updated_at timestamptz NULL DEFAULT now()`.
- Katalog layanan website, public published read, updated_at trigger. Terpisah dari internal_services.

#### 18.6 `services_item_details`

- `id uuid NN PK DEFAULT gen_random_uuid()`.
- `service_item_id uuid NN FK services_items.id`, cascade update/delete existing.
- `title`, `description`, `cta_description text NULL`.
- `sort_order bigint NULL DEFAULT 0`, UNIQUE `(service_item_id, sort_order)`.
- `is_published boolean NULL` tanpa default pada baseline.
- `created_at`, `updated_at timestamptz NULL DEFAULT now()`.
- Detail/accordion layanan website, public published read, updated_at trigger. Bukan SOP operasional.

#### 18.7 `blog_posts`

- `id uuid NN PK DEFAULT gen_random_uuid()`, `slug text NN UNIQUE`.
- `title`, `excerpt`, `content_md text NULL`; content_md pada aplikasi berisi HTML Tiptap meskipun nama lama MD.
- `author_name text NULL`, `reading_time_min bigint NULL`.
- `featured_image`, `cover_alt text NULL`.
- `seo_title`, `seo_description`, `og_image text NULL`.
- `published_at date NULL`; trigger mengisi saat transisi published.
- `status blog_status NULL DEFAULT draft`.
- `created_at`, `updated_at timestamptz NULL DEFAULT now()`.
- Public SELECT published; active staff read semua, insert/update draft/pending; active admin insert/update semua status dan delete.
- Tidak diubah untuk domain tracking.

#### 18.8 `contact_messages`

- `id uuid NN DEFAULT gen_random_uuid()`; **belum mempunyai PK/UNIQUE pada baseline yang diaudit**, meskipun dokumentasi V1 lama mengklaim PK.
- `name text NN`, `email`, `phone text NULL` pada DDL.
- `message text NN`, `status contact_status NN DEFAULT new`.
- `created_at timestamptz NULL DEFAULT now()`.
- Forward migration CHECK NOT VALID untuk kontrak name/email/phone/message tetap berlaku pada write baru; email/phone baru tidak boleh NULL walau nullable secara tipe.
- Public/authenticated direct INSERT dicabut. Submit server-side setelah Turnstile memakai dedicated server-only Secret client existing.
- Staff aktif read/update; admin aktif delete sesuai hardening existing.
- Temuan PK tetap follow-up terpisah; bukan diperbaiki oleh rancangan tracking.

#### 18.9 `review_requests`

- `id uuid NN PK DEFAULT gen_random_uuid()`.
- `token_hash text NN UNIQUE`, hash SHA-256, bukan token mentah.
- `client_name`, `client_email text NULL`.
- `expires_at`, `used_at`, `revoked_at timestamptz NULL`.
- `created_at timestamptz NN DEFAULT now()`.
- Staff aktif insert/read/update; admin aktif delete. Token capability digunakan oleh review RPC.
- Nama/email ini snapshot undangan review, bukan FK clients. Menautkan review ke Client/Job merupakan fitur masa depan, bukan migrasi wajib MVP.

#### 18.10 `reviews`

- `id uuid NN PK DEFAULT gen_random_uuid()`.
- `review_request_id uuid NULL FK review_requests.id`, NO ACTION default existing.
- `name text NN`, `email text NULL`, `message text NN`.
- `is_published boolean NULL DEFAULT false`, `is_featured boolean NULL DEFAULT false`.
- `created_at timestamptz NN DEFAULT now()`.
- Public SELECT published; staff aktif read/update; admin aktif delete. Submit via hardened token RPC atomik.
- Tidak diubah dalam domain tracking.

#### 18.11 `question_answer`

- `id uuid NN PK DEFAULT gen_random_uuid()`.
- `services_categories_id uuid NULL FK services_categories.id`, cascade update/delete.
- `question text NN`, `answer text NN`; forward migration sudah mengganti typo lama menjadi answer.
- `is_visible boolean NN DEFAULT true`.
- `created_at`, `updated_at timestamptz NULL DEFAULT now()`.
- Public SELECT visible. File statis masih canonical FAQ menurut baseline sampai cutover CMS disetujui.
- Tidak dipakai sebagai requirement/SOP.

### 19. Enum existing dan legacy

| Enum saat source review | Nilai |
| --- | --- |
| role | super_admin, admin, staff |
| admin_access_request_status | pending, approved, rejected |
| blog_status | draft, pending, published, rejected |
| categories_type | primary, secondary |
| contact_status | new, in_progress, replied, closed, spam |
| cta_type | contact, detail |

Baseline V1 memuat editor/contributor; forward authorization migration menggantinya menjadi staff. Itu bukan role yang harus dihidupkan kembali untuk V2. Job/Task statuses baru adalah tabel Master Data, bukan mengganti enum role/auth/CMS.

### 20. Function, trigger, policy, dan Storage existing

Functions inti:

- `current_role`, `is_admin_role`, `is_staff_role`, `is_admin`, `is_staff`: saat ini memeriksa active profile; V2 harus menambahkan syarat `deleted_at IS NULL`.
- `is_active_super_admin`: definer helper read profile untuk menghindari recursive policy profiles; V2 juga wajib menolak soft-deleted profile.
- `ensure_admin_access_request`: authenticated current user, metadata Auth, request idempotent.
- `approve_admin_access_request(p_user_id, p_role)`: super admin aktif, lock pending, profile active + role + request approved satu transaksi.
- `reject_admin_access_request(p_user_id, p_rejection_reason)`: super admin aktif, pending lock, reviewed actor current user, tidak membuat profile.
- `check_review_request_status`, `submit_review`: token capability; hardened definer + safe search path; submit lock request dan insert review atomik.
- `set_blog_post_published`: diperbaiki agar memakai blog status, bukan kolom is_published yang tidak ada.
- `set_published_at`, `set_updated_at`: trigger functions existing.

Catatan drift source: generated types saat review menyebut return `submit_review` string, tetapi hardened SQL migration mendeklarasikan UUID. Validasi/regenerasi types harus dilakukan saat implementasi; jangan menyatakan types membuktikan semua signature SQL.

Triggers utama yang terbukti: updated_at kategori/item/detail service, published_at blog, updated_at admin_access_requests. Tabel baru memerlukan trigger audit/version sendiri yang tidak mengubah kontrak CMS lama.

Storage existing:

- Bucket public `images`, dipakai cover/body blog; dibuat forward storage migration.
- Path blog/ dan blog_cover/, active staff insert, owner cleanup untuk file tak direferensikan, active admin delete; tidak ada UPDATE policy sehingga replace membuat path baru.
- Bucket public tidak cocok untuk PDF internal. Buat bucket private baru; jangan merombak policy images untuk kebutuhan SOP.

### 21. Dampak V2 terhadap existing dan batas rollout

- Perubahan inti: menambah 17 tabel + functions/policies/index/view/bucket private. Kolom `display_name`, `avatar_url`, dan `deleted_at` pada profiles serta hardening FK lifecycle perlu migration tersendiri/terintegrasi yang diaudit.
- Tidak rename/drop tabel CMS, tidak mengubah role enum, tidak menghapus existing super admin, tidak mengubah OAuth Production.
- Auth.users hanya identitas; profiles approval tetap gate akses. User tanpa profile, inactive, atau soft-deleted tidak boleh membaca domain tracking maupun Storage internal.
- Profil approved existing bootstrap super admin tetap digunakan. Jika belum ada, operator tepercaya melakukan provisioning satu akun memakai workflow bootstrap yang sudah didokumentasikan; tidak membuat endpoint self-promotion.
- Tidak ada kebutuhan secret/service_role frontend atau penambahan service-role client untuk tracking. Server-only Secret client existing kontak tetap domain terpisah, bukan dipakai sebagai bypass RLS tracking.
- Migration baseline tidak diedit. Implementasi berikut memakai migration lokal baru, review schema drift, test lokal, Preview, backup, dan approval terpisah sebelum rollout Production.
- Tidak ada command production, reset, migration, type generation, atau perubahan workbook yang dilakukan untuk membuat dokumen ini.
