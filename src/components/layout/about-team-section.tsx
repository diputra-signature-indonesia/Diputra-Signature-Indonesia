'use client';
import type { PublicTeamMember } from '@/lib/supabase/queries';
import { useState } from 'react';
import { TeamButton } from '../ui/team-button';
import { ViewportReveal } from '../viewport-reveal';

interface Team {
  team: PublicTeamMember[];
}

export function TeamSection({ team }: Team) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="hero-section" className="brand-section-px **:brand-stretch **:font-raleway mx-auto mt-30 flex max-w-[1440px] flex-col pb-20">
      <ViewportReveal as="div" delay={0.2} duration={0.6} y={0} x={-24} className="flex flex-col sm:w-xl lg:w-2xl xl:w-3xl">
        <div className="flex w-fit flex-col items-end gap-2.5">
          <h2 className="brand-h1-semi text-brand-black">
            Our <span className="brand-h1 text-brand-burgundy">Team</span>
          </h2>
          <div className="bg-brand-yellow brand-h1-mb h-0.5 w-20 md:h-1" />
        </div>
        <p className="brand-p-desc text-left text-balance sm:border-l sm:pl-5 lg:pl-10">
          We provide legal, visa, and real estate services tailored for individuals and businesses operating in Bali, Indonesia.{' '}
        </p>
      </ViewportReveal>

      <div className="flex flex-row gap-5 lg:gap-10 xl:gap-25">
        <div className="w-full">
          {team.map((member, i) => (
            <ViewportReveal key={member.id} as="div" delay={0.2} duration={0.6} y={24} x={0} className="">
              <TeamButton
                position={member.job_title ?? ''}
                photoSrc={member.avatar_url ?? ''}
                photoAlt={member.full_name ?? ''}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)} // ⬅ only 1 open
              >
                {member.full_name}
              </TeamButton>
            </ViewportReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
