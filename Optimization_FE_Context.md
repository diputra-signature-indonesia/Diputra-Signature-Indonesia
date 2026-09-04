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
