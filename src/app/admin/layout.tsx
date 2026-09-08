import { AdminLayoutProvider } from '@/components/layout-admin/admin-layout-provider';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { MuiProvider } from '@/components/mui-provider';
import { getCurrentAuthorFromTeamMember } from '@/lib/supabase/queries/admin';
import { connection } from 'next/server';
import { IBM_Plex_Sans } from 'next/font/google';
import { Suspense, type ReactNode } from 'react';

const adminSidebarFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-admin-sidebar',
  display: 'swap',
});

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
  const authorName = admin.displayName || author?.nickname || author?.full_name || admin.email?.split('@')[0] || 'Admin';
  return (
    <div className={`${adminSidebarFont.variable} font-raleway flex h-dvh overflow-hidden`}>
      <MuiProvider>
        <AdminLayoutProvider username={authorName} avatarUrl={admin.avatarUrl} role={admin.role}>
          {children}
        </AdminLayoutProvider>
      </MuiProvider>
    </div>
  );
}
