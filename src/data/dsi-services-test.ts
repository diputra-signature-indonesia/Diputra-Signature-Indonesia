export const SERVICES_LIST = [
  {
    id: 0,
    slug: 'legal-and-corporate',
    type: 'primary',
    title: 'Legal & Corporate',
    description: 'Legal consulting for businesses and individuals in Bali, including contract and agreement drafting, document review, and ongoing compliance with Indonesian regulations.',
    image: '/image/services-legal-image.png',
    iconKey: 'law',
  },
  {
    id: 1,
    slug: 'visa',
    type: 'primary',
    title: 'Visa',
    description: 'End-to-end support for visas, stay permits (KITAS/KITAP), work permits, and other immigration matters for expatriates living, working, or investing in Bali.',
    image: '/image/services-visa-image.png',
    iconKey: 'visa',
  },
  {
    id: 2,
    slug: 'real-estate',
    type: 'primary',
    title: 'Real Estate',
    description: 'Legal assistance for property transactions in Bali—from land and building due diligence and document verification to guiding you through purchase or lease agreements.',
    image: '/image/services-realestate-image.jpg',
    iconKey: 'realestate',
  },
  {
    id: 3,
    slug: 'insurance',
    type: 'secondary',
    title: 'Insurance (ALLIANZ)	',
    description: 'Insurance solutions for property, assets, and health protection tailored for companies, PT PMA, and individuals in Indonesia.',
    image: '/image/services-realestate-image.jpg',
    iconKey: 'realestate',
  },
  {
    id: 4,
    slug: 'intellectual-property-and-trademark-registration-services',
    type: 'secondary',
    title: 'IP & Trademark Registration Services',
    description: 'Protect your brand and creative assets through professional IP and trademark registration services in Indonesia.',
    image: '/image/services-realestate-image.jpg',
    iconKey: 'realestate',
  },
] as const;

export const SERVICES_CATEGORY = {
  'legal-and-corporate': {
    hero: {
      heading: 'Legal & Corporate',
      type: 'primary',
      short_description: 'Legal consulting for businesses and individuals in Bali, including contract and agreement drafting, document review, and ongoing compliance with Indonesian regulations.',
      description:
        'We are a team of legal professionals dedicated to providing reliable business and immigration solutions in Indonesia. With years of experience, we help clients navigate complex regulations with confidence and ease.',
      image: '/image/legal.webp',
    },
    services: [
      {
        title: 'Corporate & Business',
        slug: 'corporate-business',
        icon: 'IconCorporateBusiness',
        description: 'Company establishment, revisions, licensing, and compliance reporting for businesses operating in Indonesia.',
        cta: '/services/legal/corporate-business',
        cta_description: 'Read Detail',
        services_detail: [
          {
            detail_title: 'Company Setup',
            detail_description:
              'Establishing a company in Indonesia involves different requirements based on structure and business model. Our team provides tailored guidance to ensure your business complies with local regulations.',
            detail_cta_description: 'Contact our team for personalized assistance.',
          },
          {
            detail_title: 'Company Revision',
            detail_description:
              'Changes in ownership, capital, or business activities usually require updates to your company documents and licenses. We guide you through the revision process so your structure stays compliant with Indonesian regulations.',
            detail_cta_description: 'Contact our team to review your planned company changes.',
          },
          {
            //New
            detail_title: 'Company Dissolution',
            detail_description:
              'Investment activity reporting in Indonesia is mandatory and may vary depending on your business sector and structure. Our team assists you in preparing and submitting LKPM reports in line with the latest regulations.',
            detail_cta_description: 'Contact our team for tailored LKPM support.',
          },
          {
            detail_title: 'LKPM',
            detail_description:
              'Investment activity reporting in Indonesia is mandatory and may vary depending on your business sector and structure. Our team assists you in preparing and submitting LKPM reports in line with the latest regulations.',
            detail_cta_description: 'Contact our team for tailored LKPM support.',
          },
          {
            detail_title: 'Virtual Office',
            detail_description:
              'A compliant business address is often required for licensing and day-to-day operations. We help you arrange virtual office solutions that match your business model and regulatory needs.',
            detail_cta_description: 'Contact our team for personalized assistance.',
          },
          // {
          //   detail_title: 'Yearly Tax Report',
          //   detail_description:
          //     'Annual tax reporting obligations differ based on your company type, size, and activities. We coordinate with trusted tax professionals to help ensure your yearly reports meet regulatory expectations.',
          //   detail_cta_description: 'Contact our team for coordinated yearly tax assistance.',
          // },
          {
            detail_title: 'Share Sale & Purchase',
            detail_description:
              'Annual tax reporting obligations differ based on your company type, size, and activities. We coordinate with trusted tax professionals to help ensure your yearly reports meet regulatory expectations.',
            detail_cta_description: 'Contact our team for coordinated yearly tax assistance.',
          },
        ],
      },
      {
        title: 'Contract Advisory',
        slug: 'contract-advisory',
        icon: 'IconContractAdvisory',
        description: 'Drafting, reviewing, and negotiating contracts with legally sound guidance to protect your business interests.',
        cta: '/services/legal/contract-advisory',
        cta_description: 'Read Detail',
        services_detail: [
          {
            detail_title: 'Contract Drafting',
            detail_description:
              'We assist in drafting clear, structured, and legally sound contracts tailored to your business needs. Our team ensures every clause is aligned with regulatory requirements and protects your interests.',
            detail_cta_description: 'Discuss drafting needs',
          },
          {
            detail_title: 'Contract Review',
            detail_description:
              'We review existing agreements to identify risks, clarify obligations, and ensure compliance with Indonesian regulations. Our team provides recommendations to help strengthen and safeguard your contracts.',
            detail_cta_description: 'Request contract review',
          },
          {
            detail_title: 'Contract Negotiation',
            detail_description:
              'We support businesses during contract negotiations by clarifying terms, minimizing risks, and helping achieve mutually beneficial outcomes. Our guidance ensures your agreements remain fair and enforceable.',
            detail_cta_description: 'Request contract review',
          },
          {
            detail_title: 'Contract Support',
            detail_description:
              'We provide ongoing legal support throughout the contract lifecycle, including clarification, amendment assistance, and handling unforeseen issues. Our team ensures your agreements remain valid and up-to-date.',
            detail_cta_description: 'Ongoing contract support',
          },
        ],
      },
      {
        title: 'Legal Due Diligence',
        slug: 'building-permit',
        icon: 'IconBuildingPermit',
        description: 'PKKPR, UKL-UPL, PBG, and SLF permitting to ensure full regulatory compliance.',
        cta: '/services/legal/building-permit',
        cta_description: 'Read Detail',
        services_detail: [
          {
            detail_title: 'PKKPR',
            detail_description:
              'We assist in obtaining PKKPR, ensuring your land-use plan aligns with spatial regulations. Our guidance helps you meet zoning requirements before proceeding with development or licensing.',
            detail_cta_description: 'Check PKKPR requirements',
          },
          {
            detail_title: 'UKL-UPL',
            detail_description:
              'We help prepare and submit UKL-UPL documents to ensure your business activities comply with environmental standards. Our team coordinates requirements so your operations remain legally compliant.',
            detail_cta_description: 'Prepare UKL-UPL documents',
          },
          {
            detail_title: 'PBG',
            detail_description:
              'We support the application process for PBG by ensuring your building design and documentation meet technical, architectural, and safety regulations. This approval is required before construction can begin.',
            detail_cta_description: 'Review PBG requirements',
          },
          {
            detail_title: 'SLF',
            detail_description:
              'We guide you through obtaining the SLF, confirming that your completed building meets all functional, safety, and regulatory standards. This certificate is necessary before the property can be used or operated.',
            detail_cta_description: 'Process SLF approval',
          },
        ],
      },
      // {
      //   title: 'Building Permit',
      //   slug: 'building-permit',
      //   icon: 'IconBuildingPermit',
      //   description: 'PKKPR, UKL-UPL, PBG, and SLF permitting to ensure full regulatory compliance.',
      //   cta: '/services/legal/building-permit',
      //   cta_description: 'Read Detail',
      //   services_detail: [
      //     {
      //       detail_title: 'PKKPR',
      //       detail_description:
      //         'We assist in obtaining PKKPR, ensuring your land-use plan aligns with spatial regulations. Our guidance helps you meet zoning requirements before proceeding with development or licensing.',
      //       detail_cta_description: 'Check PKKPR requirements',
      //     },
      //     {
      //       detail_title: 'UKL-UPL',
      //       detail_description:
      //         'We help prepare and submit UKL-UPL documents to ensure your business activities comply with environmental standards. Our team coordinates requirements so your operations remain legally compliant.',
      //       detail_cta_description: 'Prepare UKL-UPL documents',
      //     },
      //     {
      //       detail_title: 'PBG',
      //       detail_description:
      //         'We support the application process for PBG by ensuring your building design and documentation meet technical, architectural, and safety regulations. This approval is required before construction can begin.',
      //       detail_cta_description: 'Review PBG requirements',
      //     },
      //     {
      //       detail_title: 'SLF',
      //       detail_description:
      //         'We guide you through obtaining the SLF, confirming that your completed building meets all functional, safety, and regulatory standards. This certificate is necessary before the property can be used or operated.',
      //       detail_cta_description: 'Process SLF approval',
      //     },
      //   ],
      // },
    ],
  },
  visa: {
    hero: {
      heading: 'VISA',
      type: 'primary',
      short_description: 'End-to-end support for visas, stay permits (KITAS/KITAP), work permits, and other immigration matters for expatriates living, working, or investing in Bali.',
      description:
        'Our immigration specialists provide clear guidance and hands-on assistance throughout every stage of the visa and stay permit process. We help individuals, professionals, and investors navigate Indonesian immigration regulations with confidence and compliance.',
      image: '/image/visa.webp',
    },
    services: [
      {
        title: 'VISA',
        slug: 'VISA',
        icon: 'IconBuildingPermit',
        description: 'Visa application assistance for tourism, business, investment, social visits, and remote work purposes in Indonesia.',
        cta: '/services/visa/visa',
        cta_description: 'Read Detail',
        services_detail: [
          {
            detail_title: 'Visa On Arrival (VOA)',
            detail_description:
              'A convenient visa option for eligible nationalities entering Indonesia for short stays. We assist in confirming requirements and ensuring your arrival process runs smoothly.',
            detail_cta_description: 'Confirm VOA eligibility',
          },
          {
            detail_title: 'Visa Pre Investment (D12)',
            detail_description: 'Designed for foreign investors exploring business opportunities in Indonesia. We guide you through the application to support your investment planning activities.',
            detail_cta_description: 'Check D12 eligibility',
          },
          {
            detail_title: 'Visa Tourist (C1)',
            detail_description: 'Suitable for short visits related to tourism and leisure. Our team ensures you meet the necessary requirements for a smooth entry into Indonesia.',
            detail_cta_description: 'Apply tourist visa',
          },
          {
            detail_title: 'Visa Social/Business (C2)',
            detail_description:
              'Intended for non-work visits such as meetings, social activities, and non-commercial business purposes. We help prepare your application to align with current regulations.',
            detail_cta_description: 'Determine visa purpose',
          },
          {
            detail_title: 'Remote Worker Visa (E33G)',
            detail_description:
              'Allows foreign professionals to work remotely from Indonesia for an overseas employer. We assist in meeting eligibility criteria and navigating the application process.',
            detail_cta_description: 'Assess remote visa',
          },
        ],
      },
      {
        title: 'KITAS',
        slug: 'kitas',
        icon: 'IconBuildingPermit',
        description: 'Residence permit services for investors, workers, families, retirees, and foreign spouses living in Indonesia.',
        cta: '/services/visa/kitas',
        cta_description: 'Read Detail',
        services_detail: [
          {
            detail_title: 'KITAS Investor (E28A)',
            detail_description:
              'Issued to foreign investors managing or participating in business activities in Indonesia. We help ensure your company documents and requirements meet current regulatory standards.',
            detail_cta_description: 'Investor KITAS guidance',
          },
          {
            detail_title: 'KITAS Family (E31E)',
            detail_description: 'A residence permit for spouses or dependents of KITAS/KITAP holders. We assist in preparing supporting documents and managing the application process smoothly.',
            detail_cta_description: 'Family sponsorship help',
          },
          {
            detail_title: 'Working KITAS',
            detail_description:
              'Required for foreigners employed by companies in Indonesia. Our team coordinates the licensing and documentation needed to ensure full compliance with manpower and immigration regulations.',
            detail_cta_description: 'Work permit support',
          },
          {
            detail_title: 'Mutation Passport and Address KITAS',
            detail_description: 'For KITAS holders who need to update their passport information or residential address. We help process these changes to keep your permit valid and compliant.',
            detail_cta_description: 'Update KITAS details',
          },
          {
            detail_title: 'KITAS Spouse (E31A & E31B)',
            detail_description: 'Intended for foreign spouses of Indonesian citizens. We guide you through the application steps to ensure your residence status remains secure and compliant.',
            detail_cta_description: 'Spouse KITAS assistance',
          },
          {
            detail_title: 'KITAS Retirement (E33F)',
            detail_description: 'Designed for retirees who wish to live in Indonesia. We assist in meeting eligibility requirements and preparing documents for a smooth application process.',
            detail_cta_description: 'Retirement KITAS support',
          },
        ],
      },
      {
        title: 'KITAP',
        slug: 'kitap',
        icon: 'IconBuildingPermit',
        description: 'Long-term residency permission for eligible foreign nationals wishing to stay in Indonesia. Contact our team for tailored assistance.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Exit Permit Only (EPO)',
        slug: 'exit-permit-only',
        icon: 'IconBuildingPermit',
        description: 'Required for foreign residents leaving Indonesia permanently or changing sponsorship. We assist to ensure a smooth and compliant exit process.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Termination Stay Permit (TSP)',
        slug: 'termination-stay-permit',
        icon: 'IconBuildingPermit',
        description: 'Issued when ending a stay permit or employment in Indonesia. Our team helps manage the process to keep your immigration status compliant.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
    ],
  },
  'real-estate': {
    hero: {
      heading: 'Real Estate',
      type: 'primary',
      short_description: 'Legal assistance for property transactions in Bali—from land and building due diligence and document verification to guiding you through purchase or lease agreements.',
      description:
        'We provide legal support for property transactions to help clients minimize risks and ensure regulatory compliance. Our team assists with document verification, transaction procedures, and coordination with relevant authorities to support secure and transparent property dealings.',
      image: '/image/realestate.webp',
    },
    services: [
      {
        title: 'Property Due Diligence',
        slug: 'property-due-diligence',
        icon: 'IconBuildingPermit',
        description: 'Comprehensive verification of property documents, ownership status, and regulatory compliance before purchase or lease.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Transaction & Agreement Assistance',
        slug: 'sale-and-purchase-assistance',
        icon: 'IconBuildingPermit',
        description: 'Legal guidance throughout property sale or purchase transactions to ensure clarity, safety, and proper documentation.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      // {
      //   title: 'Lease Agreement Preparation',
      //   slug: 'lease-agreement-preparation',
      //   icon: 'IconBuildingPermit',
      //   description: 'Drafting and reviewing lease agreements to protect your rights and ensure compliance with local regulations.',
      //   cta: '/contact',
      //   cta_description: 'Contact Us',
      //   services_detail: [],
      // },
      {
        title: 'Building Permit',
        slug: 'land-title-verification',
        icon: 'IconBuildingPermit',
        description: 'Verification of land certificates and ownership records to ensure the property is legally valid and dispute-free.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      // {
      //   title: 'Notary and Land Office Coordination',
      //   slug: 'notary-and-land-office-coordination',
      //   icon: 'IconBuildingPermit',
      //   description: 'Assistance with notarial processes and land office submissions to ensure smooth documentation and legal compliance.',
      //   cta: '/contact',
      //   cta_description: 'Contact Us',
      //   services_detail: [],
      // },
      // {
      //   title: 'Property Transaction Advisory',
      //   slug: 'property-transaction-advisory',
      //   icon: 'IconBuildingPermit',
      //   description: 'Professional advice on property transactions, risks, and legal obligations for secure and informed decision-making.',
      //   cta: '/contact',
      //   cta_description: 'Contact Us',
      //   services_detail: [],
      // },
      // {
      //   title: 'Power of Attorney Handling',
      //   slug: 'power-of-attorney-handling',
      //   icon: 'IconBuildingPermit',
      //   description: 'Preparation and management of Power of Attorney documents for property-related matters, ensuring accuracy and legal validity.',
      //   cta: '/contact',
      //   cta_description: 'Contact Us',
      //   services_detail: [],
      // },
    ],
  },
  insurance: {
    hero: {
      heading: 'Insurance (ALLIANZ)	',
      type: 'secondary',
      short_description: 'Insurance solutions for property, assets, and health protection tailored for companies, PT PMA, and individuals in Indonesia.',
      description:
        'We provide insurance solutions in partnership with ALLIANZ to help individuals and companies protect their assets, health, and business continuity. Our team assists clients in selecting suitable coverage for property, health, and operational risks with clear guidance and professional support.',
      image: '/image/realestate.webp',
    },
    services: [
      {
        title: 'Property Insurance (PT PMA)',
        slug: 'property-insurance',
        icon: 'IconBuildingPermit',
        description: 'Comprehensive insurance protection for company-owned buildings against major physical risks to support asset security and business continuity.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Contents Insurance (PT PMA)',
        slug: 'content-insurance',
        icon: 'IconBuildingPermit',
        description: 'Insurance coverage for movable business assets such as equipment, machinery, and interior items to reduce financial loss from damage or loss.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'All Risks Property Insurance (PT PMA)',
        slug: 'all-risks-property-insurance',
        icon: 'IconBuildingPermit',
        description: 'Extended property insurance coverage protecting high-value assets against a wide range of physical loss or damage.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Health Insurance',
        slug: 'health-insurance',
        icon: 'IconBuildingPermit',
        description: 'Health insurance coverage to support medical expenses, including hospitalization and treatment, for individuals and employees.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'International Health Insurance Coverage',
        slug: 'international-health-insurance-coverage',
        icon: 'IconBuildingPermit',
        description: 'Worldwide health insurance coverage designed for expatriates and international employees requiring cross-border medical protection.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Health Risk Assessment & Consultation',
        slug: 'health-risk-assessment-and-consultation',
        icon: 'IconBuildingPermit',
        description: 'Professional consultation to assess healthcare risks and recommend suitable health insurance solutions for corporate needs.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
    ],
  },
  'intellectual-property-and-trademark-registration-services': {
    hero: {
      heading: 'Intellectual Property & Trademark Registration ',
      type: 'secondary',
      short_description: 'Protect your brand and creative assets through professional IP and trademark registration services in Indonesia.',
      description:
        'We assist individuals and businesses in protecting their brands and creative assets through intellectual property and trademark registration services in Indonesia. Our team provides guidance on registration, protection strategies, and administrative processes to help minimize legal risks and safeguard long-term business value.',
      image: '/image/realestate.webp',
    },
    services: [
      {
        title: 'Copyright Registration',
        slug: 'copyrights-registration',
        icon: 'IconBuildingPermit',
        description: 'Legal registration to protect copyrights for creative and intellectual works as officially recognized proof of ownership.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Trademark Registration',
        slug: 'trademark-registration',
        icon: 'IconBuildingPermit',
        description: 'Trademark registration services to secure exclusive commercial rights for brand names, logos, and slogans.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Trademark Search & Analysis',
        slug: 'trademark-search-and-analysis',
        icon: 'IconBuildingPermit',
        description: 'Trademark search and analysis to ensure availability and reduce the risk of conflicts or application rejection.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Intellectual Property (IP) Consultation',
        slug: 'intellectual-property-consultation',
        icon: 'IconBuildingPermit',
        description: 'Professional consultation to determine suitable intellectual property protection and registration strategies.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'Administrative & Legal Assistance',
        slug: 'administrative-and-legal-assistance',
        icon: 'IconBuildingPermit',
        description: 'Administrative and legal support for document preparation, application submission, and certification processes.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
      {
        title: 'IP Protection for Foreign Investment Companies (PT PMA)',
        slug: 'ip-protection-for-foreign-investment-companies',
        icon: 'IconBuildingPermit',
        description: 'Intellectual property protection services tailored for PT PMA to support business legality and investor confidence.',
        cta: '/contact',
        cta_description: 'Contact Us',
        services_detail: [],
      },
    ],
  },
  // '': {
  //   hero: {
  //     heading: 'Intellectual Property & Trademark Registration ',
  //     short_description: 'Protect your brand and creative assets through professional IP and trademark registration services in Indonesia.',
  //     description:
  //       'We assist individuals and businesses in protecting their brands and creative assets through intellectual property and trademark registration services in Indonesia. Our team provides guidance on registration, protection strategies, and administrative processes to help minimize legal risks and safeguard long-term business value.',
  //     image: '/image/realestate.webp',
  //   },
  //   services: [],
  // },
};
