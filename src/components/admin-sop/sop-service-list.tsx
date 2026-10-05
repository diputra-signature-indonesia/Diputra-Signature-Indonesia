'use client';

import { useState } from 'react';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { AdminSearchField } from '@/components/layout-admin/admin-search-field';
import { AllJobsPagination } from '@/components/admin-all-jobs/all-jobs-pagination';
import { AdminModal } from '@/components/layout-admin/admin-modal';

type Service = { id: string; title: string; summary: string };
type Page = { services: Service[]; total: number; page: number };

function ServiceItem({ service, active, onSelect }: { service: Service; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 border-b border-[#E4E7EB] px-5 py-5 text-left transition ${active ? 'bg-[#FFF9F8]' : 'hover:bg-[#FAFBFC]'}`}
    >
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${active ? 'bg-[#A61919]' : 'bg-[#E4C5C1]'}`} />
      <span className="min-w-0">
        <span className={`block text-sm leading-5 ${active ? 'font-bold text-[#9F1010]' : 'font-medium text-[#292323]'}`}>{service.title}</span>
        <span className="mt-1 block text-[11px] leading-4 text-[#685754]">{service.summary}</span>
      </span>
    </button>
  );
}

export function SopServiceList({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [modalQuery, setModalQuery] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const preview = useAdminPage<Page>(`/api/admin/sop?${new URLSearchParams({ kind: 'list', query, page: '1' })}`, undefined, 400);
  const result = useAdminPage<Page>(open ? `/api/admin/sop?${new URLSearchParams({ kind: 'list', query: modalQuery, page: String(page) })}` : null, undefined, 400);
  const closeModal = () => {
    setOpen(false);
    setModalQuery('');
    setPage(1);
  };
  const renderServices = (data: typeof preview, limit?: number, inModal = false) => (
    <>
      {data.loading ? (
        <p role="status" className="px-5 py-10 text-center text-xs text-[#7B8491]">
          Searching services...
        </p>
      ) : data.error ? (
        <p role="alert" className="px-5 py-10 text-center text-xs text-[#A51919]">
          {data.error}
        </p>
      ) : (
        data.data?.services.slice(0, limit).map((service) => (
          <ServiceItem
            key={service.id}
            service={service}
            active={service.id === selectedId}
            onSelect={() => {
              onSelect(service.id);
              if (inModal) closeModal();
            }}
          />
        ))
      )}
      {!data.loading && !data.error && !data.data?.services.length ? <p className="px-5 py-10 text-center text-sm text-[#7B8491]">No services found.</p> : null}
    </>
  );
  return (
    <>
      <aside className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] xl:sticky xl:top-5">
        <header className="border-b border-[#E4E7EB] p-4">
          <h2 className="text-xl font-semibold text-[#292323]">Service List</h2>
          <p className="mt-1 text-xs text-[#685754]">Select a service to view its internal SOP.</p>
          <div className="mt-2">
            <AdminSearchField label="Search internal services" hideLabel compact value={query} onChange={setQuery} placeholder="Internal service name..." />
          </div>
        </header>
        <div className="max-h-[480px] overflow-y-auto">{renderServices(preview, 5)}</div>
        <button
          type="button"
          onClick={() => {
            setModalQuery('');
            setPage(1);
            setOpen(true);
          }}
          className="flex h-12 w-full items-center justify-center text-xs font-semibold tracking-[0.04em] text-[#760A0A] transition hover:bg-[#FFF9F8]"
        >
          View All Services
        </button>
      </aside>
      <AdminModal open={open} onClose={closeModal} title="All Internal Services" description="Select a service to view and manage its SOP." size="lg">
        <div className="mb-4">
          <AdminSearchField
            label="Search all internal services"
            hideLabel
            value={modalQuery}
            onChange={(value) => {
              setModalQuery(value);
              setPage(1);
            }}
            placeholder="Search service name or code..."
          />
        </div>
        <div className="max-h-[480px] overflow-y-auto rounded-lg border border-[#E4E7EB]">{renderServices(result, undefined, true)}</div>
        <AllJobsPagination
          noun="services"
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
