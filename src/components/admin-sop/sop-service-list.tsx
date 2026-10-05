'use client';
import { useState } from 'react';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AllJobsPagination } from '@/components/admin-all-jobs/all-jobs-pagination';
import { AdminModal } from '@/components/layout-admin/admin-modal';
type Service = { id: string; title: string; summary: string };
type Page = { services: Service[]; total: number; page: number };
export function SopServiceList({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const result = useAdminPage<Page>(`/api/admin/sop?${new URLSearchParams({ kind: 'list', query, page: String(page) })}`, undefined, 400);
  const list = (
    <>
      <input
        type="search"
        maxLength={160}
        aria-label="Search internal SOP services"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
        placeholder="Search service name or code..."
        className="m-4 h-10 w-[calc(100%-2rem)] rounded-lg border px-3 text-xs"
      />
      <div className="max-h-[480px] overflow-y-auto border-t">
        {result.loading ? (
          <p role="status" className="p-5 text-xs">
            Searching...
          </p>
        ) : result.error ? (
          <p role="alert" className="p-5 text-xs text-red-700">
            {result.error}
          </p>
        ) : (
          result.data?.services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => {
                onSelect(service.id);
                setOpen(false);
              }}
              className={`block w-full border-b p-4 text-left ${service.id === selectedId ? 'bg-[#FFF9F8] text-[#9F1010]' : 'hover:bg-gray-50'}`}
            >
              <span className="block text-sm font-semibold">{service.title}</span>
              <span className="mt-1 block text-xs text-gray-500">{service.summary}</span>
            </button>
          ))
        )}
        {!result.loading && !result.data?.services.length ? <p className="p-5 text-xs text-gray-500">No services found.</p> : null}
      </div>
      <AllJobsPagination currentPage={result.data?.page ?? page} pageSize={10} totalItems={result.data?.total ?? 0} onPageChange={setPage} />
    </>
  );
  return (
    <>
      <aside className="overflow-hidden rounded-xl border bg-white shadow-sm xl:sticky xl:top-5">
        <h2 className="px-4 pt-4 text-xl font-semibold">Service List</h2>
        {!open ? list : null}
        <button type="button" onClick={() => setOpen(true)} className="h-12 w-full border-t text-xs font-semibold text-[#760A0A]">
          View All Services
        </button>
      </aside>
      <AdminModal open={open} onClose={() => setOpen(false)} title="All Internal Services" description="Search and choose a service to manage its SOP." size="lg">
        {open ? list : null}
      </AdminModal>
    </>
  );
}
