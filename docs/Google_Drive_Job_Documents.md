# Rancangan Google Drive untuk Job Documents

## Scope saat ini

- Menambahkan tab `Documents` pada Job Detail.
- Menampilkan metadata file sebagai card dan membuka `web_view_url` di tab baru.
- Menyediakan empty state, loading state, serta tombol Upload, Manage Access, dan Delete dalam keadaan nonaktif.
- Menyediakan schema lokal untuk folder Job dan metadata file Google Drive.
- Belum membuat OAuth, kredensial Google, upload, delete, permission mutation, webhook, atau background sync.

## Keputusan arsitektur

Google Drive menjadi sumber kebenaran untuk:

- isi file;
- struktur folder pada Shared Drive;
- ACL atau permission;
- capability seperti `canShare` dan `canDelete`.

PostgreSQL hanya menyimpan relasi terhadap Job dan metadata yang diperlukan untuk menampilkan file. Aplikasi tidak menyimpan binary file Google Drive di Supabase Storage.

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
- Semua mutasi berikutnya harus melalui server-side action dan RPC `security definer` yang memvalidasi pemanggil.
- Link tidak menggantikan Google ACL. Pengguna yang tidak memperoleh permission di Drive tetap akan ditolak oleh Google ketika membuka link.

## Flow API berikutnya

### Persiapan folder

1. Server memvalidasi admin/PIC Job.
2. Cari atau buat folder Job di Shared Drive.
3. Simpan mapping ke `job_drive_folders` secara idempotent.
4. Untuk Shared Drive, request file Google harus menyatakan dukungan Shared Drive.

### Upload

1. Browser mengirim file ke server, bukan langsung membawa credential Google.
2. Server memvalidasi ukuran, MIME type, Job, dan actor.
3. Server mengupload file ke `google_folder_id`.
4. Setelah Google berhasil, server menyimpan `google_file_id`, metadata, dan `web_view_url` melalui RPC.
5. Jika penyimpanan database gagal, server menjalankan kompensasi dengan menghapus file Google yang baru dibuat atau mencatat error untuk rekonsiliasi.

### Delete

1. Server memvalidasi capability Google dan hak admin/PIC.
2. Hapus atau trash file di Google terlebih dahulu.
3. Setelah berhasil, soft-archive row `job_documents`.
4. Kegagalan Google tidak boleh menyembunyikan row database seolah file sudah terhapus.

### Manage Access

1. Ambil capability file secara live dari Google untuk mengaktifkan tombol yang benar.
2. Gunakan resource permissions Google untuk user, group, atau domain.
3. Permission yang diwariskan dari folder tidak boleh dianggap dapat dihapus dari file anak.
4. Database tidak menjadi sumber keputusan ACL dan tidak menyimpan credential atau access token di tabel publik.

## Authentication Google

Pilihan autentikasi harus diputuskan ketika integrasi API dimulai:

- OAuth Google Workspace atas nama user; atau
- service account yang menjadi member Shared Drive, bila kebijakan Workspace mengizinkan.

Apa pun pilihannya:

- credential dan refresh token hanya berada di environment/server secret;
- tidak menggunakan `NEXT_PUBLIC_*`;
- token tidak dikirim ke browser;
- gunakan scope minimum yang cukup untuk kebutuhan upload, delete, dan permission;
- lakukan pengujian pada Shared Drive development sebelum menghubungkan Drive production.

## Referensi resmi

- Shared Drive support: https://developers.google.com/workspace/drive/api/guides/enable-shareddrives
- File creation/upload: https://developers.google.com/workspace/drive/api/guides/create-file
- Permissions and sharing: https://developers.google.com/workspace/drive/api/guides/manage-sharing

