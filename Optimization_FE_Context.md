Saya melanjutkan optimasi project production Diputra Signature Indonesia.

Lokasi project:
C:\Users\ASUS\Desktop\pribadi\webProject\diputra-signature-indonesia\diputra-signature-indonesia

Stack utama:

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Lenis
- Framer Motion
- Swiper
- Deployment production di Vercel

PERINGATAN PENTING

Project ini aktif di production. Semua perubahan harus dilakukan secara hati-hati, minimal, terukur, dan tidak boleh menyentuh database atau konfigurasi production tanpa persetujuan eksplisit.

Database development sekarang memakai Supabase lokal. Pastikan kembali environment yang digunakan sebelum melakukan operasi database. Jangan menampilkan key atau secret pada respons.

Sebelum bekerja:

1. Periksa `git status --short`.
2. Periksa diff yang sudah ada.
3. Jangan menghapus, me-reset, atau menimpa perubahan sebelumnya.
4. Jangan melakukan commit kecuali diminta.
5. Gunakan `problem_V1.md` sebagai sumber daftar masalah.
6. Jangan mengubah `dokumentasi_V1.md` kecuali diminta.
7. Jangan langsung mengubah kode untuk masalah baru. Jelaskan diagnosis, opsi penyelesaian, risiko, dan keputusan yang perlu saya pilih terlebih dahulu.
8. Setelah saya menyetujui keputusan, baru lakukan implementasi.
9. Tidak boleh ada perubahan tampilan normal halaman kecuali sudah disetujui.

DOKUMENTASI MASALAH

File utama:

- `problem_V1.md`
- `dokumentasi_V1.md`

`problem_V1.md` sudah dikelompokkan menjadi:

- UI/UX client dan perceived performance
- Logika frontend dan data fetching
- Caching dan data delivery
- Infrastruktur dan deployment
- Keamanan backend
- Logika/correctness database
- Performa database
- Reliability/local development/housekeeping

PERUBAHAN YANG SUDAH DISELESAIKAN

FE-06 — Lifecycle RAF Lenis

Keputusan:

- Lenis dipertahankan.
- Menggunakan `autoRaf` bawaan Lenis.
- RAF manual dihapus.
- Reduced-motion dan visibility handling ditunda.
- Parameter rasa scroll tidak diubah.

Implementasi pada `src/utils/lenis.ts`:

```ts
import Lenis from 'lenis';

export function initLenis() {
  return new Lenis({
    anchors: true,
    autoRaf: true,
  });
}
```

Cleanup `lenis.destroy()` pada `RootClient` tetap dipertahankan.

FE-07 — Dua sistem smooth scrolling

Keputusan:

- Lenis menjadi satu-satunya pengendali smooth scroll.
- Native `html { scroll-behavior: smooth; }` dihapus dari `src/app/globals.css`.
- Lenis menggunakan `anchors: true`.
- Tidak menggunakan offset.
- Reduced-motion tetap ditunda.
- Tidak ada parameter rasa scroll yang diubah.

Anchor yang sudah diverifikasi:

- `#contact-section`
- `#services-section`

FE-09 — Swiper Mousewheel

Keputusan:

- Swiper tetap digunakan.
- Integrasi Mousewheel dihapus.
- Carousel desktop menggunakan mouse drag.
- Mobile tetap menggunakan touch swipe.
- Tidak menambahkan navigation button.
- Keyboard navigation ditunda.
- Import `swiper/css/pagination` dibiarkan dahulu.

Perubahan pada `src/components/layout/section-review.tsx`:

- Import `Mousewheel` dihapus.
- `modules={[Mousewheel]}` dihapus.
- Prop `mousewheel={...}` dihapus.
- Tampilan, state active card, drag, dan touch swipe tidak diubah.

FE-14 — Internal link About ke Contact

Keputusan:

- `<a href="/contact">` diganti menjadi Next.js `Link`.
- Prefetch memakai perilaku default.
- Tidak memaksa `prefetch={true}`.
- History memakai default push.
- Scroll memakai perilaku default.
- Scope hanya CTA About yang terbukti bermasalah.

Perubahan berada di:
`src/components/layout/about-hero-section.tsx`

Route `/contact` bersifat static dan tidak membaca Supabase ketika halaman dimuat, sehingga prefetch default dipertahankan.

VERIFIKASI YANG SUDAH DILAKUKAN

- ESLint berhasil.
- TypeScript check berhasil.
- Production build berhasil.
- Homepage, About, Services, dan Contact lokal merespons HTTP 200.
- `git diff --check` berhasil.
- Build masih menghasilkan warning lama:
  - data `baseline-browser-mapping` sudah lama,
  - konvensi Next.js `middleware` deprecated.
- Beberapa file lama masih ditandai oleh pemeriksaan Prettier file-wide. Jangan memformat seluruh file secara otomatis jika menghasilkan perubahan di luar scope.
- Browser interaktif tidak tersedia pada sesi sebelumnya, sehingga beberapa pengujian scroll/drag/navigation dilakukan manual oleh user.

DATA REVIEW LOKAL

Enam review dummy sudah ditambahkan hanya ke Supabase lokal untuk menguji carousel:

- `[LOCAL TEST FE-09] Client 01`
- sampai `[LOCAL TEST FE-09] Client 06`

Semua review:

- `is_published = true`
- menjadi enam review terbaru,
- muncul pada homepage lokal.

Data tersebut tidak perlu dihapus karena hanya digunakan pada environment lokal.

URUTAN PEKERJAAN SELANJUTNYA

Kerjakan secara berurutan:

1. FE-08 — Audit dan optimasi Framer Motion
2. FE-10 — Profiling paint/compositing
3. FE-02 — Verifikasi region Vercel Function dan Supabase
4. FE-01 — Strategi caching data publik
5. FE-03 — Deduplikasi query metadata dan page
6. FE-04 — Hilangkan query layanan yang redundan/berantai
7. FE-05 — Loading UI route publik
8. FE-15 — Error boundary dan not-found UI publik

ATURAN UNTUK FE-08

Jangan langsung mengubah kode.

Analisis terlebih dahulu:

- jumlah penggunaan komponen Motion,
- ukuran bundle/chunk Framer Motion,
- hydration dan observer,
- potensi penggunaan `LazyMotion`,
- apakah optimasi dapat mempertahankan final state, timing, dan tampilan animasi,
- bagian yang berisiko menghasilkan flash atau perubahan visual.

Berikan:

- opsi penyelesaian,
- keuntungan dan risiko setiap opsi,
- keputusan yang perlu saya pilih,
- rekomendasi paling aman untuk production.

ATURAN UNTUK FE-10

Mulai dengan profiling saja. Jangan mengurangi shadow, overlay, fixed image, transform, atau efek visual sebelum ada bukti trace dan persetujuan saya.

ATURAN UNTUK FE-02 SAMPAI FE-04

Ini menyentuh infrastruktur dan data layer. Sebelum implementasi:

- verifikasi region secara read-only,
- rancang cache dan invalidasi,
- pastikan konten admin tidak menjadi stale,
- jangan mengubah production deployment atau Supabase tanpa persetujuan,
- pisahkan query publik anonim dari query berbasis session dengan hati-hati,
- ukur query sebelum dan sesudah.

ATURAN UNTUK FE-05 DAN FE-15

Loading, skeleton, error, retry, dan not-found menambahkan state visual baru. Jangan mengimplementasikannya sebelum menjelaskan rancangan dan memperoleh persetujuan.

TUGAS PERTAMA DI ROOM BARU

Mulai dari FE-08.

Jangan mengubah kode dahulu. Baca `problem_V1.md`, periksa implementasi Motion saat ini secara read-only, kemudian jelaskan:

1. penyebab masalah,
2. opsi penyelesaian,
3. pengaruh terhadap tampilan dan animasi,
4. risiko production,
5. keputusan yang perlu saya putuskan,
6. rekomendasi urutan implementasi dan verifikasi.

TAMBAHAN DARI SAYA:

tambahkan setiap update FE-n ke file Optimization_FE_Context.md untuk mencatat setiap konteks/record perubahan dan progress yang dilakukan.

## Progress FE-08 — Analisis Framer Motion (2 September 2026)

Status: **analisis selesai, implementasi belum dilakukan, menunggu keputusan**.

Kondisi worktree sebelum analisis:

- `Optimization_FE_Context.md` sudah berstatus untracked.
- Tidak ada tracked diff yang terdeteksi.
- Tidak ada source code yang diubah dalam tahap analisis ini.

Temuan source:

- Project memakai `framer-motion` versi `12.27.5` melalui satu wrapper client di `src/components/motion.tsx`.
- Terdapat 33 lokasi JSX `<Motion>` pada 15 file section.
- Semua instance memakai pola yang sama: `initial` opacity/translate, `whileInView` menuju final state, `viewport={{ once: true }}`, dan easing `easeOut`.
- Lima section pemakai Motion memang sudah merupakan Client Component karena memiliki state/interaksi sendiri. Sepuluh section lainnya tetap Server Component dengan island `Motion`; mengimpor child client tidak otomatis mengubah seluruh parent menjadi Client Component.
- Jumlah instance runtime lebih besar atau lebih kecil mengikuti data pada `.map()`. Dengan seed lokal, homepage diperkirakan merender 23 instance dan About 17 instance. Blog list dapat mencapai 14 instance karena limit 12 post. Halaman category/detail mengikuti jumlah category, service item, dan detail yang diterima.
- Seluruh instance memakai root dan opsi viewport yang sama. Implementasi Framer Motion mem-pool konfigurasi ini sehingga umumnya hanya ada satu native `IntersectionObserver` per document/configuration, bukan satu observer object per elemen. Namun observer tersebut tetap mengamati seluruh target dan setiap target tetap memiliki Motion VisualElement, state, subscription, hydration, serta pekerjaan animasi sendiri.

Temuan bundle dari fresh production build:

- Chunk Framer Motion: `af1d9f696e3d374b.js` = 113.761 byte raw, sekitar 37.342 byte gzip, atau 33.106 byte Brotli.
- Chunk tersebut dimuat pada `/`, `/about`, `/blog`, `/contact`, `/services`, `/services/[category]`, dan `/services/[category]/[service]`.
- Chunk tersebut tidak tercantum pada entry `/blog/[slug]` saat ini.
- Chunk `ceda1110956cddae.js` = 85.399 byte raw memang mengandung `IntersectionObserver`, tetapi merupakan shared Next.js client/framework code (termasuk observer prefetch), bukan chunk Framer Motion. Dengan demikian catatan audit lama tentang dua chunk Motion sekitar 85 KB dan 114 KB perlu dibaca sebagai satu chunk Motion 114 KB dan satu chunk framework 85 KB.
- Production build berhasil. Warning lama `baseline-browser-mapping` dan konvensi `middleware` tetap muncul.

Diagnosis:

- Biaya pasti saat ini adalah download/parse/evaluate chunk Motion pada hampir semua route publik yang memiliki reveal animation.
- Banyak target Motion menambah hydration dan pekerjaan runtime. Akan tetapi jumlah native observer object tidak sama dengan jumlah komponen karena observer dipakai bersama.
- `LazyMotion` hanya mengurangi biaya bundle/feature code. `LazyMotion` tidak otomatis mengurangi jumlah target, hydration, atau callback viewport.
- Karena state SSR/initial memakai opacity 0 dan transform, pemuatan feature secara asynchronous berisiko memperpanjang kondisi elemen tidak terlihat pada koneksi atau device lambat. Risiko paling jelas berada pada hero dan konten above-the-fold dengan delay 0,2–0,6 detik.

Opsi yang dianalisis:

1. **Tidak mengubah Motion, profiling baseline saja.** Risiko visual nol, tetapi tidak memberi penghematan bundle atau runtime.
2. **`LazyMotion` synchronous + `m` + `domAnimation`.** Fitur yang sedang dipakai (`whileInView`, opacity, translate, timing, dan easing) didukung `domAnimation`. Final state dan timing dapat dipertahankan. Ini kandidat bundle-only paling aman, tetapi jumlah target/hydration tetap sama. Provider harus tetap route-scoped agar `/blog/[slug]` tidak ikut memuat Motion tanpa kebutuhan.
3. **`LazyMotion` asynchronous.** Initial bundle paling kecil dan feature masuk ke chunk lanjutan, tetapi ada waterfall serta risiko reveal terlambat/flash/blank lebih lama. Tidak direkomendasikan sebagai perubahan pertama production.
4. **Kurangi Motion pada card/list atau ganti efek sederhana dengan CSS/shared observer.** Potensi pengurangan runtime terbesar, tetapi mengubah pengalaman animasi dan memerlukan pembandingan visual serta trace sebelum dipilih.

Rekomendasi sementara:

- Ambil baseline Network/Performance terlebih dahulu.
- Jika disetujui, implementasikan hanya opsi 2 secara synchronous, gunakan satu provider pada setiap route yang memang memakai Motion, ubah wrapper ke `m`, aktifkan mode `strict`, dan jangan mengubah nilai `initial`, `whileInView`, `viewport`, delay, duration, atau easing.
- Bandingkan chunk raw/compressed, coverage, scripting/hydration, filmstrip, serta posisi/final state sebelum dan sesudah.
- Jangan memasang provider pada seluruh site layout karena itu akan menambah Motion ke `/blog/[slug]` yang saat ini tidak memuat chunk tersebut.
- Reduced-motion dan pengurangan animasi card/list dijadikan keputusan terpisah karena keduanya mengubah perilaku visual untuk sebagian atau seluruh user.

## Progress FE-08 — Implementasi LazyMotion synchronous (2 September 2026)

Status: **implementasi lokal selesai dan terverifikasi, belum di-commit atau di-deploy**.

Keputusan yang disetujui:

- Gunakan `LazyMotion` synchronous dengan `m` dan `domAnimation`.
- UI, markup DOM yang terlihat, final state, initial state, timing, easing, serta perilaku animasi harus tetap sama.
- Async feature loading, reduced-motion, dan pengurangan animasi card/list tidak termasuk scope ini.

Implementasi:

- `src/components/motion.tsx` sekarang memakai `LazyMotion`, `m`, dan `domAnimation`.
- `MotionProvider` memakai `strict` agar penggunaan `motion` penuh di bawah provider terdeteksi saat development.
- Wrapper `Motion` tetap menerima props dan default yang sama.
- Nilai `initial`, `whileInView`, `viewport`, `duration`, `delay`, dan `ease` tidak diubah.
- Satu provider ditempatkan pada setiap route yang memang memakai Motion: `/`, `/about`, `/blog`, `/contact`, `/services`, `/services/[category]`, dan `/services/[category]/[service]`.
- Provider tidak ditempatkan pada site layout. Route `/blog/[slug]` tetap tidak memuat chunk Motion.
- `LazyMotion`/`MotionProvider` tidak menghasilkan elemen DOM tambahan, sehingga struktur layout dan selector CSS yang terlihat tidak berubah.

Perbandingan chunk production:

| Ukuran | Sebelum | Sesudah | Pengurangan |
| --- | ---: | ---: | ---: |
| Raw | 113.761 byte | 70.599 byte | 43.162 byte (37,9%) |
| Gzip | 37.342 byte | 24.829 byte | 12.513 byte (33,5%) |
| Brotli | 33.106 byte | 22.539 byte | 10.567 byte (31,9%) |

Verifikasi:

- ESLint langsung pada seluruh file yang diubah berhasil.
- TypeScript `tsc --noEmit` berhasil.
- Production build Next.js berhasil.
- `git diff --check` berhasil; warning line-ending LF/CRLF bersifat informasi dari konfigurasi Git dan bukan whitespace error.
- `/`, `/about`, `/services`, `/blog`, dan `/contact` dari production server lokal merespons HTTP 200.
- Uji render server terisolasi membuktikan `motion.div` lama dan `LazyMotion` + `m.div` baru menghasilkan HTML yang identik untuk props wrapper saat ini, termasuk `opacity: 0` dan transform awal.
- Pencarian source memastikan tidak ada import atau akses `motion[...]` lama yang tersisa.
- Browser interaktif tidak tersedia pada sesi implementasi, sehingga screenshot/filmstrip dan observasi animasi langsung tetap perlu dilakukan manual sebelum deployment production.

Catatan tooling:

- Script `npm run lint` saat ini gagal karena masih menjalankan `next lint`, sedangkan Next.js 16 tidak lagi menyediakan command tersebut. Ini merupakan masalah script lama dan tidak diubah dalam FE-08.
- Sebagai pengganti verifikasi FE-08, executable ESLint lokal dijalankan langsung dan berhasil.
- Warning lama `baseline-browser-mapping` serta deprecation konvensi `middleware` tetap muncul dan tidak diubah.

## Progress FE-10 — Analisis paint/compositing (2 September 2026)

Status: **audit source selesai, Performance trace empiris belum tersedia, tidak ada style atau source visual yang diubah**.

Batas pekerjaan:

- FE-08 yang belum di-commit tetap dipertahankan dan tidak ditimpa.
- Audit ini hanya membaca source serta CSS hasil production build.
- Shadow, overlay, fixed image, filter, transform, dan efek visual lain tidak dikurangi atau diubah.
- Browser interaktif tidak tersedia pada sesi ini, sehingga belum ada bukti Paint Flashing, Layers, GPU memory, dropped frame, atau durasi raster/paint dari browser nyata.

Inventaris aktif pada halaman publik:

- Empat lokasi source memakai `drop-shadow-lg`; tiga di antaranya merupakan wrapper section full-width dan satu berada pada footer global.
- Tiga lokasi memakai `shadow-2xl`: panel konten About, image card hero Home, dan image card hero Category.
- `inner-shadow` memakai pseudo-element dengan inset `box-shadow` pada hero Category dan setiap card kategori layanan.
- Empat template aktif memakai brightness filter: fixed image About, foto Team, serta dua template card layanan. Template card berarti jumlah elemen runtime mengikuti jumlah kategori layanan.
- About memiliki satu background image `fixed`, berukuran viewport dengan tinggi maksimum 800px, brightness filter, dan overlay gradient pada mobile.
- Navbar global memakai `sticky` dan `shadow-md`. Overlay serta drawer mobile memakai `fixed`, tetapi hanya aktif/terlihat ketika menu dibuka.
- Carousel review mengubah scale semua slide dan shadow slide aktif, sementara track Swiper juga bergerak dengan transform.
- Tidak ditemukan penggunaan aktif `backdrop-blur`, blur besar, atau `mix-blend`; satu kandidat blur/mix-blend di Home masih berada di dalam komentar.
- Tidak ada `will-change`, `contain`, atau `content-visibility` eksplisit. Keputusan layer promotion saat ini diserahkan pada heuristik browser dan Framer Motion.

Interpretasi teknis:

- Transform dan opacity dari wrapper Motion umumnya compositor-friendly, tetapi banyak animasi yang mulai ketika section masuk viewport tetap dapat menyebabkan layer creation/promotion dan raster awal secara berdekatan.
- Shadow statis biasanya diraster dan dapat di-cache; keberadaannya saja belum membuktikan scroll jank. `hover:shadow-xl` terutama relevan saat pointer berinteraksi, bukan otomatis pada scroll biasa.
- `drop-shadow-lg` adalah CSS `filter: drop-shadow(...)`, bukan `box-shadow`. Ketika diterapkan pada wrapper besar, browser dapat memerlukan offscreen surface untuk seluruh subtree. Ini kandidat biaya paint/compositing yang lebih kuat, tetapi tetap memerlukan trace.
- Fixed image About dengan brightness filter adalah kandidat paling kuat untuk masalah scroll berkelanjutan karena permukaan besar harus dipertahankan saat konten bergerak di atasnya. `position: fixed` sendiri tidak selalu buruk apabila browser berhasil mengisolasinya menjadi layer.
- Gradient dan overlay yang statis belum dapat dianggap bottleneck tanpa paint flashing. Menghapusnya sekarang tidak memiliki dasar bukti dan akan mengubah tampilan.
- Transisi `grid-template-rows`, width/height, margin, dan padding pada Q&A/Team termasuk kandidat layout/main-thread, bukan murni masalah compositing. Ini perlu dipisahkan dari trace scroll pasif.

Prioritas route untuk profiling:

1. `/about`: fixed full-viewport image + brightness + overlay + panel `shadow-2xl` + foto Team.
2. `/`: hero transform/shadow, beberapa card layanan dengan filter/shadow, carousel Swiper, serta wrapper Contact `drop-shadow-lg`.
3. `/services/[category]` dan `/services/[category]/[service]`: kombinasi hero/card, banyak item Motion, service cards, dan wrapper Blog `drop-shadow-lg`.
4. `/services`: isolasi biaya kumpulan card layanan.
5. `/blog` atau `/contact`: baseline yang lebih sederhana dengan navbar/footer global.

Rencana trace sebelum keputusan implementasi:

- Rekam Chrome Performance minimal tiga kali per route pada viewport mobile dan CPU throttling yang konsisten.
- Gunakan urutan yang sama: idle singkat, scroll kontinu dari atas ke bawah, lalu interaksi hover/carousel/Q&A pada rekaman terpisah.
- Catat long task di atas 50ms, frame/dropped frame, total Paint, Raster, Composite Layers, serta lonjakan saat section pertama kali masuk viewport.
- Gunakan Paint Flashing dan Layers untuk memeriksa apakah fixed About, full-width drop-shadow, sticky navbar, atau card yang dianimasikan menyebabkan invalidasi area besar.
- Setelah baseline tersedia, lakukan eksperimen sementara di DevTools satu efek pada satu waktu. Jangan membuat source patch sebelum perbedaan trace terbukti dan perubahan visual disetujui.

Keputusan FE-10 saat ini:

- Belum ada dasar yang cukup untuk mengubah tampilan atau menambahkan `will-change`/layer hint.
- Rekomendasi paling aman adalah mempertahankan seluruh UI dan melanjutkan ke pengambilan trace pada perangkat/browser yang tersedia.
- Jika bukti menunjukkan bottleneck, urutan eksperimen adalah fixed filtered image About, full-width `drop-shadow`, lalu kombinasi filter/shadow pada service cards. Navbar, gradient, dan overlay tidak disentuh lebih dahulu tanpa bukti spesifik.
