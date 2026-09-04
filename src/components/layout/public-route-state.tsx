import { BrandButton } from '@/components/ui/button';
import Link from 'next/link';
import type { ReactNode } from 'react';

type PublicRouteStateProps = {
  code: '404' | '500';
  title: string;
  description: string;
  actions: ReactNode;
  alert?: boolean;
};

export function PublicRouteState({ code, title, description, actions, alert = false }: PublicRouteStateProps) {
  return (
    <section
      role={alert ? 'alert' : undefined}
      aria-labelledby="public-route-state-title"
      className="brand-section-px bg-brand-white flex min-h-[calc(100svh-5rem)] w-full items-center justify-center py-20"
    >
      <div className="font-raleway mx-auto w-full max-w-2xl text-center">
        <p className="text-brand-burgundy mb-4 text-sm font-semibold tracking-[0.3em]">{code}</p>
        <h1 id="public-route-state-title" className="brand-h1 brand-h1-mb text-brand-black">
          {title}
        </h1>
        <p className="brand-p text-brand-black-semi mx-auto max-w-xl leading-relaxed">{description}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">{actions}</div>
      </div>
    </section>
  );
}

export function PublicNotFoundState() {
  return (
    <PublicRouteState
      code="404"
      title="Page not found"
      description="The page you are looking for may have moved, no longer be available, or the address may be incorrect."
      actions={
        <>
          <BrandButton asChild variant="red">
            <Link href="/">Back to home</Link>
          </BrandButton>
          <BrandButton asChild variant="white">
            <Link href="/services">View services</Link>
          </BrandButton>
        </>
      }
    />
  );
}
