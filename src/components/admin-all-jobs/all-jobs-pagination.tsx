import { ChevronLeft, ChevronRight } from 'lucide-react';

type AllJobsPaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  noun?: string;
  disabled?: boolean;
};

export function AllJobsPagination({ currentPage, pageSize, totalItems, onPageChange, noun = 'jobs', disabled = false }: AllJobsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => startPage + index);
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-4 border-t border-[#DEE2E7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#68717E]">
        Showing {firstItem}&ndash;{lastItem} of {totalItems} {noun}
      </p>

      <nav aria-label={`${noun} pagination`} className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={disabled || currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex size-8 items-center justify-center rounded text-[#8A94A3] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            aria-label={`Page ${page}`}
            disabled={disabled}
            aria-current={currentPage === page ? 'page' : undefined}
            onClick={() => onPageChange(page)}
            className={`size-8 rounded text-xs font-medium transition ${currentPage === page ? 'bg-[#B44343] text-white' : 'text-[#68717E] hover:bg-gray-100'}`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          aria-label="Next page"
          disabled={disabled || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex size-8 items-center justify-center rounded text-[#68717E] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </nav>
    </div>
  );
}
