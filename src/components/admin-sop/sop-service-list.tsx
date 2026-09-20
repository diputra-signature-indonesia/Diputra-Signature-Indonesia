'use client';

import { AdminModal } from '@/components/layout-admin/admin-modal';
import type { SopService } from '@/data/admin-sop/sop-dummy-data';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

type SopServiceListProps = {
  services: SopService[];
  selectedId: string;
  onSelect: (serviceId: string) => void;
};

function ServiceItem({ service, active, onSelect }: { service: SopService; active: boolean; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className={`flex w-full items-start gap-3 border-b border-[#E4E7EB] px-5 py-5 text-left transition ${active ? 'bg-[#FFF9F8]' : 'hover:bg-[#FAFBFC]'}`}>
      <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${active ? 'bg-[#A61919]' : 'bg-[#E4C5C1]'}`} />
      <span className="min-w-0">
        <span className={`block text-sm leading-5 ${active ? 'font-bold text-[#9F1010]' : 'font-medium text-[#292323]'}`}>{service.title}</span>
        <span className="mt-1 block text-[11px] leading-4 text-[#685754]">{service.summary}</span>
      </span>
    </button>
  );
}

export function SopServiceList({ services, selectedId, onSelect }: SopServiceListProps) {
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const visibleServices = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return services;
    return services.filter((service) => `${service.title} ${service.summary}`.toLocaleLowerCase().includes(normalizedQuery));
  }, [query, services]);

  const selectService = (serviceId: string) => {
    onSelect(serviceId);
    setShowAll(false);
  };

  return (
    <>
      <aside className="overflow-hidden rounded-xl border border-[#D9DDE3] bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04)] xl:sticky xl:top-5">
        <header className="border-b border-[#E4E7EB] p-4">
          <h2 className="text-xl font-semibold text-[#292323]">Service List</h2>
          <p className="mt-1 text-xs text-[#685754]">Select a service to view its internal SOP.</p>
          <label className="mt-2 flex h-9 items-center gap-2 rounded-lg border border-[#DEE2E7] bg-[#F5F6F8] px-3 focus-within:border-[#A61919] focus-within:ring-2 focus-within:ring-[#A61919]/10">
            <Search aria-hidden="true" className="size-4 shrink-0 text-[#8A94A3]" />
            <span className="sr-only">Search internal services</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Internal service name..."
              className="min-w-0 flex-1 bg-transparent text-xs text-[#303846] outline-none placeholder:text-[#747D8C]"
            />
          </label>
        </header>

        <div className="max-h-[480px] overflow-y-auto">
          {visibleServices.slice(0, 5).map((service) => (
            <ServiceItem key={service.id} service={service} active={service.id === selectedId} onSelect={() => onSelect(service.id)} />
          ))}
          {visibleServices.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[#7B8491]">No services found.</p> : null}
        </div>

        <button type="button" onClick={() => setShowAll(true)} className="flex h-12 w-full items-center justify-center text-xs font-semibold tracking-[0.04em] text-[#760A0A] transition hover:bg-[#FFF9F8]">
          View All Services
        </button>
      </aside>

      <AdminModal open={showAll} onClose={() => setShowAll(false)} title="All Internal Services" description="Select a service to view and manage its SOP." size="lg">
        <div className="overflow-hidden rounded-lg border border-[#E4E7EB]">
          {services.map((service) => (
            <ServiceItem key={service.id} service={service} active={service.id === selectedId} onSelect={() => selectService(service.id)} />
          ))}
        </div>
      </AdminModal>
    </>
  );
}
