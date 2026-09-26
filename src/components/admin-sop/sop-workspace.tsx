'use client';

import type { SopWorkspaceData } from '@/types/admin-sop';
import { useState } from 'react';
import { SopDescriptionCard } from './sop-description-card';
import { SopFlowCard } from './sop-flow-card';
import { SopRequirementFilesCard } from './sop-requirement-files-card';
import { SopRequirementsTable } from './sop-requirements-table';
import { SopServiceList } from './sop-service-list';

export function SopWorkspace({ data }: { data: SopWorkspaceData }) {
  const [selectedId, setSelectedId] = useState(data.services[0]?.id ?? '');
  const selectedService = data.services.find((service) => service.id === selectedId) ?? data.services[0];

  if (!selectedService) return <main className="px-4 py-5 sm:px-5 lg:px-6"><div className="rounded-xl border border-dashed border-[#C8CDD5] bg-white px-6 py-16 text-center"><h2 className="text-lg font-semibold text-[#292323]">Belum ada Internal Service aktif</h2><p className="mt-2 text-sm text-[#68717E]">Tambahkan dan aktifkan Internal Service melalui Master Data sebelum membuat SOP.</p></div></main>;

  return (
    <main className="grid items-start gap-5 px-4 pt-5 pb-20 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,2.08fr)_minmax(300px,1fr)]">
      <div className="space-y-5">
        <SopDescriptionCard key={`description-${selectedService.id}-${selectedService.sop?.version ?? 0}`} service={selectedService} canManage={data.canManage} />
        <SopFlowCard service={selectedService} canManage={data.canManage} />
        <SopRequirementFilesCard service={selectedService} canManage={data.canManage} />
        <SopRequirementsTable key={`prices-${selectedService.id}-${selectedService.sop?.version ?? 0}`} service={selectedService} canManage={data.canManage} />
      </div>
      <SopServiceList services={data.services} selectedId={selectedService.id} onSelect={setSelectedId} />
    </main>
  );
}
