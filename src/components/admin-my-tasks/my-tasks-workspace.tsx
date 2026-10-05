'use client';
import { useState } from 'react';
import type { MyTaskPage } from '@/types/admin-my-tasks';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AllJobsPagination } from '@/components/admin-all-jobs/all-jobs-pagination';
import { ClientTasksCard } from './client-tasks-card';
import { JobListCard } from './job-list-card';
import { initialMyTasksFilters, MyTasksFilters } from './my-tasks-filters';
export function MyTasksWorkspace({ initialPage }: { initialPage: MyTaskPage }) {
  const [selectedId, setSelectedId] = useState(initialPage.selected?.id ?? '');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [filters, setFilters] = useState(initialMyTasksFilters);
  const [jobQuery, setJobQuery] = useState('');
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams({
    ...filters,
    query: filters.query,
    jobQuery,
    page: String(page),
    taskPage: String(taskPage),
    selected: selectedId,
    taskStatus: status === 'All' ? '' : status,
    revision: `${initialPage.revision}-${revision}`,
  });
  const result = useAdminPage<MyTaskPage>(`/api/admin/my-tasks?${params}`, initialPage, 400);
  const data = result.data ?? initialPage;
  const selected = result.loading || result.error ? null : data.selected;
  return (
    <>
      <MyTasksFilters
        statuses={initialPage.jobStatuses}
        filters={filters}
        onChange={(next) => {
          setFilters(next);
          setPage(1);
          setTaskPage(1);
          setStatus('All');
        }}
        onApply={() => setRevision((n) => n + 1)}
        onReset={() => {
          setFilters(initialMyTasksFilters);
          setJobQuery('');
          setPage(1);
          setTaskPage(1);
        }}
      />
      {result.error ? (
        <p role="alert" className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}
      {result.loading ? (
        <p role="status" className="mx-5 mt-4 text-xs text-gray-500">
          Loading...
        </p>
      ) : null}
      <section aria-busy={result.loading} className="grid items-start gap-5 px-4 py-5 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,2.05fr)_minmax(320px,1fr)]">
        {selected ? (
          <ClientTasksCard
            key={selected.id}
            job={selected}
            searchQuery=""
            activeStatus={status}
            onStatusChange={(value) => {
              setStatus(value);
              setTaskPage(1);
            }}
            page={data.taskPage}
            total={data.taskTotal}
            onPageChange={setTaskPage}
            onSaved={() => setRevision((n) => n + 1)}
          />
        ) : (
          <div className="rounded-xl border bg-white p-10 text-center text-sm">Tidak ada Job sesuai filter.</div>
        )}
        <div>
          <JobListCard
            jobs={data.jobs}
            selectedJobId={selected?.id ?? ''}
            query={jobQuery}
            onQueryChange={(value) => {
              setJobQuery(value);
              setPage(1);
              setTaskPage(1);
              setStatus('All');
            }}
            onJobSelect={(id) => {
              setSelectedId(id);
              setStatus('All');
              setTaskPage(1);
            }}
          />
          <AllJobsPagination
            currentPage={data.page}
            pageSize={10}
            totalItems={data.total}
            onPageChange={(value) => {
              setPage(value);
              setTaskPage(1);
              setStatus('All');
            }}
          />
        </div>
      </section>
    </>
  );
}
