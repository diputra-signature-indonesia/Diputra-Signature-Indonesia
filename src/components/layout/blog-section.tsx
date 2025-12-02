'use client';

import Image from 'next/image';
import { BrandButton } from '../ui/button';

export function BlogSection() {
  const item = [
    {
      id: 1,
      title: 'Optimalisasi Layanan KITAS 2025: Apa yang Berubah?',
      excerpt:
        'Pemerintah kembali memperbarui kebijakan terkait izin tinggal terbatas (KITAS). Perubahan ini menekankan proses yang lebih cepat dan integrasi data yang lebih kuat. Artikel ini membahas poin-poin penting yang perlu diperhatikan pemohon.',
    },
    {
      id: 2,
      title: 'Aturan Baru Visa Bisnis: Persyaratan yang Perlu Anda Siapkan',
      excerpt:
        'Mulai 2025, visa bisnis mengalami penyesuaian pada syarat dokumen serta masa berlaku. Pembaruan ini bertujuan meningkatkan transparansi dan mempermudah pelaku usaha asing untuk masuk ke Indonesia.',
    },
    {
      id: 3,
      title: 'Penerapan OSS RBA Terbaru: Dampaknya bagi Perizinan Usaha',
      excerpt:
        'OSS RBA kini memiliki fitur validasi otomatis yang membantu pengurusan izin menjadi lebih akurat. Artikel ini menjelaskan perubahan utama serta bagaimana pelaku usaha dapat mempersiapkan diri.',
    },
    {
      id: 4,
      title: 'Harmonisasi Pajak Daerah untuk Pelaku Usaha di Bali',
      excerpt:
        'Pemda Bali menerapkan kebijakan baru terkait Pajak Daerah dan Retribusi. Langkah ini diambil untuk menyederhanakan proses administrasi dan meningkatkan kepatuhan pelaku usaha lokal maupun asing.',
    },
    {
      id: 5,
      title: 'Update Peraturan Tenaga Kerja Asing 2025',
      excerpt:
        'Kementerian Ketenagakerjaan merilis regulasi baru terkait penggunaan TKA, termasuk prosedur RPTKA dan notifikasi kerja. Pembaruan ini dirancang untuk meningkatkan keamanan dan kepastian hukum bagi perusahaan.',
    },
    {
      id: 6,
      title: 'Update Peraturan Tenaga Kerja Asing 2025',
      excerpt:
        'Kementerian Ketenagakerjaan merilis regulasi baru terkait penggunaan TKA, termasuk prosedur RPTKA dan notifikasi kerja. Pembaruan ini dirancang untuk meningkatkan keamanan dan kepastian hukum bagi perusahaan.',
    },
  ];

  return (
    <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col gap-7">
      <div className="flex w-full flex-col items-end">
        <div className="flex w-xs flex-col items-end sm:w-sm lg:w-lg">
          <h2 className="brand-h1-semi">
            Latest <span className="brand-h1 text-brand-maroon">News</span>
          </h2>
          <p className="brand-p-desc text-right text-balance">Dapatkan update terbaru seputar legalitas, peraturan pemerintah, imigrasi, dan bisnis di Indonesia.</p>
        </div>
        <div className="flex w-full justify-end gap-2.5">
          <input type="text" className="w-full rounded-xl border px-5 py-2 text-xs font-light max-sm:max-w-3xs sm:max-w-80 sm:text-sm lg:max-w-96 lg:text-base" />
          <BrandButton variant="white" className="my-auto px-5 font-light sm:px-7 lg:px-10">
            Find
          </BrandButton>
        </div>
      </div>
      <div className="mx-auto w-full lg:columns-2 xl:max-w-7xl xl:columns-3">
        {item.map((item) => (
          <div key={item.id} className="mb-3 flex h-fit w-full gap-2.5 sm:mb-5 lg:mb-10">
            <div className="flex w-fit flex-col text-[14px] max-lg:hidden">
              <p className="border-b pb-2.5">01</p>
              <p className="border-b py-2.5">12</p>
              <p className="pt-2.5">20 25</p>
            </div>
            <div className="sm:border-brand-gray flex w-full overflow-hidden sm:border lg:flex-col">
              <Image alt="blog-1" src={'/image/news_image.png'} width={300} height={200} className="max-h-44 object-cover max-sm:h-20 max-sm:w-36 sm:w-2/5 lg:h-[200px] lg:w-full" />
              <div className="flex w-full flex-col gap-1 p-2 sm:gap-2.5 lg:p-5">
                <h3 className="brand-h3 line-clamp-2 font-normal sm:text-balance">{item.title}</h3>
                <p className="line-clamp-3 font-light max-sm:hidden sm:text-sm lg:line-clamp-4">{item.excerpt}</p>
                <p className="text-[9px] sm:text-[12px] lg:hidden">01/12/2025</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
