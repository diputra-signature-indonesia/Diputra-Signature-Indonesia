'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AdminSearchField } from '@/components/layout-admin/admin-search-field';
import { AdminModal } from '@/components/layout-admin/admin-modal';
import { AllJobsPagination } from '@/components/admin-all-jobs/all-jobs-pagination';
import type { AdminJobPage } from '@/types/admin-pages';

function RelatedJobItem({ job }: { job: AdminJobPage['jobs'][number] }) {
  const color = (value: string | undefined, fallback: string) => (/^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : fallback);
  const priorityColor = color(job.priorityColor, '#C32929');
  const statusColor = color(job.statusColor, '#194DB8');
  return (
    <article className="border-b border-[#E3E5E8] px-4 py-3">
      <Link href={`/admin/all-jobs/${job.id}`} className="block truncate text-sm font-medium text-[#2A2020] hover:text-[#8C1010]">
        {job.title}
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`text-[10px] ${job.deadlineNote.startsWith('Overdue') ? 'text-red-600' : 'text-[#2A2020]'}`}>{job.deadlineNote}</span>
        <div className="flex gap-1.5">
          <span className="rounded px-2 py-1 text-[8px] font-semibold uppercase" style={{ color: priorityColor, backgroundColor: priorityColor + '18' }}>
            {job.priority}
          </span>
          <span className="rounded border px-2 py-1 text-[8px] font-semibold uppercase" style={{ color: statusColor, borderColor: statusColor, backgroundColor: statusColor + '12' }}>
            {job.status}
          </span>
        </div>
      </div>
    </article>
  );
}

export function LiveMoreFromClientCard({ jobId, clientName }: { jobId: string; clientName: string }) {
  const [query, setQuery] = useState('');
  const [modalQuery, setModalQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const preview = useAdminPage<AdminJobPage>(`/api/admin/jobs/${jobId}?${new URLSearchParams({ query, page: '1' })}`, undefined, 400);
  const result = useAdminPage<AdminJobPage>(open ? `/api/admin/jobs/${jobId}?${new URLSearchParams({ query: modalQuery, page: String(page) })}` : null, undefined, 400);
  const renderJobs = (data: typeof preview) =>
    data.loading ? (
      <p role="status" className="px-4 py-10 text-center text-xs text-[#8A94A3]">
        Loading jobs...
      </p>
    ) : data.error ? (
      <p role="alert" className="px-4 py-10 text-center text-xs text-[#A51919]">
        {data.error}
      </p>
    ) : data.data?.jobs.length ? (
      data.data.jobs.map((job) => <RelatedJobItem key={job.id} job={job} />)
    ) : (
      <p className="px-4 py-10 text-center text-xs text-[#8A94A3]">Belum ada Job lain untuk Client ini.</p>
    );
  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
        <header className="px-4 pt-4 pb-3">
          <h2 className="text-xl font-semibold text-[#2A2020]">More from this Client</h2>
          <div className="mt-3">
            <AdminSearchField label="Search this client jobs" hideLabel compact value={query} onChange={setQuery} placeholder="Job title or client name..." />
          </div>
        </header>
        <div className="max-h-56 overflow-y-auto border-t border-[#E3E5E8]">{renderJobs(preview)}</div>
        <button
          type="button"
          onClick={() => {
            setModalQuery('');
            setPage(1);
            setOpen(true);
          }}
          className="flex h-11 w-full items-center justify-center border-t border-[#E3E5E8] text-xs font-semibold text-[#8C1010] transition hover:bg-[#FFF6F6]"
        >
          View All Jobs
        </button>
      </section>
      <AdminModal open={open} onClose={() => setOpen(false)} title="All Client Jobs" description={`Job lain untuk ${clientName}.`} size="lg">
        <div className="mb-4">
          <AdminSearchField
            label="Search all client jobs"
            hideLabel
            value={modalQuery}
            onChange={(value) => {
              setModalQuery(value);
              setPage(1);
            }}
            placeholder="Search jobs..."
          />
        </div>
        <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-[#E3E5E8]">{renderJobs(result)}</div>
        <AllJobsPagination
          noun="jobs"
          disabled={result.loading || Boolean(result.error)}
          currentPage={result.data?.page ?? page}
          pageSize={10}
          totalItems={result.data?.total ?? 0}
          onPageChange={setPage}
        />
      </AdminModal>
    </>
  );
}
