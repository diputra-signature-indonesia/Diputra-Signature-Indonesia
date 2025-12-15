export function CompanyOverviewSection() {
  return (
    <section id="company-overview" className="brand-section-px brand-section-py brand-stretch mx-auto max-w-[1440px] pt-20">
      <div className="mx-auto max-w-[1000px]">
        <div className="mx-auto flex w-fit flex-col justify-end">
          <h2 className="brand-h1-semi brand-h1-mb text-brand-black w-full text-center text-balance">
            Our <span className="brand-h1 text-brand-burgundy">Approach</span>
          </h2>
        </div>
        <div className="relative">
          <div className="border-brand-yellow absolute -right-4 -bottom-4 size-5 border-r-2 border-b-2 md:border-r-4 md:border-b-4" />
          <div className="border-brand-yellow absolute -top-4 -left-4 size-5 border-t-2 border-l-2 md:border-t-4 md:border-l-4" />
          <p className="brand-p-desc text-brand-black hidden text-center hyphens-auto md:block md:columns-2 md:gap-12 md:text-justify">
            As a trusted partner for individuals and businesses across Indonesia we combine legal, business and immigration expertise to provide solutions that are clear, practical and results-driven
            dedicated to helping clients navigate Indonesia’s regulatory landscape with certainty and ease. Our services cover a complete spectrum of needs from visa and immigration support to
            business setup, licensing, contracts and corporate compliance. Every process is handled with precision, transparency and a commitment to delivering the best possible outcome for our
            clients. Our approach is client-focused and solution-oriented. We customize every solution to align with your goals, communicate clearly and guide you with integrity and professionalism.
          </p>

          <div className="brand-p-desc block text-center md:hidden">
            As a trusted legal, business, and immigration partner, we provide clear and practical solutions to help individuals and businesses navigate Indonesia’s regulatory landscape with
            confidence.
          </div>
          <div className="brand-p-desc block text-center md:hidden">Our approach is client-focused and solution-oriented, delivering every service with precision, transparency, and integrity.</div>
        </div>
      </div>
    </section>
  );
}
