import { AdminReviewTableClient } from '@/components/ui/AdminReviewTableClient';
import { AdminReviewUrlTableClient } from '@/components/ui/AdminReviewUrlTableClient';
import { BrandButton } from '@/components/ui/button';
import { getAdminClientStories, getAdminGeneratedReview } from '@/lib/supabase/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function AdminReviewPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/admin/login'); // atau '/login'
  }

  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  const role = (profile?.role as 'super_admin' | 'admin' | 'editor' | 'contributor') ?? null;

  const reviewData = await getAdminClientStories();
  const reviewUrlData = await getAdminGeneratedReview();
  return (
    <div className="h-full px-4 py-6">
      <div className="brand-h1-mb flex items-center justify-between">
        <h1 className="brand-h2 font-bold">Review List</h1>
        <BrandButton asChild variant="red" className="w-full justify-center max-sm:px-0 sm:w-fit">
          <Link href="/admin/reviews/create">Generate URL</Link>
        </BrandButton>
      </div>
      <div className="flex flex-col gap-7">
        <AdminReviewUrlTableClient role={role} data={reviewUrlData} />
        <AdminReviewTableClient role={role} data={reviewData} />
      </div>
    </div>
  );
}
