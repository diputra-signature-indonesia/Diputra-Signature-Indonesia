import { LoaderCircle } from 'lucide-react';

export default function AdminSopLoading() {
  return <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-[#F8F9FA] text-sm font-medium text-[#536075]"><LoaderCircle className="mr-2 size-5 animate-spin text-[#8C1010]" />Loading SOP...</div>;
}
