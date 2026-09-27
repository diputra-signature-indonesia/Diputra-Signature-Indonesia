import { PublicServicesWorkspace } from '@/components/admin-public-services/public-services-workspace';
import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { getPublicServiceManagementData } from '@/lib/supabase/queries/public-service-management';
import { getQuestionAnswerManagementData } from '@/lib/supabase/queries/question-answer-management';

export default async function AdminPublicServicesPage() {
  const context = await requireActiveAdmin();
  const [categories, questionAnswers] = await Promise.all([getPublicServiceManagementData(), getQuestionAnswerManagementData()]);

  return (
    <div className="min-h-full bg-[#F8F9FA] text-[#202938]" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <AdminPageHeader title="Client Services" description="Manage Services, Sub-services, and optional details displayed on the public website." />
      <PublicServicesWorkspace initialCategories={categories} initialQuestionAnswers={questionAnswers.items} canManageServices={context.role === 'admin' || context.role === 'super_admin'} />
    </div>
  );
}
