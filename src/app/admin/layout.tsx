import { AdminLayoutProvider } from '@/components/layout-admin/admin-layout-provider';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { MuiProvider } from '@/components/mui-provider';
import { getCurrentAuthorFromTeamMember } from '@/lib/supabase/queries/admin';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DynamicAdminLayout>{children}</DynamicAdminLayout>
    </Suspense>
  );
}

async function DynamicAdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const admin = await requireActiveAdmin();
  const author = await getCurrentAuthorFromTeamMember(admin.userId);
  const authorName = author?.nickname || author?.full_name || 'Admin';
  return (
    <div className="font-raleway flex max-h-svh min-h-svh flex-col">
      <MuiProvider>
        <AdminLayoutProvider username={authorName} role={admin.role}>
          {children}
        </AdminLayoutProvider>
      </MuiProvider>
    </div>
  );
}
