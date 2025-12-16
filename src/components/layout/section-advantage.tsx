export function AdvantageSection() {
  const advantageContent = [
    {
      title: 'Experienced',
      subTitle: 'Legal Experts',
      description: 'A professional team with extensive experience handling legal, business, and immigration matters across Indonesia.',
      shortDescription: 'Experienced professionals handling legal and immigration matters with confidence.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
    {
      title: 'Personalized',
      subTitle: 'Solutions',
      description: 'Tailored legal solutions designed to meet each client’s specific needs with efficiency and clarity.',
      shortDescription: 'Legal solutions tailored to your individual needs.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'English–Indonesian',
      subTitle: 'Support',
      description: 'Clear and effective communication in both English and Indonesian for local and international clients.',
      shortDescription: 'Clear communication for local and international clients.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'Fast & Transparent',
      subTitle: 'Process',
      description: 'Efficient handling with clear updates at every stage, ensuring full transparency throughout the process.',
      shortDescription: 'Efficient processes with clear and transparent updates.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
    {
      title: 'Complete Legal',
      subTitle: 'Journey Support',
      description: 'Comprehensive assistance at every stage of the legal process, from initial consultation to completion.',
      shortDescription: 'Support from consultation to completion.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
    {
      title: 'Ethical, Honest & ',
      subTitle: 'Professional Guidance',
      description: 'Integrity-driven advice based on facts, law, and our clients’ best interests.',
      shortDescription: 'Advice based on integrity, law, and client interests.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
  ];

  return (
    <section className="brand-section-px brand-stretch font-raleway relative mx-auto my-auto mt-25 flex max-w-[1440px] flex-col justify-center gap-7 xl:max-h-[700px]">
      <div className="mx-auto flex flex-col items-center md:w-3xl lg:w-4xl">
        <div className="flex flex-col items-center gap-5">
          <h2 className="brand-h1 text-brand-maroon">
            Diputra <span className="brand-h1-semi text-black">Advantage</span>
          </h2>
          <p className="brand-p text-brand-black mb-5">Why Choose Us?</p>
        </div>
        <p className="brand-p text-center">
          We are committed to delivering trustworthy legal, visa, and real estate services through experienced professionals, transparent processes, and solutions tailored to each client in Bali,
          Indonesia.
        </p>
      </div>
      <div className="*:text-brand-white grid w-full grid-cols-1 gap-x-5 overflow-hidden max-lg:rounded-2xl max-lg:*:text-black sm:grid-cols-2 md:grid-cols-3 md:gap-y-2.5 lg:grid-cols-2 lg:gap-x-10 xl:grid-cols-3">
        {advantageContent.map((item, idx) => {
          return (
            <div key={idx} className={`flex w-full flex-col gap-2.5 border-b border-gray-300 py-5 text-left lg:flex-col lg:gap-4`}>
              <div className="border-brand-yellow border-l-2 px-5">
                <h3 className="brand-h3 text-brand-burgundy font-semibold">{item.title}</h3>
                <h3 className="brand-h3 text-brand-black font-normal">{item.subTitle}</h3>
              </div>
              <p className={`brand-p text-brand-black px-5`}>
                <span className="hidden md:inline">{item.description}</span>
                <span className="md:hidden">{item.shortDescription}</span>
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
