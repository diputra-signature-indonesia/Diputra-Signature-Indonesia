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

Status: **audit source dan profiling trace putaran pertama selesai; bottleneck main-thread/paint terkonfirmasi tetapi efek visual penyebab tunggal belum terisolasi; tidak ada style atau source visual yang diubah**.

Batas pekerjaan:

- FE-08 yang belum di-commit tetap dipertahankan dan tidak ditimpa.
- Audit awal hanya membaca source serta CSS hasil production build. Profiling lanjutan membaca trace yang diberikan user tanpa menjalankan perubahan source.
- Shadow, overlay, fixed image, filter, transform, dan efek visual lain tidak dikurangi atau diubah.
- Browser interaktif tetap tidak tersedia pada sesi ini. Bukti dropped frame, paint, layerization, dan raster sekarang tersedia dari trace user, tetapi Paint Flashing, inspeksi Layers/GPU memory, serta eksperimen toggle CSS satu per satu belum dilakukan.

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

- Sudah ada bukti bahwa `/` dan `/about` lebih berat daripada baseline `/contact`, tetapi belum ada dasar yang cukup untuk mengubah tampilan atau menambahkan `will-change`/layer hint.
- Rekomendasi paling aman tetap mempertahankan seluruh UI dan melanjutkan pengambilan trace terkontrol dalam production build.
- Eksperimen berikutnya dilakukan sementara di DevTools, bukan sebagai source patch: fixed/filter About, full-width `drop-shadow`, lalu kombinasi filter/shadow pada service cards, masing-masing satu variabel per rekaman.

### Trace empiris putaran 1 — `Trace-20260902T200232.json.gz`

Kondisi rekaman:

- Trace berasal dari Chrome DevTools, berdurasi sekitar 65,93 detik, berisi 580.709 event, memakai CPU throttling 4x dan host DPR 1,25.
- Viewport yang terekam sekitar 1227 x 922 pada display 60 Hz. Ini merupakan profil desktop, belum mewakili mobile.
- Adanya elemen `#devtools-indicator` dan chunk development Next.js menunjukkan rekaman dibuat dari `next dev`, bukan production build. Angka absolut karena itu tidak boleh dipakai sebagai prediksi performa production.
- Urutan route adalah `/` → `/about` → `/` → `/about` → `/contact`. Proses soft navigation dipisahkan dari interval scroll aktif.
- Sembilan cluster wheel digabung menjadi lima interval scroll aktif. Setiap interval mencakup 100 ms sebelum wheel pertama dan tail maksimal 1 detik setelah wheel terakhir, dibatasi oleh boundary route.
- Frame dihitung dari `frame_sequence` unik pada renderer utama. Ini menghindari menghitung dua event `PipelineReporter` milik refresh frame yang sama.

Ringkasan interval scroll aktif:

| Kunjungan | Durasi aktif | Frame unik | Dropped | Affects smoothness | Long task >50 ms | Paint ms/detik | Layerize ms/detik | Raster ms/detik |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` pertama | 9,76 dtk | 586 | 89 (15,2%) | 335 (57,2%) | 47 | 77,5 | 120,1 | 6,1 |
| `/about` pertama | 8,58 dtk | 473 | 79 (16,7%) | 208 (44,0%) | 34 | 55,1 | 35,6 | 2,8 |
| `/` kedua | 14,38 dtk | 864 | 70 (8,1%) | 277 (32,1%) | 50 | 42,8 | 105,1 | 3,9 |
| `/about` kedua | 10,59 dtk | 637 | 55 (8,6%) | 124 (19,5%) | 14 | 67,2 | 41,3 | 5,0 |
| `/contact` | 2,64 dtk | 158 | 6 (3,8%) | 9 (5,7%) | 1 | 6,9 | 13,4 | 1,1 |

Catatan: kategori `Dropped`, `Affects smoothness`, dan status presented pada `PipelineReporter` dapat saling overlap pada frame sequence yang sama. Durasi event juga tidak dijumlahkan lintas kategori karena beberapa event bersifat nested.

Temuan trace:

1. `/` dan `/about` benar-benar lebih berat daripada baseline `/contact`. Bahkan pada kunjungan kedua yang sudah lebih hangat, dropped frame `/` dan `/about` sekitar 8%, sedangkan `/contact` 3,8%; frame yang ditandai memengaruhi smoothness masing-masing 32,1%, 19,5%, dan 5,7%.
2. Beban `/` paling menonjol pada update style/layerization. Pada kunjungan kedua, `UpdateLayoutTree` memakan 1.552,98 ms atau sekitar 108,0 ms/detik dan `Layerize` 1.511,34 ms atau 105,1 ms/detik. Paint yang sering muncul berasal dari `#document`, sticky header, service cards, dan slide carousel. Ini mendukung dugaan bahwa jumlah elemen bergerak/card/layer lebih berpengaruh daripada satu shadow tunggal.
3. `/about` paling menonjol pada repaint area besar. Pada dua kunjungan, sekitar 93,5–93,8% total waktu Paint berada pada clip selebar lebih dari 1000 px dan lebih tinggi dari dua viewport. Paint berulang terlihat pada `#document` dengan clip sekitar 1208 x 3723–3859 serta outer `DIV.relative` sekitar 1208 x 2873.
4. Trace belum membuktikan fixed image atau brightness About sebagai penyebab tunggal. Node fixed image tidak muncul sebagai paint hotspot terpisah; browser mengatribusikan paint mahal terutama ke document/ancestor. Karena itu menghapus `fixed`, filter, gradient, atau `shadow-2xl` sekarang masih berupa tebakan dan dilarang oleh batas UI saat ini.
5. GPU raster bukan sinyal utama pada rekaman ini. `RasterTask` hanya sekitar 1,1–6,1 ms/detik; checkerboarding nol pada kedua About dan Contact, serta hanya 3 dan 4 frame pada dua kunjungan Home. Masalah lebih konsisten dengan main-thread animation, style, paint, dan layerization.
6. Seluruh frame sequence pada interval aktif ditandai `has_main_animation`. Trace juga mencatat callback `raf` yang cocok dengan Lenis `autoRaf`, sementara fungsi `processBatch` berasal dari frameloop Framer Motion. Long task besar berulang berisi `PageAnimator::serviceScriptedAnimations`, `FireAnimationFrame`, `UpdateLayoutTree`, `Layerize`, dan `Paint`.
7. Kunjungan kedua `/about` mencampur scroll dengan minimal tiga click pada Team accordion. Tiga long task click sekitar 74 ms, 85 ms, dan 160 ms berasal dari dispatch React/state update; angka tersebut tidak boleh dianggap sebagai biaya scroll pasif.
8. Variasi cold/warm besar: dropped frame pada kunjungan pertama Home/About sekitar 15–17%, lalu turun menjadi sekitar 8% pada kunjungan kedua. Ini memperkuat kebutuhan mengulang pengukuran pada production build dengan urutan interaksi yang identik.
9. Soft navigation start-to-commit pada dev trace berada sekitar 1,04–1,51 detik. Angka ini dipisahkan dari FE-10 karena mencampur Next.js dev server, RSC/data fetching, dan navigation work; jangan dipakai sebagai kesimpulan TTFB production.

Kesimpulan putaran 1:

- Status FE-10 tetap **profiling, belum implementasi**.
- Hipotesis umum FE-10 tervalidasi: route visual kompleks mengalami dropped frame dan kerja paint/layerization yang nyata pada CPU 4x.
- Hipotesis “fixed filtered image About adalah penyebab utama” belum tervalidasi. Pada kunjungan kedua, Home justru memiliki layerization sekitar 2,5x About, sedangkan About memiliki paint sekitar 1,6x Home.
- Tidak ada dasar untuk mengubah shadow, overlay, fixed image, brightness, transform, gradient, atau hierarchy UI.
- Langkah berikutnya yang direkomendasikan adalah merekam production build minimal tiga kali per route, memisahkan scroll pasif dari click/hover/carousel, lalu melakukan eksperimen sementara satu efek per trace di DevTools. Hanya perubahan yang tetap identik secara visual dan menunjukkan perbaikan berulang yang layak diajukan untuk implementasi.

## Progress FE-02 — Penyelarasan region Vercel Function dan Supabase (3 September 2026)

Status: **konfigurasi lokal selesai dan terverifikasi; belum di-deploy ke Preview maupun Production**.

Keputusan yang disetujui:

- Region Supabase production telah dikonfirmasi berada di AWS `ap-southeast-1` (Singapore).
- Vercel Function sebelumnya berjalan di `iad1` (Washington, D.C.) berdasarkan pengaturan dashboard dan header production.
- Gunakan satu Vercel Function Region `sin1` (Singapore), sesuai batas paket Hobby dan lokasi primary database Supabase.
- Tidak menggunakan multi-region, tidak mengubah runtime menjadi Edge, dan tidak memindahkan region Supabase.
- Terapkan melalui `vercel.json` agar konfigurasi tercatat dan konsisten pada deployment repository.
- Lakukan Preview Deployment dan verifikasi sebelum perubahan dipromosikan ke Production.

Baseline production sebelum implementasi:

- Pengukuran read-only dilakukan pada `/`, `/about`, dan `/services`, masing-masing tiga request.
- Seluruh response mengembalikan `X-Vercel-Id` dengan jalur `sin1::iad1`, yang menunjukkan request melalui Singapore dan Function dieksekusi di Washington, D.C.
- Seluruh response mengembalikan `X-Vercel-Cache: MISS`, `Age: 0`, serta `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.
- Rentang TTFB yang tercatat: `/` 0,968–3,329 detik; `/about` 0,958–1,339 detik; `/services` 0,844–1,737 detik.
- Baseline ini hanya sembilan sampel dan bukan benchmark final. Pengukuran p50/p75/p95 minimal 20 kali tetap diperlukan setelah Preview dan Production deployment.

Implementasi lokal:

- Menambahkan `vercel.json` pada root repository.
- Menetapkan `regions` ke satu region, yaitu `sin1`.
- Menambahkan referensi schema resmi Vercel agar konfigurasi dapat divalidasi oleh editor/tooling.
- Konfigurasi project-level ini berlaku untuk Vercel Functions pada deployment dan mengoverride Function Region yang tersimpan di Project Settings.
- Tidak ada source UI, query, environment variable, database, schema, migration, maupun data Supabase yang diubah.

Verifikasi lokal:

- Parsing JSON berhasil dan memastikan hanya terdapat satu region `sin1`.
- Pemeriksaan format Prettier untuk `vercel.json` berhasil.
- `git diff --check` berhasil tanpa whitespace error.
- Production build Next.js berhasil, termasuk pemeriksaan TypeScript dan prerender route statis.
- Warning lama `baseline-browser-mapping` dan deprecation konvensi `middleware` tetap muncul; keduanya tidak berasal dari perubahan FE-02 dan tidak diubah dalam scope ini.

Verifikasi setelah deployment yang diwajibkan:

1. Deploy branch perubahan sebagai Preview Deployment.
2. Pastikan Deployment Summary menunjukkan Function Region `sin1`.
3. Periksa `/`, `/about`, dan `/services`; seluruh halaman serta data Supabase harus tetap berhasil dimuat.
4. Periksa header response Preview. Region eksekusi tidak boleh lagi menunjukkan `iad1`; targetnya adalah `sin1`.
5. Uji login/admin dan minimal satu operasi baca yang membutuhkan session tanpa melakukan perubahan data production.
6. Setelah Preview lulus, merge/deploy ke Production dan ulangi pemeriksaan header serta TTFB.
7. Jangan melanjutkan FE-01 sebelum baseline sesudah perubahan region dicatat agar kontribusi FE-02 dapat dibedakan dari efek caching.

## Progress FE-01 — Analisis strategi caching data publik (3 September 2026)

Status: **audit source selesai; seluruh keputusan disetujui dan hasil implementasi dicatat pada bagian berikutnya**.

Batas pekerjaan:

- Audit hanya membaca loader Supabase, route publik, mutation Server Action, konfigurasi Next.js, serta policy lokal yang merepresentasikan schema production.
- Tidak ada cache, query, UI, environment variable, database, migration, maupun konfigurasi production yang diubah pada tahap analisis.
- Admin/session, token review, contact form, login, dan data privat tidak boleh masuk shared cache.

Kondisi saat ini:

- `createSupabaseServerClient()` selalu memanggil `cookies()`, termasuk ketika hanya membaca konten publik anonim.
- `next.config.ts` belum mengaktifkan `cacheComponents`, dan tidak ditemukan `unstable_cache`, `use cache`, `cacheTag`, `revalidateTag`, `updateTag`, maupun `revalidatePath` pada source.
- Build masih mengklasifikasikan `/`, `/about`, `/blog`, `/blog/[slug]`, `/services`, dan seluruh detail layanan sebagai dynamic.
- Homepage menjalankan tiga kelompok query publik secara paralel: services, tiga blog terbaru, dan review terbit.
- Category dan detail service menggunakan data services dan blog yang sama pada beberapa route. Metadata dan body juga memanggil loader yang sama kembali; deduplikasi cold request tetap menjadi scope FE-03.
- Cache response production sebelum FE-01 masih `MISS` dengan `private, no-store`, sehingga setiap request membayar Function render dan round-trip Supabase.

Kandidat shared cache:

| Tag yang diusulkan | Data | Konsumen utama | Jalur mutation aplikasi |
| --- | --- | --- | --- |
| `public-services` | category, item, dan item detail yang published | `/`, `/services`, category/detail service, metadata | Tidak ditemukan; perubahan kemungkinan langsung melalui Supabase |
| `public-blog` | daftar dan detail blog published | `/`, `/blog`, blog detail, category/detail service, metadata | save/edit, publish/unpublish, delete melalui Server Action |
| `public-team` | team member visible | `/about` | Tidak ditemukan; perubahan kemungkinan langsung melalui Supabase |
| `public-reviews` | review published | `/` | publish/unpublish dan delete melalui Server Action |

Temuan data-minimization:

- `getVisibleStories()` menggunakan `select('*')` pada tabel `reviews`.
- Tabel tersebut memiliki kolom `email`, sedangkan `ReviewSection` adalah Client Component dan menerima seluruh object hasil query sebagai props.
- TypeScript assertion ke `StoryExperience[]` tidak menghapus properti tambahan pada runtime. Karena itu email dapat ikut terserialisasi ke payload client walaupun tidak dirender.
- Sebelum caching review publik, query harus memilih hanya `id`, `name`, `message`, dan `created_at`. Ini tidak mengubah tampilan dan mencegah data yang tidak diperlukan masuk ke shared cache/payload browser.

Opsi mekanisme:

1. **Cache Components + `use cache`.** Ini API modern yang direkomendasikan Next.js 16, tetapi perlu mengaktifkan `cacheComponents` secara global. Perubahan tersebut juga mengubah model prerendering seluruh App Router dan berpotensi mewajibkan penyesuaian Suspense/request-time API pada route admin. Scope dan regression surface terlalu besar untuk patch caching pertama pada project production.
2. **`unstable_cache` pada loader publik tanpa mengaktifkan Cache Components.** API ini masih didukung oleh model caching tanpa Cache Components dan memakai Next.js Data Cache lintas request/deployment. Kekurangannya adalah API tersebut telah digantikan oleh `use cache` untuk arah jangka panjang, sehingga migrasi terkontrol tetap diperlukan nanti.
3. **Cache full route atau `force-static`.** Potensi response paling cepat, tetapi meningkatkan risiko stale page, metadata, dan slug serta memperbesar dampak invalidasi. Tidak direkomendasikan untuk implementasi awal.

Rekomendasi implementasi pertama:

- Gunakan opsi 2 sebagai perubahan paling sempit: `unstable_cache` hanya pada loader publik anonim.
- Buat Supabase public server client terpisah dengan anon key, tanpa `cookies()`, session persistence, atau service-role key.
- Pertahankan client cookie-bound saat ini untuk seluruh auth, admin, preview draft, contact, dan review-request.
- Gunakan empat tag domain yang kasar seperti tabel di atas. Argumen `slug` dan `limit` tetap menjadi bagian cache key.
- Gunakan TTL 15 menit sebagai safety net awal untuk perubahan yang dilakukan langsung di Supabase.
- Setelah mutation blog/review berhasil, expire tag terkait dari Server Action agar publish, unpublish, edit, dan delete tidak menunggu TTL.
- Jangan mengaktifkan `cacheComponents`, `force-static`, full-route caching, webhook, atau multi-layer cache pada putaran pertama.
- Uji cache MISS pertama, HIT berikutnya, invalidasi mutation, isolation session, not-found, serta build/Preview sebelum Production.

Risiko dan batas invalidasi:

- Mutation blog/review dari aplikasi dapat menginvalidasi cache secara otomatis.
- Perubahan services/team langsung dari Supabase tidak menjalankan kode Next.js. Dengan pilihan tanpa webhook, konten dapat tetap lama sampai TTL terlewati dan request berikutnya merevalidasi.
- Webhook Supabase menuju Route Handler revalidation dapat mengurangi keterlambatan tersebut, tetapi menambah secret endpoint, autentikasi webhook, retry, dan permukaan keamanan. Ini sebaiknya menjadi tahap terpisah setelah cache dasar stabil.
- Error query yang melempar exception tidak boleh dijadikan fallback cache. Cache hanya menyimpan hasil query yang berhasil; perilaku not-found/error yang lebih tepat tetap dibahas pada FE-15/FE-16.
- FE-01 dapat mengurangi query pada cache hit, tetapi tidak dianggap menyelesaikan FE-03 atau FE-04 untuk cold cache.

Keputusan yang masih diperlukan:

1. Pilih `unstable_cache` scoped tanpa Cache Components untuk putaran pertama, atau aktifkan Cache Components + `use cache` sekarang.
2. Setujui bahwa hanya data publik anonim yang di-cache dan seluruh data auth/admin/token/contact tetap uncached.
3. Pilih TTL safety net: 5 menit, 15 menit (rekomendasi), atau 1 jam.
4. Pilih invalidasi mutation blog/review yang langsung expire agar perubahan terlihat pada request publik berikutnya, atau stale-while-revalidate yang masih dapat menyajikan versi lama satu kali.
5. Untuk services/team yang diedit langsung di Supabase, terima keterlambatan sesuai TTL untuk tahap awal atau bangun webhook revalidation sekarang.
6. Setujui pemangkasan kolom review publik agar `email` tidak ikut ke shared cache dan payload browser.
7. Setujui data-cache-only pada putaran pertama; full-route cache, `force-static`, dan perubahan visual tetap ditunda.

Keputusan arsitektur lanjutan:

- Seluruh rekomendasi FE-01 Tahap A disetujui secara prinsip.
- `unstable_cache` dipakai sebagai bridge scoped untuk menyelesaikan optimasi FE dengan risiko perubahan minimum.
- Setelah fondasi FE selesai, bridge wajib dimigrasikan ke Next.js 16 Cache Components + `use cache` agar tidak menjadi utang arsitektur permanen.
- Rancangan tahap, exit criteria, rollback, dan guardrail SEO dicatat di `V2_Baseline_Architecture.md`.
- Pembuatan rancangan ini belum mengimplementasikan cache atau mengubah source aplikasi.

## Progress FE-01 — Implementasi scoped Data Cache Tahap A (3 September 2026)

Status: **implementasi lokal selesai dan terverifikasi; belum di-deploy ke Preview maupun Production**.

Implementasi:

- Menambahkan `src/lib/supabase/public-server.ts` sebagai Supabase server client khusus data publik anonim.
- Public client memakai anon key, tidak membaca cookies, tidak menyimpan/me-refresh session, dan tidak memakai service-role key.
- Menambahkan `src/lib/public-cache.ts` sebagai sumber tunggal TTL 15 menit, empat cache tag, dan namespace cache key.
- Namespace key mencakup environment Vercel/Node dan URL Supabase agar entry dari sumber data local, Preview, dan Production tidak bertabrakan.
- Public loader services, blog, team, dan reviews sekarang dibungkus `unstable_cache` dengan tag domain dan TTL 900 detik.
- Parameter `slug` dan `limit` tetap menjadi bagian cache key melalui argumen fungsi cached.
- Query admin, auth, preview draft, contact, review request, dan mutation tetap memakai client cookie-bound dan tidak masuk shared cache.
- Public review query berubah dari `select('*')` menjadi hanya `id, name, message, created_at`. Kolom email tidak lagi ikut ke props `ReviewSection`.
- Server Action blog meng-expire tag `public-blog` setelah perubahan status, edit, atau delete berhasil.
- Server Action review meng-expire tag `public-reviews` setelah publish/unpublish atau delete berhasil.
- Save draft, review request, submit review unpublished, revoke/delete review request, dan toggle featured yang belum dipakai UI publik tidak menginvalidasi public cache.

Kendali Full Route Cache:

- Build awal setelah cookie dipisahkan memperlihatkan Next.js otomatis mem-prerender `/`, `/about`, `/blog`, dan `/services` dengan revalidate 15 menit.
- Karena keputusan Tahap A adalah data-cache-only, keempat page memanggil API stabil `connection()` agar tetap dynamic tanpa mengakses cookies atau data session.
- Build final kembali menandai seluruh route publik berbasis Supabase sebagai dynamic (`ƒ`), sementara `/contact` dan sitemap tetap static (`○`).
- Penanda `connection()` ini harus diaudit/dihapus saat migrasi Cache Components Tahap B agar static shell dapat dirancang secara sengaja.

Verifikasi lokal:

- Prettier pada seluruh file source yang diubah berhasil.
- ESLint langsung pada seluruh file source yang diubah berhasil.
- TypeScript `tsc --noEmit` berhasil.
- Production build Next.js berhasil.
- `git diff --check` berhasil tanpa whitespace error.
- Smoke test production server lokal menghasilkan HTTP 200 untuk `/`, `/about`, `/blog`, `/services`, `/contact`, satu category service, dan satu detail service.
- Dengan `NEXT_PRIVATE_DEBUG_CACHE=1`, log cache menunjukkan request awal `FETCH false` dan request berikutnya `FETCH true` untuk services, blog, reviews, team, serta key detail berbasis slug.
- Homepage lokal: TTFB sekitar 297 ms pada request pertama dan 54 ms pada request kedua.
- Category service lokal: sekitar 179 ms lalu 45 ms; detail service sekitar 118 ms lalu 42 ms.
- Angka lokal hanya membuktikan jalur cache dan tidak boleh dianggap sebagai prediksi production.
- Enam review terserialisasi pada homepage; pemeriksaan window object review menemukan nol key email. Email publik pada JSON-LD LocalBusiness tetap ada dan bukan data review.
- Warning lama `baseline-browser-mapping` dan deprecation konvensi `middleware` tetap muncul serta tidak diubah.

Batas verifikasi saat ini:

- Pemisahan cold/hit dan key berbasis argumen sudah terbukti melalui log runtime lokal.
- `updateTag` berhasil melewati compile, TypeScript, dan production build, tetapi alur mutation authenticated belum dijalankan end-to-end karena tidak ada session admin dalam pengujian otomatis ini.
- TTL 15 menit tidak ditunggu penuh dalam pengujian lokal.
- Preview Vercel diperlukan untuk memastikan perilaku Data Cache terdistribusi, Function Region `sin1`, invalidasi admin, dan metrik production-like.

Checklist Preview sebelum Production:

1. Pastikan Function Region deployment adalah `sin1`.
2. Uji dua request berulang pada route publik dan bandingkan Function duration/TTFB.
3. Uji publish lalu unpublish satu blog test; list, detail, dan metadata harus berubah pada request berikutnya.
4. Uji publish lalu unpublish satu review test; homepage harus berubah tanpa menunggu 15 menit.
5. Pastikan draft, review request, dan data admin tidak muncul pada halaman publik.
6. Periksa payload homepage dan pastikan email review tidak ada.
7. Uji satu category/detail service valid serta slug tidak ada tanpa mengubah data Supabase.
8. Bandingkan title, description, canonical, robots, JSON-LD, heading, internal link, dan status HTTP dengan baseline SEO.
9. Setelah seluruh pemeriksaan lulus, deploy ke Production dan catat minimal 20 sampel TTFB cold/warm.

## Progress FE-03 — Analisis deduplikasi query metadata dan page (3 September 2026)

Status: **audit source selesai; implementasi belum dilakukan dan menunggu keputusan**.

Batas pekerjaan:

- Audit hanya membaca dynamic route publik, `generateMetadata`, dan public loader hasil FE-01.
- Tidak ada query, metadata, UI, cache, database, maupun konfigurasi deployment yang diubah pada tahap analisis ini.
- FE-03 hanya menangani deduplikasi dalam satu server render/request. Optimasi bentuk dan urutan query tetap menjadi scope FE-04.

Temuan pada kode saat ini:

| Route | Pemanggilan yang berulang | Kondisi saat ini |
| --- | --- | --- |
| `/blog/[slug]` | `getPublishedBlogPostBySlug(slug)` dipanggil oleh `generateMetadata` dan page | Dua call site memakai slug yang sama. |
| `/services/[category]` | `getServiceCategoryBySlug(category)` dipanggil oleh metadata, page, dan dari dalam `getServiceItemsByCategorySlug(category)` | Category yang sama dapat diminta melalui tiga jalur dalam satu render. |
| `/services/[category]/[service]` | `getServiceDetailPageData(category, service)` dipanggil oleh metadata dan page | Seluruh rangkaian category, item, dan detail dapat diminta dua kali. |

Hubungan dengan FE-01:

- `unstable_cache` FE-01 adalah Data Cache lintas request dengan TTL dan invalidasi tag. Lapisan ini mengurangi round-trip Supabase ketika entry sudah tersedia.
- FE-01 tidak menggantikan request memoization. Pada cold cache atau sesudah invalidasi, call site metadata dan body masih dapat meminta loader yang sama selama satu render.
- Pada debug cache lokal FE-01, key identik dapat terlihat sebagai cold `FETCH false` lebih dari sekali ketika metadata dan body berjalan pada render yang sama. Karena itu FE-03 tetap relevan walaupun warm request sudah jauh lebih cepat.
- FE-03 harus menjadi lapisan request-local di luar Data Cache FE-01; TTL, cache tag, dan invalidasi yang sudah ada tidak perlu diubah.

Opsi penyelesaian:

1. **React `cache()` pada shared loader yang memang dipanggil ulang (rekomendasi).** Bungkus fungsi yang sama satu kali pada module scope, lalu ekspor dan gunakan instance memoized tersebut di metadata, page, dan helper. React akan berbagi Promise/hasil untuk argumen primitif yang sama selama satu server request, kemudian membuang memoization tersebut setelah request selesai.
2. **Membuat aggregate loader khusus untuk setiap route.** Metadata dan page dapat memakai satu object gabungan, tetapi pada category service metadata hanya membutuhkan category sedangkan body membutuhkan list lain. Aggregate loader berisiko mengambil data body yang tidak diperlukan hanya untuk metadata dan mulai mencampur scope FE-04.
3. **Mengandalkan `unstable_cache` FE-01 saja.** Perubahan tambahan paling sedikit, tetapi cold render dan render setelah invalidasi tetap memiliki peluang kerja duplikat. Opsi ini tidak menyelesaikan tujuan FE-03.

Rancangan yang direkomendasikan:

- Tambahkan `cache` dari React dan buat wrapper pada module scope, bukan di dalam page/component.
- Terapkan secara targeted pada `getPublishedBlogPostBySlug`, `getServiceCategoryBySlug`, dan `getServiceDetailPageData`.
- Susunan lapisan untuk loader yang sudah persistent-cached adalah: query Supabase sebagai lapisan terdalam, `unstable_cache` FE-01 sebagai cache lintas request, lalu React `cache()` sebagai deduplikasi per request.
- `getServiceCategoryBySlug` yang sama harus tetap dipakai oleh metadata, page, dan helper item agar ketiganya membaca memoization store yang sama.
- Memoize `getServiceDetailPageData` sebagai satu unit agar metadata dan body berbagi satu rangkaian category, item, dan details tanpa mengubah susunan query internalnya pada tahap ini.
- Jangan membungkus query admin/auth, jangan memindahkan data ke client, dan jangan menambahkan API Route/HTTP fetch hanya untuk memperoleh automatic fetch memoization.
- Pertahankan title, description, canonical, Open Graph, JSON-LD, status HTTP, `notFound`, payload, visual, serta perilaku cache FE-01.

Mengapa scope targeted direkomendasikan:

- Ketiga loader tersebut sudah terbukti memiliki lebih dari satu call site dalam render route yang sama.
- Loader list seperti `getPublishedBlogPosts()` dan `getServiceCategories()` belum terbukti diduplikasi metadata/body pada route yang sama, sehingga membungkus seluruh public query belum memberi manfaat terukur.
- Perubahan targeted memperkecil regression surface pada project production dan membuat hasil trace FE-03 lebih mudah dibandingkan dengan baseline.

Risiko dan guardrail:

- React `cache()` juga memoize error untuk argumen yang sama selama request tersebut. Ini tidak membuat error persistent antar-request, tetapi error handling yang ada harus diuji tetap identik. Perbaikan klasifikasi not-found versus backend error tetap scope FE-16.
- Setiap pemanggilan `cache()` menghasilkan memoization store berbeda. Wrapper harus dibuat dan diekspor satu kali dari module bersama; membuat wrapper terpisah di page dan metadata tidak akan berdeduplikasi.
- Argumen yang dipakai saat ini berupa slug string, sehingga equality cache key stabil. Jangan memasukkan Supabase client, cookies, session, atau object mutable sebagai argumen.
- FE-03 tidak mengurangi query berantai di dalam cold execution pertama. Penggabungan atau paralelisasi query service tetap dilakukan pada FE-04.
- Tidak ada dampak yang diharapkan pada indexing karena isi metadata, HTML, URL, canonical, JSON-LD, dan status response tidak berubah; yang berubah hanya jumlah eksekusi server untuk data yang sama.

Rencana verifikasi setelah implementasi:

1. Jalankan Prettier, ESLint targeted, TypeScript, dan production build.
2. Jalankan production server lokal dengan cache debug pada cache yang dingin.
3. Request satu slug valid untuk masing-masing blog detail, category service, dan detail service.
4. Pastikan loader identik untuk metadata dan page hanya memulai satu eksekusi pada request yang sama.
5. Ulangi request untuk memastikan Data Cache FE-01 tetap HIT dan tidak ada perubahan pada tag/TTL.
6. Bandingkan metadata dan body sebelum/sesudah: title, description, canonical, Open Graph, JSON-LD, heading, link, status valid, serta slug tidak ditemukan harus tetap sama.
7. Ulangi pemeriksaan pada Preview Vercel sebelum Production dan bandingkan Function duration/query count dengan baseline.

Keputusan yang disetujui:

1. Gunakan React `cache()` sebagai lapisan request memoization di atas `unstable_cache` FE-01.
2. Batasi scope pada `getPublishedBlogPostBySlug`, `getServiceCategoryBySlug`, dan `getServiceDetailPageData`, bukan seluruh public loader.
3. Jangan mengubah struktur serta urutan query service pada FE-03; pekerjaan tersebut tetap dibahas terpisah pada FE-04.
4. Pertahankan perilaku error/not-found saat ini pada FE-03; koreksi semantiknya tetap scope FE-16.
5. Gunakan acceptance criteria: satu eksekusi shared loader per kombinasi slug dalam satu request, FE-01 tetap HIT lintas request, dan seluruh output UI/SEO tetap identik.

Referensi resmi:

- Next.js, `generateMetadata`: request berbasis `fetch` dimemoize otomatis dan React `cache()` dapat dipakai saat `fetch` tidak tersedia — https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js, Metadata and OG images: contoh resmi deduplikasi query yang dipakai oleh metadata dan page dengan React `cache()` — https://nextjs.org/docs/app/getting-started/metadata-and-og-images#memoizing-data-requests
- React, `cache`: memoization Server Components berlaku per server request, berbagi hasil untuk argumen yang sama, dan error juga dimemoize selama request — https://react.dev/reference/react/cache

## Progress FE-03 — Implementasi request memoization (3 September 2026)

Status: **implementasi lokal selesai dan terverifikasi; belum di-deploy ke Preview maupun Production**.

Implementasi:

- `getPublishedBlogPostBySlug` sekarang mengekspor wrapper React `cache()` di atas fungsi `unstable_cache` FE-01 yang sudah ada.
- `getServiceCategoryBySlug` sekarang mengekspor wrapper React `cache()` dengan susunan lapisan yang sama.
- `getServiceDetailPageData` diubah menjadi implementation function internal dan diekspor melalui satu wrapper React `cache()` pada module scope.
- Seluruh call site tetap menggunakan nama export yang sama. Route metadata, page body, dan helper item otomatis berbagi instance memoized yang sama tanpa perubahan pada page component.
- TTL 15 menit, namespace key, tag invalidasi, public Supabase client, dan Data Cache FE-01 tidak berubah.
- Tidak ada query admin/auth, struktur query, urutan query service, UI, motion, metadata, canonical, Open Graph, JSON-LD, ataupun URL yang diubah.

Verifikasi lokal:

- Prettier pada dua file query yang diubah berhasil.
- ESLint targeted pada dua file query berhasil. Warning lama `baseline-browser-mapping` tetap muncul dan tidak berasal dari FE-03.
- TypeScript `tsc --noEmit` berhasil.
- Production build Next.js berhasil.
- Route map build tetap sama dengan baseline FE-01: route publik berbasis Supabase tetap dynamic (`ƒ`) dan FE-03 tidak mengaktifkan Full Route Cache.
- `git diff --check` berhasil tanpa whitespace error; pesan LF/CRLF yang muncul hanya line-ending warning repository Windows.
- Smoke test production server lokal menghasilkan HTTP 200 untuk `/`, `/blog`, category service valid, dan detail service valid.
- Category dan detail service yang tidak ditemukan tetap menghasilkan HTTP 404.
- Pada cold category request, key category yang sama hanya mencapai Data Cache sekali meskipun digunakan metadata, page, dan helper item; key item juga dieksekusi satu kali.
- Pada detail service, rangkaian category, item, dan details hanya terlihat satu kali untuk render tersebut; request berikutnya menunjukkan Data Cache FE-01 tetap HIT.
- Production server lokal pengujian sudah dihentikan setelah verifikasi.

Batas verifikasi dan temuan lanjutan:

- Dataset lokal saat pengujian tidak memiliki link blog published, sehingga detail blog dengan slug valid belum dapat diuji melalui HTTP. Struktur blog memakai pola wrapper yang sama dan telah lulus TypeScript, ESLint, serta production build.
- Detail blog dengan slug tidak tersedia masih menghasilkan HTTP 500 karena loader existing memakai `.single()` lalu page tidak menangani exception sebelum `notFound()`. Perilaku ini tidak diubah sesuai keputusan FE-03 dan harus tetap ditangani pada FE-16.
- Debug invalid blog dapat menjalani render/error handling tambahan dan memperlihatkan lebih dari satu cold lookup. Hasil ini tidak dipakai sebagai bukti kegagalan deduplikasi jalur sukses; jalur error akan diaudit bersama FE-16.
- Verifikasi Preview tetap diperlukan untuk slug blog production yang valid serta perbandingan Function duration/query count pada runtime Vercel `sin1`.

Checklist Preview sebelum Production:

1. Uji satu blog detail published, satu category service, dan satu detail service dengan slug valid.
2. Pastikan metadata dan body tetap menampilkan data yang sama tanpa key loader identik dieksekusi ulang dalam satu request.
3. Ulangi request untuk memastikan Data Cache FE-01 tetap HIT lintas request.
4. Bandingkan title, description, canonical, Open Graph, JSON-LD, heading, link, dan status HTTP dengan Production saat ini.
5. Periksa Function duration/query count cold dan warm; jangan mengandalkan TTFB lokal sebagai prediksi Production.
6. Setelah Preview lulus, deploy ke Production dan ulangi smoke test tanpa melakukan mutation data.

## Progress FE-04 — Analisis query layanan redundan dan berantai (3 September 2026)

Status: **audit source dan schema selesai; seluruh keputusan disetujui dan hasil implementasi dicatat pada bagian berikutnya**.

Batas pekerjaan:

- Audit hanya membaca public service loader, dua dynamic route service, migration schema lokal, constraint/index, dan RLS yang merepresentasikan production.
- Tidak ada source, UI, query, database, migration, cache, maupun konfigurasi deployment yang diubah pada tahap analisis ini.
- FE-04 berfokus pada jumlah round-trip dan waterfall data layanan. Deduplikasi metadata/page sudah selesai pada FE-03.

Kondisi setelah FE-03:

| Jalur | Tahap data layanan saat cache dingin | Temuan |
| --- | --- | --- |
| `/services/[category]` | category, lalu items berdasarkan `category.id` | React `cache()` mencegah pembacaan category identik berulang, tetapi helper items masih bergantung pada hasil category sebelum query items dimulai. |
| `/services/[category]/[service]` | category, lalu item, lalu details | Ketiga `await` masih serial. Query item sebenarnya sudah memvalidasi category melalui join dan tidak membutuhkan object category dari query pertama. Hanya details yang benar-benar bergantung pada `item.id`. |
| Supporting content | primary service data, baru kemudian blog dan seluruh category | `getPublishedBlogPosts(3)` dan `getServiceCategories()` baru dimulai setelah primary service data selesai, walaupun independen. |

Catatan dampak:

- Pada warm Data Cache FE-01, biaya rantai ini sebagian besar hanya cache lookup sehingga dampaknya kecil.
- Pada cold cache, sesudah invalidasi `public-services`, atau ketika instance cache belum terisi, setiap tahap dapat menambah round-trip Function `sin1` ke Supabase Singapore.
- FE-03 memastikan satu loader tidak dieksekusi ulang dalam request yang sama, tetapi tidak mengubah tiga query berbeda di dalam detail loader.
- Query terpisah juga dapat membaca snapshot yang sedikit berbeda bila konten berubah di antara round-trip. Satu relational query membaca category, item, dan details dalam satu statement.

Dukungan schema yang sudah tersedia:

- `services_items.category_id` memiliki foreign key ke `services_categories.id`.
- `services_item_details.service_item_id` memiliki foreign key ke `services_items.id`.
- `services_categories.slug` memiliki unique constraint/index.
- Kombinasi `services_items(category_id, slug)` memiliki unique constraint/index.
- `services_item_details(service_item_id, sort_order)` memiliki unique index.
- Relasi tersebut dapat dideteksi otomatis oleh PostgREST/Supabase untuk nested select dan `!inner`; tidak diperlukan perubahan schema untuk implementasi yang direkomendasikan.

Opsi penyelesaian:

1. **Perubahan minimal: teruskan `category.id` dan paralelkan category dengan item.** Category page tetap membutuhkan dua query, sedangkan detail turun dari tiga tahap serial menjadi dua tahap melalui `Promise.all(category, item)` lalu details. Regression surface paling kecil, tetapi FE-04 hanya terselesaikan sebagian dan masih membayar lebih dari satu round-trip saat cold.
2. **Relational select PostgREST per route (rekomendasi).** Category page mengambil category beserta published items dalam satu query. Detail page mengambil item beserta published category dan ordered details dalam satu query. Hasil dipetakan kembali ke shape props saat ini sehingga UI tidak berubah.
3. **View atau RPC database.** Dapat mengontrol shape dan SQL secara penuh, tetapi membutuhkan migration production, audit privilege/RLS, versioning function, serta rollback database. Kompleksitas ini belum dibutuhkan karena foreign key yang ada sudah mendukung nested select.

Rancangan yang direkomendasikan:

- Buat route-level loader category yang mengembalikan `{ category, items }` melalui satu query dari `services_categories` dengan embedded `services_items`.
- Gunakan loader category yang sama pada `generateMetadata` dan page melalui React `cache()` FE-03.
- Ubah internal `getServiceDetailPageData(categorySlug, itemSlug)` menjadi satu query dari `services_items` dengan embedded published category dan `services_item_details`.
- Pertahankan return shape detail `{ category, item, details }` sehingga komponen dan call site tidak perlu diubah.
- Pakai `!inner` pada relasi category untuk memastikan item hanya valid pada category slug yang diminta.
- Pilih kolom secara eksplisit, filter `is_published` secara eksplisit di setiap level, dan pertahankan urutan items/details berdasarkan `sort_order` ascending.
- Bungkus hasil relational query dengan `unstable_cache` bertag `public-services`, TTL 15 menit, dan namespace key FE-01; React `cache()` tetap menjadi lapisan terluar per request.
- Mulai primary route data, blog, dan daftar category secara paralel. Gunakan hasil settled/guard yang mempertahankan prioritas error saat ini: kegagalan primary service tetap menuju `notFound`, sedangkan kegagalan supporting query tetap menjadi server error.
- Jangan membuat Route Handler internal; Server Component tetap membaca Supabase langsung agar tidak menambah hop HTTP baru.

Perkiraan perubahan round-trip data layanan:

| Route | Sebelum FE-04, cold | Rekomendasi sesudah FE-04, cold |
| --- | --- | --- |
| Category | category → items: 2 query dalam 2 tahap | category + embedded items: 1 query |
| Detail | category → item → details: 3 query dalam 3 tahap | item + embedded category/details: 1 query |

Perhitungan di atas hanya untuk primary data layanan dan tidak menghitung blog/daftar category pendukung. Peningkatan latency production harus tetap dibuktikan melalui Preview, bukan diasumsikan dari jumlah query saja.

Risiko dan guardrail:

- Nested result memiliki shape berbeda dari row datar. Mapping harus dilakukan di server dan tidak boleh meneruskan property relasi tambahan ke Client Component.
- Embedded one-to-many mengembalikan array kosong ketika tidak ada detail; perilaku ini harus tetap sama dengan query list lama.
- RLS anon tetap menjadi lapisan keamanan utama, tetapi filter `is_published` eksplisit dipertahankan sebagai kontrak query dan defense-in-depth.
- Satu tag `public-services` tetap menginvalidasi list maupun detail; tidak ada perubahan invalidation contract FE-01.
- Error handling tidak diperbaiki pada FE-04. Pembedaan data tidak ditemukan dari gangguan Supabase tetap menjadi scope FE-16.
- Loader lama yang tidak lagi memiliki consumer dapat dihapus setelah `rg`, TypeScript, build, dan route smoke test membuktikan tidak ada pemakaian. Menghapusnya tidak mengubah database atau cache entry yang sudah ada.
- Tidak ada dampak yang diharapkan pada SEO karena field metadata, canonical, Open Graph, JSON-LD, URL, serta isi body dipertahankan; hanya sumber data internal yang digabung.

Rencana verifikasi setelah implementasi:

1. Jalankan relational query terhadap Supabase lokal dan validasi shape, published filtering, ownership category, serta urutan nested rows.
2. Bandingkan output route valid sebelum/sesudah untuk heading, cards, details, metadata, canonical, Open Graph, JSON-LD, dan internal link.
3. Uji category kosong, item tanpa details, category/item tidak published, pasangan category-item salah, serta slug tidak ditemukan.
4. Jalankan cache debug pada cold request dan pastikan primary category/detail masing-masing hanya memiliki satu key Data Cache.
5. Ulangi request dan pastikan key yang sama menjadi HIT; uji invalidasi `public-services` secara lokal bila jalur aman tersedia.
6. Jalankan Prettier, ESLint targeted, TypeScript, production build, dan smoke test.
7. Ulangi pada Preview Vercel `sin1` dan bandingkan query count serta Function duration cold/warm sebelum Production.

Keputusan yang disetujui:

1. Gunakan relational select satu query per route, bukan perubahan minimal dua tahap.
2. Gunakan route-level aggregate loader dengan return shape lama agar metadata, UI, dan komponen tidak berubah.
3. Mulai supporting query blog dan seluruh category secara paralel dengan primary service data, dengan guard yang mempertahankan perilaku error saat ini.
4. Gunakan explicit column selection, published filter pada setiap level, dan `sort_order` ascending pada nested items/details.
5. Hapus helper service lama yang sudah tidak memiliki consumer pada patch yang sama setelah verifikasi.
6. Jangan menambahkan migration/RPC/Route Handler atau mengubah UI/SEO; cache FE-01 serta memoization FE-03 tetap dipertahankan.

Referensi resmi:

- Supabase, Querying Joins and Nested Tables: relasi otomatis dari foreign key, embedded one-to-many, filter join dengan `!inner`, dan filter pada joined field — https://supabase.com/docs/guides/database/joins-and-nesting
- Supabase JavaScript `select()`: referenced table, inner join, dan filtering melalui referenced table — https://supabase.com/docs/reference/javascript/select
- Supabase JavaScript `order()`: pengurutan row pada referenced table dengan `referencedTable` — https://supabase.com/docs/reference/javascript/using-modifiers-order
- Next.js, Fetching Data: request independen sebaiknya dimulai bersama dan ditunggu dengan `Promise.all` untuk menghindari waterfall — https://nextjs.org/docs/app/getting-started/fetching-data#parallel-data-fetching

## Progress FE-04 — Implementasi relational service queries (3 September 2026)

Status: **implementasi lokal selesai dan terverifikasi; belum di-commit atau di-deploy ke Preview/Production**.

Implementasi loader:

- Menambahkan `getServiceCategoryPageData(categorySlug)` yang mengambil category dan seluruh published items melalui satu nested select dari `services_categories`.
- Category dan nested items menggunakan explicit column selection, explicit `is_published` filters, serta nested `sort_order` ascending.
- `getServiceDetailPageData(categorySlug, itemSlug)` sekarang menjalankan satu query dari `services_items` dengan embedded `services_categories!inner` dan `services_item_details`.
- Relasi category pada detail difilter dengan category slug serta status published sehingga pasangan category-item yang salah tidak dapat lolos.
- Detail nested tetap berbentuk array, difilter published, dan diurutkan dengan `sort_order` ascending.
- Nested response dipetakan di server kembali menjadi `{ category, items }` untuk category dan `{ category, item, details }` untuk detail. Property relasi mentah tidak diteruskan ke komponen.
- Aggregate category dan detail memakai key Data Cache baru, tag `public-services`, TTL 15 menit, namespace FE-01, dan React `cache()` sebagai lapisan request memoization FE-03.
- Helper lama `getServiceCategoryBySlug`, `getServiceItemsByCategorySlug`, `getServiceItemByCategoryAndSlug`, dan `getServiceItemDetailsByItemId` dihapus setelah pencarian source memastikan tidak ada consumer lain.

Implementasi route:

- `generateMetadata` dan body category sekarang memakai instance `getServiceCategoryPageData` yang sama.
- Detail metadata dan body tetap memakai nama `getServiceDetailPageData`, tetapi internalnya sudah menjadi satu relational query.
- Primary service data, tiga blog terbaru, dan seluruh category sekarang dimulai bersama melalui `Promise.allSettled`.
- Hasil primary service yang rejected tetap diprioritaskan menjadi `notFound`; error supporting blog/category tetap dilempar sebagai server error. Perbaikan klasifikasi error yang lebih spesifik tetap scope FE-16.
- Return props, urutan section, UI, motion, metadata fields, canonical, Open Graph, dan URL tidak diubah.

Perubahan jalur cold primary data:

| Route | Sebelum FE-04 | Sesudah FE-04 |
| --- | --- | --- |
| Category | category → items, dua query/tahap | category + embedded items, satu query |
| Detail | category → item → details, tiga query/tahap | item + embedded category/details, satu query |

Verifikasi relational query lokal:

- Read-only query category `legal-and-corporate` berhasil dan mengembalikan tiga item published dalam `sort_order` ascending.
- Read-only query item `corporate-business` berhasil, relasi category kembali sebagai `legal-and-corporate`, dan array details kosong ditangani dengan benar.
- Dataset lokal tidak memiliki satu pun `services_item_details` published yang dapat digunakan sebagai fixture non-empty. Ordering untuk array berisi data wajib diuji kembali pada Preview/Production read-only.
- Tidak ada data, policy, schema, migration, function, atau configuration Supabase yang diubah selama pengujian.

Verifikasi source dan runtime:

- Prettier pada tiga file source berhasil.
- ESLint targeted pada tiga file source berhasil.
- TypeScript `tsc --noEmit` berhasil.
- Production build Next.js berhasil; route publik Supabase tetap dynamic (`ƒ`) seperti baseline FE-01.
- `git diff --check` berhasil tanpa whitespace error; LF/CRLF yang muncul hanya warning line ending repository Windows.
- Dua putaran smoke test menghasilkan HTTP 200 untuk category dan detail service valid.
- Category slug tidak tersedia, service slug tidak tersedia, serta pasangan category-item salah masing-masing menghasilkan HTTP 404 pada dua putaran.
- HTML category memuat tiga link item unik, sesuai jumlah item published dari relational query lokal.
- Detail response tetap memiliki metadata title, canonical, dan Open Graph title.
- Cache debug cold menunjukkan satu primary key `public-services` untuk category dan satu primary key untuk detail. Request valid kedua menunjukkan kedua key tersebut menjadi HIT.
- Blog dan daftar category pendukung terlihat dimulai pada kelompok request yang sama dengan primary data, bukan setelah primary selesai.
- Server production lokal pada port pengujian dihentikan setelah verifikasi.

Batas verifikasi dan checklist Preview:

1. Uji category yang tidak memiliki item dan item yang memiliki minimal satu detail published.
2. Pastikan urutan item/detail, jumlah card/detail, dan seluruh teks sama dengan Production sebelum perubahan.
3. Uji category/item unpublished dan pasangan category-item yang salah; semuanya tidak boleh merender data publik.
4. Bandingkan title, description, canonical, Open Graph, JSON-LD, heading, CTA, serta internal link pada route valid.
5. Pastikan cold request masing-masing hanya menggunakan satu primary relational query dan request berikutnya menjadi cache HIT.
6. Verifikasi invalidasi tag `public-services` bila tersedia jalur aman tanpa mengubah data Production.
7. Bandingkan Function duration cold/warm pada Preview Vercel `sin1` sebelum mempromosikan deployment.

## Progress FE-05 — Analisis Loading UI route publik (4 September 2026)

Status: **audit route/layout selesai; keputusan disetujui dan implementasi dicatat pada bagian berikutnya**.

Batas pekerjaan:

- Audit hanya membaca struktur App Router publik, shared site layout, halaman dynamic, komponen section, style token, serta hasil FE-01 sampai FE-04.
- Tidak ada `loading.tsx`, Suspense boundary, skeleton, UI, route, source, database, cache, maupun konfigurasi yang diubah pada tahap analisis ini.
- Loading UI hanya boleh mengubah keadaan sementara selama navigasi/data menunggu. Tampilan halaman setelah data selesai harus identik.

Kondisi saat ini:

- Tidak ditemukan satu pun `loading.tsx`, `error.tsx`, `not-found.tsx`, atau `global-error.tsx` di App Router.
- Route `/`, `/about`, `/blog`, `/blog/[slug]`, `/services`, `/services/[category]`, dan `/services/[category]/[service]` tetap dynamic karena data Supabase dan keputusan data-cache-only FE-01.
- `/contact` bersifat static dan tidak memerlukan loading boundary khusus data.
- Seluruh public page berada di bawah `src/app/(site)/layout.tsx`. Navbar dan footer berada di layout tersebut, sementara page dirender sebagai `children` di dalam `<main>`.
- Tanpa loading boundary, navigasi ke dynamic route dapat mempertahankan halaman lama tanpa feedback sampai Server Component payload siap, sehingga klik terasa tidak merespons pada cache dingin atau jaringan lambat.
- FE-01 sampai FE-04 sudah menangani region, cache, deduplikasi, dan query waterfall. FE-05 menjadi feedback UX, bukan pengganti optimasi data.

Perilaku Next.js yang relevan:

- `loading.tsx` otomatis membungkus page dan child segment di bawahnya dengan Suspense.
- Loading fallback dapat diprefetch untuk dynamic route sehingga navigasi dapat dimulai segera, shared layout tetap interaktif, dan navigasi dapat dibatalkan oleh navigasi baru.
- `loading.tsx` adalah Server Component secara default; fallback ringan tidak memerlukan JavaScript client tambahan.
- Skeleton harus memiliki ukuran mendekati konten akhir untuk mengurangi layout shift ketika page asli menggantikan fallback.

Opsi penyelesaian:

1. **Satu generic `src/app/(site)/loading.tsx`.** Diff paling kecil dan mencakup semua route publik, tetapi fallback yang sama tidak cocok untuk homepage, article, category, dan detail. Ia juga ikut membungkus `/contact` serta semua child route dan lebih mudah menghasilkan flash/layout shift yang tidak sesuai bentuk halaman tujuan.
2. **Route-shaped `loading.tsx` per segment dengan shared skeleton component (rekomendasi).** Homepage, About, blog list/article, services list/category/detail mendapat bentuk fallback yang mendekati first viewport masing-masing. Navbar/footer tetap berasal dari shared layout. Jumlah file lebih banyak, tetapi setiap boundary sederhana dan regression surface visual lebih mudah diuji.
3. **Refactor setiap page menjadi banyak async child dengan manual Suspense.** Dapat menampilkan Hero/static section asli sambil hanya menunggu section berbasis data. Ini memberi streaming paling granular, tetapi menyentuh struktur banyak page dan Motion boundary, meningkatkan risiko layout shift serta perubahan timing animasi. Direkomendasikan sebagai tahap lanjutan hanya bila segment loading masih belum cukup setelah profiling.

Rancangan yang direkomendasikan:

- Buat satu presentational Server Component loading dengan variant: home, about, list, category, article, dan detail.
- Tambahkan loading boundary terdekat untuk About, blog list/article, services list/category/detail.
- Pindahkan homepage secara mekanis ke pathless route group `(home)` lalu letakkan `loading.tsx` di group tersebut. URL tetap `/`, sedangkan static `/contact` tidak ikut dibungkus fallback homepage.
- Gunakan shared `brand-section-px`, `max-w-[1440px]`, tinggi/aspect ratio first viewport, warna netral brand, dan rounded shape yang sudah ada. Jangan menampilkan teks konten palsu.
- Skeleton hanya memakai elemen CSS ringan. Jangan mengimpor Framer Motion, Lenis, Swiper, image, icon, atau membuat request data.
- Gunakan `role="status"`, `aria-live="polite"`, `aria-busy="true"`, satu teks screen-reader `Loading page`, dan tandai shape dekoratif sebagai `aria-hidden`.
- Gunakan pulse opacity CSS hanya melalui `motion-safe`, tanpa JavaScript; pengguna `prefers-reduced-motion` mendapat skeleton statis.
- Pertahankan minimum height agar footer tidak meloncat ke first viewport saat loading.
- Jangan menambahkan spinner fullscreen, overlay yang mengunci navbar, progress palsu, atau perubahan pada final page UI.

Rencana lokasi boundary:

| Target | Boundary yang diusulkan | Bentuk first viewport |
| --- | --- | --- |
| `/` | `(site)/(home)/loading.tsx` | dua kolom hero pada desktop, bertumpuk pada mobile |
| `/about` | `(site)/about/loading.tsx` | media/hero tinggi mendekati `100svh`, maksimal sekitar 700px |
| `/blog` | `(site)/blog/loading.tsx` | heading/search blocks dan grid card |
| `/blog/[slug]` | `(site)/blog/[slug]/loading.tsx` | cover aspect `16/7`, title, dan excerpt blocks |
| `/services` | `(site)/services/loading.tsx` | heading dan grid service cards |
| `/services/[category]` | `(site)/services/[category]/loading.tsx` | hero media/text mendekati tinggi maksimal 600px |
| `/services/[category]/[service]` | `(site)/services/[category]/[service]/loading.tsx` | centered title/description dan detail rows |

Trade-off status HTTP dan SEO:

- Metadata route valid tetap dibuat oleh `generateMetadata`; streaming server-rendered tidak menghilangkan title, description, canonical, Open Graph, atau konten akhir dari crawler.
- Ketika fallback sudah mulai di-stream, header response sudah terkirim dan status tidak dapat diubah kemudian.
- Karena itu `notFound()` dari dynamic blog/service yang baru diketahui setelah query dapat menghasilkan streamed HTTP 200 dengan `<meta name="robots" content="noindex">`, bukan hard HTTP 404 seperti perilaku lokal sebelum FE-05.
- Next.js menyatakan response tersebut tidak diindeks, tetapi monitoring atau analytics dapat mengategorikannya sebagai soft 404.
- Mempertahankan hard 404 sambil tetap memakai automatic segment loading pada resource yang sama memerlukan validasi slug sebelum streaming, misalnya di Proxy/layout. Itu menambah query atau kompleksitas dan tidak direkomendasikan tanpa kebutuhan compliance/monitoring yang jelas.

Risiko dan guardrail:

- Skeleton yang terlalu detail dapat terlihat seperti redesign dan lebih mahal dirender. Gunakan bentuk minimum yang hanya menjaga struktur first viewport.
- Fallback tanpa ukuran stabil dapat membuat footer muncul lalu bergeser jauh saat data selesai.
- Pulse cepat dapat membuat UI terasa lebih sibuk dan tidak ramah reduced-motion; gunakan satu pulse lembut atau skeleton statis.
- Loading fallback dapat sangat singkat pada warm cache dan terlihat berkedip. Uji cache warm serta koneksi cepat; jika mengganggu, gunakan reveal delay CSS kecil tanpa menambah state client.
- Jangan menampilkan skeleton untuk mutation/form submission; itu bukan scope FE-05.
- Jangan menambahkan error/not-found design pada patch ini. Hal tersebut tetap FE-15, sedangkan pembedaan error data tetap FE-16.
- Pathless route group tidak mengubah URL, metadata, atau canonical, tetapi production build dan seluruh link ke `/` wajib diuji setelah pemindahan file homepage.

Rencana verifikasi setelah implementasi:

1. Jalankan production build dan pastikan route map serta URL tidak berubah.
2. Uji navigasi client-side dari navbar, service cards, blog cards, CTA, serta browser Back/Forward.
3. Gunakan network throttling Fast 3G/Slow 4G dan cache dingin untuk memastikan fallback terlihat, navbar tetap interaktif, serta navigasi dapat diganti sebelum request selesai.
4. Uji koneksi cepat/warm cache untuk memastikan tidak ada skeleton flash yang mengganggu.
5. Bandingkan tinggi first viewport mobile/desktop dan periksa CLS ketika fallback diganti page asli.
6. Uji keyboard/focus, screen reader announcement tunggal, `prefers-reduced-motion`, dan tidak adanya elemen skeleton yang focusable.
7. Periksa route valid: title, description, canonical, Open Graph, JSON-LD, heading, dan status tetap sesuai baseline.
8. Periksa route blog/service tidak valid dan catat apakah status berubah menjadi streamed 200 + `noindex`; hasil harus sesuai keputusan yang dikunci.
9. Jalankan Prettier, ESLint targeted, TypeScript, `git diff --check`, serta smoke test Preview sebelum Production.

Keputusan yang disetujui:

1. Gunakan route-shaped skeleton per segment dengan satu shared component.
2. Pindahkan homepage secara mekanis ke pathless `(home)` group agar loading homepage tidak membungkus static `/contact`.
3. Gunakan segment-level `loading.tsx` terlebih dahulu; granular Suspense tidak termasuk scope FE-05 saat ini.
4. Gunakan pulse opacity lembut melalui `motion-safe`; reduced-motion mendapat skeleton statis.
5. Untuk dynamic blog/service invalid, terima standard streaming response HTTP 200 + `noindex` demi immediate route loading.
6. Final page UI, metadata, cache FE-01, memoization FE-03, query FE-04, serta error UI FE-15 tidak diubah.

Referensi resmi:

- Next.js, `loading.js`: instant loading state, automatic Suspense boundary, shared layout tetap interaktif, SEO, dan konsekuensi status code setelah streaming — https://nextjs.org/docs/app/api-reference/file-conventions/loading
- Next.js, Linking and Navigating: dynamic route dengan `loading.tsx` dapat diprefetch sebagian dan menampilkan feedback segera — https://nextjs.org/docs/app/getting-started/linking-and-navigating
- Next.js, Fetching Data: perbedaan route-level `loading.tsx` dan granular Suspense — https://nextjs.org/docs/app/getting-started/fetching-data

## Progress FE-05 — Implementasi Loading UI route publik (4 September 2026)

Status: **implementasi lokal selesai dan terverifikasi secara statis/server-side; belum di-commit atau di-deploy**.

Implementasi:

- Menambahkan `src/components/layout/public-route-loading.tsx` sebagai presentational Server Component tanpa state, request data, atau Client Component boundary.
- Shared component menyediakan enam bentuk ringan: `home`, `about`, `list`, `category`, `article`, dan `detail`.
- Menambahkan loading boundary pada homepage, About, blog list/article, services list/category/detail.
- Homepage dipindahkan secara mekanis dari `src/app/(site)/page.tsx` ke `src/app/(site)/(home)/page.tsx`. Pathless route group tidak mengubah URL `/`, metadata, canonical, atau isi homepage.
- Loading homepage berada di `(site)/(home)/loading.tsx`, sehingga `/contact` tidak ikut dibungkus fallback tersebut.
- Navbar dan footer tetap berasal dari shared site layout dan tidak diganti oleh loading fallback.
- Skeleton hanya memakai markup dan utility CSS. Framer Motion, Lenis, Swiper, image, icon, serta query Supabase tidak dimuat oleh komponen loading.
- Animasi pulse hanya aktif melalui `motion-safe:animate-pulse`; pengguna dengan `prefers-reduced-motion` menerima state statis.
- Wrapper loading memakai `role="status"`, `aria-live="polite"`, `aria-busy="true"`, satu teks screen-reader `Loading page`, dan seluruh shape dekoratif `aria-hidden="true"`.
- Minimum height dan aspect ratio dipertahankan per variant untuk mengurangi perpindahan footer dan layout shift selama content page menunggu.
- Tidak ada perubahan pada UI final, data fetching, cache, metadata, Motion animation, ataupun konfigurasi deployment.

Boundary yang dibuat:

| Route | File loading | Variant |
| --- | --- | --- |
| `/` | `src/app/(site)/(home)/loading.tsx` | `home` |
| `/about` | `src/app/(site)/about/loading.tsx` | `about` |
| `/blog` | `src/app/(site)/blog/loading.tsx` | `list` |
| `/blog/[slug]` | `src/app/(site)/blog/[slug]/loading.tsx` | `article` |
| `/services` | `src/app/(site)/services/loading.tsx` | `list` |
| `/services/[category]` | `src/app/(site)/services/[category]/loading.tsx` | `category` |
| `/services/[category]/[service]` | `src/app/(site)/services/[category]/[service]/loading.tsx` | `detail` |

Verifikasi otomatis:

- Prettier berhasil pada seluruh file FE-05.
- ESLint langsung pada seluruh file FE-05 berhasil.
- Route types diregenerasi dengan `next typegen` setelah path homepage dipindahkan; TypeScript `tsc --noEmit` berhasil.
- Production build Next.js berhasil.
- Route map tetap memuat `/` sebagai dynamic route, `/contact` tetap static, dan seluruh public route lain mempertahankan path sebelumnya.
- Production server lokal mengembalikan HTTP 200 untuk `/`, `/about`, `/blog`, `/services`, `/contact`, satu category valid, dan satu service detail valid.
- HTML response route dynamic yang ditargetkan memuat teks accessibility `Loading page` serta `aria-busy="true"`, membuktikan fallback ikut di-stream.
- HTML `/contact` tidak memuat marker loading FE-05.
- Invalid service category dan service detail lokal mengembalikan streamed HTTP 200 dengan `noindex`, sesuai keputusan yang disetujui.
- Invalid blog slug juga menghasilkan response HTTP 200 dengan `noindex`, tetapi server masih mencatat error Supabase `PGRST116` karena query tidak menemukan baris. Ini merupakan perilaku error/data yang sudah ada dan tetap menjadi scope FE-16, bukan regression yang diperbaiki dalam FE-05.

Verifikasi manual sebelum Production:

1. Uji navigasi client-side memakai link navbar, card, CTA, serta Back/Forward pada Preview deployment.
2. Gunakan network throttling dan cache dingin untuk memeriksa skeleton desktop/mobile, navbar tetap interaktif, dan tidak ada footer jump yang mengganggu.
3. Uji warm cache untuk memastikan fallback singkat tidak terasa berkedip.
4. Aktifkan `prefers-reduced-motion` dan pastikan skeleton statis.
5. Bandingkan final UI, title, description, canonical, Open Graph, JSON-LD, heading, serta animasi terhadap Production sebelum patch.

Catatan tooling:

- Browser interaktif tidak tersedia pada sesi implementasi, sehingga screenshot, pengukuran CLS visual, fokus keyboard, dan client navigation masih perlu diuji manual pada Preview deployment.
- Warning lama `baseline-browser-mapping` dan deprecation konvensi `middleware` tetap muncul saat build; keduanya tidak berasal dari FE-05 dan tidak diubah.

### Penyesuaian FE-05 — Warna skeleton netral (4 September 2026)

- Seluruh aksen merah/burgundy dan kuning pada skeleton dihapus berdasarkan hasil review visual.
- Semua placeholder sekarang memakai abu-abu netral dari `brand-black` dengan opacity rendah: `10%` untuk shape dan `5%` untuk panel latar About.
- Struktur, dimensi, minimum height, pulse animation, reduced-motion, accessibility, boundary route, serta final page UI tidak berubah.

## Progress FE-15 — Analisis Error Boundary dan Not-found UI publik (4 September 2026)

Status: **audit source dan rancangan selesai; keputusan disetujui dan implementasi dicatat pada bagian berikutnya**.

Batas pekerjaan:

- Audit hanya membaca struktur App Router, shared public layout, dynamic public pages, loader Supabase, komponen UI yang dapat digunakan ulang, dan dokumentasi resmi Next.js.
- Tidak ada `error.tsx`, `not-found.tsx`, `global-error.tsx`, query, cache, metadata, UI normal, database, maupun konfigurasi yang diubah pada tahap analisis ini.
- FE-15 menangani pengalaman ketika error atau resource tidak ditemukan. Klasifikasi penyebab error pada data layer tetap dipisahkan sebagai FE-16.

Kondisi source saat ini:

- Tidak terdapat `error.tsx`, `global-error.tsx`, maupun `not-found.tsx` di seluruh `src/app`.
- Semua halaman publik berada di bawah `src/app/(site)/layout.tsx`; navbar dan footer berasal dari layout tersebut, sedangkan page dirender sebagai child di dalam `<main>`.
- Error dari page atau nested component publik dapat ditangani oleh satu `(site)/error.tsx` tanpa mengganti navbar/footer. Error yang terjadi di dalam `(site)/layout.tsx` sendiri tidak dapat ditangkap oleh boundary pada segment yang sama.
- Site layout tidak menjalankan query data. Risiko error utama saat ini berada di page/loader Supabase, sehingga site-scoped boundary memberi coverage yang paling relevan dengan diff minimum.
- Root layout hanya menyiapkan font, metadata, global CSS, `<html>`, dan `<body>`. `global-error.tsx` baru diperlukan sebagai last-resort bila root layout/template ikut gagal; kasus tersebut lebih luas daripada public failure UX FE-15.
- `app/not-found.tsx` diperlukan untuk URL yang tidak cocok dengan route mana pun. Nested `(site)/not-found.tsx` diperlukan agar `notFound()` dari blog/service publik memakai UI yang tetap berada di dalam site shell.
- Project memiliki satu root layout biasa. Experimental `global-not-found.tsx` tidak diperlukan dan tidak direkomendasikan.

Temuan alur error data:

- `getPublishedBlogPostBySlug()` menggunakan `.single()` dan melempar seluruh error Supabase. Secara type fungsi selalu mengembalikan `BlogPost`, sehingga pengecekan `if (!post) notFound()` pada page tidak menangani kondisi nol baris secara bersih; invalid slug saat pengujian FE-05 masih mencatat `PGRST116`.
- Page category dan detail service menggunakan `Promise.allSettled()`. Rejection primary service loader selalu dipetakan ke `notFound()`, sedangkan rejection blog list atau service category list diteruskan sebagai error.
- Karena loader service juga menggunakan `.single()`, primary rejection dapat berarti row tidak ada, timeout, gangguan jaringan, permission/RLS, atau konfigurasi salah. Semua kondisi tersebut saat ini terlihat sebagai 404.
- `generateMetadata()` blog/service menangkap seluruh error lalu memakai metadata generic. Ini mencegah metadata render ikut crash, tetapi tidak membedakan resource tidak ada dari outage.
- Tidak ditemukan SDK error reporting atau `instrumentation.ts`. Vercel/server logs tetap menjadi sumber diagnosis yang tersedia saat ini.

Pemisahan tanggung jawab FE-15 dan FE-16:

- FE-15 menyediakan UI fallback yang aman untuk uncaught exception serta UI not-found yang konsisten.
- FE-16 harus mengubah loader agar hasil `not found` menjadi `null` atau error terklasifikasi, sedangkan error operasional tetap dilempar ke `error.tsx`.
- Mengimplementasikan FE-15 tanpa FE-16 tetap berguna untuk menghilangkan fallback framework, tetapi sementara waktu missing blog dapat memakai error UI dan outage service dapat memakai not-found UI.
- Rekomendasi urutan adalah implementasikan boundary FE-15 terlebih dahulu, verifikasi secara terisolasi, lalu lanjutkan FE-16 segera sebagai perubahan correctness terpisah. FE-16 tidak boleh disisipkan diam-diam ke patch FE-15.

Opsi error boundary:

1. **Satu `(site)/error.tsx` untuk seluruh public page (rekomendasi).** Menangkap uncaught error dari page publik dan nested child, mempertahankan site navbar/footer, serta menyediakan satu UX yang konsisten. Diff dan client bundle tambahan paling kecil. Boundary tidak menangkap error pada site layout itu sendiri.
2. **`error.tsx` per route publik.** Copy dapat dibuat spesifik untuk blog/service dan blast radius reset lebih sempit, tetapi menambah duplikasi, file client, serta matriks pengujian tanpa kebutuhan UX yang terbukti saat ini.
3. **Root `app/error.tsx` atau `global-error.tsx`.** Coverage lebih luas, termasuk route admin/auth atau root failure tergantung lokasi, tetapi melampaui public scope. `global-error.tsx` juga harus menggantikan root layout serta mendefinisikan `<html>` dan `<body>` sendiri. Tidak direkomendasikan untuk putaran awal.

Opsi not-found:

1. **Nested `(site)/not-found.tsx` + stable root `app/not-found.tsx` dengan shared state content (rekomendasi).** Nested file menangani `notFound()` dari resource publik di dalam site shell; root file menangani semua URL unmatched. Root state dibuat standalone dan ringan karena tidak otomatis berada di dalam `(site)` layout.
2. **Root `app/not-found.tsx` saja.** File lebih sedikit dan menangani URL unmatched, tetapi dynamic public resource kehilangan kesempatan memakai boundary terdekat dengan site shell dan route context.
3. **Experimental `app/global-not-found.tsx`.** Melewati layout dan memberi kontrol penuh terhadap global 404, tetapi memerlukan flag experimental, full HTML document, serta import style/font sendiri. Project memiliki root layout tunggal sehingga kompleksitas ini tidak diperlukan.

Rancangan UI yang direkomendasikan:

- Gunakan satu shared presentational state dengan variant `error` dan `not-found`; tidak memakai image, Motion, Lenis tambahan, query data, atau efek berat.
- Copy tetap bahasa Inggris sesuai `lang="en"` dan seluruh konten situs.
- Error state: label `500`, heading `Something went wrong`, penjelasan generic tanpa detail internal, primary action `Try again`, dan secondary link `Back to home`.
- Not-found state: label `404`, heading `Page not found`, penjelasan bahwa alamat mungkin salah atau content sudah tidak tersedia, primary link `Back to home`, dan secondary link `View services`.
- Gunakan warna brand dan tipografi yang sudah tersedia secara sederhana, minimum height agar footer tidak meloncat, focus-visible yang jelas, serta layout responsive. UI normal tidak berubah.
- Error fallback memakai `role="alert"` dan heading yang terhubung melalui `aria-labelledby`. Not-found memakai heading semantik tanpa live-region karena bukan perubahan error async di dalam page yang sedang dibaca.
- `Try again` memanggil `reset()` secara manual untuk mencoba render ulang segment. Tidak ada auto-retry atau retry loop.

Keamanan dan logging:

- Jangan menampilkan `error.message`, stack trace, object Supabase, URL database, atau environment detail kepada user.
- Next.js menyamarkan message Server Component di production dan menyediakan `error.digest` untuk dicocokkan dengan server logs.
- Error UI dapat mencatat error melalui client console saat development. Untuk production, gunakan original Vercel Function logs dan digest; integrasi provider eksternal atau `instrumentation.ts` dipisahkan dari FE-15 agar tidak memperluas data yang dikirim keluar.
- Digest tidak perlu ditampilkan pada UI awal. Jika kelak dibutuhkan customer support, reference code dapat ditambahkan setelah alur support ditentukan.

Pengaruh FE-05 dan SEO:

- `loading.tsx` berada di luar page dan membungkus not-found UI pada hierarchy segment. Skeleton dapat muncul sebelum not-found/error state siap.
- `notFound()` otomatis menambahkan robots `noindex`.
- Karena FE-05 sudah mengaktifkan streaming, missing dynamic resource dapat merespons HTTP 200 dengan `noindex` alih-alih hard 404. Trade-off tersebut sudah disetujui pada FE-05 dan tidak diubah dalam FE-15.
- Root unmatched URL melalui `app/not-found.tsx` tetap dapat memberi status 404 ketika response belum di-stream.

Rencana verifikasi setelah implementasi:

1. Tambahkan test-only failure trigger yang tidak masuk commit, atau gunakan mock terkontrol; jangan memutus koneksi atau mengubah Supabase Production untuk memicu error.
2. Verifikasi uncaught public page error menampilkan site-scoped error UI, navbar/footer tetap interaktif, dan detail internal tidak terlihat.
3. Verifikasi `Try again` hanya melakukan retry manual dan mengganti fallback bila render berikutnya berhasil.
4. Uji invalid blog slug, category, pasangan category-service salah, unpublished resource, dan URL global yang tidak cocok.
5. Catat status HTTP dan robots `noindex`, khususnya streamed dynamic not-found hasil FE-05.
6. Uji direct load, client navigation, refresh, Back/Forward, keyboard, mobile/desktop, dan focus-visible.
7. Pastikan route valid serta UI normal, metadata, cache, Motion, Lenis, dan loading skeleton tidak berubah.
8. Jalankan Prettier, ESLint targeted, TypeScript, production build, `git diff --check`, dan Preview smoke test.
9. Setelah FE-15 stabil, kerjakan FE-16 dan ulangi matriks not-found versus operational error.

Keputusan yang disetujui:

1. Gunakan satu `(site)/error.tsx` untuk seluruh public page, bukan boundary per route.
2. Gunakan dua coverage not-found: `(site)/not-found.tsx` untuk explicit public `notFound()` dan `app/not-found.tsx` untuk URL unmatched.
3. Gunakan UI minimal berbahasa Inggris dengan action: error `Try again` + `Back to home`; not-found `Back to home` + `View services`.
4. Retry hanya manual melalui `reset()` tanpa auto-retry.
5. Detail error/digest tidak ditampilkan; gunakan Vercel logs saat ini dan tunda external observability/instrumentation.
6. `global-error.tsx` dan experimental `global-not-found.tsx` tidak dibuat pada putaran ini.
7. FE-15 tidak mengubah klasifikasi query; FE-16 dikerjakan setelahnya untuk membedakan missing resource dari operational error.

Referensi resmi:

- Next.js, `error.js`: segment error boundary, Client Component, sanitized Server Component error, digest, dan manual `reset()` — https://nextjs.org/docs/app/api-reference/file-conventions/error
- Next.js, Error Handling: expected error, uncaught exception, nested error boundary, dan not-found — https://nextjs.org/docs/app/getting-started/error-handling
- Next.js, `not-found.js`: nested not-found, root unmatched URL, status streaming, dan experimental global-not-found — https://nextjs.org/docs/app/api-reference/file-conventions/not-found
- Next.js, `notFound()`: menghentikan render segment dan menyisipkan robots `noindex` — https://nextjs.org/docs/app/api-reference/functions/not-found
- Next.js, `instrumentation.js`: `onRequestError` untuk provider observability server-side — https://nextjs.org/docs/pages/api-reference/file-conventions/instrumentation

## Progress FE-15 — Implementasi Error Boundary dan Not-found UI publik (5 September 2026)

Status: **implementasi lokal selesai dan terverifikasi secara statis/server-side; belum di-commit atau di-deploy**.

Implementasi:

- Menambahkan `src/components/layout/public-route-state.tsx` sebagai shared presentational state untuk error dan not-found.
- Shared state memakai typography, warna, spacing, dan `BrandButton` yang sudah tersedia; tidak menambah image, Motion, Lenis, query, atau dependency baru.
- Menambahkan `src/app/(site)/error.tsx` sebagai Client Component boundary tunggal untuk seluruh page publik di bawah site layout.
- Error state menampilkan copy generic `Something went wrong`, action manual `Try again` melalui `reset()`, dan link `Back to home`.
- Error state memakai `role="alert"` dan `aria-labelledby`; message, stack trace, object Supabase, dan digest tidak dirender kepada user.
- Menambahkan `src/app/(site)/not-found.tsx` agar explicit `notFound()` pada blog/service memakai custom state di dalam navbar/footer publik.
- Menambahkan stable `src/app/not-found.tsx` untuk URL global yang tidak cocok dengan route mana pun. Root state dibuat standalone dan ringan karena tidak berada di bawah `(site)` layout.
- Not-found state menampilkan `404`, `Page not found`, `Back to home`, dan `View services`.
- `global-error.tsx`, experimental `global-not-found.tsx`, instrumentation eksternal, auto-retry, serta boundary per-route tidak ditambahkan.
- Loader, query, cache, metadata, normal page UI, FE-05 loading boundary, dan klasifikasi error FE-16 tidak diubah.

Catatan arsitektur visual:

- `V2_Baseline_Architecture.md` sekarang mencatat bahwa UI error/not-found ini adalah functional baseline, bukan final design system Diputra.
- Future visual review boleh menyesuaikan hierarchy, spacing, warna, copy, dan responsive behavior, tetapi tidak boleh menghilangkan accessibility, retry manual, recovery link, noindex, sanitasi error, atau pemisahan error versus not-found.
- Redesign visual wajib tetap dipisahkan dari perubahan data correctness FE-16.

Verifikasi:

- Prettier berhasil pada seluruh source FE-15.
- ESLint langsung pada seluruh source FE-15 berhasil.
- TypeScript `tsc --noEmit` berhasil.
- Production build Next.js berhasil dan route map publik tidak berubah.
- `/` dan `/contact` tetap merespons HTTP 200.
- URL global yang tidak terdaftar merespons HTTP 404, memuat custom `Page not found`, robots `noindex`, dan tidak memuat detail internal.
- Invalid service category dan pasangan category-service tetap mengikuti keputusan streaming FE-05: response HTTP 200 + `noindex`, diawali loading state lalu resolved melalui RSC.
- Invalid blog slug tetap menghasilkan server error `PGRST116` dengan digest, lalu ditangani oleh route error boundary pada client. Penyebab dan klasifikasinya tetap dicatat untuk FE-16.
- Pemeriksaan HTML visible tanpa script memastikan custom not-found tidak tampil pada valid `/` maupun `/contact`.
- `git diff --check` dijalankan pada pemeriksaan akhir setelah dokumentasi selesai.

Batas verifikasi:

- Browser interaktif tidak tersedia pada sesi implementasi. Tampilan resolved state dynamic setelah hydration, action `Try again`, focus behavior, mobile/desktop, dan client-side navigation tetap perlu diuji manual pada Preview/local production.
- Recovery sukses setelah `reset()` memerlukan kegagalan sementara yang dapat dipulihkan; jangan memutus atau mengubah Supabase Production untuk mengujinya.

Checklist manual sebelum Production:

1. Jalankan production build lokal atau Preview deployment, lalu buka URL random untuk memeriksa global 404.
2. Uji invalid blog slug, invalid service category, dan pasangan category-service salah setelah JavaScript/hydration selesai.
3. Pastikan navbar/footer tetap aktif pada nested state dan tidak muncul pada standalone global 404 sesuai rancangan awal.
4. Uji `Try again` memakai mock/failure trigger lokal yang aman, bukan dengan mengubah Production.
5. Uji keyboard, focus-visible, screen reader alert error, mobile, desktop, refresh, Back/Forward, dan client navigation.
6. Pastikan tidak ada message Supabase, stack trace, URL database, atau digest pada UI.
7. Setelah FE-15 diterima, lanjutkan FE-16 dan ulangi matriks missing resource versus operational failure.

## Pembahasan FE-16 — Klasifikasi not-found dan error operasional Supabase (5 September 2026)

Status: **audit alur kode selesai; rancangan dan keputusan disiapkan; implementasi belum dimulai**.

Urutan pekerjaan yang dikunci:

- FE-15 telah diuji dan di-commit pada `05fb85c`.
- FE-16 menjadi pekerjaan aktif berikutnya.
- FE-11, FE-12, dan FE-13 akan dibahas sebagai satu batch setelah FE-16 selesai.
- FE-10 berstatus deferred, bukan solved, dan dicatat di `V2_Baseline_Architecture.md` untuk dilanjutkan kemudian.

Batas scope:

- Hanya klasifikasi hasil query pada tiga public detail loader serta konsumennya di page dan metadata.
- Tidak mengubah UI `error.tsx`/`not-found.tsx`, layout, animasi, Lenis, loading skeleton, schema Supabase, RLS, atau konfigurasi production.
- Pemangkasan `.select('*')` tetap menjadi scope FE-11 dan tidak disisipkan ke FE-16.
- Tidak menambah observability provider pada tahap ini; error operasional tetap tersedia melalui error boundary dan server/Vercel logs.

Temuan kode:

1. `fetchPublishedBlogPostBySlug()` memakai `.single()`. Slug yang tidak ada atau tidak published menghasilkan error `PGRST116`, bukan `null`, sehingga check `if (!post) notFound()` pada page tidak pernah menangani kasus tersebut sebagaimana dimaksud.
2. `fetchServiceCategoryPageData()` dan `fetchServiceDetailPageData()` juga memakai `.single()` lalu melempar setiap error.
3. Dua service page memakai `Promise.allSettled()` dan mengubah rejection primary loader menjadi `notFound()`. Akibatnya timeout, gangguan jaringan, RLS/permission, schema error, dan error Supabase lain dapat ditampilkan sebagai halaman tidak ditemukan.
4. `generateMetadata()` blog dan service memakai broad `catch` lalu menghasilkan metadata generic. Ini juga menyamarkan error operasional sebagai fallback yang terlihat sah.
5. FE-15 sudah menyediakan dua jalur UI yang benar: `not-found.tsx` untuk resource yang benar-benar tidak ada dan `error.tsx` untuk uncaught operational failure. FE-16 perlu mengarahkan hasil query ke jalur yang tepat.

Klasifikasi target:

| Kondisi | Hasil loader | Perilaku route |
| --- | --- | --- |
| Tidak ada row published yang cocok | `null` | `notFound()` |
| Slug/category/service salah atau resource unpublished | `null` | `notFound()` |
| Lebih dari satu row padahal kontraknya tunggal | throw error | Bubble ke `error.tsx` dan server log |
| Timeout/gangguan jaringan | throw error | Bubble ke `error.tsx` dan server log |
| RLS/permission/auth error | throw error | Bubble ke `error.tsx` dan server log |
| Schema/query/Supabase operational error | throw error | Bubble ke `error.tsx` dan server log |
| Query pendamping blog/category gagal | throw error | Bubble ke `error.tsx`, bukan render data parsial |

Opsi loader:

1. **Gunakan `.maybeSingle()` dan return nullable (rekomendasi).** Supabase menerima tepat nol atau satu row: nol menjadi `data: null`, sedangkan lebih dari satu row serta error operasional tetap berada pada jalur error. Kontrak TypeScript dibuat eksplisit sebagai `T | null`.
2. **Tetap `.single()` lalu anggap kode `PGRST116` sebagai not-found.** Diff terlihat kecil, tetapi kode tersebut dapat merepresentasikan hasil yang bukan tepat satu row, termasuk data ganda. Pendekatan ini berisiko menyembunyikan pelanggaran integritas sebagai 404 dan tidak direkomendasikan.
3. **Buat result union khusus, misalnya `{ status: 'found' | 'missing' | 'error' }`.** Paling eksplisit, tetapi menambah wrapper dan branching tanpa kebutuhan yang terbukti untuk tiga loader sederhana. Belum perlu pada putaran pertama.

Rancangan page dan metadata yang direkomendasikan:

1. Ubah hanya tiga public detail loader ke `.maybeSingle()` dan return nullable:
   - `fetchPublishedBlogPostBySlug(): Promise<BlogPost | null>`;
   - `fetchServiceCategoryPageData(): Promise<ServiceCategoryPageData | null>`;
   - `fetchServiceDetailPageData(): Promise<ServiceDetailPageData | null>`.
2. Pertahankan `throw error` bila Supabase mengembalikan error. Jangan mengubah error menjadi array kosong, `null`, metadata generic, atau stale fallback.
3. Pada page, panggil `notFound()` hanya saat primary result benar-benar `null`.
4. Ganti `Promise.allSettled()` pada dua service page dengan `Promise.all()`. Query tetap berjalan paralel, tetapi rejection operasional langsung bubble ke boundary; setelah semua resolve, primary `null` baru dipetakan ke `notFound()`.
5. Pada `generateMetadata()`, hapus broad `catch`. Jika loader resolve `null`, panggil `notFound()`; jika loader throw, biarkan error bubble. Metadata route valid tetap sama.
6. Tidak mengubah structured data, canonical URL, tampilan normal, atau copy error/not-found.

Keputusan cache untuk missing resource:

1. **Cache hasil `null` mengikuti TTL/tag yang sudah ada (rekomendasi).** Invalid slug berulang tidak terus membebani Supabase. Mutation blog dari aplikasi sudah menginvalidasi tag; perubahan service yang dilakukan langsung di Supabase mengikuti safety-net TTL 15 menit yang sebelumnya sudah disetujui.
2. **Jangan cache hasil `null`.** Resource baru terlihat segera tanpa menunggu invalidasi/TTL, tetapi invalid URL berulang selalu menjalankan query dan implementasinya memerlukan jalur cache khusus.

Rekomendasi tahap awal adalah opsi pertama karena konsisten dengan kebijakan FE-01. Konsekuensinya harus diterima secara sadar: resource yang baru dibuat langsung melalui Supabase dapat tetap dianggap missing sampai tag diinvalidasi atau TTL maksimal 15 menit berakhir.

Catatan streaming dan status HTTP:

- FE-05 menyediakan route-level loading UI sehingga dynamic route dapat mulai streaming sebelum hasil loader diketahui.
- Setelah response mulai streaming dan header terkirim, framework tidak selalu dapat mengganti status HTTP menjadi hard `404` atau `500`; hasil missing/error tetap dibedakan melalui streamed UI, `notFound()`/robots `noindex`, error boundary, dan server logs.
- Karena trade-off streaming `200` + `noindex` sudah diterima pada FE-05, FE-16 tidak akan menghapus loading boundary atau menahan seluruh response hanya untuk mengejar hard status code.
- Sasaran utama FE-16 adalah correctness semantik dan UX: missing menampilkan `Page not found`, sedangkan outage/permission/timeout menampilkan `Something went wrong` dan dapat dicoba ulang.

Risiko dan guardrail:

- Jangan menganggap semua `PGRST116` sebagai missing; data ganda harus tetap terlihat sebagai error.
- Jangan menggunakan service-role key atau melemahkan RLS untuk membuat query berhasil.
- Jangan mengubah query list/selected columns dalam patch yang sama; itu milik FE-11.
- Jangan menguji operational failure dengan memutus atau mengubah Supabase Production. Gunakan mock/test-only trigger lokal yang tidak ikut commit.
- Pastikan return type nullable diterapkan sampai ke seluruh consumer agar tidak ada dereference sebelum null check.
- Cache hanya hasil query yang sukses, termasuk sukses tanpa row. Exception operasional tidak boleh menjadi cached fallback.

Rencana verifikasi setelah implementasi:

1. Valid blog, category, dan service tetap menampilkan UI, metadata, canonical, serta structured data yang sama.
2. Invalid slug, invalid category, pasangan category-service salah, dan unpublished resource menampilkan custom `Page not found` serta `noindex`.
3. Mock timeout/network/permission/query failure menampilkan custom `Something went wrong`, bukan not-found, dan error tetap muncul di server log tanpa bocor ke UI.
4. Skenario data ganda terkontrol tetap menjadi operational error, bukan 404.
5. Query primary dan pendamping pada service tetap paralel; tidak ada waterfall baru.
6. Uji cache miss/hit serta invalidasi blog; verifikasi negative cache mengikuti TTL/tag yang dipilih.
7. Uji direct load, client navigation, refresh, Back/Forward, dan tombol `Try again` pada local production atau Preview.
8. Catat HTTP status dan `noindex` secara terpisah agar streamed `200` tidak keliru dianggap klasifikasi UI yang gagal.
9. Jalankan Prettier, targeted ESLint, TypeScript, production build, `git diff --check`, dan Preview smoke test.

Keputusan yang diperlukan sebelum implementasi:

1. Setujui `.maybeSingle()` + return nullable untuk tiga public detail loader.
2. Setujui hanya `null` yang memanggil `notFound()`; seluruh error Supabase lain tetap dilempar.
3. Setujui broad `catch` pada `generateMetadata()` dihapus; missing memanggil `notFound()`, operational error bubble.
4. Setujui `Promise.allSettled()` service diganti `Promise.all()` sambil mempertahankan eksekusi paralel.
5. Pilih hasil missing ikut dicache selama maksimal 15 menit/tag invalidation (rekomendasi), atau tidak dicache.
6. Setujui trade-off streaming FE-05 dipertahankan: correctness UI/noindex/log diprioritaskan tanpa menjamin hard HTTP 404/500 setelah streaming dimulai.
7. Setujui FE-16 tidak mencakup perubahan UI, query projection FE-11, instrumentation, schema, RLS, atau production configuration.

Referensi resmi:

- Supabase JavaScript, `.maybeSingle()` — https://supabase.com/docs/reference/javascript/using-modifiers-maybesingle
- Next.js, `notFound()` — https://nextjs.org/docs/app/api-reference/functions/not-found
- Next.js, error handling — https://nextjs.org/docs/app/getting-started/error-handling
- Next.js, `generateMetadata()` — https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js, loading UI dan streaming — https://nextjs.org/docs/13/app/building-your-application/routing/loading-ui-and-streaming

## Progress FE-16 — Implementasi klasifikasi not-found dan error Supabase (5 September 2026)

Status: **implementasi lokal selesai dan terverifikasi secara statis serta melalui production smoke test; belum di-commit atau di-deploy**.

Implementasi:

- `fetchPublishedBlogPostBySlug()`, `fetchServiceCategoryPageData()`, dan `fetchServiceDetailPageData()` sekarang memakai `.maybeSingle()` serta mengembalikan tipe nullable.
- Zero row yang valid menjadi `null`. Error Supabase tetap dilempar, termasuk network, timeout, permission/RLS, query/schema, dan hasil lebih dari satu row.
- Public blog, service category, dan service detail memanggil `notFound()` hanya setelah loader berhasil resolve dengan `null`.
- Broad `catch` pada ketiga `generateMetadata()` dihapus. Missing resource mengikuti `notFound()`, sedangkan operational exception tidak lagi diubah menjadi metadata generic.
- Dua service page sekarang memakai `Promise.all()`, sehingga primary data dan query pendamping tetap dimulai secara paralel sementara seluruh rejection operasional bubble ke FE-15 error boundary.
- Hasil `null` tetap berada di dalam `unstable_cache` yang sudah ada dan mengikuti service/blog tag serta safety-net TTL 15 menit.
- UI normal, UI error/not-found, loading boundary, structured data, canonical, query projection, schema, RLS, dan konfigurasi production tidak diubah.

Verifikasi otomatis:

- Prettier berhasil pada lima source yang diubah.
- Targeted ESLint berhasil tanpa error. Warning lama `baseline-browser-mapping` tetap muncul dan tidak berasal dari FE-16.
- TypeScript `tsc --noEmit` berhasil.
- Production build Next.js 16.0.10 berhasil; route map tetap mempertahankan blog dan service dynamic routes.
- `git diff --check` berhasil. Warning normalisasi LF/CRLF tidak menunjukkan whitespace error.

Production-mode smoke test lokal:

| Route uji | HTTP | Resolved UI | `noindex` | Detail Supabase bocor |
| --- | --- | --- | --- | --- |
| `/blog/fe16-missing-smoke-test` | `200` streamed | `Page not found` | Ya | Tidak |
| `/services/fe16-missing-smoke-test` | `200` streamed | `Page not found` | Ya | Tidak |
| `/services/fe16-missing-category/fe16-missing-service` | `200` streamed | `Page not found` | Ya | Tidak |

Status `200` pada ketiga missing route konsisten dengan loading/streaming FE-05: header telah dikirim sebelum `notFound()` diselesaikan. Klasifikasi final UI, `noindex`, dan tidak adanya error leak sudah sesuai target FE-16.

Batas verifikasi:

- Operational failure sengaja tidak dipicu dengan memutus atau mengubah Supabase Production. Jalur ini telah diverifikasi secara statis: ketiga loader hanya mengembalikan `null` saat `error` kosong dan `data` kosong; setiap `error` tetap dilempar sebelum null check.
- Mock timeout/network/RLS serta tombol recovery `Try again` masih perlu diuji melalui failure trigger lokal sementara atau Preview yang aman sebelum Production.
- Valid route tidak diberi perubahan output, tetapi visual/client-navigation regression tetap perlu diperiksa manual pada Preview bersama smoke test final.

Checklist manual sebelum Production:

1. Buka satu blog, category, dan service valid; bandingkan UI, metadata, canonical, dan structured data dengan production saat ini.
2. Ulangi tiga invalid route dan pastikan resolved state adalah `Page not found`, bukan `Something went wrong`.
3. Gunakan local-only mock untuk network/permission/query failure; pastikan resolved state adalah `Something went wrong` dan server log mencatat error.
4. Pastikan `Try again` bekerja setelah local-only failure dihilangkan serta tidak membocorkan message, stack, digest, atau URL Supabase.
5. Uji refresh, client navigation, Back/Forward, mobile, desktop, keyboard, dan focus-visible.
6. Setelah Preview lolos, commit FE-16 secara terpisah sebelum memulai batch FE-11/FE-12/FE-13.

## Pembahasan gabungan FE-11, FE-12, dan FE-13 (5 September 2026)

Status: **audit source dan production build output selesai; rancangan serta keputusan disiapkan; implementasi belum dimulai**.

Batas pekerjaan:

- Perubahan FE-16 yang belum di-commit tetap dipertahankan dan tidak ditimpa.
- FE-11 hanya mengubah projection serta tipe data public read; cache policy, TTL, tag, query filter/order, schema, RLS, dan output UI tidak berubah.
- FE-12 hanya membersihkan asset setelah pemeriksaan referensi source dan production data; asset yang masih mungkin dipakai melalui URL database tidak boleh dihapus berdasarkan `rg` saja.
- FE-13 hanya mengubah cara Raleway variable font dideklarasikan; class font, ukuran, line-height, spacing, dan desain tidak berubah.
- Query admin/auth, asset Supabase Storage, dan optimasi visual FE-10 berada di luar batch ini.
- Walaupun dibahas bersama, FE-11, FE-12, dan FE-13 direkomendasikan sebagai unit implementasi serta commit terpisah agar rollback production tetap sempit.

### FE-11 — Projection query publik

Temuan terkini:

1. Temuan lama mengenai review publik yang memakai `.select('*')` sudah diselesaikan oleh FE-01. `fetchVisibleStories()` sekarang memilih tepat `id, name, message, created_at`; seluruh field tersebut dipakai carousel.
2. `fetchServiceCategories()` masih memakai `.select('*')`. `ServicesSection` hanya memerlukan `id`, `slug`, `title`, `type`, `short_description`, `card_image`, dan `card_icon_key`.
3. `fetchPublishedBlogPosts()` sudah eksplisit tetapi masih mengambil `author_name`, `reading_time_min`, `cover_alt`, dan `status` yang tidak digunakan `BlogSection`. List hanya memakai `slug`, `title`, `excerpt`, `featured_image`, dan `published_at`.
4. `fetchVisibleTeamMembers()` mengambil enam field. UI hanya membaca `full_name`, `job_title`, dan `avatar_url`; `id` sebaiknya tetap dipertahankan untuk kontrak/stable key, sedangkan `short_bio` dan `display_order` tidak perlu berada di response. Kolom `display_order` tetap dapat dipakai untuk sorting tanpa dikirim sebagai output.
5. Loader detail blog masih memakai `.select('*')`. Page/metadata/JSON-LD hanya memerlukan `slug`, `title`, `excerpt`, `content_md`, `author_name`, `featured_image`, `published_at`, dan `updated_at`.
6. Query category dan detail service sudah eksplisit, tetapi masih membawa beberapa kolom parent/child yang tidak digunakan. Contoh terbesar adalah SEO/OG child items pada category page serta hero/card fields category pada detail page.
7. Semua query tersebut berada di Server Components, tetapi datanya tetap diserialisasi ke cache dan sebagian diteruskan ke Client Components. Projection yang lebih sempit mengurangi transfer Supabase, cache entry, dan RSC serialization walaupun jumlah row saat ini kecil.

Rancangan projection:

| Loader | Rancangan |
| --- | --- |
| Service category list | `id, slug, title, type, short_description, card_image, card_icon_key` |
| Blog list | `slug, title, excerpt, featured_image, published_at` |
| Review list | Tidak diubah; sudah tepat empat field |
| Team list | `id, full_name, job_title, avatar_url` |
| Blog detail | Delapan field yang digunakan page, metadata, dan JSON-LD; hilangkan `*` |
| Service category page | Parent dan child dipangkas berdasarkan akses aktual page/component |
| Service detail page | Category, item, dan details dipangkas berdasarkan metadata serta component |

Opsi scope FE-11:

1. **Audit dan rapikan seluruh public read loader di atas (rekomendasi).** Menyelesaikan prinsip FE-11 secara konsisten dan mencegah `.select('*')` baru menjadi satu-satunya fokus. Diff lebih besar, tetapi setiap projection dapat diuji dengan route matrix yang jelas.
2. **Ubah hanya `.select('*')` pada service list dan blog detail.** Diff paling kecil, tetapi over-selection yang sudah terbukti pada blog/team/service relational query tetap menjadi utang dan FE-11 belum benar-benar selesai.
3. **Ubah public dan admin query sekaligus.** Tidak direkomendasikan karena admin membutuhkan kontrak berbeda serta menyentuh auth/management flow di luar tujuan perceived performance publik.

Guardrail tipe:

- Buat tipe output sempit untuk list/card/page, misalnya public DTO berbasis `Pick`, bukan melempar hasil parsial ke tipe row penuh dengan type assertion.
- Pertahankan full/editable type untuk admin dan mutation agar pemangkasan public query tidak merusak form/table.
- Tipe baru harus mengikuti nullability schema yang sekarang; FE-11 tidak digunakan untuk mengubah asumsi database.
- Jangan mengubah filter, order, limit, cache key, cache tags, nullable behavior FE-16, atau error propagation.

Keputusan FE-11 yang diperlukan:

1. Pilih seluruh public read loader dirapikan dalam satu FE-11 (rekomendasi), atau hanya dua query yang masih memakai `*`.
2. Setujui penggunaan public DTO/type sempit dan pemisahannya dari admin/editable type.
3. Setujui query admin tetap di luar scope.

### FE-12 — Asset lokal besar dan asset yatim

Temuan ukuran dan referensi:

| Asset | Ukuran | Temuan source |
| --- | ---: | --- |
| `public/image/about-hero-section.jpg` | 11,33 MB | Tidak direferensikan runtime; About aktif memakai WebP 0,18 MB |
| `public/image/about-section.png` | 8,15 MB | Hanya berada di blok JSX yang dikomentari |
| `public/image/services-realestate-image.jpg` | 0,92 MB | Hanya dirujuk module test yang tidak di-import |
| `public/image/services-legal-image.png` | 0,69 MB | Hanya dirujuk module test yang tidak di-import |
| `public/image/services-visa-image.png` | 0,66 MB | Hanya dirujuk module test yang tidak di-import |

Kelima kandidat berjumlah sekitar **21,75 MB**. `src/data/dsi-services-test.ts` sendiri tidak memiliki consumer/import aktif. Selain itu ditemukan beberapa asset tanpa referensi source, tetapi ukurannya lebih kecil dan mungkin masih dirujuk oleh nilai URL dalam database production.

Makna performa:

- File di `public` dapat dilayani langsung melalui URL dasar. Namun browser hanya mengunduh file yang benar-benar diminta, sehingga kandidat di atas bukan penyebab TTFB, LCP, atau scroll route publik saat ini.
- Membersihkannya tetap mengurangi current repository checkout, build/deployment input atau static output, dan risiko file sangat besar dipakai kembali tanpa sengaja.
- Menghapus file dari current tree tidak mengecilkan riwayat Git lama. History rewrite tidak direkomendasikan untuk repository production aktif.

Opsi FE-12:

1. **Cleanup bertahap setelah audit production reference (rekomendasi).** Periksa kolom/path production yang dapat menyimpan URL lokal (`featured_image`, `content_md`, `hero_image`, `card_image`, `avatar_url`, dan field terkait), lalu hapus hanya file yang tidak dirujuk. Kelima kandidat besar dan module test menjadi batch pertama jika audit bersih.
2. **Hapus dua original About saja.** Risiko paling rendah dan mengurangi 19,48 MB, tetapi tiga test asset besar serta module mati masih tertinggal.
3. **Pertahankan semuanya.** Tidak ada regresi, tetapi tidak memberi optimasi housekeeping dan risiko future accidental use tetap ada.
4. **Kompres tanpa menghapus.** Tidak direkomendasikan untuk file yang tidak digunakan; menambah pekerjaan dan tetap mempertahankan asset mati.

Guardrail asset:

- Jangan menghapus hanya karena tidak ditemukan oleh static search; URL dapat berasal dari Supabase production.
- Jangan mengubah atau mengompres WebP aktif, image dari Storage, OG image, fallback `news_image.png`, maupun asset yang masuk seed aktif pada putaran ini.
- Simpan daftar path yang dihapus. Semua file tracked tetap dapat dipulihkan dari commit sebelumnya tanpa history rewrite.
- Setelah penghapusan, production build dan smoke test harus memastikan tidak ada response image `404` pada route representatif.

Keputusan FE-12 yang diperlukan:

1. Setujui audit read-only terhadap referensi path di database production sebelum file dihapus.
2. Bila audit bersih, pilih cleanup lima asset + module test (rekomendasi), hanya dua original About, atau tidak ada penghapusan.
3. Setujui asset kecil yang belum terbukti aman tetap dipertahankan untuk tahap ini.

### FE-13 — Deklarasi Raleway variable font

Koreksi terhadap asumsi awal:

1. Source meminta sembilan weight `100` sampai `900`.
2. Audit Tailwind/CSS menemukan weight yang dipakai aplikasi adalah `300`, `400`, `500`, `600`, dan `700`; tidak ditemukan pemakaian `100`, `200`, `800`, atau `900`.
3. Production build menghasilkan lima file WOFF2 dengan total raw **122.252 byte**, tetapi sembilan weight tidak menghasilkan sembilan binary berbeda. CSS berisi 45 rule `@font-face` (9 weight x 5 unicode subset) yang semuanya menunjuk ke lima URL file variable font yang sama.
4. Karena itu, manfaat FE-13 yang realistis terutama mengurangi deklarasi CSS dan menyatakan kemampuan variable font dengan benar. Penghematan binary font network kemungkinan kecil atau nol karena URL WOFF2 sudah dibagi antar-weight.
5. Next.js 16.0.10 yang terpasang menyatakan Raleway mendukung `weight: 'variable'` dengan axis `wght` 100–900. Dokumentasi Next.js juga merekomendasikan variable font untuk performa dan fleksibilitas.

Opsi FE-13:

1. **Ganti array sembilan weight menjadi `weight: 'variable'` (rekomendasi).** Seluruh rentang 100–900 tetap tersedia, sehingga class 300–700 sekarang dan kemungkinan weight baru nanti tetap valid. Ini tidak memerlukan perubahan class atau desain dan mengurangi pengulangan `@font-face`.
2. **Daftarkan hanya `300`, `400`, `500`, `600`, `700`.** Sesuai pemakaian saat ini, tetapi karena Raleway sudah variable, masih menghasilkan rule per weight dan lebih rapuh bila weight lain ditambahkan kemudian.
3. **Biarkan sembilan weight.** Aman secara visual, tetapi deklarasi CSS tetap redundan.

Guardrail font:

- Pertahankan `subsets: ['latin']`, CSS variable `--font-raleway`, dan `display: 'swap'`.
- Jangan mengubah utility font-weight, font-size, line-height, letter-spacing, fallback, atau layout.
- Bandingkan screenshot route publik/admin pada viewport yang sama serta periksa computed font family/weight sebelum Production.
- Bandingkan jumlah `@font-face`, daftar WOFF2, dan transfer font sebelum/sesudah build; jangan mengklaim penghematan binary bila hasil build tidak berubah.

Keputusan FE-13 yang diperlukan:

1. Pilih `weight: 'variable'` (rekomendasi), lima weight eksplisit, atau pertahankan konfigurasi sekarang.
2. Setujui tidak ada perubahan class/tampilan sebagai bagian FE-13.

### Urutan implementasi dan verifikasi yang direkomendasikan

1. Commit FE-16 terlebih dahulu sebagai baseline correctness terpisah.
2. Implementasikan FE-11, jalankan TypeScript/build serta smoke test seluruh public data route, lalu commit terpisah.
3. Implementasikan FE-13, bandingkan output font dan screenshot, lalu commit terpisah.
4. Jalankan audit production path untuk FE-12; hapus hanya kandidat yang terbukti aman, jalankan image/network smoke test, lalu commit terpisah.
5. Deploy ketiganya ke Preview dan bandingkan dengan production sebelum merge/deploy Production.

Referensi resmi:

- Supabase JavaScript `select()` — https://supabase.com/docs/reference/javascript/select
- Next.js Font Optimization — https://nextjs.org/docs/app/getting-started/fonts
- Next.js `next/font` API — https://nextjs.org/docs/app/api-reference/components/font
- Next.js `public` folder — https://nextjs.org/docs/app/api-reference/file-conventions/public-folder
