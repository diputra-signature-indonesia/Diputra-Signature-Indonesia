'use client';

import { muiCache } from '@/lib/mui/emotion-cache';
import { CacheProvider } from '@emotion/react';

export function MuiProvider({ children }: { children: React.ReactNode }) {
  return <CacheProvider value={muiCache}>{children}</CacheProvider>;
}
