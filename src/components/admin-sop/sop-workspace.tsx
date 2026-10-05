'use client';

import type { SopWorkspaceData } from '@/types/admin-sop';
import { useAdminPage } from '@/components/layout-admin/use-admin-page';
import { useState } from 'react';
import { SopDescriptionCard } from './sop-description-card';
import { SopFlowCard } from './sop-flow-card';
import { SopRequirementFilesCard } from './sop-requirement-files-card';
import { SopRequirementsTable } from './sop-requirements-table';
import { SopServiceList } from './sop-service-list';

export function SopWorkspace({ data }: { data: SopWorkspaceData }) {
  const [selectedId, setSelectedId] = useState(data.services[0]?.id ?? '');
  const details = useAdminPage<SopWorkspaceData>(`/api/admin/sop?service=${selectedId}&revision=${data.revision}`, data);
  const selectedService = details.loading || details.error ? undefined : (details.data ?? data).services[0];

  return (
    <main className="grid items-start gap-5 px-4 pt-5 pb-20 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,2.08fr)_minmax(300px,1fr)]">
      <div className="space-y-5">
        {details.loading ? (
          <p role="status" className="text-xs">
            Loading SOP...
          </p>
        ) : null}
        {details.error ? (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {details.error}
          </p>
        ) : null}
        {selectedService ? (
          <>
            <SopDescriptionCard key={`description-${selectedService.id}-${selectedService.sop?.version ?? 0}`} service={selectedService} canManage={data.canManage} />
            <SopFlowCard service={selectedService} canManage={data.canManage} />
            <SopRequirementFilesCard service={selectedService} canManage={data.canManage} />
            <SopRequirementsTable key={`prices-${selectedService.id}-${selectedService.sop?.version ?? 0}`} service={selectedService} canManage={data.canManage} />
          </>
        ) : !details.loading && !details.error ? (
          <div className="rounded-xl border border-[#D9DDE3] bg-white p-10 text-center text-sm text-[#7B8491] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            Select an active Internal Service to view its SOP.
          </div>
        ) : null}
      </div>
      <SopServiceList selectedId={selectedId} onSelect={setSelectedId} />
    </main>
  );
}
