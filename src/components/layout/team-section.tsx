'use client';
import { useState } from 'react';
import { TeamButton } from '../ui/team-button';
export function TeamSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const teamList = [
    { position: 'Founder/COO', name: 'Anak Agung Ngurah Gede Dhananjaya', img: '/image/developer-face.png' },
    { position: 'Founder/COO', name: 'Anak Agung Ngurah Gede Dhananjaya', img: '/image/developer-face.png' },
    { position: 'Senior Consultant', name: 'Anak Agung Ngurah Gede Dhananjaya', img: '/image/developer-face.png' },
    { position: 'Associate', name: 'Anak Agung Ngurah Gede Dhananjaya', img: '/image/developer-face.png' },
  ];
  return (
    <section id="hero-section" className="brand-section-px brand-section-py **:brand-stretch **:font-raleway mx-auto mb-20 flex max-w-[1440px] flex-col">
      <div className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <h2 className="brand-h1-semi text-brand-black">
          Our <span className="brand-h1 text-brand-burgundy">Team</span>
        </h2>
        <p className="brand-p-desc text-left text-balance sm:border-l sm:pl-5 lg:pl-10">
          We provide legal, visa, and real estate services tailored for individuals and businesses operating in Bali, Indonesia.{' '}
        </p>
      </div>

      <div className="flex flex-row gap-5 lg:gap-10 xl:gap-25">
        <div className="w-full">
          {teamList.map((member, i) => (
            <TeamButton
              key={i}
              position={member.position}
              photoSrc={member.img}
              photoAlt={member.name}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)} // ⬅ only 1 open
            >
              {member.name}
            </TeamButton>
          ))}
        </div>
      </div>
    </section>
  );
}
