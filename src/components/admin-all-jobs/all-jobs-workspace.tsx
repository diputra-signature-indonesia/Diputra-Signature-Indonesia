'use client';
import { initialAllJobsFilters } from '@/data/admin-all-jobs/all-jobs-dummy-data';
import { useState } from 'react';
import type { AddJobOptions } from '@/lib/supabase/queries/add-job';
import type { AdminJobPage } from '@/types/admin-pages';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AllJobsFilters } from './all-jobs-filters';
import { AllJobsTable } from './all-jobs-table';

export function AllJobsWorkspace({ initialPage, options }: { initialPage: AdminJobPage; options: AddJobOptions }) {
  const [filters, setFilters] = useState(initialAllJobsFilters);
  const [page, setPage] = useState(initialPage.page);
  const [revision, setRevision] = useState(0);
  const params = new URLSearchParams({ ...filters, page: String(page), revision: `${initialPage.revision}-${revision}` });
  const url = revision || page !== initialPage.page || JSON.stringify(filters) !== JSON.stringify(initialAllJobsFilters) ? `/api/admin/jobs?${params}` : null;
  const result = useAdminPage<AdminJobPage>(url, initialPage, 400);
  const data = url ? result.data : initialPage;
  return (
    <>
      <AllJobsFilters
        options={options}
        onApply={(next) => {
          setFilters(next);
          setPage(1);
          setRevision((value) => value + 1);
        }}
      />
      <div className="px-4 py-5 sm:px-5 lg:px-6">
        {result.error ? (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {result.error}
          </p>
        ) : null}
        <AllJobsTable
          jobs={data?.jobs ?? []}
          groupBy={filters.groupBy}
          isLoading={result.loading}
          options={options}
          page={data?.page ?? page}
          total={data?.total ?? 0}
          onPageChange={setPage}
          onSaved={() => setRevision((value) => value + 1)}
        />
      </div>
    </>
  );
}
