import { AdminPageHeader } from '@/components/layout-admin/admin-page-header';
import { LoaderCircle } from 'lucide-react';

export default function BlogLoading() {
  return <div className="relative min-h-full bg-[#F8F9FA]"><AdminPageHeader title="Blogpost" description="Loading editorial workspace..." /><div className="absolute inset-x-0 top-24 flex justify-center"><LoaderCircle className="size-8 animate-spin text-[#8C1010]" /></div></div>;
}
