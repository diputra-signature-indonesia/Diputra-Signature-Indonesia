'use client';
import type { TeamMember } from '@/lib/supabase/queries';
import { useState } from 'react';
import { Motion } from '../motion';
import { TeamButton } from '../ui/team-button';

interface Team {
  team: TeamMember[];
}

export function TeamSection({ team }: Team) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const teamList = [
    { position: 'Managing Partner', name: 'Anak Agung Gede Bagus Rahardiputra, S.H., M.Kn.', img: '/image/developer-face.png' },
    { position: 'IT Partner', name: 'Anak Agung Ngurah Gede Dhananjaya, S.Kom.', img: '/image/developer-face.png' },
    { position: 'Senior Associate', name: 'I Putu Gede Dalem, S.H.', img: '/image/developer-face.png' },
    { position: 'Junior Associate', name: 'Anak Agung Ayu Agung Devi Anjani Jelantik, S.H.', img: '/image/developer-face.png' },
    { position: 'Associate', name: 'I Made Mahendraputra Utama, S.H.', img: '/image/developer-face.png' },
    { position: 'Associate', name: 'Loedwig Guntur Naftali Sojuaon Hasugian, S.H.', img: '/image/developer-face.png' },
  ];
  return (
    <section id="hero-section" className="brand-section-px **:brand-stretch **:font-raleway mx-auto mt-30 flex max-w-[1440px] flex-col pb-20">
      <Motion as="div" delay={0.2} duration={0.6} y={0} x={-24} once={true} className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <div className="flex w-fit flex-col items-end gap-2.5">
          <h2 className="brand-h1-semi text-brand-black">
            Our <span className="brand-h1 text-brand-burgundy">Team</span>
          </h2>
          <div className="bg-brand-yellow brand-h1-mb h-0.5 w-20 md:h-1" />
        </div>
        <p className="brand-p-desc text-left text-balance sm:border-l sm:pl-5 lg:pl-10">
          We provide legal, visa, and real estate services tailored for individuals and businesses operating in Bali, Indonesia.{' '}
        </p>
      </Motion>

      <div className="flex flex-row gap-5 lg:gap-10 xl:gap-25">
        <div className="w-full">
          {team.map((member, i) => (
            <Motion key={i} as="div" delay={0.2} duration={0.6} y={24} x={0} once={true} className="">
              <TeamButton
                position={member.job_title ?? ''}
                photoSrc={member.avatar_url ?? ''}
                photoAlt={member.full_name ?? ''}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)} // ⬅ only 1 open
              >
                {member.full_name}
              </TeamButton>
            </Motion>
          ))}
        </div>
      </div>
    </section>
  );
}
