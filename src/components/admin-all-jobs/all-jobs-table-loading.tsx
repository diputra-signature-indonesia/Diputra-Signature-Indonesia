const headerWidths = ['w-36', 'w-14', 'w-20', 'w-24', 'w-20', 'w-16', 'w-14'];

export function AllJobsTableLoading() {
  return (
    <section aria-label="Loading jobs" aria-busy="true" className="overflow-hidden rounded-xl border border-[#DEE2E7] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.05)]">
      <div className="min-w-[1100px] animate-pulse">
        <div className="grid grid-cols-[2.1fr_0.85fr_1fr_1.15fr_0.9fr_0.75fr_0.65fr_40px] gap-5 border-b border-[#E7E9ED] px-11 py-5">
          {headerWidths.map((width, index) => <span key={index} className={`h-3 rounded bg-[#ECEEF1] ${width}`} />)}
          <span className="h-3 w-4 rounded bg-[#ECEEF1]" />
        </div>

        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="grid h-[72px] grid-cols-[2.1fr_0.85fr_1fr_1.15fr_0.9fr_0.75fr_0.65fr_40px] items-center gap-5 border-b border-[#E7E9ED] px-11">
            <div className="space-y-2">
              <span className="block h-3 w-40 rounded bg-[#E1E4E8]" />
              <span className="block h-2.5 w-28 rounded bg-[#EFF1F3]" />
            </div>
            <span className="h-7 w-20 rounded-full bg-[#E8EAED]" />
            <span className="h-3 w-20 rounded bg-[#E8EAED]" />
            <div className="space-y-2">
              <span className="block h-2.5 w-16 rounded bg-[#E8EAED]" />
              <span className="block h-1.5 w-24 rounded bg-[#E1E4E8]" />
            </div>
            <div className="space-y-2">
              <span className="block h-3 w-20 rounded bg-[#E8EAED]" />
              <span className="block h-2.5 w-16 rounded bg-[#EFF1F3]" />
            </div>
            <span className="h-6 w-16 rounded bg-[#E8EAED]" />
            <span className="h-6 w-12 rounded bg-[#E8EAED]" />
            <span className="h-4 w-1.5 rounded bg-[#E1E4E8]" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-[#DEE2E7] px-5 py-4">
        <span className="h-3 w-32 animate-pulse rounded bg-[#E8EAED]" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => <span key={index} className="size-8 animate-pulse rounded bg-[#E8EAED]" />)}
        </div>
      </div>
    </section>
  );
}
