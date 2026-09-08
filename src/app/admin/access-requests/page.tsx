import { AdminAccessRequestsClient } from '@/components/layout-admin/admin-access-requests-client';
import { requireActiveSuperAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminAccessRequestsPage() {
  await requireActiveSuperAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('admin_access_requests')
    .select('user_id, email, full_name, avatar_url, requested_at')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) {
    throw new Error(`Unable to load access requests: ${error.message}`);
  }

  return (
    <div className="h-full px-4 py-6">
      <div className="brand-h1-mb rounded-2xl border border-gray-200 px-5 py-4 shadow-sm">
        <h1 className="brand-h2 font-bold">Admin Access Requests</h1>
        <p className="mt-1 text-sm text-gray-500">Pilih role lalu setujui atau tolak permintaan akses dashboard.</p>
      </div>
      <AdminAccessRequestsClient requests={data ?? []} />
    </div>
  );
}
