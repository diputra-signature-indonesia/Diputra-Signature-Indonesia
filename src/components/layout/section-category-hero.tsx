import Image from 'next/image';

export function HeroSection() {
  return (
    <section id="hero-section" className="*:brand-stretch *:font-raleway brand-section-px relative flex pt-32 pb-16 sm:pt-40 lg:pt-52">
      <Image src={'/image/about-hero-section.jpg'} alt="team from Diputra Signature Indonesia" fill priority={true} sizes="100vw" className="-z-10 object-cover brightness-40" />
      <div className="flex max-w-[1440px]">
        <div className="mt-auto flex flex-col gap-0 max-sm:w-full md:w-2xl">
          <h1 className="brand-h1 text-brand-yellow w-full leading-[125%] text-balance max-md:text-center">
            {} <span className="brand-h1-semi text-brand-white font-medium">— Overview</span>
          </h1>
          <p className="brand-p text-brand-white max-md:text-center">
            We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia. With years of experience, we help clients navigate complex regulations
            with confidence and ease.
          </p>
        </div>
      </div>
    </section>
  );
}
