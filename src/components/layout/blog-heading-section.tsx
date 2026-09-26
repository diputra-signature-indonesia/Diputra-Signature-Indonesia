import Image from 'next/image';

interface BlogHeading {
  title: string;
  excerpt: string;
  image?: string;
  imageAlt?: string;
  category?: string;
  author?: string;
  publishedAt?: string | null;
  readingTimeMinutes?: number | null;
}

export function BlogHeadingSection({ title, excerpt, image, imageAlt, category, author, publishedAt, readingTimeMinutes }: BlogHeading) {
  return (
    <header id="hero-section" className="brand-stretch *:font-raleway brand-section-px mx-auto min-h-svh pb-16 lg:pb-20">
      <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col gap-14 md:gap-10">
        {image ? <div className="relative aspect-16/7 w-full flex-1"><Image src={image} alt={imageAlt || `${title} cover image`} fill priority sizes="(max-width: 768px) 100vw, 896px" className="object-cover" /></div> : null}
        <div className="my-auto flex flex-col max-md:items-center md:flex-1">
          <h1 id="post-title" className="brand-h1 brand-h1-mb text-brand-burgundy w-full text-center leading-[125%] text-balance">
            {title}
          </h1>
          <p className="brand-h3 text-brand-black text-center">{excerpt}</p>
          {category || author || publishedAt ? <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[#6F7782]">{category ? <span className="font-semibold text-[#8C1010]">{category}</span> : null}{category && (author || publishedAt) ? <span aria-hidden="true">·</span> : null}{author ? <span>By {author}</span> : null}{author && publishedAt ? <span aria-hidden="true">·</span> : null}{publishedAt ? <time dateTime={publishedAt}>{new Intl.DateTimeFormat('en', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(publishedAt))}</time> : null}{readingTimeMinutes ? <><span aria-hidden="true">·</span><span>{readingTimeMinutes} min read</span></> : null}</div> : null}
        </div>
      </div>
    </header>
  );
}
