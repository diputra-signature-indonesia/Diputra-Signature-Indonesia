import { ChevronLeft, ChevronRight } from 'lucide-react';

type AllJobsPaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function AllJobsPagination({ currentPage, pageSize, totalItems, onPageChange }: AllJobsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-4 border-t border-[#DEE2E7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#68717E]">Showing {firstItem}&ndash;{lastItem} of {totalItems} jobs</p>

      <nav aria-label="Jobs pagination" className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex size-8 items-center justify-center rounded text-[#8A94A3] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
          <button
            key={page}
            type="button"
            aria-label={`Page ${page}`}
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
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex size-8 items-center justify-center rounded text-[#68717E] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </nav>
    </div>
  );
}
