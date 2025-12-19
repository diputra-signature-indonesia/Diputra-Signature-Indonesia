import Image from 'next/image';
import { BrandButton } from '../ui/button';
import IconArrow from '@/icons/BrandIconArrow';

interface BlogHeading {
  title: string;
  excerpt: string;
  image: string;
}

export function BlogHeadingSection({ title, excerpt, image }: BlogHeading) {
  return (
    <section id="hero-section" className="brand-stretch *:font-raleway brand-section-px mx-auto h-svh pb-16 lg:pb-20">
      <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col gap-14 md:gap-10">
        <div className="relative aspect-16/7 w-full flex-1">
          <Image
            src={image}
            alt="Diputra Signature Indonesia team which handles legal, business and immigration consulting services"
            fill
            priority
            sizes="(max-width: 768px) 100vw"
            className="object-cover"
          />
        </div>
        <div className="my-auto flex flex-col max-md:items-center md:flex-1">
          <h1 className="brand-h1 brand-h1-mb text-brand-burgundy w-full text-center leading-[125%] text-balance">{title}</h1>
          <h2 className="brand-h3 text-brand-black text-center">{excerpt}</h2>
        </div>
      </div>
    </section>
  );
}
