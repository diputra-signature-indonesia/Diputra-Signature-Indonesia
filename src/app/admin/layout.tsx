import { AdminLayoutProvider } from '@/components/layout-admin/admin-layout-provider';
import { MuiProvider } from '@/components/mui-provider';
import type { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-h-svh min-h-svh flex-col">
      <MuiProvider>
        <AdminLayoutProvider>{children}</AdminLayoutProvider>
      </MuiProvider>
    </div>
  );
}
