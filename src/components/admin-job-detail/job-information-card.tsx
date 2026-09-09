import { jobDetail } from '@/data/admin-job-detail/job-detail-dummy-data';

type InformationItemProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

function InformationItem({ label, children, className }: InformationItemProps) {
  return (
    <div className={className}>
      <dt className="text-[10px] uppercase tracking-[0.08em] text-[#A2A2A8]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[#111348]">{children}</dd>
    </div>
  );
}

export function JobInformationCard() {
  return (
    <section className="rounded-xl border border-[#D9DDE3] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <h2 className="text-lg font-semibold text-[#282828]">Job Information</h2>

      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        <InformationItem label="Client">{jobDetail.client}</InformationItem>
        <InformationItem label="PIC">{jobDetail.pic}</InformationItem>
        <InformationItem label="Category">{jobDetail.category}</InformationItem>
        <InformationItem label="Priority">{jobDetail.priority}</InformationItem>
        <InformationItem label="Start Date">{jobDetail.startDate}</InformationItem>
        <InformationItem label="Estimated End Date">{jobDetail.estimatedEndDate}</InformationItem>
        <InformationItem label="Estimated Duration">{jobDetail.estimatedDuration}</InformationItem>
        <InformationItem label="Deadline">{jobDetail.deadline}</InformationItem>
        <InformationItem label="Status">
          <span className="inline-flex rounded border border-[#E4B400] bg-[#FFF9E8] px-2 py-1 text-[11px] uppercase text-[#756000]">{jobDetail.status}</span>
        </InformationItem>
        <InformationItem label="Description" className="sm:col-span-2 xl:col-span-3">{jobDetail.description}</InformationItem>
      </dl>
    </section>
  );
}
