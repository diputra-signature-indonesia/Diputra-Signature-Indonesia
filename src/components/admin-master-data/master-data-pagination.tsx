import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = { page: number; pageCount: number; first: number; last: number; total: number; disabled?: boolean; onChange: (page: number) => void };

export function MasterDataPagination({ page, pageCount, first, last, total, disabled = false, onChange }: Props) {
  const start = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);
  const buttonClass =
    'flex size-8 items-center justify-center rounded-md text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8C1010]/25 disabled:cursor-not-allowed disabled:opacity-35';
  const defaultButtonClass = buttonClass + ' text-[#667181] hover:bg-[#FDEBEB]';
  return (
    <nav aria-label="Internal Services pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#707988]">
      <p aria-live="polite">
        Showing {first}&ndash;{last} of {total} services &middot; 10 per page
      </p>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous page" disabled={disabled || page === 1} onClick={() => onChange(page - 1)} className={defaultButtonClass}>
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-label={'Page ' + number}
            aria-current={number === page ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onChange(number)}
            className={number === page ? buttonClass + ' bg-[#9F1010] text-white hover:bg-[#7E0C0C]' : defaultButtonClass}
          >
            {number}
          </button>
        ))}
        <button type="button" aria-label="Next page" disabled={disabled || page === pageCount} onClick={() => onChange(page + 1)} className={defaultButtonClass}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </nav>
  );
}
