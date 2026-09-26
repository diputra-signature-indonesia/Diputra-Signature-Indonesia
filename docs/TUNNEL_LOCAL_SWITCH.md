# Berpindah antara tunnel dan lokal

Semua URL untuk mode tunnel atau lokal diatur melalui **empat baris di `.env`**. Jangan ubah `supabase/config.toml` setiap kali berpindah mode. File itu memakai `env(...)` untuk membaca URL dari `.env`. `.env.local` tetap menyimpan key lain, tetapi tidak mendefinisikan dua URL publik agar tidak menimpa `.env`.

## Template untuk tunnel

Ganti `SUPABASE_TUNNEL` dan `APP_TUNNEL` dengan subdomain quick tunnel yang sedang aktif. Nilai sebenarnya disimpan hanya di `.env` yang diabaikan Git.

```env
NEXT_PUBLIC_SUPABASE_URL=https://SUPABASE_TUNNEL.trycloudflare.com
NEXT_PUBLIC_SITE_URL=https://APP_TUNNEL.trycloudflare.com
APP_AUTH_CALLBACK_URL=https://APP_TUNNEL.trycloudflare.com/auth/callback
GOOGLE_AUTH_CALLBACK_URL=https://SUPABASE_TUNNEL.trycloudflare.com/auth/v1/callback
```

`NEXT_PUBLIC_SITE_URL` adalah website, `NEXT_PUBLIC_SUPABASE_URL` adalah API Supabase. `APP_AUTH_CALLBACK_URL` adalah tujuan akhir Supabase setelah login. `GOOGLE_AUTH_CALLBACK_URL` adalah callback yang harus terdaftar pada **Google Cloud Console → Authorized redirect URIs** untuk OAuth Client yang dipakai `GOOGLE_CLIENT_ID`.

Alamat quick tunnel berubah bila proses tunnel dibuat ulang. Bila itu terjadi, ganti empat baris di `.env`, perbarui callback Supabase di Google Cloud Console, lalu restart Supabase dan Next.js.

## Kembali bekerja secara lokal

1. Hentikan kedua proses `cloudflared`.
2. Ganti **empat baris URL di `.env`** menjadi:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   APP_AUTH_CALLBACK_URL=http://localhost:3000/auth/callback
   GOOGLE_AUTH_CALLBACK_URL=http://127.0.0.1:54321/auth/v1/callback
   ```

3. Pastikan `http://127.0.0.1:54321/auth/v1/callback` terdaftar pada **Authorized redirect URIs** di Google Cloud Console. Callback tunnel lama boleh tetap terdaftar, tetapi tidak dipakai saat lokal.
4. Restart Supabase lokal: jalankan `npx supabase stop`, lalu `npx supabase start`. Restart Next.js: hentikan `npm run dev` dengan `Ctrl+C`, lalu jalankan `npm run dev` lagi.
5. Buka `http://localhost:3000/login`.

## Perubahan kode yang tetap dipakai

- `supabase/config.toml` membaca URL dari `.env`; bagian Google tetap aktif dan membaca Client ID serta secret dari `.env`.
- `src/app/auth/callback/route.ts`, `src/app/auth/access-denied/route.ts`, dan `src/middleware.ts` memakai `NEXT_PUBLIC_SITE_URL` untuk redirect. Karena itu nilai tersebut harus sesuai dengan mode yang aktif.
- `src/app/logout/route.ts` dan `src/components/layout-admin/admin-navigation.tsx` menghindari redirect server ke `localhost` saat logout. Perubahan kode ini tetap cocok untuk lokal.
- `src/components/auth/GoogleLoginButton.tsx` tidak perlu diubah.

`.env` dan `.env.local` diabaikan Git. Jangan masukkan key atau secret ke dokumen ini. Perubahan lain pada fitur admin tidak terkait dengan pemilihan mode URL; jangan gunakan `git restore .` untuk berpindah mode.
