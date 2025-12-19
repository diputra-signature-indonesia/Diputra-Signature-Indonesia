import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';
import Link from 'next/link';

export function AboutSection() {
  return (
    <section className="brand-stretch font-raleway brand-section-px mx-auto mt-30 flex max-h-[700px] max-w-[1440px] max-md:flex-col sm:gap-10 lg:gap-20">
      <div className="my-auto aspect-square w-full max-w-3xl overflow-hidden rounded-sm max-md:mb-7 md:min-h-[420px]">
        <Image
          src={'/image/businessman-examining-papers-table.webp'}
          alt="Legal and business consultation process at Diputra Signature Indonesia"
          sizes="(max-width: 768px) 100vw"
          width={600}
          height={600}
          priority={false}
          className="h-full object-cover max-lg:w-full"
        />
      </div>
      <div className="my-auto flex w-full flex-col gap-5 lg:w-[550px] lg:min-w-[550px] xl:w-[650px] xl:min-w-[650px]">
        <h2 className="brand-p text-black">About Us</h2>
        <h3 className="brand-h1 text-brand-burgundy border-brand-yellow border-l-4 pl-7 max-sm:leading-[90%]">
          Diputra <br className="sm:hidden" />
          <span className="brand-h1-semi text-brand-black"> Signature Indonesia</span>
        </h3>
        <p className="brand-p-desc text-black max-sm:text-pretty">
          We are a team of legal, business, and immigration professionals committed to providing accurate, reliable, and efficient solutions for clients in Indonesia. With years of experience, we help
          individuals and companies navigate various regulations and administrative processes safely, clearly, and without hassle.
        </p>
        <div className="flex w-full max-md:justify-end">
          <BrandButton asChild variant="red" className="mt-auto w-fit">
            <Link href="#contact-section">
              Contact Us
              <span>
                <IconArrow className="text-brand-white size-5" />
              </span>
            </Link>
          </BrandButton>
        </div>
      </div>
    </section>
  );
}
