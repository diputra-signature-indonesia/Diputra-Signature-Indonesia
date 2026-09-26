'use client';

import { PublicRouteState } from '@/components/layout/public-route-state';
import { BrandButton } from '@/components/ui/button';
import Link from 'next/link';

type PublicErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicError({ reset }: PublicErrorProps) {
  return (
    <PublicRouteState
      code="500"
      title="Something went wrong"
      description="We could not load this page right now. Please try again, or return to the homepage."
      alert
      actions={
        <>
          <BrandButton variant="red" onClick={reset}>
            Try again
          </BrandButton>
          <BrandButton asChild variant="white">
            <Link href="/">Back to home</Link>
          </BrandButton>
        </>
      }
    />
  );
}
