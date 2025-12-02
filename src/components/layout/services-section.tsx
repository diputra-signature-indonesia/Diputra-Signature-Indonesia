import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

export function ServicesSection() {
  const services = [
    {
      id: 0,
      title: 'Legal',
      description: 'Layanan konsultasi hukum untuk kebutuhan bisnis dan perorangan, termasuk penyusunan dokumen legal, perjanjian, kontrak, serta pendampingan kepatuhan hukum di Indonesia.',
      image: '/image/services-legal-image.png',
    },
    {
      id: 1,
      title: 'Visa',
      description: 'Pendampingan lengkap pengurusan visa, izin tinggal (KITAS/KITAP), izin kerja, dan imigrasi lainnya bagi ekspatriat serta perusahaan yang mempekerjakan tenaga asing.',
      image: '/image/services-visa-image.png',
    },
    {
      id: 2,
      title: 'Real Estate',
      description: 'Layanan legal terkait properti, mulai dari due diligence, legalitas tanah dan bangunan, verifikasi dokumen, hingga pendampingan transaksi jual beli atau sewa properti.',
      image: '/image/services-realestate-image.jpg',
    },
  ];

  return (
    <section id="services-section" className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto flex max-w-[1440px] flex-col pt-20 lg:pt-30">
      <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon">
          Diputra <span className="brand-h1-semi text-black">Services</span>
        </h2>
        <p className="brand-p-desc text-left text-balance sm:border-l sm:pl-5 lg:pl-10">
          Kami menyediakan berbagai layanan yang dirancang untuk mendukung kebutuhan legal, bisnis, dan imigrasi Anda.{' '}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 text-white sm:gap-5 xl:h-[550px] xl:min-h-[550px] xl:flex-row">
        {services.map((item) => (
          <article key={item.id} className="relative flex size-full flex-col overflow-hidden">
            <Image src={item.image} alt={item.title} fill priority={false} quality={70} className="-z-20 object-cover brightness-75" />
            <div className="absolute inset-0 -z-10 bg-black/40" />
            <h3 className="brand-h3 w-full p-5">{item.title}</h3>
            <div className="flex h-full flex-col gap-2.5 p-5">
              <p className="m brand-p mt-auto sm:text-balance xl:text-pretty">{item.description}</p>
              <BrandButton variant="ghost" className="w-full justify-end px-0 text-white">
                Learn More{' '}
                <span>
                  <IconArrow className="text-white" />
                </span>
              </BrandButton>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
