import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { LoaderCircle } from 'lucide-react';

export default function MyTasksLoading() {
  return <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
    <AdminPageHeader title="My Task" description="Manage your assigned jobs and monitor every task that needs attention." />
    <div className="flex min-h-[calc(100vh-180px)] items-center justify-center bg-[#F8F9FA]/75" role="status" aria-label="Loading My Tasks">
      <LoaderCircle className="size-7 animate-spin text-[#8C1010]" />
    </div>
  </div>;
}
