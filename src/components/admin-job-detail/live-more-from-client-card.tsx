'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AllJobsPagination } from '@/components/admin-all-jobs/all-jobs-pagination';
import type { AdminJobPage } from '@/types/admin-pages';
export function LiveMoreFromClientCard({ jobId, clientName }: { jobId: string; clientName: string }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const result = useAdminPage<AdminJobPage>(`/api/admin/jobs/${jobId}?${new URLSearchParams({ query, page: String(page) })}`, undefined, 400);
  return (
    <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-sm">
      <header className="p-4">
        <h2 className="text-xl font-semibold">More from this Client</h2>
        <p className="mt-1 text-xs text-gray-500">{clientName}</p>
        <input
          type="search"
          aria-label="Search this client jobs"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search jobs..."
          className="mt-3 h-9 w-full rounded-lg border px-3 text-xs"
        />
      </header>
      <div className="max-h-64 overflow-y-auto border-t">
        {result.loading ? (
          <p role="status" className="p-4 text-xs">
            Loading...
          </p>
        ) : result.error ? (
          <p role="alert" className="p-4 text-xs text-red-700">
            {result.error}
          </p>
        ) : (
          result.data?.jobs.map((job) => (
            <Link key={job.id} href={`/admin/all-jobs/${job.id}`} className="block border-b px-4 py-3 text-sm hover:bg-gray-50">
              <p className="font-medium">{job.title}</p>
              <p className="mt-1 text-xs text-gray-500">
                {job.status} · {job.deadlineNote}
              </p>
            </Link>
          ))
        )}
      </div>
      <AllJobsPagination currentPage={result.data?.page ?? page} pageSize={10} totalItems={result.data?.total ?? 0} onPageChange={setPage} />
    </section>
  );
}
