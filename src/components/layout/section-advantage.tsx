export function AdvantageSection() {
  const advantageContent = [
    {
      title: 'Experienced',
      subTitle: 'Legal Experts',
      description: 'A professional team with deep experience handling legal, business, and immigration matters in Bali and across Indonesia.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
    {
      title: 'Personalized',
      subTitle: 'Solutions',
      description: 'Services tailored to each client’s needs, providing practical, efficient, and outcome-oriented solutions for life and business in Bali.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'English–Indonesian',
      subTitle: 'Support',
      description: 'Clear communication in both English and Indonesian for local and international clients, ensuring every process runs smoothly.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'Fast & Transparent',
      subTitle: 'Process',
      description: 'Efficient processing with clear updates at every stage, so you always know the status of your legal, visa, or property matters in Bali.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
  ];

  return (
    <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway bg-brand-white relative mx-auto flex max-w-[1440px] flex-col">
      <div className="mx-auto flex flex-col items-center sm:w-xl lg:w-2xl xl:w-3xl">
        <div className="flex flex-col items-center gap-3">
          <h2 className="brand-h1 text-brand-maroon">
            Diputra <span className="brand-h1-semi text-black">Advantage</span>
          </h2>
          <p className="brand-p text-brand-black mb-7">Why Choose Us?</p>
        </div>
        <p className="brand-p-desc text-center text-balance">
          We are committed to delivering trustworthy legal, visa, and real estate services through experienced professionals, transparent processes, and solutions tailored to each client in Bali,
          Indonesia.
        </p>
      </div>
      <div className="*:text-brand-white flex w-full flex-row overflow-hidden max-lg:rounded-2xl max-lg:*:text-black lg:gap-5">
        {advantageContent.map((item, idx) => {
          return (
            <div key={idx} className={`flex w-full flex-col gap-2.5 py-5 text-left lg:flex-col lg:gap-7`}>
              <div className="border-brand-yellow border-l-2 px-5">
                <h3 className="brand-h3 text-brand-burgundy font-semibold">{item.title}</h3>
                <h3 className="brand-h3 text-brand-black font-light">{item.subTitle}</h3>
              </div>
              <p className={`brand-p text-brand-black px-5`}>{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
