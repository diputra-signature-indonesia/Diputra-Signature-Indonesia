import { AdminLayoutProvider } from '@/components/layout-admin/admin-layout-provider';
import { MuiProvider } from '@/components/mui-provider';
import { getCurrentAuthorFromTeamMember } from '@/lib/supabase/queries/admin';
import type { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const author = await getCurrentAuthorFromTeamMember();
  const authorName = author?.nickname || author?.full_name || 'Admin';
  return (
    <div className="font-raleway flex max-h-svh min-h-svh flex-col">
      <MuiProvider>
        <AdminLayoutProvider username={authorName}>{children}</AdminLayoutProvider>
      </MuiProvider>
    </div>
  );
}
