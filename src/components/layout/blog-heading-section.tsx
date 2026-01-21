import Image from 'next/image';

interface BlogHeading {
  title: string;
  excerpt: string;
  image: string;
}

export function BlogHeadingSection({ title, excerpt, image }: BlogHeading) {
  return (
    <header id="hero-section" className="brand-stretch *:font-raleway brand-section-px mx-auto min-h-svh pb-16 lg:pb-20">
      <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col gap-14 md:gap-10">
        <div className="relative aspect-16/7 w-full flex-1">
          <Image src={image} alt={`${title} cover image`} fill priority sizes="(max-width: 768px) 100vw, 896px" className="object-cover" />
        </div>
        <div className="my-auto flex flex-col max-md:items-center md:flex-1">
          <h1 id="post-title" className="brand-h1 brand-h1-mb text-brand-burgundy w-full text-center leading-[125%] text-balance">
            {title}
          </h1>
          <p className="brand-h3 text-brand-black text-center">{excerpt}</p>
        </div>
      </div>
    </header>
  );
}
