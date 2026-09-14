'use client';

import { initialSopServices } from '@/data/admin-sop/sop-dummy-data';
import { useState } from 'react';
import { SopDescriptionCard } from './sop-description-card';
import { SopFlowCard } from './sop-flow-card';
import { SopRequirementFilesCard } from './sop-requirement-files-card';
import { SopRequirementsTable } from './sop-requirements-table';
import { SopServiceList } from './sop-service-list';

export function SopWorkspace() {
  const [services, setServices] = useState(initialSopServices);
  const [selectedId, setSelectedId] = useState(initialSopServices[0].id);
  const selectedService = services.find((service) => service.id === selectedId) ?? services[0];

  const saveDescription = (description: string) => {
    setServices((current) => current.map((service) => (service.id === selectedService.id ? { ...service, description } : service)));
  };

  return (
    <main className="grid items-start gap-5 px-4 pt-5 pb-20 sm:px-5 lg:px-6 xl:grid-cols-[minmax(0,2.08fr)_minmax(300px,1fr)]">
      <div className="space-y-5">
        <SopDescriptionCard key={selectedService.id} service={selectedService} onSave={saveDescription} />
        <SopFlowCard serviceId={selectedService.id} />
        <SopRequirementFilesCard />
        <SopRequirementsTable />
      </div>
      <SopServiceList services={services} selectedId={selectedService.id} onSelect={setSelectedId} />
    </main>
  );
}
