import { LoaderCircle } from 'lucide-react';

type AdminRouteLoadingProps = {
  label?: string;
  fullScreen?: boolean;
};

export function AdminRouteLoading({ label = 'Loading workspace...', fullScreen = false }: AdminRouteLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`relative flex items-center justify-center overflow-hidden bg-[#F1F3F5] ${fullScreen ? 'min-h-dvh w-full' : 'min-h-[calc(100dvh-72px)] w-full'}`}
      style={{ fontFamily: 'var(--font-admin-sidebar), sans-serif' }}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[#E7E9ED]/35 backdrop-grayscale-[35%]" />
      <div className="relative flex items-center gap-3 rounded-xl border border-[#DDE1E6] bg-white/95 px-5 py-4 text-xs font-semibold text-[#536075] shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#9F1010]" />
        {label}
      </div>
    </div>
  );
}

export function AdminPendingOverlay({ label = 'Saving changes...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#E7E9ED]/55 backdrop-grayscale-[35%]" role="status" aria-live="polite" aria-busy="true">
      <div className="flex items-center gap-3 rounded-xl border border-[#DDE1E6] bg-white px-5 py-4 text-xs font-semibold text-[#536075] shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-[#9F1010]" />
        {label}
      </div>
    </div>
  );
}
