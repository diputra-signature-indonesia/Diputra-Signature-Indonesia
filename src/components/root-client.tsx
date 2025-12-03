'use client';

import { initLenis } from '@/utils/lenis';
import { ReactNode, useEffect } from 'react';

export default function RootClient({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = initLenis();
    return () => lenis.destroy();
  }, []);

  return children;
}
