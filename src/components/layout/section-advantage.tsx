export function AdvantageSection() {
  const advantageContent = [
    {
      title: 'Experienced',
      subTitle: 'Legal Experts',
      description: 'A professional team with deep experience handling legal, business, and immigration matters in Bali and across Indonesia.',
      styleContent: 'lg:rounded-tr-2xl lg:rounded-bl-2xl',
    },
    {
      title: 'English–Indonesian',
      subTitle: 'Support',
      description: 'Clear communication in both English and Indonesian for local and international clients, ensuring every process runs smoothly.',
      styleContent: 'lg:rounded-tl-2xl lg:rounded-br-2xl',
    },
    {
      title: 'Personalized',
      subTitle: 'Solutions',
      description: 'Services tailored to each client’s needs, providing practical, efficient, and outcome-oriented solutions for life and business in Bali.',
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
    <section className="brand-section-px brand-section-py **:brand-stretch **:font-raleway relative mx-auto flex max-w-[1440px] flex-col">
      <div className="mx-auto flex flex-col items-center sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1 text-brand-maroon">
          Diputra <span className="brand-h1-semi text-black">Advantage</span>
        </h2>
        <p className="brand-p text-brand-black mb-7">Why Choose Us?</p>
        <p className="brand-p-desc text-center text-balance">
          We are committed to delivering trustworthy legal, visa, and real estate services through experienced professionals, transparent processes, and solutions tailored to each client in Bali,
          Indonesia.
        </p>
      </div>
      <div className="lg:*:bg-brand-burgundy *:text-brand-white grid w-full grid-cols-1 overflow-hidden max-lg:rounded-2xl max-lg:*:text-black lg:grid-cols-2 lg:gap-5">
        {advantageContent.map((item, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === advantageContent.length - 1;
          return (
            <div
              key={idx}
              className={`flex w-full flex-col gap-2.5 px-5 pt-5 text-left lg:flex-col lg:gap-5 lg:px-10 lg:*:text-center ${item.styleContent} ${isFirst ? 'max-lg:pt-10' : ''} ${isLast ? 'max-lg:pb-5' : ''}`}
            >
              <h3 className="brand-h3 max-lg:text-brand-burgundy font-semibold text-balance">
                {item.title} <span className="max-lg:text-brand-black font-light">{item.subTitle}</span>
              </h3>
              <p className={`brand-p ${isLast ? 'border-none' : 'border-brand-gray border-b lg:border-none'} pb-5`}>{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
