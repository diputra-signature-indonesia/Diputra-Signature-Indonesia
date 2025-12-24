import type { ReactNode } from 'react';
import { AdminLayoutProvider } from '@/components/layout-admin/admin-layout-provider';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-h-svh min-h-svh flex-col">
      <AdminLayoutProvider>{children}</AdminLayoutProvider>
    </div>
  );
}
