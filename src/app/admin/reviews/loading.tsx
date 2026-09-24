import { LoaderCircle } from 'lucide-react';

export default function ReviewLoading() {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#F3F4F6]/80" style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}>
      <div className="flex items-center gap-2 rounded-xl border border-[#E0E3E7] bg-white px-4 py-3 text-xs font-semibold text-[#586273] shadow-lg">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#9F1010]" />
        Loading Client Reviews...
      </div>
    </div>
  );
}
