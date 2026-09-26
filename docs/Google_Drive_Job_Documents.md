# Google Drive untuk Job Documents dan SOP

## Scope saat ini

- Menambahkan tab `Documents` pada Job Detail.
- Menampilkan metadata file sebagai card dan membuka `web_view_url` di tab baru.
- Menyediakan upload resumable sampai 100 MiB, progress upload, open in new tab, dan pemindahan file ke Google Drive Trash.
- Menyediakan panel Manage Access pada folder Job untuk menambah pengguna, mengubah role, dan menghapus akses langsung.
- Menyediakan schema lokal untuk folder Job dan metadata file Google Drive.
- Autentikasi server menggunakan Vercel OIDC, Google Workload Identity Federation, dan service-account impersonation tanpa JSON private key.
- Webhook/Changes API dan background reconciliation belum diaktifkan.
- Flow dan Requirement SOP juga menggunakan Google Drive; deskripsi dan Price List tetap berada di PostgreSQL.

## Keputusan arsitektur

Google Drive menjadi sumber kebenaran untuk:

- isi file;
- struktur folder pada Shared Drive;
- ACL atau permission;
- capability seperti `canShare` dan `canDelete`.

PostgreSQL hanya menyimpan relasi dan metadata yang diperlukan untuk menampilkan file. Aplikasi tidak menyimpan binary file Google Drive di Supabase Storage.

SOP memakai root folder terpisah melalui `GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID`. Setiap SOP memperoleh satu child folder yang dicatat pada `sop_drive_folders`; file Flow dan Requirement dicatat pada `sop_files` menggunakan provider `GOOGLE_DRIVE`.

## Struktur database

### `job_drive_folders`

Satu Job mempunyai maksimal satu folder Google Shared Drive aktif.

- `job_id`: Job pemilik folder.
- `google_drive_id`: ID Shared Drive.
- `google_folder_id`: ID folder tujuan upload Job.
- `folder_name`: nama folder untuk tampilan dan audit.
- `web_view_url`: URL folder dari Google.
- `connection_status`: `PENDING`, `READY`, `ERROR`, atau `DISCONNECTED`.
- `last_synced_at`: waktu sinkronisasi metadata terakhir.
- audit, optimistic locking, dan soft archive.

### `job_documents`

- `job_id` dan `job_drive_folder_id`: memastikan file berada pada folder milik Job yang sama.
- `google_file_id`: identitas file Google; URL tidak dipakai sebagai identitas.
- `google_resource_key`: disediakan untuk link Google yang memerlukan resource key.
- `file_name`, `mime_type`, dan `file_size_bytes`: metadata tampilan.
- `web_view_url`: link browser lengkap yang dikembalikan Google.
- `source`: `MANUAL_LINK` atau `GOOGLE_DRIVE_API`.
- `sync_status`: `READY`, `MISSING`, `ERROR`, atau `TRASHED`.
- `uploaded_at` dan `uploaded_by`.
- audit, optimistic locking, dan soft archive.

File Google yang sama tidak dapat dicatat dua kali pada Job yang sama, tetapi tetap dapat direferensikan oleh Job lain bila kebutuhan bisnis mengharuskannya.

## Akses aplikasi

- Semua staff aktif dapat membaca dan membuka dokumen Job, konsisten dengan visibilitas Job saat ini.
- Hanya admin, super admin, atau PIC Job yang nantinya boleh membuat folder, upload, delete, dan mengelola akses.
- Tabel tidak memberikan hak insert/update/delete langsung kepada `authenticated`.
- Mutasi metadata dilakukan melalui server action dan RPC `security definer` yang memvalidasi PIC/admin/super admin.
- Link tidak menggantikan Google ACL. Pengguna yang tidak memperoleh permission di Drive tetap akan ditolak oleh Google ketika membuka link.

## Flow API berikutnya

### Persiapan folder

1. Server memvalidasi admin/PIC Job.
2. Cari atau buat folder Job di Shared Drive.
3. Simpan mapping ke `job_drive_folders` secara idempotent.
4. Untuk Shared Drive, request file Google harus menyatakan dukungan Shared Drive.

### Upload

1. Server memvalidasi ukuran, Job, actor, dan membuat resumable upload session Google.
2. Browser mengunggah file langsung ke session URI sementara tanpa memperoleh credential Google.
3. Server membaca ulang file berdasarkan ID, lalu memverifikasi Shared Drive dan parent folder.
4. Setelah verifikasi, server menyimpan `google_file_id`, metadata, dan `web_view_url` melalui RPC.
5. Jika penyimpanan database gagal, file Google yang baru dibuat dipindahkan ke Trash sebagai kompensasi.

### Delete

1. Server memvalidasi hak admin/PIC dan versi metadata.
2. Pindahkan file ke Google Drive Trash terlebih dahulu.
3. Setelah berhasil, soft-archive row `job_documents` melalui RPC.

### Manage Access

- Permission diterapkan pada folder Job agar diwarisi oleh seluruh dokumen di dalamnya.
- Aplikasi hanya membuat akses tipe `user` dengan role Viewer, Commenter, atau Editor.
- Permission yang diwarisi dari Shared Drive ditampilkan read-only dan harus diubah dari Shared Drive.
- Service account integrasi tidak dapat dihapus melalui panel aplikasi.

## Environment production

Variabel berikut wajib tersedia hanya di server Vercel:

```text
GCP_PROJECT_ID
GCP_PROJECT_NUMBER
GCP_SERVICE_ACCOUNT_EMAIL
GCP_WORKLOAD_IDENTITY_POOL_ID
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID
GCP_AUDIENCE (opsional, hanya untuk provider dengan default audience Google)
GOOGLE_DRIVE_SHARED_DRIVE_ID
GOOGLE_DRIVE_ROOT_FOLDER_ID
GOOGLE_DRIVE_SOP_ROOT_FOLDER_ID
```

Jangan menambahkan awalan `NEXT_PUBLIC_` dan jangan membuat service-account JSON key. Jika provider menggunakan Allowed audiences, `GCP_AUDIENCE` tidak perlu dibuat.

## Authentication Google

Autentikasi menggunakan token OIDC Vercel berumur pendek, ditukar melalui Google Security Token Service, lalu mengimpersonasi service account `dsi-drive-integration`. Service account menjadi member Shared Drive. Tidak ada JSON private key, refresh token, atau Google access token permanen yang disimpan di environment maupun database.

## Referensi resmi

- Shared Drive support: https://developers.google.com/workspace/drive/api/guides/enable-shareddrives
- File creation/upload: https://developers.google.com/workspace/drive/api/guides/create-file
- Permissions and sharing: https://developers.google.com/workspace/drive/api/guides/manage-sharing
